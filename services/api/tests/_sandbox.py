"""
Point the API at a throw-away copy of data/ — before `app` is imported.

app/config.py reads DATA_DIR once, when the module is first imported, and every
other module holds that value. Whichever test module imports `app` first
therefore decides, for the whole process, where writes land. The suite used to
default that to the committed ./data, so the HTTP tests (POST /api/observations)
rewrote data/observations.json and appended to data/revisions.jsonl; every later
step, and every re-run, then ran against a different dataset.

The sandbox is created once per process and removed on exit. Calling use()
again is a no-op, so conftest.py (pytest) and the script entry points can both
call it without creating a second copy.
"""
from __future__ import annotations

import atexit
import os
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MARKER = "TRACKER_TEST_SANDBOX"


def use() -> Path:
    """Return the sandboxed data directory, creating it on first call."""
    if os.environ.get(MARKER):
        return Path(os.environ["DATA_DIR"])
    tmp = Path(tempfile.mkdtemp(prefix="tracker-data-"))
    shutil.copytree(ROOT / "data", tmp / "data")
    os.environ["DATA_DIR"] = str(tmp / "data")
    os.environ[MARKER] = "1"
    atexit.register(shutil.rmtree, tmp, ignore_errors=True)
    return tmp / "data"
