"""
Engine parity.

The methodology has two implementations — Python on the server, TypeScript in
the browser — because the year scrubber and the offline fallback need
recomputation without a round trip. Two implementations of one methodology is
a real risk, so the drift is caught here rather than discovered in a briefing.

The expected figures are the ones the browser engine produces on the committed
dataset. If either engine changes, this test fails and one of them is wrong.

    python3 services/api/tests/test_parity.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/api"))
from app.engine import data_quality, score_year  # noqa: E402

FILES = {"sources": "sources.json", "framework": "framework.json",
         "indicators": "indicators.json", "observations": "observations.json"}

# Produced by apps/web/src/03-engine.js on the committed dataset. Regenerate with:
#   node --input-type=module -e "$(cat scripts/parity-snapshot.mjs)"
# Do not hand-edit these to make the test pass — if they move, find out why.
EXPECTED = {
    "readiness": 47.16, "maturity": 41.05, "coverage": 0.931, "level": 2,
    "dimensions": {"D1": 51.98, "D2": 55.82, "D3": 62.75, "D4": 46.87, "D5": 29.86, "D6": 21.69},
    "dataQuality": {"D1": 52.58, "D2": 57.76, "D3": 58.12, "D4": 67.92, "D5": 54.36, "D6": 65.75},
}
TOLERANCE = 0.01


def _dataset() -> dict:
    return {k: json.loads((ROOT / "data" / v).read_text()) for k, v in FILES.items()}


def _run() -> dict:
    return score_year(_dataset(), 2026, 2026)


def test_composites_match_the_browser_engine():
    run = _run()
    assert abs(run["readiness"]["score"] - EXPECTED["readiness"]) < TOLERANCE
    assert abs(run["maturity"]["score"] - EXPECTED["maturity"]) < TOLERANCE


def test_coverage_and_level_match():
    run = _run()
    assert abs(run["readiness"]["coverage"] - EXPECTED["coverage"]) < 0.005
    assert run["maturityLevel"]["assigned"] == EXPECTED["level"]


def test_every_dimension_matches():
    run = _run()
    for dim, expected in EXPECTED["dimensions"].items():
        actual = run["dimensions"][dim]["score"]
        assert abs(actual - expected) < TOLERANCE, f"{dim}: python {actual:.2f} vs browser {expected}"


def test_data_quality_matches_the_browser_engine():
    """
    The data quality index is computed independently in both engines. It is the
    platform's differentiator, so drift here would be as damaging as drift in
    the composites themselves.
    """
    ds = _dataset()
    run = _run()
    for dim, expected in EXPECTED["dataQuality"].items():
        actual = data_quality(ds, run, dim)["score"]
        assert abs(actual - expected) < 0.05, f"{dim}: python {actual:.2f} vs browser {expected}"


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
