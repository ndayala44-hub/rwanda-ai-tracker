"""
Scoring engine — Python implementation.

This is the authoritative server-side engine. A TypeScript implementation of
the same methodology runs in the browser (apps/web/src/03-engine.js) because
the year scrubber, the admin edits and the offline fallback all need
sub-100ms recomputation without a round trip.

Two implementations of one methodology is a real risk, so it is managed
explicitly: tests/test_parity.py asserts that this engine reproduces the
figures the browser engine produces on the same dataset, to two decimal
places. If the two ever drift, the build fails.

Everything here is pure: the same inputs always produce the same output,
which is what makes a published figure reproducible months later.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Iterable

ENGINE_VERSION = "tracker-scoring-engine-py 2.5.0"

COVERAGE_PUBLISH_GATE = 0.75
COVERAGE_PROVISIONAL_GATE = 0.50

CONFIDENCE_WEIGHTS = {"source": 0.30, "accessibility": 0.20, "recency": 0.25, "verification": 0.25}
ACCESSIBILITY = {1: 0.4, 2: 0.7, 3: 1.0}
VERIFICATION = {"verified": 0.9, "in_review": 0.6, "unverified": 0.4, "not_reported": 0.2}


def _clamp100(v: float) -> float:
    return max(0.0, min(100.0, v))


def _clamp_range(x: float, a: float, b: float) -> float:
    lo, hi = min(a, b), max(a, b)
    return max(lo, min(hi, x))


def normalise(x: float | None, ind: dict) -> float | None:
    """Convert a reported value to 0–100 using the method declared on the indicator."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None

    method = ind["normalisation"]
    L, U = float(ind["baseline"]), float(ind["target"])

    if method == "binary":
        return 100.0 if x else 0.0

    if method == "ordinal":
        # Three-state partial credit: 0 absent, 50 drafted, 100 in force.
        return _clamp100(float(x))

    if method == "passthrough":
        # External composites are rescaled by their own bounds, never recomputed.
        return _clamp100(100.0 * (x - L) / (U - L)) if U != L else 0.0

    if method == "rank":
        # Rank fields differ in size, so the universe is per-indicator: rank 111
        # of 121 is near the bottom, rank 111 of 195 is mid-table.
        n = ind.get("universe") or 172
        return _clamp100(100.0 * (n - x + 1) / n)

    if method == "log":
        # Counts that grow multiplicatively saturate a linear scale.
        a, b = math.log(1 + L), math.log(1 + U)
        if b == a:
            return 0.0
        return _clamp100(100.0 * (math.log(1 + _clamp_range(x, L, U)) - a) / (b - a))

    # Linear goalpost. Inverted goalposts (U < L) handle negative polarity.
    lo, hi = min(L, U), max(L, U)
    if hi == lo:
        return 0.0
    v = (_clamp_range(x, lo, hi) - lo) / (hi - lo)
    return _clamp100(100.0 * (v if U >= L else 1 - v))


def confidence(ind: dict, source: dict | None, age_cycles: int, verification: str) -> float:
    """Published beside a score and never used to adjust it — two different claims."""
    s = (source or {}).get("reliability", 0.6)
    a = ACCESSIBILITY.get(ind.get("accessibility", 2), 0.7)
    r = math.exp(-0.35 * max(0, age_cycles))
    v = VERIFICATION.get(verification, 0.5)
    c = (CONFIDENCE_WEIGHTS["source"] * s + CONFIDENCE_WEIGHTS["accessibility"] * a
         + CONFIDENCE_WEIGHTS["recency"] * r + CONFIDENCE_WEIGHTS["verification"] * v)
    return max(0.0, min(1.0, c))


@dataclass
class Node:
    id: str = ""
    score: float | None = None
    assessed: bool = False
    coverage: float = 0.0
    confidence: float = 0.0
    status: str = "insufficient"
    w: float = 1.0

    def as_dict(self) -> dict:
        return {"id": self.id, "score": self.score, "assessed": self.assessed,
                "coverage": self.coverage, "confidence": self.confidence, "status": self.status}


def aggregate(children: Iterable[Node], node_id: str = "") -> Node:
    """
    Weighted mean over children that reported, with missing weights renormalised away.

    Two properties that are easy to get wrong and are asserted in the tests:
      * coverage PROPAGATES — a parent built from partial children inherits that
        partiality rather than resetting to full;
      * a missing child is excluded, never scored as zero. A zero is a claim
        about performance; a gap is a claim about measurement.
    """
    children = list(children)
    total_w = sum(c.w for c in children) or 1.0
    coverage = sum(c.w * (c.coverage if c.coverage is not None else (1.0 if c.assessed else 0.0))
                   for c in children) / total_w

    available = [c for c in children if c.assessed and c.score is not None]
    if not available:
        return Node(id=node_id, score=None, assessed=False, coverage=0.0,
                    confidence=0.0, status="insufficient")

    w = sum(c.w for c in available)
    score = sum(c.w * c.score for c in available) / w
    conf = coverage * sum(c.w * c.confidence for c in available) / w
    status = ("published" if coverage >= COVERAGE_PUBLISH_GATE
              else "provisional" if coverage >= COVERAGE_PROVISIONAL_GATE else "insufficient")
    return Node(id=node_id, score=score, assessed=True, coverage=coverage,
                confidence=conf, status=status)


def geometric_mean(children: Iterable[Node]) -> float | None:
    """Published beside the arithmetic composite so lopsided progress stays visible."""
    av = [c for c in children if c.assessed and (c.score or 0) > 0]
    if not av:
        return None
    tw = sum(c.w for c in av) or 1.0
    return math.exp(sum(c.w * math.log(c.score) for c in av) / tw)


def gate_satisfied(code: str, scores: dict, defs: dict) -> bool:
    s, d = scores.get(code), defs.get(code)
    if not s or d is None or s["raw"] is None:
        return False
    if d["normalisation"] == "binary":
        return s["raw"] >= 1
    if d["normalisation"] == "ordinal":
        return s["raw"] >= 100
    if code == "RWA10":
        return s["raw"] >= 10          # at least ten public AI solutions
    if code == "RWA9":
        return s["raw"] <= 15          # a top-15 index position
    return (s["score"] or 0) >= 60


def assign_maturity(score: float, ladder: list[dict], scores: dict, defs: dict) -> dict:
    """
    The assigned level is the LOWER of the score band and the capability gate.
    A country should not reach a higher level by accumulating easy indicators
    while foundational institutions are missing.
    """
    ordered = sorted(ladder, key=lambda l: l["level"])
    band = ordered[0]["level"]
    for lvl in ordered:
        if score >= lvl["bandMin"]:
            band = lvl["level"]

    gate = ordered[0]["level"]
    unmet: list[dict] = []
    for lvl in ordered[1:]:
        failing = [g for g in lvl["gates"] if not gate_satisfied(g["indicator"], scores, defs)]
        if not failing:
            gate = lvl["level"]
            continue
        unmet = [{"level": lvl["level"], "code": g["indicator"], "label": g["label"]} for g in failing]
        break

    assigned = min(band, gate)
    return {
        "assigned": assigned, "scoreBand": band, "gateLevel": gate,
        "binding": [u for u in unmet if u["level"] == gate + 1] if gate < band else [],
        "name": next(l["name"] for l in ordered if l["level"] == assigned),
    }


def score_year(dataset: dict, year: int, cycle: int, overrides: dict | None = None) -> dict:
    """A single scoring run for one reporting year."""
    overrides = overrides or {}
    framework = dataset["framework"]
    indicators = dataset["indicators"]["items"]
    sources = {s["id"]: s for s in dataset["sources"]["items"]}
    defs = {i["code"]: i for i in indicators}

    by_indicator: dict[str, list[dict]] = {}
    for o in dataset["observations"]["items"]:
        # An observation flagged not_reported is a stated absence, not a value.
        if o.get("verification") == "not_reported" or o.get("value") is None:
            continue
        by_indicator.setdefault(o["indicator"], []).append(o)
    for series in by_indicator.values():
        series.sort(key=lambda o: o["year"])

    ind_scores: dict[str, dict] = {}
    for ind in indicators:
        series = by_indicator.get(ind["code"], [])
        obs = next((o for o in series if o["year"] == year), None)
        raw = overrides.get(ind["code"], obs["value"] if obs else None)
        sc = normalise(raw, ind)
        assessed = raw is not None and sc is not None

        latest = series[-1] if series else None
        age = (max(0, year - latest["year"]) if latest else 3) + max(0, cycle - year)
        verification = obs["verification"] if obs else "not_reported"

        ind_scores[ind["code"]] = {
            "code": ind["code"], "raw": raw, "score": sc, "assessed": assessed,
            "coverage": 1.0 if assessed else 0.0,
            "confidence": confidence(ind, sources.get(ind["sourceId"]), age, verification),
        }

    def node(code: str) -> Node:
        s = ind_scores[code]
        return Node(id=code, score=s["score"], assessed=s["assessed"],
                    coverage=s["coverage"], confidence=s["confidence"], w=1.0)

    outputs = {
        o["id"]: aggregate([node(i["code"]) for i in indicators if i["output"] == o["id"]], o["id"])
        for o in framework["outputs"]
    }
    dimensions = {
        d["id"]: aggregate([Node(**{**outputs[oid].__dict__, "w": 1.0}) for oid in d["outputs"]], d["id"])
        for d in framework["dimensions"]
    }

    def composite(membership: str) -> dict:
        """
        Readiness and maturity come from the SAME register, split by membership.
        Dimensions are weighted by how many member indicators they contribute,
        so a dimension with two maturity indicators does not carry the same
        weight as one with eleven.
        """
        by_dim: dict[str, dict] = {}
        dim_nodes: list[Node] = []
        for d in framework["dimensions"]:
            out_nodes: list[Node] = []
            for oid in d["outputs"]:
                members = [i for i in indicators
                           if i["output"] == oid and i["indexMembership"] == membership]
                if not members:
                    continue
                n = aggregate([node(m["code"]) for m in members], oid)
                n.w = float(len(members))
                out_nodes.append(n)
            if not out_nodes:
                by_dim[d["id"]] = Node(id=d["id"]).as_dict()
                continue
            n = aggregate(out_nodes, d["id"])
            by_dim[d["id"]] = n.as_dict()
            n.w = sum(o.w for o in out_nodes)
            dim_nodes.append(n)

        top = aggregate(dim_nodes, membership)
        geo = geometric_mean(dim_nodes)
        return {**top.as_dict(), "byDimension": by_dim, "geometric": geo,
                "balance": (top.score - geo) if (geo is not None and top.score is not None) else None}

    readiness, maturity = composite("readiness"), composite("maturity")

    return {
        "year": year,
        "methodologyVersion": framework["methodologyVersion"],
        "weightSet": framework["weightSet"],
        "engineVersion": ENGINE_VERSION,
        "indicators": ind_scores,
        "outputs": {k: v.as_dict() for k, v in outputs.items()},
        "dimensions": {k: v.as_dict() for k, v in dimensions.items()},
        "readiness": readiness,
        "maturity": maturity,
        "maturityLevel": assign_maturity(maturity["score"] or 0.0,
                                         framework["maturityLadder"], ind_scores, defs),
    }


def score_series(dataset: dict, first_year: int, cycle: int) -> dict[int, dict]:
    return {y: score_year(dataset, y, cycle) for y in range(first_year, cycle + 1)}


def sensitivity(dataset: dict, cycle: int, membership: str) -> list[dict]:
    """Index points gained if one indicator moved to target. Arithmetic, not prediction."""
    base = score_year(dataset, cycle, cycle)
    baseline = base[membership]["score"] or 0.0
    out = []
    for ind in dataset["indicators"]["items"]:
        if ind["indexMembership"] != membership:
            continue
        run = score_year(dataset, cycle, cycle, {ind["code"]: ind["target"]})
        out.append({"code": ind["code"], "name": ind["name"], "dimension": ind["dimension"],
                    "gain": (run[membership]["score"] or 0.0) - baseline})
    return sorted(out, key=lambda r: -r["gain"])


def data_quality(dataset: dict, run: dict, dimension: str | None = None) -> dict | None:
    """
    How well a dimension is *measured*, as distinct from how well the country is
    *doing*. Published beside every score: 60 on 95% coverage of verified
    sources is a different claim from 60 on 55% coverage of estimates, and
    without this they look identical.
    """
    indicators = [i for i in dataset["indicators"]["items"]
                  if dimension is None or i["dimension"] == dimension]
    if not indicators:
        return None

    year = run["year"]
    # A declared absence is a stated fact but not a *value*, so it is excluded
    # from the source-reported share, which measures how many published numbers
    # came from a named source. Both engines must apply the same filter.
    obs_index: dict[tuple[str, int], dict] = {
        (o["indicator"], o["year"]): o for o in dataset["observations"]["items"]
        if o.get("verification") != "not_reported" and o.get("value") is not None
    }

    scores = [run["indicators"][i["code"]] for i in indicators]
    assessed = [s for s in scores if s["assessed"]]
    coverage = len(assessed) / len(indicators)
    confidence = sum(s["confidence"] for s in assessed) / len(assessed) if assessed else 0.0

    def verification_of(code: str) -> str:
        o = obs_index.get((code, year))
        return o["verification"] if o else "not_reported"

    verified = sum(1 for i in indicators if verification_of(i["code"]) == "verified") / len(indicators)
    reported = sum(1 for i in indicators
                   if (obs_index.get((i["code"], year)) or {}).get("origin") == "source-reported") / len(indicators)

    score = 100 * (0.30 * coverage + 0.30 * confidence + 0.20 * verified + 0.20 * reported)
    band = "strong" if score >= 75 else "adequate" if score >= 55 else "weak" if score >= 40 else "poor"
    return {"score": score, "coverage": coverage, "confidence": confidence,
            "verified": verified, "sourceReported": reported, "band": band}
