"""
Durability of writes.

An approved observation must survive a restart. This test works on a copy of the
dataset, so it never touches the committed data.

    python3 services/api/tests/test_persistence.py
"""
import json, os, shutil, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
tmp = Path(tempfile.mkdtemp())
shutil.copytree(ROOT / "data", tmp / "data")
os.environ["DATA_DIR"] = str(tmp / "data")
sys.path.insert(0, str(ROOT / "services/api"))
from app.store import store
from app.persistence import persist_observation, read_revisions
from app.config import config

store.load()
before_score = store.run()["maturity"]["score"]
payload = {"indicator": "RWA10", "period": "2026", "year": 2026, "value": 44,
           "sourceId": "RISA", "verification": "verified", "origin": "source-reported"}
change = persist_observation(config.data_dir, store.dataset, payload, actor="test")
store.rescore(); store.refresh_etag()
after_score = store.run()["maturity"]["score"]

on_disk = json.loads((tmp / "data/observations.json").read_text())
row = next(o for o in on_disk["items"] if o["indicator"] == "RWA10" and o["year"] == 2026)
revs = read_revisions(config.data_dir)

assert before_score != after_score, "a write must change the composite"
print(f"ok   score recomputed {before_score:.2f} → {after_score:.2f}")
assert row["value"] == 44, "the observation did not reach disk"
print("ok   persisted to data/observations.json")
assert revs and revs[0]["action"] == "OBSERVATION_UPSERT" and revs[0]["after"] == 44
print("ok   revision appended to revisions.jsonl")
assert change["after"] == 44 and change["before"] is not None
print("ok   before/after reported")

# survives a restart
store.load()
assert store.run()["maturity"]["score"] == after_score, "the write did not survive a reload"
print("ok   survives a restart")
shutil.rmtree(tmp)
print("\n5 passed, 0 failed")
