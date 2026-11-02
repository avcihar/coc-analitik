"""
Environment & Application Configuration
=======================================
Loads `COC_API_TOKEN`, `REDIS_URL`, and `CORS_ORIGINS` from the root `.env` file.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Resolve project root and load .env file immediately
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)


def _clean_token(raw: str) -> str:
    """Strip surrounding whitespace and quotes from COC_API_TOKEN."""
    return (raw or "").strip().strip('"').strip("'")


def format_token_preview(token: Optional[str]) -> str:
    """Return the first 10 characters of the token for startup verification."""
    cleaned = _clean_token(token or "")
    if not cleaned:
        return "<EMPTY>"
    return f"{cleaned[:10]}..."


def log_startup_token(token: Optional[str] = None) -> str:
    """
    Log and print the first 10 characters of COC_API_TOKEN to console on startup
    so the operator can verify that `.env` was loaded properly.
    """
    if token is None:
        load_dotenv(dotenv_path=ENV_FILE, override=False)
        token = os.environ.get("COC_API_TOKEN", "")
    preview = format_token_preview(token)
    msg = f"[CoC Auth] .env COC_API_TOKEN loaded (first 10 chars): {preview}"
    logger.info(msg)
    print(msg, flush=True)
    return preview


def _parse_cors_origins(raw: str) -> list[str]:
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    defaults = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]
    for d in defaults:
        if d not in origins:
            origins.append(d)
    return origins


@dataclass(frozen=True)
class Settings:
    coc_api_token: str = field(
        default_factory=lambda: _clean_token(os.environ.get("COC_API_TOKEN", ""))
    )
    coc_api_base: str = field(
        default_factory=lambda: os.environ.get("COC_API_BASE", "https://api.clashofclans.com/v1").strip().rstrip("/")
    )
    redis_url: Optional[str] = field(
        default_factory=lambda: os.environ.get("REDIS_URL", "").strip() or None
    )
    cors_origins: list[str] = field(
        default_factory=lambda: _parse_cors_origins(
            os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,*")
        )
    )


def get_settings() -> Settings:
    """Return current application settings loaded from environment / .env."""
    load_dotenv(dotenv_path=ENV_FILE, override=False)
    if not _clean_token(os.environ.get("COC_API_TOKEN", "")):
        load_dotenv(dotenv_path=ENV_FILE, override=True)
    return Settings()

