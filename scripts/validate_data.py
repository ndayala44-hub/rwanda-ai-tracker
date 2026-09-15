"""
Dataset validator. Run before committing data changes, and in CI.

    npm run validate        (or: python3 scripts/validate_data.py)

Shares its rules with the API, so what CI enforces and what the service accepts
can never diverge.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))
from app.store import FILES  # noqa: E402
from app.validation import validate_dataset  # noqa: E402

DATA = Path(os.getenv("DATA_DIR", ROOT / "data")).resolve()
dataset = {key: json.loads((DATA / name).read_text(encoding="utf-8")) for key, name in FILES.items()}

obs = dataset["observations"]["items"]
origins = Counter(o.get("origin", "unclassified") for o in obs)
sources = dataset["sources"]["items"]
verified = sum(1 for s in sources if s.get("verification") == "verified")

print(f"Rwanda AI Tracker — dataset validation ({DATA})")
print(f"  {len(dataset['indicators']['items'])} indicators")
print(f"  {len(obs)} observations "
      f"({origins.get('source-reported', 0)} source-reported, {origins.get('demo', 0)} demo)")
print(f"  {len(sources)} sources ({verified} independently verified)")
print(f"  {len(dataset['useCases']['items'])} use cases")
print(f"  {len(dataset['organisations']['items'])} organisations")
print(f"  {len(dataset['benchmarks']['series'])} comparator series")

errors = validate_dataset(dataset)
if errors:
    print(f"\n{len(errors)} problem(s):")
    for e in errors:
        print("  ✗ " + e)
    sys.exit(1)

share = origins.get("source-reported", 0) / max(1, len(obs))
print(f"\n✓ dataset is valid")
print(f"  {share:.0%} of observations are reported by a named source; "
      f"the remainder are demo values and are labelled as such in the dashboard.")
