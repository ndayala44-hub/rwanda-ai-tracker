"""
HTTP contract tests.

    pip install -r services/api/requirements-dev.txt
    python3 -m pytest services/api/tests -q

These require FastAPI and httpx. The engine and parity tests deliberately do
not, so the methodology can be verified with the standard library alone.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
os.environ.setdefault("DATA_DIR", str(ROOT / "data"))
os.environ.setdefault("ADMIN_API_TOKEN", "test-token-that-is-long-enough-123456")
sys.path.insert(0, str(ROOT / "services/api"))

fastapi = pytest.importorskip("fastapi", reason="install requirements-dev.txt to run the HTTP tests")
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.store import store  # noqa: E402

TOKEN = os.environ["ADMIN_API_TOKEN"]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_reports_write_posture(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["writeEnabled"] is True


def test_bootstrap_returns_every_dataset(client):
    res = client.get("/api/bootstrap")
    assert res.status_code == 200
    for key in ("sources", "indicators", "observations", "framework",
                "economicSizing2022", "landscape2026", "benchmarks"):
        assert key in res.json(), f"bootstrap is missing {key}"
    assert res.headers.get("etag"), "bootstrap must be cacheable"


def test_bootstrap_honours_if_none_match(client):
    etag = client.get("/api/bootstrap").headers["etag"]
    assert client.get("/api/bootstrap", headers={"if-none-match": etag}).status_code == 304


def test_scores_are_internally_consistent(client):
    body = client.get("/api/scores").json()
    assert 0 < body["readiness"]["score"] < 100
    level = body["maturityLevel"]
    assert level["assigned"] == min(level["scoreBand"], level["gateLevel"])


def test_indicator_resolves_to_definition_source_and_history(client):
    body = client.get("/api/indicators/L26-USAGE").json()
    assert body["definition"], "an indicator must carry a definition"
    assert body["source"]["id"] == "ANTHROPIC_EI"
    assert body["observations"] and body["history"]


def test_provenance_is_published(client):
    """The platform has to be candid about how much of its own data is demo."""
    body = client.get("/api/provenance").json()
    assert body["observations"]["total"] > 0
    assert "source-reported" in body["observations"]["byOrigin"]
    assert 0 <= body["observations"]["sourceReportedShare"] <= 1
    assert body["sources"]["verified"] >= 5


def test_landscape_and_benchmarks_are_served(client):
    landscape = client.get("/api/landscape/2026").json()
    assert landscape["measuredAdoption"]["usageRank"] == 111
    benchmarks = client.get("/api/benchmarks").json()
    aaigi = next(s for s in benchmarks["series"] if s["id"] == "africa-governance-2026")
    assert aaigi["values"][0]["country"] == "Rwanda"
    assert aaigi["values"][0]["value"] == 3.25


def test_unknown_routes_404(client):
    assert client.get("/api/nope").status_code == 404
    assert client.get("/api/indicators/NOT-A-CODE").status_code == 404


def test_writes_are_rejected_without_a_token(client):
    res = client.post("/api/observations", json={
        "indicator": "RWA10", "year": 2026, "value": 12,
        "sourceId": "CONTRIB", "verification": "in_review"})
    assert res.status_code == 401


def test_invalid_observation_says_how_to_fix_it(client):
    res = client.post("/api/observations",
                      headers={"authorization": f"Bearer {TOKEN}"},
                      json={"indicator": "L26-AILAW", "year": 2026, "value": 7,
                            "sourceId": "LANDSCAPE26", "verification": "verified"})
    assert res.status_code == 422
    assert "binary indicator" in res.json()["detail"]


def test_valid_observation_recomputes_the_scores(client):
    before = client.get("/api/maturity").json()["index"]["score"]
    res = client.post("/api/observations",
                      headers={"authorization": f"Bearer {TOKEN}"},
                      json={"indicator": "RWA10", "year": 2026, "value": 30,
                            "sourceId": "CONTRIB", "verification": "in_review",
                            "origin": "demo"})
    assert res.status_code == 200
    assert client.get("/api/maturity").json()["index"]["score"] != before


def test_audit_records_the_write(client):
    body = client.get("/api/audit", headers={"authorization": f"Bearer {TOKEN}"}).json()
    assert any(e["action"] == "OBSERVATION_UPSERT" for e in body["items"])
