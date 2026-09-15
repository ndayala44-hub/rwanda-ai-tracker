"""
Vercel entry point for the FastAPI backend.

Vercel's Python runtime looks for an ASGI application called `app` in this file
and routes matching requests to it. Everything else — the store, the engine, the
routes — is imported unchanged from services/api, so there is one backend, not a
separate serverless fork of it.

Two things differ on Vercel and both are handled here:

  * The filesystem is read-only apart from /tmp, so writes are impossible.
    ADMIN_API_TOKEN is deliberately ignored and the service runs read-only,
    which is the safe default anyway.
  * Requests may arrive rewritten to /api/index, depending on how the platform
    resolves the route, so the path is normalised before FastAPI sees it.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))

# The datasets travel with the function bundle — see includeFiles in vercel.json.
os.environ.setdefault("DATA_DIR", str(ROOT / "data"))
os.environ.setdefault("NODE_ENV", "production")
os.environ.setdefault("CORS_ORIGINS", os.getenv("CORS_ORIGINS", "*"))
# A read-only filesystem cannot honour a durable write, so refuse them outright
# rather than accept a change that would silently vanish.
os.environ["ADMIN_API_TOKEN"] = ""

from app.main import app as fastapi_app  # noqa: E402


class PathNormaliser:
    """
    Restore the original request path when the platform rewrites it.

    A rewrite of /api/(.*) to /api/index would otherwise present every request
    to FastAPI as /api/index, and every route would 404.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http" and scope.get("path", "").startswith("/api/index"):
            original = scope.get("headers") and dict(
                (k.decode(), v.decode()) for k, v in scope["headers"]
            ) or {}
            forwarded = original.get("x-vercel-original-path") or original.get("x-forwarded-uri")
            if forwarded:
                scope = {**scope, "path": forwarded.split("?")[0], "raw_path": forwarded.encode()}
            else:
                # Fall back to the bootstrap payload, which is what the
                # dashboard asks for on load.
                scope = {**scope, "path": "/api/bootstrap"}
        return await self.inner(scope, receive, send)


app = PathNormaliser(fastapi_app)
