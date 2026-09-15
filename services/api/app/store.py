"""
Dataset store.

Three responsibilities and nothing else: read the versioned JSON in DATA_DIR,
run the scoring engine over it, and reload when a file changes on disk.

Scores are computed once per load rather than per request. The dataset is a few
hundred kilobytes and scores in milliseconds, so there is no cache-invalidation
problem worth the complexity of solving.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import config
from .engine import ENGINE_VERSION, score_series, score_year, sensitivity

FILES: dict[str, str] = {
    "sources": "sources.json",
    "organisations": "organisations.json",
    "sectors": "sectors.json",
    "geography": "geography.json",
    "framework": "framework.json",
    "indicators": "indicators.json",
    "observations": "observations.json",
    "journey": "journey.json",
    "policies": "policies.json",
    "glossary": "glossary.json",
    "useCases": "use-cases.json",
    "contributions": "contributions.json",
    "economicSizing2022": "economic-sizing-2022.json",
    "landscape2026": "landscape-2026.json",
    "benchmarks": "benchmarks.json",
    "proposedIndicators": "proposed-indicators.json",
}


class Store:
    def __init__(self) -> None:
        self.dataset: dict[str, Any] = {}
        self.runs: dict[int, dict] = {}
        self.etag: str = ""
        self.loaded_at: datetime = datetime.now(timezone.utc)
        self._mtimes: dict[str, float] = {}

    def load(self) -> None:
        dataset: dict[str, Any] = {}
        for key, filename in FILES.items():
            path = config.data_dir / filename
            dataset[key] = json.loads(path.read_text(encoding="utf-8"))
            self._mtimes[filename] = path.stat().st_mtime
        self.dataset = dataset
        self.runs = score_series(dataset, config.first_year, config.cycle)
        self.loaded_at = datetime.now(timezone.utc)
        payload = json.dumps({"i": dataset["indicators"], "o": dataset["observations"],
                              "f": dataset["framework"]}, sort_keys=True)
        self.etag = hashlib.sha256(payload.encode()).hexdigest()[:16]

    def reload_if_stale(self) -> bool:
        """Reload only when a data file has actually changed, so editing a JSON
        file is enough to update the platform."""
        for filename in FILES.values():
            if (config.data_dir / filename).stat().st_mtime != self._mtimes.get(filename):
                self.load()
                return True
        return False

    def run(self, year: int | None = None) -> dict:
        year = year or config.cycle
        if year not in self.runs:
            raise KeyError(f"No scoring run for {year}")
        return self.runs[year]

    def sensitivity(self, membership: str) -> list[dict]:
        return sensitivity(self.dataset, config.cycle, membership)

    def rescore(self) -> None:
        self.runs = score_series(self.dataset, config.first_year, config.cycle)

    def refresh_etag(self) -> None:
        """Recompute the cache tag after a write, so clients see the change."""
        payload = json.dumps({"i": self.dataset["indicators"], "o": self.dataset["observations"],
                              "f": self.dataset["framework"]}, sort_keys=True)
        self.etag = hashlib.sha256(payload.encode()).hexdigest()[:16]
        self._mtimes["observations.json"] = (config.data_dir / "observations.json").stat().st_mtime

    def provenance(self) -> dict:
        """
        How much of what is published is actually reported by a named source.
        Surfaced in the dashboard rather than buried: a platform whose whole
        proposition is provenance has to be candid about its own.
        """
        obs = self.dataset["observations"]["items"]
        by_origin: dict[str, int] = {}
        for o in obs:
            by_origin[o.get("origin", "unclassified")] = by_origin.get(o.get("origin", "unclassified"), 0) + 1
        sources = self.dataset["sources"]["items"]
        return {
            "observations": {"total": len(obs), "byOrigin": by_origin,
                             "sourceReportedShare": round(by_origin.get("source-reported", 0) / max(1, len(obs)), 4)},
            "sources": {"total": len(sources),
                        "verified": sum(1 for s in sources if s.get("verification") == "verified"),
                        "byClass": {c: sum(1 for s in sources if s.get("provenanceClass") == c)
                                    for c in sorted({s.get("provenanceClass", "unclassified") for s in sources})}},
        }

    def meta(self) -> dict:
        return {
            "platform": "Rwanda AI Tracker",
            "backend": "FastAPI",
            "engineVersion": ENGINE_VERSION,
            "methodologyVersion": self.dataset["framework"]["methodologyVersion"],
            "weightSet": self.dataset["framework"]["weightSet"],
            "cycle": config.cycle,
            "firstYear": config.first_year,
            "indicators": len(self.dataset["indicators"]["items"]),
            "observations": len(self.dataset["observations"]["items"]),
            "sources": len(self.dataset["sources"]["items"]),
            "loadedAt": self.loaded_at.isoformat(),
            "etag": self.etag,
            "writeEnabled": config.write_enabled,
            "provenance": self.provenance(),
        }


store = Store()
