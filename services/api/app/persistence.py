"""
Durable writes.

The previous implementation mutated the in-memory dataset and told the caller to
commit the change by hand. That is not what the endpoint appeared to do, and a
restart silently discarded an approved observation.

Writes are now durable and auditable:

  * the observation is written back to data/observations.json atomically —
    temp file, fsync, rename — so a crash mid-write cannot truncate the dataset;
  * every change is appended to data/revisions.jsonl, which is append-only and
    never rewritten, so the full history survives even if a value is later
    corrected;
  * Git remains the provenance record. The JSON files stay the source of truth,
    so a change made through the API shows up as a reviewable diff.
"""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REVISIONS = "revisions.jsonl"


class ReadOnlyDataDirectory(RuntimeError):
    """Raised where the dataset cannot be written — a serverless deployment, or
    a container with the data volume mounted read-only. Better to refuse the
    write than to accept a change that quietly disappears."""


def atomic_write_json(path: Path, payload: Any) -> None:
    """Write to a temp file in the same directory, fsync, then rename."""
    if not os.access(path.parent, os.W_OK):
        raise ReadOnlyDataDirectory(
            f"{path.parent} is not writable, so this change cannot be persisted. "
            "On a read-only deployment the service should run without ADMIN_API_TOKEN, "
            "and contributions should go through the repository instead.")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)          # atomic on POSIX and Windows
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def append_revision(data_dir: Path, record: dict) -> None:
    """Append-only revision log. Never rewritten, never compacted in place."""
    line = json.dumps({"at": datetime.now(timezone.utc).isoformat(), **record}, ensure_ascii=False)
    with open(data_dir / REVISIONS, "a", encoding="utf-8") as fh:
        fh.write(line + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def read_revisions(data_dir: Path, limit: int = 200) -> list[dict]:
    path = data_dir / REVISIONS
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    out = []
    for line in reversed(lines[-limit * 2:]):
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
        if len(out) >= limit:
            break
    return out


def persist_observation(data_dir: Path, dataset: dict, payload: dict, actor: str) -> dict:
    """
    Upsert an observation and write it through to disk.

    Returns the before/after pair so the caller can report what changed rather
    than simply confirming success.
    """
    items = dataset["observations"]["items"]
    existing = next((o for o in items
                     if o["indicator"] == payload["indicator"] and o["year"] == payload["year"]), None)
    before = dict(existing) if existing else None

    if existing:
        existing.update(payload)
    else:
        items.append(payload)

    items.sort(key=lambda o: (o["indicator"], o["year"]))
    atomic_write_json(data_dir / "observations.json", dataset["observations"])
    append_revision(data_dir, {
        "action": "OBSERVATION_UPSERT",
        "indicator": payload["indicator"], "year": payload["year"],
        "before": (before or {}).get("value"), "after": payload.get("value"),
        "origin": payload.get("origin"), "sourceId": payload.get("sourceId"),
        "verification": payload.get("verification"), "actor": actor,
    })
    return {"before": (before or {}).get("value"), "after": payload.get("value")}
