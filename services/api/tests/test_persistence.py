"""
Durability of writes.

An approved observation must survive a restart. The data directory is the
sandbox from _sandbox.py, so this never touches the committed data — under
pytest and when run directly alike:

    python3 services/api/tests/test_persistence.py
"""
import _sandbox

DATA_DIR = _sandbox.use()      # must precede the app imports below

import json                    # noqa: E402
import sys                     # noqa: E402

sys.path.insert(0, str(_sandbox.ROOT / "services/api"))
from app.config import config  # noqa: E402
from app.persistence import persist_observation, read_revisions  # noqa: E402
from app.store import store    # noqa: E402


def test_observation_write_is_durable_and_audited():
    assert config.data_dir == DATA_DIR, "the API is not pointed at the sandbox"
    store.load()
    before_score = store.run()["maturity"]["score"]
    current = next((o["value"] for o in store.dataset["observations"]["items"]
                    if o["indicator"] == "RWA10" and o["year"] == 2026), None)
    # Other tests share the sandbox, so don't assume what RWA10 currently holds.
    value = 44 if current != 44 else 45
    payload = {"indicator": "RWA10", "period": "2026", "year": 2026, "value": value,
               "sourceId": "RISA", "verification": "verified", "origin": "source-reported"}
    change = persist_observation(config.data_dir, store.dataset, payload, actor="test")
    store.rescore()
    store.refresh_etag()
    after_score = store.run()["maturity"]["score"]

    on_disk = json.loads((config.data_dir / "observations.json").read_text())
    row = next(o for o in on_disk["items"] if o["indicator"] == "RWA10" and o["year"] == 2026)
    revs = read_revisions(config.data_dir)

    assert before_score != after_score, "a write must change the composite"
    print(f"ok   score recomputed {before_score:.2f} → {after_score:.2f}")
    assert row["value"] == value, "the observation did not reach disk"
    print("ok   persisted to data/observations.json")
    assert revs and revs[0]["action"] == "OBSERVATION_UPSERT" and revs[0]["after"] == value
    print("ok   revision appended to revisions.jsonl")
    assert change["after"] == value and change["before"] == current
    print("ok   before/after reported")

    # survives a restart
    store.load()
    assert store.run()["maturity"]["score"] == after_score, "the write did not survive a reload"
    print("ok   survives a restart")


if __name__ == "__main__":
    test_observation_write_is_durable_and_audited()
    print("\n5 passed, 0 failed")
