"""Configuration. Everything comes from the environment; nothing secret is committed."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _csv(name: str, default: str) -> list[str]:
    return [s.strip() for s in os.getenv(name, default).split(",") if s.strip()]


@dataclass(frozen=True)
class Config:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "4010"))
    env: str = os.getenv("NODE_ENV", os.getenv("ENV", "development"))
    data_dir: Path = Path(os.getenv("DATA_DIR", "./data")).resolve()
    cors_origins: list[str] = field(default_factory=lambda: _csv("CORS_ORIGINS", "http://localhost:4000"))
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "300"))
    #: Unset means the service runs strictly read-only. That is the safe default,
    #: so a misconfigured deployment fails closed rather than open.
    admin_token: str = os.getenv("ADMIN_API_TOKEN", "")
    cycle: int = int(os.getenv("CYCLE", "2026"))
    first_year: int = int(os.getenv("FIRST_YEAR", "2019"))

    @property
    def write_enabled(self) -> bool:
        return len(self.admin_token) >= 16


config = Config()
