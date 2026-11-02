"""
CWL Scouting & Army Inference Pipeline
======================================
Official Clash of Clans API–compliant CWL scouting engine and Celery worker.

Workflow:
  1. Fetch `/clans/{clanTag}/currentwar/leaguegroup` for the given clan tag.
  2. Scan `warTags` across all `rounds` to locate the active (`inWar`) or
     upcoming (`preparation`) CWL war involving our clan via
     `/clanwarleagues/wars/{warTag}`, and identify the opponent clan.
  3. Extract all 15 or 30 `player_tag` entries from the opponent clan's war roster.
  4. Fetch all opponent player profiles (`/players/{tag}`) in parallel using
     `asyncio.gather` guarded by a strict sliding-window rate limiter
     (max 10 requests/second).
  5. Extract each opponent's Town Hall level (up to TH18), hero levels (including
     Minion Prince), active equipped hero equipment (`heroEquipment`), pets,
     active boosted Super Troops (`superTroops`), and live CWL war attacks
     (if the war has started).
  6. Run the Army Inference Engine (`infer_player_army`) and `army_parser` to
     predict each opponent's primary attack army and generate a valid in-game
     CopyArmy URL (`https://link.clashofclans.com/...`).
  7. Store the complete scout report in Redis with state-aware TTL so FastAPI
     (`GET /api/v1/cwl/scout/{clan_tag}`) can serve it directly to the frontend.
"""

from __future__ import annotations

import asyncio
from collections import deque
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import redis.asyncio as aioredis
from celery import shared_task
from dotenv import load_dotenv

from cache.redis_strategy import CacheKey, TTL
from schemas.pydantic.coc_models import MAX_TOWN_HALL_LEVEL
from services.api.battlelog_service import (
    compute_clan_army_meta,
    compute_player_army_stats,
    extract_defenses_against,
    extract_scout_armies,
    extract_three_star_defenses,
    fetch_and_enrich_player_battlelog,
)
from services.api.client import CoCAPIClient, CoCAPIException, _encode_tag, sanitize_tag
from services.army_parser.inference import KNOWN_PET_NAMES
from services.army_parser.parser import (
    build_copy_army_link,
    derive_army_name,
    parse_army_share_code,
)
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env", override=True)
logger = logging.getLogger(__name__)

API_TOKEN = os.environ.get("COC_API_TOKEN", "").strip().strip('"').strip("'")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

MAX_REQUESTS_PER_SECOND = 10
MAX_CONCURRENT_PLAYER_FETCHES = 12


def _normalise_tag(tag: str) -> str:
    """Normalise a CoC tag to uppercase without leading '#' or '%23'."""
    cleaned = tag.strip().upper()
    if cleaned.startswith("%23"):
        cleaned = cleaned[3:]
    return cleaned.lstrip("#")


def _format_tag(tag: str) -> str:
    """Ensure a CoC tag has a leading '#'."""
    norm = _normalise_tag(tag)
    return f"#{norm}" if norm else ""


# ---------------------------------------------------------------------------
# Sliding-Window Async Rate Limiter (Max 10 req/s)
# ---------------------------------------------------------------------------

class AsyncRateLimiter:
    """
    Concurrency + sliding-window rate limiter enforcing at most `max_calls`
    requests per `period` seconds across concurrent `asyncio.gather` coroutines.
    """

    def __init__(self, max_calls: int = MAX_REQUESTS_PER_SECOND, period: float = 1.0):
        self.max_calls = max(1, max_calls)
        self.period = period
        self._semaphore = asyncio.Semaphore(self.max_calls)
        self._lock = asyncio.Lock()
        self._timestamps: deque[float] = deque()

    async def __aenter__(self) -> "AsyncRateLimiter":
        await self._semaphore.acquire()
        async with self._lock:
            loop = asyncio.get_running_loop()
            now = loop.time()

            while self._timestamps and (now - self._timestamps[0]) >= self.period:
                self._timestamps.popleft()

            if len(self._timestamps) >= self.max_calls:
                wait_seconds = self.period - (now - self._timestamps[0])
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds)
                now = loop.time()
                while self._timestamps and (now - self._timestamps[0]) >= self.period:
                    self._timestamps.popleft()

            self._timestamps.append(loop.time())
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        self._semaphore.release()


# ---------------------------------------------------------------------------
# War Discovery Helper
# ---------------------------------------------------------------------------

async def _fetch_cwl_war_payload(
    api_client: CoCAPIClient,
    war_tag: str,
    rate_limiter: AsyncRateLimiter,
) -> Dict[str, Any]:
    """
    Fetch `GET /clanwarleagues/wars/%23{warTag}` respecting the rate limiter.
    Supports both `api_client.get_cwl_war(war_tag)` and fallback `api_client.get(...)`.
    """
    encoded_tag = _encode_tag(war_tag)
    endpoint = f"/clanwarleagues/wars/{encoded_tag}"
    async with rate_limiter:
        if type(api_client) is CoCAPIClient:
            return await api_client.get_cwl_war(war_tag)
        if hasattr(api_client, "get_cwl_war"):
            res = await api_client.get_cwl_war(war_tag)
            if isinstance(res, dict):
                return res
        return await api_client.get(endpoint)


async def find_clan_cwl_war(
    api_client: CoCAPIClient,
    clan_tag: str,
    league_group: Dict[str, Any],
    rate_limiter: AsyncRateLimiter,
    round_number: Optional[int] = None,
) -> Tuple[
    Optional[Tuple[int, str, Dict[str, Any], Dict[str, Any], Dict[str, Any]]],
    List[Dict[str, Any]],
]:
    """
    Scan all rounds and `warTags` in `league_group` to find our clan's CWL wars across all 7 rounds.

    Returns
    -------
    Tuple of:
      - matched_war: Optional tuple of (round_number, war_tag, war_data, our_clan_dict, opponent_clan_dict)
      - rounds_summary: List of round metadata dictionaries for rounds 1..7
    """
    norm_target = _normalise_tag(clan_tag)
    rounds: List[Dict[str, Any]] = league_group.get("rounds", []) or []

    discovered_by_round: Dict[int, Tuple[int, str, Dict[str, Any], Dict[str, Any], Dict[str, Any]]] = {}
    rounds_summary: List[Dict[str, Any]] = []

    for round_idx, round_item in enumerate(rounds, start=1):
        war_tags: List[str] = [
            wt for wt in (round_item.get("warTags") or [])
            if wt and wt not in ("#0", "0")
        ]
        if not war_tags:
            rounds_summary.append({
                "roundNumber": round_idx,
                "warTag": "#0",
                "state": "unrevealed",
                "stateLabel": "Henüz Belli Değil",
                "opponentClan": None,
                "isSavasGunu": False,
                "isHazirlikGunu": False,
                "isBitti": False,
                "isUnrevealed": True,
            })
            continue

        round_war_found = None
        for war_tag in war_tags:
            try:
                war_data = await _fetch_cwl_war_payload(api_client, war_tag, rate_limiter)
            except CoCAPIException as exc:
                logger.warning("Failed to fetch CWL war %s in round %d: %s", war_tag, round_idx, exc)
                continue

            if not isinstance(war_data, dict):
                continue

            clan_a = war_data.get("clan") or {}
            clan_b = war_data.get("opponent") or {}
            tag_a = _normalise_tag(str(clan_a.get("tag", "")))
            tag_b = _normalise_tag(str(clan_b.get("tag", "")))

            if tag_a == norm_target:
                round_war_found = (round_idx, war_tag, war_data, clan_a, clan_b)
                break
            if tag_b == norm_target:
                round_war_found = (round_idx, war_tag, war_data, clan_b, clan_a)
                break

        if round_war_found:
            r_num, w_tag, w_data, our_c, opp_c = round_war_found
            discovered_by_round[r_num] = round_war_found
            w_state = str(w_data.get("state", "preparation"))
            is_in_war = w_state.lower() == "inwar"
            is_prep = w_state.lower() == "preparation"
            is_ended = w_state.lower() == "warended"
            state_label = (
                "Savaş Günü" if is_in_war
                else "Hazırlık Günü" if is_prep
                else "Bitti" if is_ended
                else w_state
            )
            rounds_summary.append({
                "roundNumber": r_num,
                "warTag": _format_tag(w_tag),
                "state": w_state,
                "stateLabel": state_label,
                "opponentClan": {
                    "tag": _format_tag(str(opp_c.get("tag", ""))),
                    "name": opp_c.get("name", "Rakip Klan"),
                    "clanLevel": opp_c.get("clanLevel"),
                    "stars": opp_c.get("stars", 0),
                    "destructionPercentage": opp_c.get("destructionPercentage", 0.0),
                    "badgeUrls": opp_c.get("badgeUrls"),
                },
                "isSavasGunu": is_in_war,
                "isHazirlikGunu": is_prep,
                "isBitti": is_ended,
                "isUnrevealed": False,
            })
        else:
            rounds_summary.append({
                "roundNumber": round_idx,
                "warTag": "#0",
                "state": "unrevealed",
                "stateLabel": "Henüz Belli Değil",
                "opponentClan": None,
                "isSavasGunu": False,
                "isHazirlikGunu": False,
                "isBitti": False,
                "isUnrevealed": True,
            })

    matched_war = None
    if round_number is not None:
        matched_war = discovered_by_round.get(round_number)
    elif discovered_by_round:
        state_priority = {"inwar": 3, "preparation": 2, "warended": 1}
        sorted_wars = sorted(
            discovered_by_round.values(),
            key=lambda item: (
                state_priority.get(str(item[2].get("state", "")).lower(), 0),
                item[0],
            ),
            reverse=True,
        )
        matched_war = sorted_wars[0]

    return matched_war, rounds_summary


# ---------------------------------------------------------------------------
# Player Profile + War Attack + Army Inference Builder
# ---------------------------------------------------------------------------

def _extract_war_attacks(
    war_member: Dict[str, Any],
    our_members_by_tag: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Extract and enrich live CWL war attacks made by an opponent roster member."""
    raw_attacks: List[Dict[str, Any]] = war_member.get("attacks") or []
    enriched_attacks: List[Dict[str, Any]] = []

    for atk in raw_attacks:
        def_tag = _format_tag(str(atk.get("defenderTag", "")))
        defender_info = our_members_by_tag.get(_normalise_tag(def_tag), {})
        enriched_attacks.append({
            "attackerTag": _format_tag(str(atk.get("attackerTag", war_member.get("tag", "")))),
            "defenderTag": def_tag,
            "defenderName": defender_info.get("name"),
            "defenderTownHall": defender_info.get(
                "townhallLevel", defender_info.get("townHallLevel")
            ),
            "defenderMapPosition": defender_info.get("mapPosition"),
            "stars": int(atk.get("stars", 0)),
            "destructionPercentage": float(atk.get("destructionPercentage", 0.0)),
            "order": int(atk.get("order", 1)),
            "duration": atk.get("duration"),
        })

    return enriched_attacks


def _format_battlelog_timestamp(raw_ts: Optional[str]) -> Optional[str]:
    """Format a CoC ISO timestamp (`YYYYMMDDTHHmmss.SSSZ`) into `YYYY-MM-DD HH:MM` if present."""
    if not raw_ts or not isinstance(raw_ts, str):
        return None
    ts = raw_ts.strip()
    if len(ts) >= 13 and "T" in ts and ts[:8].isdigit():
        return f"{ts[:4]}-{ts[4:6]}-{ts[6:8]} {ts[9:11]}:{ts[11:13]}"
    return ts


def _extract_real_profile_heroes(raw_player: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extract ONLY the real heroes and equipped equipment returned by `/players/{tag}`.
    Never fabricates heroes or equipment that are not present in the API response.
    """
    heroes_detailed: List[Dict[str, Any]] = []
    active_equipment: List[Dict[str, Any]] = []

    for h in raw_player.get("heroes") or []:
        if not isinstance(h, dict) or h.get("village", "home") != "home":
            continue
        h_name = str(h.get("name", "")).strip()
        if not h_name:
            continue
        h_lvl = int(h.get("level", 1))
        h_max = int(h.get("maxLevel", h_lvl))
        eq_list: List[Dict[str, Any]] = []
        for eq in h.get("equipment") or []:
            if not isinstance(eq, dict):
                continue
            eq_name = str(eq.get("name", "")).strip()
            if not eq_name:
                continue
            eq_lvl = int(eq.get("level", 1))
            eq_max = int(eq.get("maxLevel", 18))
            is_epic = eq_max > 18 or str(eq.get("rarity", "")).lower() == "epic"
            eq_entry = {
                "name": eq_name,
                "level": eq_lvl,
                "maxLevel": eq_max,
                "rarity": "Epic" if is_epic else "Common",
                "isEpic": is_epic,
            }
            eq_list.append(eq_entry)
            active_equipment.append({"hero": h_name, **eq_entry})

        heroes_detailed.append({
            "name": h_name,
            "level": h_lvl,
            "maxLevel": h_max,
            "equipments": eq_list,
            "pet": h.get("pet"),
        })

    return heroes_detailed, active_equipment


def _extract_real_battlelog_armies(
    battlelog: Optional[Any],
    max_distinct: int = 20,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Optional[str]]:
    """
    Extract real armies using the unified `extract_scout_armies` service.
    Returns:
      (recent_armies, enriched_log_items, failure_reason)
    """
    if not isinstance(battlelog, dict):
        return [], [], "Battle log boş"

    recent_armies, failure_reason = extract_scout_armies(battlelog, max_distinct=max_distinct)
    enriched_items = battlelog.get("items") or []
    return recent_armies, enriched_items, failure_reason


def _build_opponent_scout_entry(
    war_member: Dict[str, Any],
    raw_player: Dict[str, Any],
    our_members_by_tag: Dict[str, Dict[str, Any]],
    battlelog: Optional[Any] = None,
    is_cwl: bool = True,
) -> Dict[str, Any]:
    """
    Combine war-roster metadata, live `/players/{tag}` profile data, and
    real `/players/{tag}/battlelog` `armyShareCode` records into a scout card payload.
    Never fabricates an army: if no attack `armyShareCode` is found in `battlelog`,
    marks `armyDetected = False` and sets exact failure reason.
    """
    player_tag = _format_tag(str(raw_player.get("tag") or war_member.get("tag", "")))
    player_name = str(raw_player.get("name") or war_member.get("name", "Unknown"))
    th_level = min(
        max(
            1,
            int(
                raw_player.get(
                    "townHallLevel",
                    war_member.get("townhallLevel", war_member.get("townHallLevel", 18)),
                )
            ),
        ),
        MAX_TOWN_HALL_LEVEL,
    )
    map_position = int(war_member.get("mapPosition", 0))
    trophies = int(raw_player.get("trophies", 0))
    war_stars = int(raw_player.get("warStars", 0))

    # Extract war attacks if CWL war is inWar or warEnded
    war_attacks = _extract_war_attacks(war_member, our_members_by_tag)
    if war_attacks:
        best_atk = max(
            war_attacks,
            key=lambda a: (a["stars"], a["destructionPercentage"]),
        )
        stars = best_atk["stars"]
        destruction = best_atk["destructionPercentage"]
    else:
        stars = 0
        destruction = 0.0

    # Real profile heroes & pets
    profile_heroes, active_equipment = _extract_real_profile_heroes(raw_player)
    pets_list: List[Dict[str, Any]] = []
    seen_pets: set[str] = set()
    for p in (raw_player.get("pets") or []) + (raw_player.get("troops") or []):
        if not isinstance(p, dict):
            continue
        p_name = str(p.get("name", "")).strip()
        if p_name in KNOWN_PET_NAMES and p_name not in seen_pets:
            seen_pets.add(p_name)
            pets_list.append({
                "name": p_name,
                "level": int(p.get("level", 1)),
                "maxLevel": int(p.get("maxLevel", 20)),
            })

    active_super_troops = [
        str(t.get("name", "")).strip()
        for t in (raw_player.get("troops") or [])
        if isinstance(t, dict) and t.get("superTroopIsActive") and t.get("name")
    ]

    # Extract real battlelog armies from `armyShareCode` using unified service
    recent_armies, battlelog_attacks, failure_reason = _extract_real_battlelog_armies(
        battlelog, max_distinct=3
    )

    raw_battle_items = (
        battlelog.get("items")
        if isinstance(battlelog, dict) and isinstance(battlelog.get("items"), list)
        else (battlelog if isinstance(battlelog, list) else [])
    )
    player_stats = (
        battlelog.get("playerArmyStats")
        if isinstance(battlelog, dict) and "playerArmyStats" in battlelog
        else compute_player_army_stats(raw_battle_items)
    )
    defenses_against = (
        battlelog.get("defensesAgainst")
        if isinstance(battlelog, dict) and "defensesAgainst" in battlelog
        else extract_defenses_against(raw_battle_items)
    )

    ranked_defenses = [
        it for it in raw_battle_items
        if isinstance(it, dict)
        and it.get("attack") is False
        and str(it.get("battleType") or "").lower() in ("ranked", "legend")
    ]
    three_star_defenses = extract_three_star_defenses(raw_battle_items)
    three_star_defense_count = len(three_star_defenses)
    primary_defense_army = (
        three_star_defenses[0]["armyName"] if three_star_defenses else None
    )

    if recent_armies:
        primary_army = recent_armies[0]
        if not war_attacks:
            stars = int(primary_army.get("stars", 0))
            destruction = float(primary_army.get("destructionPercentage", 0.0))

        troop_cards = [
            {
                "id": f"t_{t['id']}_{idx}",
                "unitId": t["id"],
                "name": t["name"],
                "count": t["count"],
                "level": 1,
                "housingSpace": t.get("housingSpace", 0),
                "totalHousingSpace": t.get("totalHousingSpace", 0),
                "superTroopIsActive": bool(t.get("superTroopIsActive", False)),
                "unknown": bool(t.get("unknown", False)),
            }
            for idx, t in enumerate(primary_army["troops"], start=1)
        ]
        spell_cards = [
            {
                "id": f"s_{s['id']}_{idx}",
                "spellId": s["id"],
                "name": s["name"],
                "count": s["count"],
                "level": 1,
                "housingSpace": s.get("housingSpace", 0),
                "unknown": bool(s.get("unknown", False)),
            }
            for idx, s in enumerate(primary_army["spells"], start=1)
        ]
        siege_card = None
        if primary_army["siegeMachines"]:
            sg = primary_army["siegeMachines"][0]
            siege_card = {
                "id": f"sg_{sg['id']}",
                "siegeId": sg["id"],
                "name": sg["name"],
                "count": sg["count"],
                "level": 1,
            }

        return {
            "playerTag": player_tag,
            "opponentName": player_name,
            "mapPosition": map_position,
            "townHallLevel": th_level,
            "trophies": trophies,
            "warStars": war_stars,
            "hasAttacked": len(war_attacks) > 0,
            "stars": stars,
            "destruction": destruction,
            "warAttacks": war_attacks,
            "battlelogAttacks": battlelog_attacks,
            "isCwl": is_cwl,
            "armyDetected": True,
            "armySource": primary_army.get("source", "ranked"),
            "sourceBadge": primary_army.get("sourceBadge", "Ranked"),
            "armySourceLabel": primary_army.get("sourceLabel", "En iyi ordu"),
            "armySummary": primary_army.get("summary", ""),
            "warning": primary_army.get("warning"),
            "otherArmiesCount": max(0, len(recent_armies) - 1),
            "armyName": primary_army["armyName"],
            "inferredArchetype": primary_army["armyName"],
            "armyShareCode": primary_army["armyShareCode"],
            "armyLink": primary_army["armyLink"],
            "activeSuperTroops": active_super_troops,
            "heroes": profile_heroes,
            "armyHeroes": primary_army["heroes"],
            "activeEquipment": active_equipment,
            "pets": pets_list,
            "troops": troop_cards,
            "spells": spell_cards,
            "siege": siege_card,
            "siegeMachines": primary_army["siegeMachines"],
            "clanCastle": primary_army["clanCastle"],
            "recentArmies": recent_armies,
            "playerArmyStats": player_stats,
            "defensesAgainst": defenses_against,
            "threeStarDefenses": three_star_defenses,
            "threeStarDefenseCount": three_star_defense_count,
            "totalRankedDefenses": len(ranked_defenses),
            "primaryDefenseArmy": primary_defense_army,
        }

    # No valid attack army with armyShareCode found -> DO NOT FABRICATE AN ARMY, report distinct failure reason
    actual_reason = (
        failure_reason
        or (battlelog.get("reason") if isinstance(battlelog, dict) else None)
        or "Saldırı kaydı yok"
    )
    return {
        "playerTag": player_tag,
        "opponentName": player_name,
        "mapPosition": map_position,
        "townHallLevel": th_level,
        "trophies": trophies,
        "warStars": war_stars,
        "hasAttacked": len(war_attacks) > 0,
        "stars": stars,
        "destruction": destruction,
        "warAttacks": war_attacks,
        "battlelogAttacks": battlelog_attacks,
        "isCwl": is_cwl,
        "armyDetected": False,
        "armySource": "none",
        "failureReason": actual_reason,
        "sourceBadge": actual_reason,
        "armySourceLabel": actual_reason,
        "armySummary": "",
        "warning": None,
        "otherArmiesCount": 0,
        "armyName": actual_reason,
        "inferredArchetype": actual_reason,
        "armyShareCode": "",
        "armyLink": "",
        "activeSuperTroops": active_super_troops,
        "heroes": profile_heroes,
        "armyHeroes": [],
        "activeEquipment": active_equipment,
        "pets": pets_list,
        "troops": [],
        "spells": [],
        "siege": None,
        "siegeMachines": [],
        "clanCastle": [],
        "recentArmies": [],
        "playerArmyStats": player_stats,
        "defensesAgainst": defenses_against,
        "threeStarDefenses": three_star_defenses,
        "threeStarDefenseCount": three_star_defense_count,
        "totalRankedDefenses": len(ranked_defenses),
        "primaryDefenseArmy": primary_defense_army,
    }


async def _fetch_player_and_battlelog(
    api_client: CoCAPIClient,
    p_tag: str,
    fallback_name: str,
    fallback_th: int,
    rate_limiter: AsyncRateLimiter,
    redis_cache: Optional[Any] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Concurrently fetch `/players/%23{playerTag}` and decoded `/players/%23{playerTag}/battlelog`
    using the shared battle log service with exponential backoff on 429/5xx and Redis/in-memory cache.
    """
    norm_tag = sanitize_tag(p_tag)

    async def _get_profile() -> Dict[str, Any]:
        try:
            async with rate_limiter:
                prof = await api_client.get_player(norm_tag)
            if isinstance(prof, dict):
                return prof
        except Exception as exc:
            logger.warning("Could not fetch profile for opponent %s: %s", p_tag, exc)
        return {
            "tag": _format_tag(p_tag),
            "name": fallback_name,
            "townHallLevel": fallback_th,
        }

    async def _get_battlelog() -> Dict[str, Any]:
        async with rate_limiter:
            return await fetch_and_enrich_player_battlelog(
                api_client=api_client,
                player_tag=norm_tag,
                cache=redis_cache,
            )

    return await asyncio.gather(_get_profile(), _get_battlelog())


# ---------------------------------------------------------------------------
# Core Async CWL Scouting Pipeline
# ---------------------------------------------------------------------------

async def scout_cwl_clan(
    clan_tag: str,
    api_client: CoCAPIClient,
    redis_client: Optional[aioredis.Redis] = None,
    *,
    force_refresh: bool = False,
    rate_limit_per_sec: int = MAX_REQUESTS_PER_SECOND,
    fallback_to_clan_roster: bool = False,
    roster_filter: str = "cwl",
    round_number: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Execute the CWL scouting pipeline for `clan_tag` using real `/players/{tag}/battlelog`
    `armyShareCode` data. Fetches opponent players with bounded concurrency
    (`asyncio.Semaphore(12)`) and caches the result with a short TTL.
    """
    formatted_clan_tag = _format_tag(clan_tag)
    norm_clan_tag = _normalise_tag(clan_tag)
    canonical_cache_key = f"{CacheKey.cwl_scout(norm_clan_tag)}:{roster_filter}:round_{round_number or 'default'}"
    legacy_cache_key = f"coc:cwl:{formatted_clan_tag}:scout:{roster_filter}:round_{round_number or 'default'}"

    if redis_client is not None and not force_refresh:
        cached_raw = await redis_client.get(canonical_cache_key)
        if cached_raw and isinstance(cached_raw, (str, bytes)):
            try:
                return json.loads(cached_raw)
            except (json.JSONDecodeError, TypeError):
                pass

    rate_limiter = AsyncRateLimiter(max_calls=rate_limit_per_sec, period=1.0)
    player_semaphore = asyncio.Semaphore(MAX_CONCURRENT_PLAYER_FETCHES)

    # 1. Fetch CWL League Group (handle 404 NotFound when outside CWL week)
    league_group: Optional[Dict[str, Any]] = None
    try:
        async with rate_limiter:
            resp = await api_client.get_clan_league_group(formatted_clan_tag)
            if isinstance(resp, dict):
                league_group = resp
    except CoCAPIException as exc:
        logger.info("CWL leaguegroup not active for %s: %s", formatted_clan_tag, exc)
        if not fallback_to_clan_roster:
            raise

    matched_war = None
    rounds_summary: List[Dict[str, Any]] = []
    if isinstance(league_group, dict) and league_group.get("state") != "notInWar":
        matched_war, rounds_summary = await find_clan_cwl_war(
            api_client=api_client,
            clan_tag=formatted_clan_tag,
            league_group=league_group,
            rate_limiter=rate_limiter,
            round_number=round_number,
        )

    if matched_war is None:
        if round_number and rounds_summary:
            req_summary = next((r for r in rounds_summary if r["roundNumber"] == round_number), None)
            if req_summary and req_summary.get("state") == "unrevealed":
                return {
                    "status": "unrevealed",
                    "clanTag": formatted_clan_tag,
                    "season": league_group.get("season") if isinstance(league_group, dict) else None,
                    "roundNumber": round_number,
                    "roundsSummary": rounds_summary,
                    "warState": "unrevealed",
                    "isPreparationDay": False,
                    "message": "Sonraki tur rakibi henüz belli değil",
                    "opponents": [],
                    "opponentsByTag": {},
                    "cwlCount": 0,
                    "allCount": 0,
                    "rosterFilter": roster_filter,
                }

        if fallback_to_clan_roster:
            return await _scout_live_regular_war_or_clan_roster(
                clan_tag=formatted_clan_tag,
                api_client=api_client,
                rate_limiter=rate_limiter,
                player_semaphore=player_semaphore,
                roster_filter=roster_filter,
            )

        status_code = (
            "notInWar"
            if not isinstance(league_group, dict) or league_group.get("state") == "notInWar"
            else "noActiveWarFound"
        )
        logger.info("Clan %s is not currently in an active CWL war (%s).", formatted_clan_tag, status_code)
        return {
            "status": status_code,
            "clanTag": formatted_clan_tag,
            "season": league_group.get("season") if isinstance(league_group, dict) else None,
            "roundsSummary": rounds_summary,
            "opponents": [],
            "opponentsByTag": {},
            "cwlCount": 0,
            "allCount": 0,
            "rosterFilter": roster_filter,
        }

    round_number, war_tag, war_data, our_clan, opponent_clan = matched_war
    war_state = str(war_data.get("state", "preparation"))
    team_size = int(war_data.get("teamSize", len(opponent_clan.get("members", []))))

    # Index our clan's roster by normalised tag to enrich opponent war attacks
    our_members_by_tag: Dict[str, Dict[str, Any]] = {
        _normalise_tag(str(m.get("tag", ""))): m
        for m in (our_clan.get("members") or [])
        if m.get("tag")
    }

    # 3. Extract CWL war roster members (15 or 30 players), sorted by mapPosition
    cwl_roster_members: List[Dict[str, Any]] = sorted(
        [m for m in (opponent_clan.get("members") or []) if m.get("tag")],
        key=lambda m: int(m.get("mapPosition", 999)),
    )
    cwl_count = len(cwl_roster_members)

    # 4. Fetch full opponent clan members list (up to 50 players)
    opp_tag = str(opponent_clan.get("tag", "")).strip()
    all_clan_members: List[Dict[str, Any]] = []
    if opp_tag:
        try:
            async with rate_limiter:
                opp_clan_data = await api_client.get_clan(_format_tag(opp_tag))
                if isinstance(opp_clan_data, dict):
                    all_clan_members = opp_clan_data.get("memberList") or []
        except Exception as exc:
            logger.warning("Could not fetch clan memberList for %s: %s", opp_tag, exc)

    all_count = len(all_clan_members) if all_clan_members else cwl_count

    # Determine roster targets according to roster_filter
    # Note: CWL roster players always come first!
    if roster_filter == "all" and all_clan_members:
        cwl_tags = set(_normalise_tag(str(m.get("tag", ""))) for m in cwl_roster_members)
        non_cwl_members = [
            {
                "tag": m.get("tag"),
                "name": m.get("name", m.get("tag")),
                "townhallLevel": m.get("townHallLevel", 18),
                "mapPosition": m.get("clanRank", 999),
                "attacks": [],
            }
            for m in all_clan_members
            if _normalise_tag(str(m.get("tag", ""))) not in cwl_tags
        ]
        members_to_scout: List[Tuple[Dict[str, Any], bool]] = [
            (m, True) for m in cwl_roster_members
        ] + [
            (m, False) for m in non_cwl_members
        ]
    else:
        members_to_scout = [(m, True) for m in cwl_roster_members]

    # 5. Fetch opponent profiles & battlelogs with player_semaphore (12 concurrent)
    async def _fetch_and_scout_member(member: Dict[str, Any], is_cwl: bool) -> Optional[Dict[str, Any]]:
        p_tag = str(member.get("tag", ""))
        async with player_semaphore:
            raw_profile, raw_battlelog = await _fetch_player_and_battlelog(
                api_client=api_client,
                p_tag=p_tag,
                fallback_name=str(member.get("name", p_tag)),
                fallback_th=int(member.get("townhallLevel", member.get("townHallLevel", 18))),
                rate_limiter=rate_limiter,
                redis_cache=redis_client,
            )
        return _build_opponent_scout_entry(
            member,
            raw_profile,
            our_members_by_tag,
            battlelog=raw_battlelog,
            is_cwl=is_cwl,
        )

    scouted_results = await asyncio.gather(
        *(_fetch_and_scout_member(m, is_cwl) for m, is_cwl in members_to_scout)
    )
    opponents_list: List[Dict[str, Any]] = [r for r in scouted_results if r is not None]
    opponents_by_tag: Dict[str, Dict[str, Any]] = {
        entry["playerTag"]: entry for entry in opponents_list
    }

    report: Dict[str, Any] = {
        "status": "ok",
        "clanTag": _format_tag(str(our_clan.get("tag", formatted_clan_tag))),
        "clanName": our_clan.get("name"),
        "opponentClan": {
            "tag": _format_tag(str(opponent_clan.get("tag", ""))),
            "name": opponent_clan.get("name"),
            "clanLevel": opponent_clan.get("clanLevel"),
            "stars": opponent_clan.get("stars", 0),
            "destructionPercentage": opponent_clan.get("destructionPercentage", 0.0),
            "attacks": opponent_clan.get("attacks", 0),
            "badgeUrls": opponent_clan.get("badgeUrls"),
        },
        "season": league_group.get("season"),
        "roundNumber": round_number or matched_war[0],
        "roundsSummary": rounds_summary,
        "warTag": _format_tag(war_tag),
        "warState": war_state,
        "isPreparationDay": war_state.lower() == "preparation",
        "teamSize": team_size,
        "opponentCount": len(opponents_list),
        "cwlCount": cwl_count,
        "allCount": all_count,
        "rosterFilter": roster_filter,
        "opponents": opponents_list,
        "opponentsByTag": opponents_by_tag,
        "clanArmyMeta": compute_clan_army_meta(opponents_list),
    }

    # 5. Cache in Redis with war-state-aware TTL
    if redis_client is not None and opponents_list:
        ttl_seconds = (
            int(TTL.CWL_BATTLE_WINDOW_WAR.value)
            if war_state.lower() == "inwar"
            else int(TTL.CWL_PREP_DAY_WAR.value)
        )
        serialized = json.dumps(report)
        await redis_client.set(canonical_cache_key, serialized, ex=ttl_seconds)
        await redis_client.set(legacy_cache_key, serialized, ex=ttl_seconds)
        logger.info(
            "Cached CWL scout report for %s vs %s (%d opponents, state=%s, TTL=%ds).",
            formatted_clan_tag,
            report["opponentClan"]["tag"],
            len(opponents_list),
            war_state,
            ttl_seconds,
        )

    return report


async def _scout_live_regular_war_or_clan_roster(
    clan_tag: str,
    api_client: CoCAPIClient,
    rate_limiter: AsyncRateLimiter,
    player_semaphore: Optional[asyncio.Semaphore] = None,
    roster_filter: str = "cwl",
) -> Dict[str, Any]:
    """
    When a clan is outside the CWL window, fetch its live `/currentwar` opponent
    roster (if in a regular Clan War) or its live `/clans/{tag}` member roster
    from the official Supercell API with `asyncio.Semaphore(12)` concurrency.
    """
    formatted_clan_tag = _format_tag(clan_tag)
    sem = player_semaphore or asyncio.Semaphore(MAX_CONCURRENT_PLAYER_FETCHES)

    # 1. Try active regular Clan War (`/clans/%23{tag}/currentwar`)
    if hasattr(api_client, "get_clan_current_war"):
        try:
            async with rate_limiter:
                current_war = await api_client.get_clan_current_war(formatted_clan_tag)
            if (
                isinstance(current_war, dict)
                and current_war.get("state") in ("inWar", "preparation", "warEnded")
                and isinstance(current_war.get("opponent"), dict)
                and current_war["opponent"].get("members")
            ):
                our_clan = current_war.get("clan") or {}
                opponent_clan = current_war["opponent"]
                our_members_by_tag = {
                    _normalise_tag(str(m.get("tag", ""))): m
                    for m in (our_clan.get("members") or [])
                    if m.get("tag")
                }
                all_war_members = sorted(
                    [m for m in (opponent_clan.get("members") or []) if m.get("tag")],
                    key=lambda m: int(m.get("mapPosition", 999)),
                )
                cwl_count = min(15, len(all_war_members))
                all_count = len(all_war_members)

                if roster_filter == "cwl":
                    opp_members = all_war_members[:15]
                    is_cwl_flags = [True] * len(opp_members)
                else:
                    opp_members = all_war_members
                    is_cwl_flags = [i < 15 for i in range(len(opp_members))]

                async def _scout_cw_member(idx: int, member: Dict[str, Any], is_cwl: bool) -> Dict[str, Any]:
                    p_tag = str(member.get("tag", ""))
                    async with sem:
                        raw_profile, raw_battlelog = await _fetch_player_and_battlelog(
                            api_client=api_client,
                            p_tag=p_tag,
                            fallback_name=str(member.get("name", p_tag)),
                            fallback_th=int(member.get("townhallLevel", member.get("townHallLevel", 18))),
                            rate_limiter=rate_limiter,
                        )
                    return _build_opponent_scout_entry(
                        member,
                        raw_profile,
                        our_members_by_tag,
                        battlelog=raw_battlelog,
                        is_cwl=is_cwl,
                    )

                opponents_list = list(
                    await asyncio.gather(
                        *(_scout_cw_member(idx, m, is_cwl_flags[idx]) for idx, m in enumerate(opp_members))
                    )
                )
                return {
                    "status": "ok",
                    "clanTag": _format_tag(str(our_clan.get("tag", formatted_clan_tag))),
                    "clanName": our_clan.get("name"),
                    "opponentClan": {
                        "tag": _format_tag(str(opponent_clan.get("tag", ""))),
                        "name": opponent_clan.get("name"),
                        "clanLevel": opponent_clan.get("clanLevel"),
                        "stars": opponent_clan.get("stars", 0),
                        "destructionPercentage": opponent_clan.get("destructionPercentage", 0.0),
                        "attacks": opponent_clan.get("attacks", 0),
                    },
                    "season": "Clan War (Canlı)",
                    "roundNumber": 1,
                    "warState": str(current_war.get("state", "inWar")),
                    "teamSize": int(current_war.get("teamSize", len(opponents_list))),
                    "opponentCount": len(opponents_list),
                    "cwlCount": cwl_count,
                    "allCount": all_count,
                    "rosterFilter": roster_filter,
                    "opponents": opponents_list,
                    "opponentsByTag": {entry["playerTag"]: entry for entry in opponents_list},
                    "clanArmyMeta": compute_clan_army_meta(opponents_list),
                }
        except CoCAPIException:
            pass

    # 2. Fetch live clan roster (`/clans/%23{tag}`) and scout its members
    try:
        async with rate_limiter:
            clan_data = await api_client.get_clan(formatted_clan_tag)
    except CoCAPIException:
        clan_data = None

    if isinstance(clan_data, dict) and isinstance(clan_data.get("memberList"), list) and clan_data["memberList"]:
        all_members = clan_data["memberList"]
        cwl_count = min(15, len(all_members))
        all_count = len(all_members)

        if roster_filter == "cwl":
            raw_members = all_members[:15]
            is_cwl_flags = [True] * len(raw_members)
        else:
            raw_members = all_members
            is_cwl_flags = [i < 15 for i in range(len(raw_members))]

        async def _scout_roster_member(idx: int, member: Dict[str, Any], is_cwl: bool) -> Dict[str, Any]:
            p_tag = str(member.get("tag", ""))
            war_member_stub = {
                "tag": p_tag,
                "name": member.get("name", p_tag),
                "townhallLevel": member.get("townHallLevel", 18),
                "mapPosition": idx,
                "attacks": [],
            }
            async with sem:
                raw_profile, raw_battlelog = await _fetch_player_and_battlelog(
                    api_client=api_client,
                    p_tag=p_tag,
                    fallback_name=str(member.get("name", p_tag)),
                    fallback_th=int(member.get("townHallLevel", 18)),
                    rate_limiter=rate_limiter,
                )
            return _build_opponent_scout_entry(
                war_member_stub,
                raw_profile,
                {},
                battlelog=raw_battlelog,
                is_cwl=is_cwl,
            )

        opponents_list = list(
            await asyncio.gather(
                *(_scout_roster_member(idx, m, is_cwl_flags[idx - 1]) for idx, m in enumerate(raw_members, start=1))
            )
        )
        return {
            "status": "liveClanRoster",
            "clanTag": _format_tag(str(clan_data.get("tag", formatted_clan_tag))),
            "clanName": clan_data.get("name"),
            "opponentClan": {
                "tag": _format_tag(str(clan_data.get("tag", formatted_clan_tag))),
                "name": f"{clan_data.get('name', formatted_clan_tag)} (Canlı Klan Kadrosu)",
                "clanLevel": clan_data.get("clanLevel"),
                "stars": 0,
                "destructionPercentage": 0.0,
                "attacks": 0,
            },
            "season": clan_data.get("warLeague", {}).get("name", "CWL Kadro Analizi"),
            "roundNumber": 1,
            "warState": "liveRoster",
            "teamSize": len(opponents_list),
            "opponentCount": len(opponents_list),
            "cwlCount": cwl_count,
            "allCount": all_count,
            "rosterFilter": roster_filter,
            "opponents": opponents_list,
            "opponentsByTag": {entry["playerTag"]: entry for entry in opponents_list},
            "clanArmyMeta": compute_clan_army_meta(opponents_list),
        }

    return {
        "status": "notInWar",
        "clanTag": formatted_clan_tag,
        "season": None,
        "opponents": [],
        "opponentsByTag": {},
    }


async def _run_cwl_scout(clan_tag: str) -> Dict[str, Any]:
    """Standalone async runner used by Celery worker task."""
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    api_client = CoCAPIClient(api_token=API_TOKEN, redis_client=redis_client)

    try:
        return await scout_cwl_clan(
            clan_tag=clan_tag,
            api_client=api_client,
            redis_client=redis_client,
            force_refresh=True,
        )
    finally:
        await api_client.close()
        await redis_client.aclose()


@shared_task(name="cwl_scout_pipeline")
def scout_cwl_prep_day(clan_tag: str) -> Dict[str, Any]:
    """
    Celery task to run the CWL scouting and army inference pipeline.
    """
    return asyncio.run(_run_cwl_scout(clan_tag))
