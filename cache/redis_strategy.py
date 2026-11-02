"""
Clash of Clans Analytics Platform — Redis Cache Key Design & TTL Strategy
=========================================================================
This module centralises all Redis key namespacing, TTL constants, and
caching helpers used across the analytics platform.

Key Hierarchy Convention:
    coc:{domain}:{version}:{discriminator}:{...identifiers}

Domains:
    api     – raw CoC official API responses
    cwl     – active CWL war snapshots
    lb      – leaderboard aggregations
    player  – individual player profiles
    session – user/bot session tokens

Version is bumped when the shape of the stored value changes to avoid
poisoning deserialization with stale data after a deployment.
"""

from __future__ import annotations

import json
import time
from datetime import timedelta
from enum import IntEnum
from typing import Any, Optional

import redis.asyncio as aioredis

# ---------------------------------------------------------------------------
# TTL Constants (all values are in seconds)
# ---------------------------------------------------------------------------

class TTL(IntEnum):
    """
    Canonical TTL values for each cache domain.

    Design Rationale
    ----------------
    - COC_API_PLAYER        : CoC API allows ~10 req/s per token; 60 s prevents
                              stampedes while keeping data fresh for dashboards.
    - COC_API_CLAN          : Clan data changes less frequently than player data.
    - COC_API_WAR           : Active war states update every few minutes.
    - CWL_PREP_DAY_WAR      : 6-hour TTL as per requirement — covers the full
                              Prep Day window so we never hit the API again
                              until the battle window opens.
    - CWL_BATTLE_WINDOW_WAR : During battle windows poll more aggressively.
    - COC_API_RAID_WEEKEND  : Weekend raids last 3 days; refresh hourly.
    - LEADERBOARD_HOT       : Hot-path leaderboard (e.g. top-200 global).
    - LEADERBOARD_CLAN      : Per-clan leaderboard, slightly looser TTL.
    - PLAYER_PROFILE        : Enriched profile with hero + equipment details.
    - API_RATE_LIMIT_WINDOW : Sliding window for rate-limit accounting.
    - SEARCH_RESULTS        : Short-lived search result cache.
    """
    COC_API_PLAYER          = 60          # 1 minute
    COC_API_CLAN            = 120         # 2 minutes
    COC_API_WAR             = 180         # 3 minutes  (active war state)
    CWL_PREP_DAY_WAR        = 21_600      # 6 hours    (Prep Day snapshot)
    CWL_BATTLE_WINDOW_WAR   = 300         # 5 minutes  (Battle Day live updates)
    COC_API_RAID_WEEKEND    = 3_600       # 1 hour
    COC_API_LOCATION        = 86_400      # 24 hours   (static location list)
    COC_API_LEAGUE_LIST     = 86_400      # 24 hours   (static league metadata)
    LEADERBOARD_HOT         = 300         # 5 minutes
    LEADERBOARD_CLAN        = 600         # 10 minutes
    PLAYER_PROFILE          = 120         # 2 minutes  (enriched profile)
    API_RATE_LIMIT_WINDOW   = 1           # 1 second   (rolling window counter)
    SEARCH_RESULTS          = 30          # 30 seconds


# ---------------------------------------------------------------------------
# Key Builders
# ---------------------------------------------------------------------------

class CacheKey:
    """
    Typed key builder — every Redis key in the platform must go through here.

    Examples
    --------
    >>> CacheKey.player_profile("ABC123XY")
    'coc:player:v1:profile:ABC123XY'

    >>> CacheKey.cwl_active_war("CLAN999", prep_day=True)
    'coc:cwl:v1:war:CLAN999:prep'
    """

    _PREFIX = "coc"
    _DELIMITER = ":"

    # ---- CoC Official API Responses ----------------------------------------

    @staticmethod
    def api_player(player_tag: str) -> str:
        """Raw CoC API /players/{playerTag} response."""
        return f"coc:api:v1:player:{_normalise_tag(player_tag)}"

    @staticmethod
    def api_clan(clan_tag: str) -> str:
        """Raw CoC API /clans/{clanTag} response."""
        return f"coc:api:v1:clan:{_normalise_tag(clan_tag)}"

    @staticmethod
    def api_clan_members(clan_tag: str) -> str:
        """CoC API /clans/{clanTag}/members."""
        return f"coc:api:v1:clan:{_normalise_tag(clan_tag)}:members"

    @staticmethod
    def api_current_war(clan_tag: str) -> str:
        """CoC API /clans/{clanTag}/currentwar — regular CW only."""
        return f"coc:api:v1:war:{_normalise_tag(clan_tag)}:current"

    @staticmethod
    def api_war_log(clan_tag: str) -> str:
        """CoC API /clans/{clanTag}/warlog."""
        return f"coc:api:v1:war:{_normalise_tag(clan_tag)}:log"

    @staticmethod
    def api_raid_weekend(clan_tag: str) -> str:
        """CoC API /clans/{clanTag}/capitalraidseasons."""
        return f"coc:api:v1:raid:{_normalise_tag(clan_tag)}:weekend"

    @staticmethod
    def api_player_battle_log(player_tag: str) -> str:
        """CoC API /players/{playerTag}/battlelog (Builder Base)."""
        return f"coc:api:v1:player:{_normalise_tag(player_tag)}:battlelog"

    @staticmethod
    def api_locations() -> str:
        """CoC API /locations — static, cached 24 h."""
        return "coc:api:v1:meta:locations"

    @staticmethod
    def api_league_list() -> str:
        """CoC API /leagues — static, cached 24 h."""
        return "coc:api:v1:meta:leagues"

    # ---- CWL (Clan War League) Active War Snapshots -------------------------

    @staticmethod
    def cwl_group(clan_tag: str) -> str:
        """
        CWL group snapshot for a clan.
        /clans/{clanTag}/currentwar/leaguegroup
        """
        return f"coc:cwl:v1:group:{_normalise_tag(clan_tag)}"

    @staticmethod
    def cwl_active_war(clan_tag: str, *, prep_day: bool = False) -> str:
        """
        Active CWL war state snapshot.

        Parameters
        ----------
        clan_tag:
            The clan's tag (with or without #).
        prep_day:
            When True, a 6-hour TTL should be applied (Prep Day snapshot).
            When False (Battle Day), a 5-minute TTL should be applied.

        Key Examples
        ------------
        Prep Day  : coc:cwl:v1:war:CLANTAG:prep
        Battle Day: coc:cwl:v1:war:CLANTAG:battle
        """
        phase = "prep" if prep_day else "battle"
        return f"coc:cwl:v1:war:{_normalise_tag(clan_tag)}:{phase}"

    @staticmethod
    def cwl_war_round(clan_tag: str, round_index: int) -> str:
        """Specific CWL round — /clanwarleagues/wars/{warTag}."""
        return f"coc:cwl:v1:round:{_normalise_tag(clan_tag)}:{round_index}"

    @staticmethod
    def cwl_scout(clan_tag: str) -> str:
        """Full CWL opponent roster & inferred army scout report for a clan."""
        return f"coc:cwl:v1:scout:{_normalise_tag(clan_tag)}"

    # ---- Leaderboards -------------------------------------------------------

    @staticmethod
    def leaderboard_global(strategy: str, *, page: int = 1) -> str:
        """Global leaderboard aggregation page."""
        return f"coc:lb:v1:global:{strategy}:p{page}"

    @staticmethod
    def leaderboard_clan(clan_tag: str, strategy: str) -> str:
        """Per-clan leaderboard."""
        return f"coc:lb:v1:clan:{_normalise_tag(clan_tag)}:{strategy}"

    @staticmethod
    def leaderboard_cwl_group(group_id: str, strategy: str) -> str:
        """CWL group leaderboard."""
        return f"coc:lb:v1:cwlgroup:{group_id}:{strategy}"

    # ---- Player Profile (enriched, not raw API) -----------------------------

    @staticmethod
    def player_profile(player_tag: str) -> str:
        """Enriched player profile with heroes, pets, and equipment."""
        return f"coc:player:v1:profile:{_normalise_tag(player_tag)}"

    # ---- Clan Search --------------------------------------------------------

    @staticmethod
    def clan_search(
        query: str,
        *,
        limit: int = 20,
        min_members: Optional[int] = None,
        min_clan_level: Optional[int] = None,
    ) -> str:
        """Short-lived cache key for /clans?name={query} searches."""
        norm_q = query.strip().lower()
        return f"coc:api:v1:search:clans:{norm_q}:l{limit}:m{min_members}:lvl{min_clan_level}"

    # ---- Rate Limiting ------------------------------------------------------

    @staticmethod
    def rate_limit_token_bucket(api_token_id: str) -> str:
        """Per-token sliding rate-limit counter for CoC API tokens."""
        return f"coc:ratelimit:v1:token:{api_token_id}"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _normalise_tag(tag: str) -> str:
    """Strip leading # or %23 and uppercase the tag for consistent key generation."""
    cleaned = tag.strip().upper()
    if cleaned.startswith("%23"):
        cleaned = cleaned[3:]
    return cleaned.lstrip("#")


# ---------------------------------------------------------------------------
# TTL Resolver — maps a key pattern to its canonical TTL
# ---------------------------------------------------------------------------

_TTL_MAP: dict[str, int] = {
    "coc:api:v1:player:*":              TTL.COC_API_PLAYER,
    "coc:api:v1:clan:*:members":        TTL.COC_API_CLAN,
    "coc:api:v1:clan:*":                TTL.COC_API_CLAN,
    "coc:api:v1:war:*:current":         TTL.COC_API_WAR,
    "coc:api:v1:war:*:log":             TTL.COC_API_CLAN,
    "coc:api:v1:raid:*":                TTL.COC_API_RAID_WEEKEND,
    "coc:api:v1:meta:*":                TTL.COC_API_LOCATION,
    "coc:cwl:v1:war:*:prep":            TTL.CWL_PREP_DAY_WAR,
    "coc:cwl:v1:war:*:battle":          TTL.CWL_BATTLE_WINDOW_WAR,
    "coc:cwl:v1:group:*":               TTL.COC_API_WAR,
    "coc:cwl:v1:round:*":               TTL.COC_API_WAR,
    "coc:lb:v1:global:*":               TTL.LEADERBOARD_HOT,
    "coc:lb:v1:clan:*":                 TTL.LEADERBOARD_CLAN,
    "coc:lb:v1:cwlgroup:*":             TTL.LEADERBOARD_CLAN,
    "coc:player:v1:profile:*":          TTL.PLAYER_PROFILE,
}

LEADERBOARD_TTL_REFERENCE = """
┌──────────────────────────────────────────────────────────────────────────────┐
│  Redis Key Design — TTL Reference Table (CoC Analytics Platform)            │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│  Domain                      │  Key Pattern                  │  TTL          │
├──────────────────────────────┼──────────────────────────────┼───────────────┤
│  Player (raw API)            │  coc:api:v1:player:*          │  60 s         │
│  Clan (raw API)              │  coc:api:v1:clan:*            │  120 s        │
│  Active War (regular CW)     │  coc:api:v1:war:*:current     │  180 s        │
│  CWL — Prep Day snapshot     │  coc:cwl:v1:war:*:prep        │  21,600 s (6h)│
│  CWL — Battle Day snapshot   │  coc:cwl:v1:war:*:battle      │  300 s (5m)   │
│  Raid Weekend                │  coc:api:v1:raid:*            │  3,600 s (1h) │
│  Static API Metadata         │  coc:api:v1:meta:*            │  86,400 s (24h│
│  Global Leaderboard          │  coc:lb:v1:global:*           │  300 s (5m)   │
│  Clan Leaderboard            │  coc:lb:v1:clan:*             │  600 s (10m)  │
│  Enriched Player Profile     │  coc:player:v1:profile:*      │  120 s        │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
"""


# ---------------------------------------------------------------------------
# Generic Cache Helpers
# ---------------------------------------------------------------------------

class CoCRedisCache:
    """
    Async Redis cache helper with built-in JSON serialisation and TTL enforcement.

    Usage
    -----
    cache = CoCRedisCache(redis_client)

    # Cache a raw player API response
    await cache.set(CacheKey.api_player("ABC123"), player_data, ttl=TTL.COC_API_PLAYER)

    # Cache a CWL Prep Day snapshot (6-hour TTL)
    await cache.set(
        CacheKey.cwl_active_war("CLAN99", prep_day=True),
        war_snapshot,
        ttl=TTL.CWL_PREP_DAY_WAR,
    )

    # Retrieve with automatic JSON deserialisation
    player = await cache.get(CacheKey.api_player("ABC123"))
    """

    def __init__(self, client: Optional[aioredis.Redis] = None) -> None:
        self._r = client
        self._fallback_store: dict[str, tuple[str, float]] = {}

    @property
    def redis(self) -> Optional[aioredis.Redis]:
        """Access the underlying aioredis.Redis client, or None if in-memory mode."""
        return self._r

    async def get(self, key: str) -> Optional[Any]:
        if self._r is not None:
            try:
                raw = await self._r.get(key)
                if raw is None:
                    return None
                return json.loads(raw)
            except (aioredis.RedisError, OSError, Exception):
                pass

        entry = self._fallback_store.get(key)
        if entry is None:
            return None
        payload, expires_at = entry
        if time.monotonic() >= expires_at:
            self._fallback_store.pop(key, None)
            return None
        try:
            return json.loads(payload)
        except Exception:
            return None

    async def set(self, key: str, value: Any, *, ttl: int) -> None:
        serialized = json.dumps(value, default=str)
        if self._r is not None:
            try:
                await self._r.set(key, serialized, ex=ttl)
                return
            except (aioredis.RedisError, OSError, Exception):
                pass
        self._fallback_store[key] = (serialized, time.monotonic() + max(1, ttl))

    async def delete(self, *keys: str) -> int:
        deleted = 0
        if self._r is not None:
            try:
                return await self._r.delete(*keys)
            except (aioredis.RedisError, OSError, Exception):
                pass
        for k in keys:
            if k in self._fallback_store:
                del self._fallback_store[k]
                deleted += 1
        return deleted

    async def exists(self, key: str) -> bool:
        if self._r is not None:
            try:
                return bool(await self._r.exists(key))
            except (aioredis.RedisError, OSError, Exception):
                pass
        entry = self._fallback_store.get(key)
        if entry is None:
            return False
        if time.monotonic() >= entry[1]:
            self._fallback_store.pop(key, None)
            return False
        return True

    async def ttl(self, key: str) -> int:
        """Returns remaining TTL in seconds, or -2 if key does not exist."""
        if self._r is not None:
            try:
                return await self._r.ttl(key)
            except (aioredis.RedisError, OSError, Exception):
                pass
        entry = self._fallback_store.get(key)
        if entry is None:
            return -2
        rem = int(entry[1] - time.monotonic())
        return rem if rem > 0 else -2

    async def invalidate_player(self, player_tag: str) -> None:
        """Bust all cache entries for a given player on profile update."""
        keys = [
            CacheKey.api_player(player_tag),
            CacheKey.player_profile(player_tag),
            CacheKey.api_player_battle_log(player_tag),
        ]
        await self.delete(*keys)

    async def invalidate_clan(self, clan_tag: str) -> None:
        """Bust all cache entries for a given clan on roster/war update."""
        keys = [
            CacheKey.api_clan(clan_tag),
            CacheKey.api_clan_members(clan_tag),
            CacheKey.api_current_war(clan_tag),
        ]
        await self.delete(*keys)

    async def get_or_fetch(
        self,
        key: str,
        fetch_fn,
        *,
        ttl: int,
    ) -> Any:
        """
        Cache-aside pattern: return cached value or invoke fetch_fn,
        cache the result, and return it.

        Parameters
        ----------
        key:
            Redis key to look up / store under.
        fetch_fn:
            Async callable with no arguments that fetches the live value.
        ttl:
            Time-to-live in seconds.
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        fresh = await fetch_fn()
        if fresh is not None:
            await self.set(key, fresh, ttl=ttl)
        return fresh
