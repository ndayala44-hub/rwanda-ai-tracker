"""
Engine tests. These run without FastAPI installed — only the standard library
and the dataset are needed, so the methodology can always be verified.

    python3 -m pytest services/api/tests -q
    python3 services/api/tests/test_engine.py     # also runs standalone
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/api"))

from app.engine import (aggregate, assign_maturity, normalise,  # noqa: E402
                        score_series, score_year, Node)

FILES = {
    "sources": "sources.json", "framework": "framework.json",
    "indicators": "indicators.json", "observations": "observations.json",
}


def dataset() -> dict:
    return {k: json.loads((ROOT / "data" / v).read_text()) for k, v in FILES.items()}


def test_goalpost_is_linear_between_goalposts():
    ind = {"normalisation": "goalpost", "baseline": 0, "target": 100}
    assert normalise(0, ind) == 0
    assert normalise(50, ind) == 50
    assert normalise(100, ind) == 100
    assert normalise(140, ind) == 100, "values beyond target are capped, not extrapolated"


def test_inverted_goalposts_score_lower_values_higher():
    ind = {"normalisation": "goalpost", "baseline": 10, "target": 2}
    assert normalise(10, ind) == 0
    assert normalise(2, ind) == 100


def test_rank_honours_the_per_indicator_universe():
    small = {"normalisation": "rank", "baseline": 0, "target": 0, "universe": 121}
    large = {"normalisation": "rank", "baseline": 0, "target": 0, "universe": 195}
    assert normalise(111, small) < normalise(111, large), "same rank is worse in a smaller field"


def test_missing_child_lowers_coverage_and_is_never_a_zero():
    node = aggregate([Node(score=80, assessed=True, confidence=0.9, coverage=1.0),
                      Node(score=None, assessed=False, confidence=0.2, coverage=0.0)])
    assert node.score == 80, "the reported child alone sets the score"
    assert node.coverage == 0.5
    assert node.status == "provisional"


def test_coverage_propagates_upward():
    partial = aggregate([Node(score=60, assessed=True, confidence=0.8, coverage=1.0),
                         Node(score=None, assessed=False, confidence=0.0, coverage=0.0)])
    parent = aggregate([partial])
    assert parent.coverage == 0.5, "a partial child must not report as full coverage"


def test_full_dataset_scores_and_is_reproducible():
    a, b = score_year(dataset(), 2026, 2026), score_year(dataset(), 2026, 2026)
    assert a["readiness"]["score"] == b["readiness"]["score"]
    assert 0 < a["readiness"]["score"] < 100
    assert 0 < a["maturity"]["score"] < 100


def test_readiness_exceeds_maturity():
    run = score_year(dataset(), 2026, 2026)
    assert run["readiness"]["score"] > run["maturity"]["score"], "the conversion deficit"


def test_level_is_the_lower_of_band_and_gate():
    lvl = score_year(dataset(), 2026, 2026)["maturityLevel"]
    assert lvl["assigned"] == min(lvl["scoreBand"], lvl["gateLevel"])


def test_unmet_gate_names_the_indicator_responsible():
    ladder = [{"level": 1, "name": "Exploring", "bandMin": 0, "bandMax": 20, "gates": []},
              {"level": 2, "name": "Emerging", "bandMin": 20, "bandMax": 40,
               "gates": [{"indicator": "X", "label": "A law in force"}]}]
    scores = {"X": {"code": "X", "raw": 0, "score": 0, "assessed": True}}
    defs = {"X": {"normalisation": "binary"}}
    m = assign_maturity(35, ladder, scores, defs)
    assert m["assigned"] == 1, "the score band alone would give level 2"
    assert m["binding"][0]["label"] == "A law in force"


def test_declared_absences_lower_coverage():
    run = score_year(dataset(), 2026, 2026)
    assert run["readiness"]["coverage"] < 1.0, (
        "indicators flagged not_reported must count against coverage rather than score zero")


def test_history_is_not_flat():
    series = score_series(dataset(), 2019, 2026)
    assert series[2026]["readiness"]["score"] > series[2021]["readiness"]["score"]


def test_every_indicator_resolves_to_a_registered_source():
    ds = dataset()
    ids = {s["id"] for s in ds["sources"]["items"]}
    missing = [i["sourceId"] for i in ds["indicators"]["items"] if i["sourceId"] not in ids]
    assert not missing, f"unregistered sources: {missing}"


if __name__ == "__main__":
    passed = failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); passed += 1; print(f"ok   {name}")
            except AssertionError as exc:
                failed += 1; print(f"FAIL {name}: {exc}")
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
