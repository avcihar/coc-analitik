"""
FastAPI Asynchronous Server for Clash of Clans Analytics Platform
=================================================================
Connects the Python backend services (`CoCAPIClient`, `CoCRedisCache`,
`ore_engine`, `army_parser`) to the Next.js (`localhost:3000`) frontend.

Endpoints:
  - GET /api/v1/players/{player_tag}
  - GET /api/v1/clans/search?name={query}
  - GET /api/v1/clans/{clan_tag}
  - GET /health
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import logging
import mimetypes
from pathlib import Path
from typing import Any, Dict, List, Optional

mimetypes.add_type("image/webp", ".webp")

import redis.asyncio as aioredis
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles

from api_server.config import ENV_FILE, Settings, get_settings, log_startup_token
from cache.redis_strategy import CacheKey, CoCRedisCache, TTL
from dotenv import load_dotenv
from schemas.pydantic.coc_models import MAX_TOWN_HALL_LEVEL, PetName
from services.api.client import (
    AuthenticationError,
    CircuitBreakerOpenError,
    CoCAPIClient,
    CoCAPIException,
    MaintenanceBreakError,
    NotFoundError,
    RateLimitError,
    sanitize_tag,
)

load_dotenv(dotenv_path=ENV_FILE, override=False)
from services.api.battlelog_service import (
    fetch_and_enrich_player_battlelog,
)
from services.army_parser.inference import (
    EQUIPMENT_TO_HERO_AND_RARITY,
)
from services.army_parser.parser import (
    build_copy_army_link,
    parse_army_share_code,
)
from services.ore_engine.cost_tables import (
    BLACKSMITH_MAX_LEVEL_BY_TH,
    HERO_MAX_LEVEL_BY_TH,
    PET_MAX_LEVEL_BY_TH,
    Rarity,
)
from services.workers.cwl_scout import scout_cwl_clan
from services.workers.leaderboard import generate_meta_dashboard

# Canonical set of pet names to separate pets from regular troops in CoC API payloads
_KNOWN_PET_NAMES: set[str] = {p.value for p in PetName}


def _infer_equipment_rarity(item: Dict[str, Any]) -> str:
    """Infer equipment rarity from explicit API field or maxLevel (18=Common, 27=Epic)."""
    if "rarity" in item and item["rarity"]:
        return str(item["rarity"]).capitalize()
    max_lvl = item.get("maxLevel", 18)
    return Rarity.EPIC.value if max_lvl > 18 else Rarity.COMMON.value


def _is_valid_group(group_tag: Any, season_id: Any) -> bool:
    """Validate that a league group tag and season ID represent an assigned group."""
    return bool(
        group_tag
        and str(group_tag).strip() not in ("", "#0", "0")
        and season_id not in (None, "", 0)
        and str(season_id).strip() not in ("", "0")
    )


def _enrich_league_group_members(
    raw_members: List[Dict[str, Any]],
    cleaned_player_tag: str,
) -> List[Dict[str, Any]]:
    """Sort league group members by leagueTrophies descending and add rank and combat rate fields."""
    sorted_raw = sorted(
        raw_members,
        key=lambda m: int(m.get("leagueTrophies") or 0),
        reverse=True,
    )
    enriched: List[Dict[str, Any]] = []
    for idx, m in enumerate(sorted_raw, start=1):
        league_trophies = int(m.get("leagueTrophies") or 0)
        attack_wins = int(m.get("attackWinCount") or 0)
        attack_losses = int(m.get("attackLoseCount") or 0)
        defense_wins = int(m.get("defenseWinCount") or 0)
        defense_losses = int(m.get("defenseLoseCount") or 0)
        attack_total = attack_wins + attack_losses
        defense_total = defense_wins + defense_losses

        enriched.append({
            **m,
            "leagueTrophies": league_trophies,
            "attackWinCount": attack_wins,
            "attackLoseCount": attack_losses,
            "defenseWinCount": defense_wins,
            "defenseLoseCount": defense_losses,
            "rank": idx,
            "attackTotal": attack_total,
            "attackWinRate": round(attack_wins / attack_total * 100, 1) if attack_total > 0 else 0.0,
            "defenseTotal": defense_total,
            "defenseWinRate": round(defense_wins / defense_total * 100, 1) if defense_total > 0 else 0.0,
            "isCurrentPlayer": sanitize_tag(m.get("playerTag", "")) == cleaned_player_tag,
        })
    return enriched


def enrich_player_payload(raw_player: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich raw CoC API `/players/{playerTag}` payload with structured TH19-aware
    sections for heroes, active equipment, unlocked equipment, pets, troops, and spells.
    """
    th_level = max(1, int(raw_player.get("townHallLevel", 1)))
    cap_lookup_th = min(th_level, MAX_TOWN_HALL_LEVEL)
    th_hero_caps = HERO_MAX_LEVEL_BY_TH.get(cap_lookup_th, {})
    th_pet_cap = PET_MAX_LEVEL_BY_TH.get(cap_lookup_th, 0)
    th_eq_caps = BLACKSMITH_MAX_LEVEL_BY_TH.get(
        cap_lookup_th, {Rarity.COMMON: 18, Rarity.EPIC: 27}
    )

    # 1. All Unlocked Hero Equipment (also indexed by hero for fallback matching)
    raw_equipment: List[Dict[str, Any]] = raw_player.get("heroEquipment", [])
    hero_equipment: List[Dict[str, Any]] = []
    unlocked_by_hero: Dict[str, List[Dict[str, Any]]] = {}

    for eq in raw_equipment:
        if eq.get("village", "home") == "builderBase":
            continue
        rarity = _infer_equipment_rarity(eq)
        eq_item = {
            "name": eq.get("name"),
            "level": eq.get("level", 1),
            "maxLevel": eq.get("maxLevel", 27 if rarity == "Epic" else 18),
            "rarity": rarity,
            "village": eq.get("village", "home"),
        }
        hero_equipment.append(eq_item)
        eq_name_lower = str(eq.get("name", "")).strip().lower()
        hero_owner, _ = EQUIPMENT_TO_HERO_AND_RARITY.get(eq_name_lower, ("", ""))
        if hero_owner:
            unlocked_by_hero.setdefault(hero_owner, []).append(eq_item)

    for h_name in unlocked_by_hero:
        unlocked_by_hero[h_name].sort(
            key=lambda x: (x["level"], 1 if x["rarity"] == "Epic" else 0),
            reverse=True,
        )

    # 2. Heroes & Active Equipped Hero Equipment (Home Village & Builder Base)
    raw_heroes: List[Dict[str, Any]] = raw_player.get("heroes", [])
    heroes: List[Dict[str, Any]] = []
    builder_heroes: List[Dict[str, Any]] = []
    active_equipment: List[Dict[str, Any]] = []

    for h in raw_heroes:
        hero_name = h.get("name", "")
        if h.get("village", "home") == "builderBase":
            builder_heroes.append({
                "name": hero_name,
                "level": h.get("level", 1),
                "maxLevel": h.get("maxLevel", h.get("level", 1)),
                "village": "builderBase",
            })
            continue
        equipped_raw = h.get("equipment", []) or []
        equipped_list: List[Dict[str, Any]] = []

        for eq in equipped_raw:
            rarity = _infer_equipment_rarity(eq)
            eq_entry = {
                "name": eq.get("name"),
                "level": eq.get("level", 1),
                "maxLevel": eq.get("maxLevel", 27 if rarity == "Epic" else 18),
                "rarity": rarity,
                "village": eq.get("village", "home"),
            }
            equipped_list.append(eq_entry)
            active_equipment.append({"hero": hero_name, **eq_entry})

        heroes.append({
            "name": hero_name,
            "level": h.get("level", 1),
            "maxLevel": h.get("maxLevel", th_hero_caps.get(hero_name, h.get("level", 1))),
            "thMaxLevel": th_hero_caps.get(hero_name, h.get("maxLevel", h.get("level", 1))),
            "village": h.get("village", "home"),
            "equipment": equipped_list,
        })

    # Keep `allSixHeroes` strictly aligned with the player's actual owned home-village heroes
    all_six_heroes: List[Dict[str, Any]] = list(heroes)

    # 3. Separate Pets vs Troops from raw `troops` (and optional `pets` field)
    raw_troops: List[Dict[str, Any]] = raw_player.get("troops", [])
    explicit_pets: List[Dict[str, Any]] = raw_player.get("pets", [])

    pets: List[Dict[str, Any]] = []
    troops: List[Dict[str, Any]] = []
    seen_pets: set[str] = set()

    for p in explicit_pets:
        p_name = p.get("name", "")
        if p_name:
            seen_pets.add(p_name)
            pets.append({
                "name": p_name,
                "level": p.get("level", 1),
                "maxLevel": p.get("maxLevel", th_pet_cap or 20),
                "thMaxLevel": th_pet_cap,
                "village": p.get("village", "home"),
            })

    for t in raw_troops:
        t_name = t.get("name", "")
        if t_name in _KNOWN_PET_NAMES:
            if t_name not in seen_pets:
                seen_pets.add(t_name)
                pets.append({
                    "name": t_name,
                    "level": t.get("level", 1),
                    "maxLevel": t.get("maxLevel", th_pet_cap or 20),
                    "thMaxLevel": th_pet_cap,
                    "village": t.get("village", "home"),
                })
        else:
            troops.append({
                "name": t_name,
                "level": t.get("level", 1),
                "maxLevel": t.get("maxLevel", 1),
                "village": t.get("village", "home"),
                "superTroopIsActive": bool(t.get("superTroopIsActive", False)),
            })

    # 4. Spells
    raw_spells: List[Dict[str, Any]] = raw_player.get("spells", [])
    spells: List[Dict[str, Any]] = [
        {
            "name": s.get("name"),
            "level": s.get("level", 1),
            "maxLevel": s.get("maxLevel", 1),
            "village": s.get("village", "home"),
        }
        for s in raw_spells
    ]

    return {
        **raw_player,
        "townHallLevel": th_level,
        "town_hall_level": th_level,
        "heroes": heroes,
        "builderHeroes": builder_heroes,
        "allSixHeroes": all_six_heroes,
        "activeEquipment": active_equipment,
        "heroEquipment": hero_equipment,
        "pets": pets,
        "troops": troops,
        "spells": spells,
        "thMetaLimits": {
            "townHall": th_level,
            "maxTownHallSupported": max(19, MAX_TOWN_HALL_LEVEL),
            "commonEquipmentMax": th_eq_caps.get(Rarity.COMMON, 18),
            "epicEquipmentMax": th_eq_caps.get(Rarity.EPIC, 27),
            "petMax": th_pet_cap,
            "heroMaxLevels": th_hero_caps,
        },
    }


logger = logging.getLogger("api_server.main")

# ---------------------------------------------------------------------------
# Lifespan & Dependency Injection
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log_startup_token(settings.coc_api_token)

    # Optional Redis connection with safe in-memory fallback
    redis_client: Optional[aioredis.Redis] = None
    if settings.redis_url and settings.redis_url.strip():
        try:
            candidate = aioredis.from_url(
                settings.redis_url.strip(),
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            await asyncio.wait_for(candidate.ping(), timeout=2.0)
            redis_client = candidate
            logger.info("[Cache] Connected to Redis at %s", settings.redis_url)
            print("[Cache] Connected to Redis successfully.", flush=True)
        except Exception as exc:
            logger.warning(
                "[Cache Warning] REDIS_URL configured but connection failed: %s. Falling back to in-memory TTL cache.",
                exc,
            )
            print(
                f"[Cache Warning] Redis connection failed ({exc}). Using in-memory TTL cache.",
                flush=True,
            )
            redis_client = None
    else:
        logger.info("[Cache] REDIS_URL not configured. Running with in-memory TTL cache.")
        print("[Cache] REDIS_URL not configured. Running with in-memory TTL cache.", flush=True)

    redis_cache = CoCRedisCache(redis_client)
    api_client = CoCAPIClient(
        api_token=settings.coc_api_token,
        redis_client=redis_client,
        api_base_url=settings.coc_api_base,
    )

    app.state.settings = settings
    app.state.redis_client = redis_client
    app.state.api_client = api_client
    app.state.redis_cache = redis_cache

    # Background warmup for top 200 ranked meta on startup so initial user visit has pre-computed data
    async def _warmup_meta():
        try:
            logger.info("[Warmup] Starting initial background ranked meta analysis...")
            await generate_meta_dashboard(
                api_client=api_client,
                redis_client=redis_client,
                top_n=200,
                sample_size=200,
                town_hall=None,
            )
            logger.info("[Warmup] Initial ranked meta analysis ready.")
        except Exception as err:
            logger.debug("[Warmup] Meta warmup error: %s", err)

    asyncio.create_task(_warmup_meta())

    try:
        yield
    finally:
        await api_client.close()
        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                pass


def get_api_client(request: Request) -> CoCAPIClient:
    """FastAPI dependency returning the shared CoCAPIClient instance."""
    return request.app.state.api_client


def get_redis_cache(request: Request) -> CoCRedisCache:
    """FastAPI dependency returning the shared CoCRedisCache instance."""
    return request.app.state.redis_cache


# ---------------------------------------------------------------------------
# FastAPI App Factory
# ---------------------------------------------------------------------------

def create_app(settings: Optional[Settings] = None) -> FastAPI:
    cfg = settings or get_settings()
    log_startup_token(cfg.coc_api_token)

    application = FastAPI(
        title="Clash of Clans Analytics Platform API",
        description="Asynchronous FastAPI server bridging CoC API & Redis cache with Next.js frontend (TH18 Meta).",
        version="2.0.0",
        lifespan=lifespan,
    )

    # CORS configuration for Next.js (localhost:3000)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception Handlers ─────────────────────────────────────────────────

    @application.exception_handler(NotFoundError)
    async def not_found_handler(_request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @application.exception_handler(AuthenticationError)
    async def auth_error_handler(_request: Request, exc: AuthenticationError):
        return JSONResponse(
            status_code=403,
            content={"detail": "API anahtarı bu IP için yetkili değil, anahtarın izinli IP'sini kontrol edin.", "error": str(exc)},
        )

    @application.exception_handler(RateLimitError)
    async def rate_limit_handler(_request: Request, exc: RateLimitError):
        return JSONResponse(status_code=429, content={"detail": str(exc)})

    @application.exception_handler(MaintenanceBreakError)
    async def maintenance_handler(_request: Request, exc: MaintenanceBreakError):
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @application.exception_handler(CircuitBreakerOpenError)
    async def circuit_breaker_handler(_request: Request, exc: CircuitBreakerOpenError):
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @application.exception_handler(CoCAPIException)
    async def coc_api_error_handler(_request: Request, exc: CoCAPIException):
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        logger.exception("Unhandled server exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": f"Sunucu hatası: {str(exc)}"},
        )

    # ── Routes ─────────────────────────────────────────────────────────────

    @application.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "ok",
            "maxTownHallSupported": MAX_TOWN_HALL_LEVEL,
            "cache": "redis" if getattr(application.state, "redis_client", None) is not None else "in-memory",
        }

    @application.get("/api/v1/players/{player_tag}", tags=["Players"])
    async def get_player_profile(
        player_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a player's full profile by tag (including TH level up to TH18,
        heroes, active equipped hero equipment, unlocked equipment, pets, and troop levels)
        with Redis TTL caching.
        """
        cleaned_tag = sanitize_tag(player_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Player tag cannot be empty.")

        cache_key = CacheKey.player_profile(cleaned_tag)

        async def _fetch_and_enrich() -> Dict[str, Any]:
            raw_data = await api_client.get_player(cleaned_tag)
            return enrich_player_payload(raw_data)

        return await cache.get_or_fetch(
            cache_key,
            _fetch_and_enrich,
            ttl=int(TTL.PLAYER_PROFILE),
        )

    @application.get("/api/v1/players/{player_tag}/battlelog", tags=["Players"])
    async def get_player_battlelog_route(
        player_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a player's ranked/multiplayer battle log (`GET /players/%23{tag}/battlelog`)
        including attacks, defenses, stars, destruction, and decoded `armyShareCode` armies.
        Uses shared battle log service with short-term caching and retry backoff.
        """
        cleaned_tag = sanitize_tag(player_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Player tag cannot be empty.")

        return await fetch_and_enrich_player_battlelog(
            api_client=api_client,
            player_tag=cleaned_tag,
            cache=cache,
        )

    @application.get("/api/v1/army/parse", tags=["Army Parser"])
    async def parse_army_share_code_route(
        code: str = Query(..., min_length=1, description="armyShareCode or full CopyArmy link"),
    ) -> Dict[str, Any]:
        """
        Decode a Clash of Clans `armyShareCode` (heroes, pets, equipments, siege
        machine, clan castle, troops, spells) and generate a CopyArmy link.
        """
        return parse_army_share_code(code)

    @application.get("/api/v1/players/{player_tag}/leaguehistory", tags=["Players"])
    async def get_player_leaguehistory_route(
        player_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a player's league season history (`GET /players/%23{tag}/leaguehistory`).
        """
        cleaned_tag = sanitize_tag(player_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Player tag cannot be empty.")

        cache_key = f"coc:player:leaguehistory:{cleaned_tag}"
        return await cache.get_or_fetch(
            cache_key,
            lambda: api_client.get_player_leaguehistory(cleaned_tag),
            ttl=int(TTL.PLAYER_PROFILE),
        )

    @application.get("/api/v1/players/{player_tag}/leaguegroup", tags=["Players"])
    async def get_player_leaguegroup_route(
        player_tag: str,
        season: str = Query("current", pattern="^(current|previous)$"),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a player's 100-player ranked league group leaderboard
        (`GET /leaguegroup/%23{groupTag}/{seasonId}?playerTag=%23{playerTag}`).
        """
        cleaned_tag = sanitize_tag(player_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Player tag cannot be empty.")

        player_cache_key = CacheKey.player_profile(cleaned_tag)

        async def _fetch_player() -> Dict[str, Any]:
            raw_data = await api_client.get_player(cleaned_tag)
            return enrich_player_payload(raw_data)

        raw_or_enriched = (
            await cache.get_or_fetch(
                player_cache_key,
                _fetch_player,
                ttl=int(TTL.PLAYER_PROFILE),
            )
            or {}
        )

        cur_group = raw_or_enriched.get("currentLeagueGroupTag")
        cur_season = raw_or_enriched.get("currentLeagueSeasonId")
        prev_group = raw_or_enriched.get("previousLeagueGroupTag")
        prev_season = raw_or_enriched.get("previousLeagueSeasonId")

        has_current = _is_valid_group(cur_group, cur_season)
        has_previous = _is_valid_group(prev_group, prev_season)

        if season == "previous" and has_previous:
            target_group, target_season, is_previous = (
                str(prev_group).strip(),
                prev_season,
                True,
            )
        elif has_current:
            target_group, target_season, is_previous = (
                str(cur_group).strip(),
                cur_season,
                False,
            )
        elif has_previous:
            target_group, target_season, is_previous = (
                str(prev_group).strip(),
                prev_season,
                True,
            )
        else:
            return {
                "available": False,
                "reason": "no_league_group",
                "playerTag": f"#{cleaned_tag}",
                "hasCurrent": False,
                "hasPrevious": False,
                "leagueTier": raw_or_enriched.get("leagueTier"),
                "members": [],
                "attackLogs": [],
                "defenseLogs": [],
            }

        async def _load_group(g_tag: str, g_season: Any, is_prev: bool) -> Dict[str, Any]:
            cache_key = f"coc:player:leaguegroup:{cleaned_tag}:{g_tag}:{g_season}"
            cached = await cache.get(cache_key)
            if cached is not None:
                return cached

            raw_group = await api_client.get_league_group(g_tag, g_season, cleaned_tag)
            raw_members = raw_group.get("members") or [] if isinstance(raw_group, dict) else []
            enriched_members = _enrich_league_group_members(raw_members, cleaned_tag)
            payload: Dict[str, Any] = {
                "available": True,
                "playerTag": f"#{cleaned_tag}",
                "groupTag": g_tag,
                "seasonId": g_season,
                "isPreviousSeason": is_prev,
                "hasCurrent": has_current,
                "hasPrevious": has_previous,
                "leagueTier": raw_or_enriched.get("leagueTier"),
                "totalMembers": len(enriched_members),
                "members": enriched_members,
                "attackLogs": (raw_group.get("attackLogs") or []) if isinstance(raw_group, dict) else [],
                "defenseLogs": (raw_group.get("defenseLogs") or []) if isinstance(raw_group, dict) else [],
            }
            await cache.set(cache_key, payload, ttl=120)
            return payload

        try:
            return await _load_group(target_group, target_season, is_previous)
        except (NotFoundError, CoCAPIException) as exc:
            logger.warning(
                "League group fetch failed for player #%s (group=%s, season=%s): %s",
                cleaned_tag,
                target_group,
                target_season,
                exc,
            )
            if not is_previous and season != "previous" and has_previous:
                fallback_group = str(prev_group).strip()
                try:
                    return await _load_group(fallback_group, prev_season, True)
                except (NotFoundError, CoCAPIException) as prev_exc:
                    logger.warning(
                        "Previous league group fallback failed for player #%s (group=%s, season=%s): %s",
                        cleaned_tag,
                        fallback_group,
                        prev_season,
                        prev_exc,
                    )

            reason = "league_group_not_found" if isinstance(exc, NotFoundError) else "league_group_unavailable"
            return {
                "available": False,
                "reason": reason,
                "playerTag": f"#{cleaned_tag}",
                "groupTag": target_group,
                "seasonId": target_season,
                "isPreviousSeason": is_previous,
                "hasCurrent": has_current,
                "hasPrevious": has_previous,
                "leagueTier": raw_or_enriched.get("leagueTier"),
                "members": [],
                "attackLogs": [],
                "defenseLogs": [],
            }

    @application.get("/api/v1/clans/search", tags=["Clans"])
    async def search_clans_by_name(
        name: str = Query(..., min_length=1, description="Clan name to search for"),
        limit: int = Query(20, ge=1, le=100, description="Max results to return"),
        min_members: Optional[int] = Query(None, ge=1, le=50),
        min_clan_level: Optional[int] = Query(None, ge=1),
        after: Optional[str] = Query(None),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Search clans by name with short-lived Redis TTL caching.
        """
        q = name.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Search query 'name' cannot be empty.")

        cache_key = CacheKey.clan_search(
            q,
            limit=limit,
            min_members=min_members,
            min_clan_level=min_clan_level,
        )

        async def _fetch_search() -> Dict[str, Any]:
            return await api_client.search_clans(
                name=q,
                limit=limit,
                min_members=min_members,
                min_clan_level=min_clan_level,
                after=after,
            )

        if after:
            # Paginated cursor queries bypass the first-page cache key
            return await _fetch_search()

        return await cache.get_or_fetch(
            cache_key,
            _fetch_search,
            ttl=int(TTL.SEARCH_RESULTS),
        )

    @application.get("/api/v1/clans/{clan_tag}", tags=["Clans"])
    async def get_clan_details(
        clan_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch clan information and full member list (`memberList`) by clan tag
        with Redis TTL caching.
        """
        cleaned_tag = sanitize_tag(clan_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Clan tag cannot be empty.")

        cache_key = CacheKey.api_clan(cleaned_tag)

        async def _fetch_clan() -> Dict[str, Any]:
            clan_data = await api_client.get_clan(cleaned_tag)
            if "memberList" not in clan_data:
                members_resp = await api_client.get_clan_members(cleaned_tag)
                clan_data["memberList"] = members_resp.get("items", [])
            return clan_data

        return await cache.get_or_fetch(
            cache_key,
            _fetch_clan,
            ttl=int(TTL.COC_API_CLAN),
        )

    @application.get("/api/v1/clans/{clan_tag}/leaguegroup", tags=["CWL Scouting"])
    async def get_clan_league_group_route(
        clan_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a clan's CWL league group (`GET /clans/%23{tag}/currentwar/leaguegroup`).
        """
        cleaned_tag = sanitize_tag(clan_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Clan tag cannot be empty.")

        cache_key = f"coc:clan:leaguegroup:{cleaned_tag}"
        return await cache.get_or_fetch(
            cache_key,
            lambda: api_client.get_clan_league_group(cleaned_tag),
            ttl=int(TTL.CWL_PREP_DAY_WAR),
        )

    @application.get("/api/v1/cwl/wars/{war_tag}", tags=["CWL Scouting"])
    async def get_cwl_war_route(
        war_tag: str,
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch a CWL war by warTag (`GET /clanwarleagues/wars/%23{war_tag}`).
        """
        cleaned_tag = sanitize_tag(war_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="War tag cannot be empty.")

        cache_key = f"coc:cwl:war:{cleaned_tag}"
        return await cache.get_or_fetch(
            cache_key,
            lambda: api_client.get_cwl_war(cleaned_tag),
            ttl=int(TTL.CWL_BATTLE_WINDOW_WAR),
        )

    @application.get("/api/v1/rankings/players", tags=["Meta Analytics"])
    async def get_global_player_rankings_route(
        location_id: str = Query("global", description="Location ID or 'global'"),
        limit: int = Query(200, ge=1, le=200, description="Number of ranked players to fetch"),
        after: Optional[str] = Query(None, description="Pagination cursor"),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch player rankings (`GET /locations/{location_id}/rankings/players`).
        """
        if after:
            return await api_client.get_global_player_rankings(
                location_id=location_id,
                limit=limit,
                after=after,
            )
        cache_key = f"coc:rankings:players:{location_id}:{limit}"
        return await cache.get_or_fetch(
            cache_key,
            lambda: api_client.get_global_player_rankings(
                location_id=location_id,
                limit=limit,
            ),
            ttl=int(TTL.LEADERBOARD_HOT),
        )

    @application.get("/api/v1/cwl/scout/{clan_tag}", tags=["CWL Scouting"])
    async def get_cwl_scout_report(
        clan_tag: str,
        round_number: Optional[int] = Query(
            None,
            alias="round",
            ge=1,
            le=7,
            description="CWL round number (1-7)",
        ),
        force_refresh: bool = Query(False, description="Bypass Redis cache and re-scout live CWL data"),
        fallback_to_clan_roster: bool = Query(
            True,
            description="If the clan is not currently in CWL, analyze its general member roster via /clans/%23{clanTag}",
        ),
        roster_filter: str = Query(
            "cwl",
            description="Roster selection: 'cwl' for war roster, 'all' for full clan members",
        ),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Scout a clan's active (`inWar`) or upcoming (`preparation`) CWL opponent roster:
        - Scans `/clans/%23{clanTag}/currentwar/leaguegroup` and all rounds' `warTags`
        - Queries `/clanwarleagues/wars/%23{warTag}` to find our clan's match and extract `opponent.members`
        - Supports round selection (`round=1..7`) to view specific battle day or preparation day
        - Falls back to `/clans/%23{clanTag}` general member roster if the clan is not currently in CWL
        - Supports roster_filter ('cwl' or 'all') with CWL members highlighted and sorted first
        - Fetches opponent `/players/%23{playerTag}` AND `/players/%23{playerTag}/battlelog` in parallel
          (`asyncio.gather`, max 10 req/s, semaphore 12)
        - Extracts ranked/legend battlelog attacks, greedy-ranks armies by 3★ count and rate
        - Extracts ranked defense 3★ history for opponent bases
        - Serves from Redis cache when available or computes & caches with state-aware TTL.
        """
        cleaned_tag = sanitize_tag(clan_tag)
        if not cleaned_tag:
            raise HTTPException(status_code=400, detail="Clan tag cannot be empty.")

        cache_key = f"{CacheKey.cwl_scout(cleaned_tag)}:{roster_filter}:round_{round_number or 'default'}"
        if not force_refresh:
            cached = await cache.get(cache_key)
            if cached is not None:
                return cached

        report = await scout_cwl_clan(
            clan_tag=cleaned_tag,
            api_client=api_client,
            redis_client=None,
            force_refresh=True,
            fallback_to_clan_roster=fallback_to_clan_roster,
            roster_filter=roster_filter,
            round_number=round_number,
        )

        if report.get("opponents"):
            war_state = str(report.get("warState", "preparation")).lower()
            ttl_val = (
                int(TTL.CWL_BATTLE_WINDOW_WAR)
                if war_state == "inwar"
                else int(TTL.CWL_PREP_DAY_WAR)
            )
            await cache.set(cache_key, report, ttl=ttl_val)

        return report

    @application.get("/api/v1/meta/top-analysis", tags=["Meta Analytics"])
    async def get_meta_top_analysis(
        sample_size: int = Query(
            200,
            ge=1,
            le=10000,
            description="Number of top leaderboard players to sample and analyze (defaults to 200)",
        ),
        top_n: Optional[int] = Query(
            None,
            ge=1,
            le=10000,
            description="Optional alias for sample_size",
        ),
        town_hall: Optional[int] = Query(
            None,
            ge=16,
            le=19,
            description="Optional Town Hall filter (e.g. 18 or 19); defaults to all top players",
        ),
        location_id: str = Query(
            "global",
            description="Location ID or 'global' for player rankings",
        ),
        force_refresh: bool = Query(
            False,
            description="Bypass Redis cache and recompute leaderboard meta statistics",
        ),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Fetch top 200 leaderboard players, scan `/players/%23{tag}` and `/players/%23{tag}/battlelog`
        with concurrency limit 10 & rate-limit protection, strictly filtering to ranked/legend
        attack logs, and return pick rates + top 5 Meta Army Recommendations.
        """
        effective_n = top_n if top_n is not None else sample_size
        cache_key = CacheKey.leaderboard_global(
            f"meta_v4_ranked_top_{location_id}_n_{effective_n}_th_{town_hall or 'all'}"
        )
        v3_key = CacheKey.leaderboard_global(
            f"meta_v4_ranked_{location_id}_n_{effective_n}_th_{town_hall or 'all'}"
        )
        if not force_refresh:
            cached = await cache.get(cache_key)
            if cached is not None and not cached.get("isProcessing"):
                return cached
            cached_v3 = await cache.get(v3_key)
            if cached_v3 is not None and not cached_v3.get("isProcessing"):
                return cached_v3

        from services.workers.leaderboard import MetaTaskManager
        job_id = f"{location_id}_{effective_n}_{town_hall or 'all'}"
        existing_job = MetaTaskManager.get_job(job_id)
        if existing_job and not force_refresh and existing_job.current_dashboard:
            return existing_job.current_dashboard

        try:
            dashboard = await generate_meta_dashboard(
                api_client=api_client,
                redis_client=getattr(cache, "redis", None),
                top_n=effective_n,
                sample_size=effective_n,
                town_hall=town_hall,
                location_id=location_id,
                force_refresh=force_refresh,
            )
            if not dashboard.get("isProcessing"):
                await cache.set(cache_key, dashboard, ttl=1800)
                await cache.set(v3_key, dashboard, ttl=1800)
            return dashboard
        except Exception as exc:
            logger.exception("Error generating meta top analysis: %s", exc)
            stale = await cache.get(cache_key) or await cache.get(v3_key)
            if stale:
                logger.warning("Serving stale meta dashboard fallback after error: %s", exc)
                return stale
            raise HTTPException(
                status_code=500,
                detail=f"Meta analizi gerçekleştirilemedi: {str(exc)}",
            )

    @application.get("/api/v1/meta/dashboard", tags=["Meta Analytics"])
    async def get_meta_dashboard(
        top_n: int = Query(
            200,
            ge=1,
            le=10000,
            description="Number of top leaderboard players to analyze (defaults to 200)",
        ),
        sample_size: Optional[int] = Query(
            None,
            ge=1,
            le=10000,
            description="Optional sample size override (e.g. 200)",
        ),
        town_hall: Optional[int] = Query(
            18,
            ge=16,
            le=19,
            description="Town Hall filter (defaults to 18) for recommended meta armies",
        ),
        force_refresh: bool = Query(
            False,
            description="Bypass Redis cache and recompute leaderboard meta statistics",
        ),
        api_client: CoCAPIClient = Depends(get_api_client),
        cache: CoCRedisCache = Depends(get_redis_cache),
    ) -> Dict[str, Any]:
        """
        Analyze the top 200 global leaderboard players using strictly ranked/legend
        attack logs, compute usage percentages and top Meta Army Recommendations.
        """
        effective_n = sample_size if sample_size is not None else top_n
        cache_key = CacheKey.leaderboard_global(
            f"meta_v4_ranked_dash_top_{effective_n}_th_{town_hall or 'all'}"
        )
        v3_key = CacheKey.leaderboard_global(
            f"meta_v4_ranked_global_n_{effective_n}_th_{town_hall or 'all'}"
        )
        if not force_refresh:
            cached = await cache.get(cache_key)
            if cached is not None and not cached.get("isProcessing"):
                return cached
            cached_v3 = await cache.get(v3_key)
            if cached_v3 is not None and not cached_v3.get("isProcessing"):
                return cached_v3

        from services.workers.leaderboard import MetaTaskManager
        job_id = f"global_{effective_n}_{town_hall or 'all'}"
        existing_job = MetaTaskManager.get_job(job_id)
        if existing_job and not force_refresh and existing_job.current_dashboard:
            return existing_job.current_dashboard

        try:
            dashboard = await generate_meta_dashboard(
                api_client=api_client,
                redis_client=getattr(cache, "redis", None),
                top_n=effective_n,
                sample_size=effective_n,
                town_hall=town_hall,
                location_id="global",
                force_refresh=force_refresh,
            )
            if not dashboard.get("isProcessing"):
                await cache.set(cache_key, dashboard, ttl=1800)
                await cache.set(v3_key, dashboard, ttl=1800)
            return dashboard
        except Exception as exc:
            logger.exception("Error generating meta dashboard: %s", exc)
            stale = await cache.get(cache_key) or await cache.get(v3_key)
            if stale:
                logger.warning("Serving stale meta dashboard fallback after error: %s", exc)
                return stale
            raise HTTPException(
                status_code=500,
                detail=f"Meta paneli oluşturulamadı: {str(exc)}",
            )

    # ── Static Files & SPA Routing ───────────────────────────────────────────
    project_root = Path(__file__).resolve().parent.parent
    frontend_out = project_root / "frontend" / "out"
    frontend_public = project_root / "frontend" / "public"

    # Always mount /icons if available (from out/icons or public/icons)
    icons_dir = frontend_out / "icons"
    if not icons_dir.exists():
        icons_dir = frontend_public / "icons"
    if icons_dir.exists():
        application.mount("/icons", StaticFiles(directory=str(icons_dir)), name="icons_static")

    # Always mount /fonts if available (from out/fonts or public/fonts)
    fonts_dir = frontend_out / "fonts"
    if not fonts_dir.exists():
        fonts_dir = frontend_public / "fonts"
    if fonts_dir.exists():
        application.mount("/fonts", StaticFiles(directory=str(fonts_dir)), name="fonts_static")

    if frontend_out.exists() and (frontend_out / "index.html").exists():
        next_dir = frontend_out / "_next"
        if next_dir.exists():
            application.mount("/_next", StaticFiles(directory=str(next_dir)), name="next_static")

        @application.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa_route(full_path: str):
            clean = full_path.lstrip("/").lower()
            if (
                clean == "api"
                or clean.startswith("api/")
                or clean == "health"
                or clean.startswith("health/")
                or clean.startswith("docs")
                or clean.startswith("openapi.json")
            ):
                return JSONResponse(status_code=404, content={"detail": f"API rotası bulunamadı: /{clean}"})
            if clean.startswith("icons/") or clean.startswith("fonts/"):
                return Response(status_code=404)
            file_on_disk = frontend_out / full_path
            if full_path and file_on_disk.is_file():
                return FileResponse(file_on_disk)
            return FileResponse(frontend_out / "index.html")

    return application


app = create_app()

