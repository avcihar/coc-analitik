"""
Clash of Clans API Client
=========================
Resilient HTTP client for the official Clash of Clans API.

Features:
- Bearer token authentication
- Exponential backoff on HTTP 429 Rate Limit
- Redis-backed Circuit Breaker for HTTP 503 Maintenance Break
"""

import asyncio
import os
import json
import logging
from pathlib import Path
from typing import Any, Optional, Dict
from urllib.parse import quote, unquote

from dotenv import load_dotenv
import httpx
import redis.asyncio as aioredis
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    RetryError,
)

# Force-load root .env so COC_API_TOKEN is always read from the project root .env file
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)

logger = logging.getLogger(__name__)

DEFAULT_COC_API_BASE_URL = "https://api.clashofclans.com/v1"
COC_API_BASE_URL = os.environ.get("COC_API_BASE", DEFAULT_COC_API_BASE_URL).strip().rstrip("/")
CIRCUIT_BREAKER_KEY = "coc:api:circuit_breaker"
CIRCUIT_BREAKER_TTL = 300  # 5 minutes


class CoCAPIException(Exception):
    """Base exception for CoC API errors."""
    pass


class AuthenticationError(CoCAPIException):
    """Raised when the CoC API rejects the Bearer token or IP address (HTTP 403)."""
    pass


class RateLimitError(CoCAPIException):
    """Raised when the API rate limit is exceeded (HTTP 429)."""
    pass


class MaintenanceBreakError(CoCAPIException):
    """Raised when the API is in maintenance (HTTP 503)."""
    pass


class CircuitBreakerOpenError(CoCAPIException):
    """Raised when the circuit breaker is open, preventing requests."""
    pass


class NotFoundError(CoCAPIException):
    """Raised when the requested player or clan resource is not found (HTTP 404)."""
    pass


def sanitize_tag(tag: str) -> str:
    """
    Strip any leading '#', '%23', or URL-encoded prefixes and return the clean
    uppercase alphanumeric CoC tag without '#' (e.g. 'P89PCUPUQ', '#P89PCUPUQ',
    or '%23P89PCUPUQ' -> 'P89PCUPUQ').
    """
    decoded = unquote(str(tag or "")).strip().upper()
    cleaned = decoded.lstrip("#").strip()
    while cleaned.startswith("%23") or cleaned.startswith("#"):
        if cleaned.startswith("%23"):
            cleaned = cleaned[3:].strip()
        elif cleaned.startswith("#"):
            cleaned = cleaned.lstrip("#").strip()
    return cleaned


def _encode_tag(tag: str) -> str:
    """
    Standardize any CoC player, clan, or war tag (whether passed as '#P89PCUPUQ',
    'P89PCUPUQ', or '%23P89PCUPUQ') using `urllib.parse.quote(f"#{cleaned}")` so
    it is ALWAYS sent to the official Supercell API as '%23P89PCUPUQ'.
    """
    cleaned = sanitize_tag(tag)
    return quote(f"#{cleaned}", safe="")


def _is_rate_limit(exception: BaseException) -> bool:
    return isinstance(exception, RateLimitError)


class CoCAPIClient:
    def __init__(
        self,
        api_token: Optional[str] = None,
        redis_client: Optional[aioredis.Redis] = None,
        api_base_url: Optional[str] = None,
    ):
        raw_token = (api_token or "").strip().strip('"').strip("'")
        if not raw_token:
            load_dotenv(dotenv_path=ENV_FILE, override=True)
            raw_token = os.environ.get("COC_API_TOKEN", "").strip().strip('"').strip("'")

        self.api_token = raw_token
        self.redis = redis_client
        effective_base = (api_base_url or os.environ.get("COC_API_BASE") or COC_API_BASE_URL).strip().rstrip("/")
        self.api_base = f"{effective_base}/"
        # Bounded concurrency across all CoC API requests (max 10 concurrent HTTP requests)
        self._semaphore = asyncio.Semaphore(10)

        token_preview = f"{self.api_token[:10]}..." if self.api_token else "<EMPTY>"
        logger.info(
            "[CoCAPIClient] Initialized with COC_API_BASE: %s (token prefix: %s)",
            effective_base,
            token_preview,
        )

        self.client = httpx.AsyncClient(
            base_url=self.api_base.rstrip("/"),
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "Accept": "application/json",
            },
            timeout=15.0,
        )

    async def _check_circuit_breaker(self):
        """Check if the global circuit breaker is open."""
        if self.redis is None:
            return
        try:
            is_open = await self.redis.exists(CIRCUIT_BREAKER_KEY)
        except (aioredis.RedisError, OSError):
            return
        if is_open:
            raise CircuitBreakerOpenError(
                "CoC API Circuit Breaker is OPEN due to ongoing maintenance."
            )

    async def _open_circuit_breaker(self):
        """Open the global circuit breaker for a set duration."""
        if self.redis is None:
            return
        try:
            await self.redis.set(CIRCUIT_BREAKER_KEY, "OPEN", ex=CIRCUIT_BREAKER_TTL)
        except (aioredis.RedisError, OSError):
            pass

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    async def request(self, method: str, endpoint: str, **kwargs) -> Any:
        """
        Execute an HTTP request with retries, tag URL-encoding, bounded concurrency, and circuit breaking.
        """
        await self._check_circuit_breaker()

        # Standardize any raw '#' in endpoint paths to '%23' before sending to Supercell API
        if "#" in endpoint:
            endpoint = endpoint.replace("#", "%23")

        # Ensure endpoint starts with a single leading slash
        request_endpoint = f"/{endpoint.lstrip('/')}"

        try:
            async with self._semaphore:
                response = await self.client.request(method, request_endpoint, **kwargs)
        except httpx.RequestError as e:
            raise CoCAPIException(f"Network error during request to {endpoint}: {e}")

        if response.status_code == 429:
            raise RateLimitError("Rate limit exceeded.")

        if response.status_code == 503:
            await self._open_circuit_breaker()
            raise MaintenanceBreakError("CoC API is in maintenance break.")

        if response.status_code == 404:
            raise NotFoundError(f"Resource not found: {endpoint}")

        if response.status_code == 403:
            token_prefix = f"{self.api_token[:10]}..." if self.api_token else "<EMPTY>"
            raise AuthenticationError(
                "API anahtarı bu IP için yetkili değil, anahtarın izinli IP'sini kontrol edin."
            )

        if not response.is_success:
            raise CoCAPIException(
                f"API Request Failed: {response.status_code} {response.text}"
            )

        return response.json()

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Helper for GET requests."""
        return await self.request("GET", endpoint, params=params)

    async def get_player(self, player_tag: str) -> Any:
        """GET /players/%23{tag} — Fetch full player profile by player tag."""
        clean_tag = _encode_tag(player_tag)
        return await self.get(f"/players/{clean_tag}")

    async def get_player_battlelog(self, player_tag: str) -> Any:
        """GET /players/%23{tag}/battlelog — Fetch a player's ranked/multiplayer battle log."""
        clean_tag = _encode_tag(player_tag)
        return await self.get(f"/players/{clean_tag}/battlelog")

    async def get_player_leaguehistory(self, player_tag: str) -> Any:
        """GET /players/%23{tag}/leaguehistory — Fetch a player's Legend/ranked league history."""
        clean_tag = _encode_tag(player_tag)
        return await self.get(f"/players/{clean_tag}/leaguehistory")

    async def get_clan(self, clan_tag: str) -> Any:
        """GET /clans/%23{tag} — Fetch full clan details and member list by clan tag."""
        clean_tag = _encode_tag(clan_tag)
        return await self.get(f"/clans/{clean_tag}")

    async def get_clan_members(self, clan_tag: str) -> Any:
        """GET /clans/%23{tag}/members — Fetch clan member list by clan tag."""
        clean_tag = _encode_tag(clan_tag)
        return await self.get(f"/clans/{clean_tag}/members")

    async def get_clan_current_war(self, clan_tag: str) -> Any:
        """GET /clans/%23{tag}/currentwar — Fetch current clan war details by clan tag."""
        clean_tag = _encode_tag(clan_tag)
        return await self.get(f"/clans/{clean_tag}/currentwar")

    async def get_clan_warlog(self, clan_tag: str) -> Any:
        """GET /clans/%23{tag}/warlog — Fetch clan war log by clan tag."""
        clean_tag = _encode_tag(clan_tag)
        return await self.get(f"/clans/{clean_tag}/warlog")

    async def search_clans(
        self,
        name: str,
        limit: int = 20,
        *,
        min_members: Optional[int] = None,
        min_clan_level: Optional[int] = None,
        after: Optional[str] = None,
    ) -> Any:
        """GET /clans?name={name}&limit={limit} — Search clans by name and optional filters."""
        params: Dict[str, Any] = {"name": name, "limit": limit}
        if min_members is not None:
            params["minMembers"] = min_members
        if min_clan_level is not None:
            params["minClanLevel"] = min_clan_level
        if after:
            params["after"] = after
        return await self.get("/clans", params=params)

    async def get_clan_league_group(self, clan_tag: str) -> Any:
        """GET /clans/%23{tag}/currentwar/leaguegroup — Fetch current CWL group for a clan."""
        clean_tag = _encode_tag(clan_tag)
        return await self.get(f"/clans/{clean_tag}/currentwar/leaguegroup")

    async def get_cwl_war(self, war_tag: str) -> Any:
        """GET /clanwarleagues/wars/%23{war_tag} — Fetch CWL war details by war tag."""
        clean_tag = _encode_tag(war_tag)
        return await self.get(f"/clanwarleagues/wars/{clean_tag}")

    async def get_global_player_rankings(
        self,
        location_id: str | int = "global",
        limit: int = 200,
        after: Optional[str] = None,
    ) -> Any:
        """
        GET /locations/{location_id}/rankings/players — Fetch player rankings for a location
        (defaults to `location_id="global"`, `limit=200`).
        """
        if isinstance(location_id, int):
            actual_limit = location_id
            actual_location = "global"
        else:
            actual_location = str(location_id or "global").strip()
            actual_limit = limit

        params: Dict[str, Any] = {"limit": actual_limit}
        if after:
            params["after"] = after
        return await self.get(f"/locations/{actual_location}/rankings/players", params=params)

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()
