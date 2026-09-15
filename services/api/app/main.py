"""
Rwanda AI Tracker — FastAPI backend.

Serves the versioned datasets and the scored output to the dashboard. The
dashboard makes one request on load (`/api/bootstrap`); every other endpoint
exists for integrators rather than for the UI.

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 4010 --reload
Docs:
    http://localhost:4010/docs
"""
from __future__ import annotations

import hmac
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import config
from .engine import ENGINE_VERSION
from .store import store
from .persistence import ReadOnlyDataDirectory, persist_observation, read_revisions
from .validation import validate_observation

app = FastAPI(
    title="Rwanda AI Tracker API",
    version="2.1.0",
    description=(
        "Data layer and scoring engine for the Rwanda AI Tracker. Read-mostly. "
        "Writes require a bearer token and are disabled unless ADMIN_API_TOKEN is set."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "authorization"],
)


@app.on_event("startup")
def _startup() -> None:
    store.load()


@app.middleware("http")
async def _security_headers(request: Request, call_next):
    # Outside production, pick up dataset edits without a restart.
    if config.env != "production":
        try:
            store.reload_if_stale()
        except Exception:  # a half-written file during an edit must not 500 the API
            pass
    response = await call_next(request)
    response.headers["x-content-type-options"] = "nosniff"
    response.headers["referrer-policy"] = "no-referrer"
    return response


def require_token(authorization: str | None = Header(default=None)) -> None:
    """Constant-time bearer check. Refuses outright when no token is configured."""
    if not config.write_enabled:
        raise HTTPException(401, "This service is running read-only. Set ADMIN_API_TOKEN to enable writes.")
    supplied = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    if not hmac.compare_digest(supplied, config.admin_token):
        raise HTTPException(401, "Unauthorised. Supply a valid bearer token.")


# --------------------------------------------------------------------- service
@app.get("/health", tags=["service"])
def health() -> dict:
    return {"status": "ok", "loadedAt": store.loaded_at.isoformat(),
            "writeEnabled": config.write_enabled, "engine": ENGINE_VERSION}


@app.get("/api/meta", tags=["service"])
def meta() -> dict:
    return store.meta()


@app.get("/api/provenance", tags=["service"])
def provenance() -> dict:
    """What share of the published observations is actually reported by a source."""
    return store.provenance()


@app.get("/api/bootstrap", tags=["service"])
def bootstrap(response: Response, if_none_match: str | None = Header(default=None)) -> Any:
    """Everything the dashboard needs, in one ETag-cached payload."""
    etag = f'"{store.etag}"'
    if if_none_match == etag:
        return Response(status_code=304)
    payload = {**store.dataset,
               "generated": datetime.now(timezone.utc).isoformat(),
               "meta": store.meta()}
    return JSONResponse(payload, headers={
        "etag": etag,
        "cache-control": f"public, max-age={config.cache_ttl_seconds}",
    })


# ------------------------------------------------------- framework and indicators
@app.get("/api/framework", tags=["framework"])
def framework() -> dict:
    return store.dataset["framework"]


@app.get("/api/dimensions", tags=["framework"])
def dimensions() -> list[dict]:
    return store.dataset["framework"]["dimensions"]


@app.get("/api/dimensions/{dimension_id}", tags=["framework"])
def dimension(dimension_id: str, year: int | None = None) -> dict:
    found = next((d for d in store.dataset["framework"]["dimensions"] if d["id"] == dimension_id), None)
    if not found:
        raise HTTPException(404, "Unknown dimension")
    return {**found, "score": store.run(year)["dimensions"][dimension_id]}


@app.get("/api/outputs", tags=["framework"])
def outputs() -> list[dict]:
    return store.dataset["framework"]["outputs"]


@app.get("/api/indicators", tags=["indicators"])
def indicators(q: str | None = None, dimension: str | None = None,
               source: str | None = None) -> dict:
    items = store.dataset["indicators"]["items"]
    if dimension:
        items = [i for i in items if i["dimension"] == dimension]
    if source:
        items = [i for i in items if i["sourceId"] == source]
    if q:
        needle = q.lower()
        items = [i for i in items if needle in f"{i['code']} {i['name']}".lower()]
    return {"count": len(items), "items": items}


@app.get("/api/indicators/{code}", tags=["indicators"])
def indicator(code: str) -> dict:
    found = next((i for i in store.dataset["indicators"]["items"] if i["code"] == code), None)
    if not found:
        raise HTTPException(404, "Unknown indicator")
    observations = [o for o in store.dataset["observations"]["items"] if o["indicator"] == code]
    history = [{"year": y, **run["indicators"][code]} for y, run in sorted(store.runs.items())]
    source = next((s for s in store.dataset["sources"]["items"] if s["id"] == found["sourceId"]), None)
    return {**found, "source": source, "observations": observations, "history": history}


@app.get("/api/observations", tags=["indicators"])
def observations(indicator: str | None = None, origin: str | None = None) -> dict:
    items = store.dataset["observations"]["items"]
    if indicator:
        items = [o for o in items if o["indicator"] == indicator]
    if origin:
        items = [o for o in items if o.get("origin") == origin]
    return {"count": len(items), "items": items}


# ------------------------------------------------------------------------ scores
@app.get("/api/scores", tags=["scores"])
def scores(year: int | None = None) -> dict:
    try:
        return store.run(year)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.get("/api/readiness", tags=["scores"])
def readiness(year: int | None = None) -> dict:
    return store.run(year)["readiness"]


@app.get("/api/maturity", tags=["scores"])
def maturity(year: int | None = None) -> dict:
    run = store.run(year)
    return {"index": run["maturity"], "level": run["maturityLevel"]}


@app.get("/api/trends", tags=["scores"])
def trends() -> list[dict]:
    return [{"year": y,
             "readiness": r["readiness"]["score"],
             "maturity": r["maturity"]["score"],
             "coverage": (r["readiness"]["coverage"] + r["maturity"]["coverage"]) / 2,
             "maturityLevel": r["maturityLevel"]["assigned"]}
            for y, r in sorted(store.runs.items())]


@app.get("/api/analytics/sensitivity", tags=["scores"])
def analytics_sensitivity(index: Literal["readiness", "maturity"] = "readiness") -> list[dict]:
    """Index points gained if an indicator moved to target. Arithmetic, not a forecast."""
    return store.sensitivity(index)


# -------------------------------------------------------------- reference data
def _dataset_route(key: str, tag: str):
    @app.get(f"/api/{key}", tags=[tag], name=key)
    def _route() -> Any:  # noqa: ANN202
        return store.dataset[_KEYS[key]]
    return _route


_KEYS = {"sources": "sources", "organisations": "organisations", "sectors": "sectors",
         "geography": "geography", "use-cases": "useCases", "policies": "policies",
         "journey": "journey", "glossary": "glossary", "contributions": "contributions",
         "economic-sizing": "economicSizing2022", "benchmarks": "benchmarks",
         "proposed-indicators": "proposedIndicators"}
for _key in _KEYS:
    _dataset_route(_key, "reference")


@app.get("/api/landscape/2026", tags=["reference"])
def landscape_2026() -> dict:
    return store.dataset["landscape2026"]


# ------------------------------------------------------------------------ writes
class ObservationIn(BaseModel):
    indicator: str = Field(..., examples=["RWA10"])
    year: int = Field(..., examples=[2026])
    period: str | None = None
    value: float | None = Field(None, examples=[14])
    sourceId: str = Field(..., examples=["RISA"])
    verification: str = Field(..., examples=["verified"])
    origin: str = Field("source-reported", examples=["source-reported"])
    collectedOn: str | None = None
    note: str | None = None


AUDIT: list[dict] = []


@app.post("/api/observations", tags=["writes"], dependencies=[Depends(require_token)])
def upsert_observation(body: ObservationIn) -> dict:
    payload = body.model_dump(exclude_none=True)
    payload.setdefault("period", str(payload["year"]))

    errors = validate_observation(payload, store.dataset)
    if errors:
        raise HTTPException(422, "; ".join(errors))

    # Durable: written back to data/observations.json atomically and appended to
    # the revision log before the scores are recomputed.
    try:
        change = persist_observation(config.data_dir, store.dataset, payload, actor="api")
    except ReadOnlyDataDirectory as exc:
        raise HTTPException(503, str(exc)) from exc
    store.rescore()
    store.refresh_etag()

    AUDIT.insert(0, {"at": datetime.now(timezone.utc).isoformat(), "action": "OBSERVATION_UPSERT",
                     "entity": f"{payload['indicator']}/{payload['year']}", **change})
    return {"ok": True, "indicator": payload["indicator"], "year": payload["year"], **change,
            "persisted": True,
            "note": ("Written to data/observations.json and appended to data/revisions.jsonl. "
                     "Commit the diff to keep Git as the provenance record.")}


@app.get("/api/revisions", tags=["writes"], dependencies=[Depends(require_token)])
def revisions(limit: int = 200) -> dict:
    """The append-only change history, newest first."""
    items = read_revisions(config.data_dir, limit)
    return {"count": len(items), "items": items}


@app.post("/api/reload", tags=["writes"], dependencies=[Depends(require_token)])
def reload_dataset() -> dict:
    store.load()
    AUDIT.insert(0, {"at": datetime.now(timezone.utc).isoformat(), "action": "DATASET_RELOAD",
                     "entity": str(config.data_dir), "before": None, "after": store.etag})
    return {"ok": True, "meta": store.meta()}


@app.get("/api/audit", tags=["writes"], dependencies=[Depends(require_token)])
def audit() -> dict:
    return {"count": len(AUDIT), "items": AUDIT[:200]}
