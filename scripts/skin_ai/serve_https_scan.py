"""Allowlisted Android research pilot with HTTPS and Supabase Auth."""
from __future__ import annotations

import argparse
import asyncio
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from uuid import UUID

import httpx
import uvicorn
from PIL import Image
from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect, Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from run_experiment import load_model
from serve_local_scan import MAX_BYTES, MAX_PIXELS, decode_photo, research_result

CONSENT_VERSION = "research-https-v1"
COOLDOWN_SECONDS = 5


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    publishable_key: str
    allowed_users: frozenset[UUID]
    cache_dir: Path

    @classmethod
    def from_environment(cls, cache_dir: Path) -> Settings:
        url = httpx.URL(os.environ.get("SUPABASE_URL", ""))
        key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
        if (url.scheme != "https" or not url.host or url.userinfo or url.raw_path != b"/"
                or url.fragment or not key.startswith("sb_publishable_")):
            raise ValueError("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for the pilot project")
        users = frozenset(UUID(value.strip()) for value in os.environ.get("SKIN_SCAN_PILOT_USER_IDS", "").split(",") if value.strip())
        if not users:
            raise ValueError("Set SKIN_SCAN_PILOT_USER_IDS to the UUIDs of authorized testers")
        return cls(str(url), key, users, cache_dir)


def reply(body, status=200):
    return JSONResponse(body, status_code=status, headers={"Cache-Control": "no-store"})


def failure(code, status):
    return reply({"error": code}, status)


async def authorize(request: Request, settings: Settings) -> UUID | JSONResponse:
    if request.scope["scheme"] != "https" or request.headers.get("origin") is not None:
        return failure("pilot_forbidden", 403)
    if request.headers.get("x-skincycle-consent") != CONSENT_VERSION:
        return failure("pilot_forbidden", 403)
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer ") or not 7 < len(authorization) <= 8192:
        return failure("unauthorized", 401)
    try:
        response = await request.app.state.auth.get(
            "/auth/v1/user", headers={"apikey": settings.publishable_key, "Authorization": authorization}
        )
    except httpx.HTTPError:
        return failure("auth_unavailable", 503)
    if response.status_code in (401, 403):
        return failure("unauthorized", 401)
    if response.status_code != 200:
        return failure("auth_unavailable", 503)
    try:
        user = response.json()
        user_id = UUID(user["id"])
    except (AttributeError, KeyError, TypeError, ValueError):
        return failure("auth_unavailable", 503)
    if user_id not in settings.allowed_users or user.get("is_anonymous") is True:
        return failure("pilot_forbidden", 403)
    return user_id


def analyze(data, processor, model):
    try:
        photo = decode_photo(data)
    except ValueError as error:
        code = str(error)
        return failure(code if code in {"invalid_dimensions", "poor_lighting"} else "invalid_image", 422)
    except (Image.DecompressionBombError, OSError):
        return failure("invalid_image", 422)
    with photo:
        try:
            return reply(research_result(photo, processor, model))
        except Exception:
            return failure("inference_failed", 500)


def create_app(settings: Settings):
    @asynccontextmanager
    async def lifespan(app):
        Image.MAX_IMAGE_PIXELS = MAX_PIXELS
        app.state.model = await run_in_threadpool(load_model, False, settings.cache_dir)
        app.state.inference = asyncio.Lock()
        app.state.last_scan = {}
        async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=3, trust_env=False) as auth:
            app.state.auth = auth
            yield

    async def health(request: Request):
        user = await authorize(request, settings)
        if isinstance(user, JSONResponse):
            return user
        return reply({"mode": "research", "ready": True})

    async def scan(request: Request):
        user = await authorize(request, settings)
        if isinstance(user, JSONResponse):
            return user
        if request.headers.get("content-type") != "image/jpeg":
            return failure("invalid_image", 415)
        length = request.headers.get("content-length")
        if length is not None and (len(length) > 8 or not length.isascii() or not length.isdigit()
                                   or not 0 < int(length) <= MAX_BYTES):
            return failure("invalid_image", 413)

        state = request.app.state
        last_scan = state.last_scan.get(user)
        if last_scan is not None and monotonic() - last_scan < COOLDOWN_SECONDS:
            return failure("rate_limited", 429)
        if state.inference.locked():
            return failure("busy", 503)
        async with state.inference:
            data = bytearray()
            try:
                async with asyncio.timeout(15):
                    async for chunk in request.stream():
                        if len(data) + len(chunk) > MAX_BYTES:
                            return failure("invalid_image", 413)
                        data.extend(chunk)
            except (ClientDisconnect, TimeoutError):
                return failure("invalid_image", 408)
            if not data or (length is not None and len(data) != int(length)):
                return failure("invalid_image", 422)
            state.last_scan[user] = monotonic()
            return await run_in_threadpool(analyze, data, *state.model)

    return Starlette(routes=[Route("/health", health), Route("/scan", scan, methods=["POST"])], lifespan=lifespan)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cert", required=True, type=Path, help="TLS certificate chain PEM")
    parser.add_argument("--key", required=True, type=Path, help="TLS private key PEM")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8443, type=int)
    parser.add_argument("--cache-dir", type=Path, default=Path(".venv-skin-ai/hf-cache"))
    args = parser.parse_args()
    try:
        settings = Settings.from_environment(args.cache_dir)
    except (httpx.InvalidURL, ValueError) as error:
        parser.error(str(error))
    uvicorn.run(create_app(settings), host=args.host, port=args.port, ssl_certfile=str(args.cert),
                ssl_keyfile=str(args.key), proxy_headers=False, access_log=False, limit_concurrency=8)


if __name__ == "__main__":
    main()
