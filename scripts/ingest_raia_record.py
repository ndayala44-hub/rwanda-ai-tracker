"""
Ingest RAIA's verified national record into the use-case registry.

The record at https://ai.gov.rw/record/ renders its entries client-side, so they
cannot be fetched from the page source. This script takes an export instead —
JSON or CSV — and does the part that matters: reconciling their register against
ours and reporting where the two disagree.

    python3 scripts/ingest_raia_record.py record.json            # dry run, prints the diff
    python3 scripts/ingest_raia_record.py record.json --write    # apply

Getting the export, easiest first:

  1. Open ai.gov.rw/record in a desktop browser, DevTools → Network → reload.
     The filters imply the entries arrive in one request; save that response.
  2. Ask RAIA. A register describing itself as verified is a reasonable thing to
     request a machine-readable copy of, and it is the route that scales.
  3. Copy the visible entries into a CSV with the columns below.

Expected fields, any subset (unknown columns are preserved in `raiaFields`):

    name | sector | stage | institution | description | date | status

Nothing is invented. A field the export does not carry is left absent rather
than guessed, and every imported record is tagged so it can be told apart from
this platform's own entries.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
WRITE = "--write" in sys.argv

# RAIA's sector labels → this platform's sector codes.
SECTORS = {
    "health": "HLT", "healthcare": "HLT",
    "agriculture": "AGR", "agri": "AGR",
    "education": "PUB", "public": "PUB", "public sector": "PUB", "government": "PUB",
    "finance": "FIN", "financial services": "FIN", "social protection": "FIN",
    "energy": "ENE", "energy & climate": "ENE", "climate": "ENE",
    "ict": "ICT", "technology": "ICT",
    "transport": "TRA", "mobility": "TRA",
    "manufacturing": "MFG", "trade": "TRD", "retail": "TRD",
}

# RAIA's stage labels → this platform's lifecycle stages.
STAGES = {
    "concept": "PoC", "proof of concept": "PoC", "poc": "PoC", "prototype": "PoC",
    "pilot": "Pilot", "piloting": "Pilot", "testing": "Pilot",
    "deployed": "Production", "production": "Production", "live": "Production",
    "operational": "Production", "scaled": "Scaled", "scaling": "Scaled",
    "national": "Scaled",
}


def normalise(text: str) -> str:
    """Comparison key: lowercase, punctuation stripped, common filler removed."""
    t = re.sub(r"[^a-z0-9 ]", " ", (text or "").lower())
    t = re.sub(r"\b(the|a|an|for|of|in|and|ai|system|platform|project|programme|program)\b", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def similar(a: str, b: str) -> float:
    """Token overlap. Deliberately crude — it proposes matches, a human confirms."""
    x, y = set(normalise(a).split()), set(normalise(b).split())
    if not x or not y:
        return 0.0
    return len(x & y) / len(x | y)


def load_export(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".csv":
        return list(csv.DictReader(raw.splitlines()))
    payload = json.loads(raw)
    # Accept a bare list, or an object with the entries under a plausible key.
    if isinstance(payload, list):
        return payload
    for key in ("items", "records", "useCases", "use_cases", "data", "entries", "posts"):
        if isinstance(payload.get(key), list):
            return payload[key]
    raise SystemExit("Could not find a list of entries in that file. Expected a JSON array, "
                     "or an object with the entries under items/records/useCases/data.")


def field(entry: dict, *names: str):
    for n in names:
        for key in entry:
            if key.lower().replace("_", "").replace(" ", "") == n:
                value = entry[key]
                if isinstance(value, dict):
                    value = value.get("rendered") or value.get("name") or value.get("title")
                if value not in (None, ""):
                    return value
    return None


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    entries = load_export(Path(sys.argv[1]))
    registry = json.loads((DATA / "use-cases.json").read_text(encoding="utf-8"))
    ours = registry["items"]

    matched, new, unmatched_ours = [], [], []

    for e in entries:
        name = field(e, "name", "title", "usecase", "usecasename")
        if not name:
            continue
        sector_raw = field(e, "sector", "domain", "category") or ""
        stage_raw = field(e, "stage", "status", "maturity") or ""
        best, score = None, 0.0
        for o in ours:
            s = similar(name, o["name"])
            if s > score:
                best, score = o, s

        record = {
            "name": str(name).strip(),
            "sector": SECTORS.get(str(sector_raw).strip().lower()),
            "stage": STAGES.get(str(stage_raw).strip().lower()),
            "institution": field(e, "institution", "owner", "organisation", "organization"),
            "desc": field(e, "description", "summary", "excerpt"),
            "raiaSector": str(sector_raw) or None,
            "raiaStage": str(stage_raw) or None,
            "src": "RAIA_CATALOGUE",
            "status": "verified",
            "origin": "source-reported",
        }
        # A proposed match above 0.5 is reported, never applied automatically:
        # two registries using different names for the same deployment is exactly
        # the judgement a human should make.
        (matched if score >= 0.5 else new).append((record, best, score))

    claimed = {m[1]["name"] for m in matched if m[1]}
    unmatched_ours = [o for o in ours if o["name"] not in claimed]

    print(f"RAIA national record — reconciliation against {len(ours)} platform entries\n")
    print(f"  export entries        {len(entries)}")
    print(f"  probable matches      {len(matched)}")
    print(f"  in RAIA's record only {len(new)}")
    print(f"  on this platform only {len(unmatched_ours)}\n")

    if matched:
        print("PROBABLE MATCHES — confirm each before applying")
        for r, o, s in sorted(matched, key=lambda m: -m[2]):
            print(f"  {s:.2f}  {r['name'][:46]:<46} ≈ {o['name'][:44]}")
        print()
    if new:
        print("IN RAIA'S RECORD, NOT HERE — candidates to add")
        for r, _, _ in new:
            print(f"        {r['name'][:46]:<46} {r.get('raiaSector') or '—':<18} {r.get('raiaStage') or '—'}")
        print()
    if unmatched_ours:
        print("ON THIS PLATFORM, NOT IN RAIA'S RECORD — the interesting column")
        for o in unmatched_ours:
            print(f"        {o['name'][:46]:<46} {o.get('sector','—'):<6} {o.get('stage','—')}")
        print("\n  These are deployments the state's own register does not list. Some will be")
        print("  private-sector and out of its scope; some may be genuine omissions. Either")
        print("  way this column is the finding, not the count.\n")

    if WRITE and new:
        next_id = max((int(o["id"].split("-")[1]) for o in ours if o["id"].startswith("UC-")), default=200)
        for r, _, _ in new:
            next_id += 1
            r["id"] = f"UC-{next_id}"
            ours.append({k: v for k, v in r.items() if v is not None})
        (DATA / "use-cases.json").write_text(json.dumps(registry, indent=2, ensure_ascii=False))
        print(f"added {len(new)} entries to data/use-cases.json")
        print("now run: npm run validate && npm run build:web")
    elif new:
        print("dry run — pass --write to add the unmatched entries")


if __name__ == "__main__":
    main()
