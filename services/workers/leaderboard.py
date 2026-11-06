"""
Leaderboard Bulk Ingestion & Real Battlelog Meta Army Engine
============================================================
Scans top global / Legend League players with cursor pagination and rate-limit
protection, analyzes real player profiles and battlelog `armyShareCode` records,
groups identical main-troop combinations, and computes empirical usage rates
(`usagePct` / `pick_rate %`) and 3-star rates (`threeStarRatePct`) strictly from
real Clash of Clans API data.

Core Rule:
  - Never fabricate or hardcode any troop, spell, hero, equipment, siege machine,
    percentage, or army composition.
  - All copy links are generated from real `armyShareCode` strings via
    `build_copy_army_link(code)`.
  - If there is insufficient battlelog data, return `"Yeterli veri yok"` with
    empty army recommendations instead of synthetic fallback data.
"""

from __future__ import annotations

import asyncio
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
import logging
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import redis.asyncio as aioredis
from celery import shared_task
from dotenv import load_dotenv

from cache.redis_strategy import CacheKey, TTL
from schemas.pydantic.coc_models import MAX_TOWN_HALL_LEVEL
from services.api.client import CoCAPIClient, CoCAPIException
from services.army_parser.inference import (
    EQUIPMENT_BY_HERO,
    EQUIPMENT_TO_HERO_AND_RARITY,
    KNOWN_HERO_NAMES,
    KNOWN_PET_NAMES,
)
from services.army_parser.unit_registry import (
    TROOP_REGISTRY,
    SPELL_REGISTRY,
    SIEGE_REGISTRY,
    UnitCategory,
)
from services.army_parser.parser import (
    build_copy_army_link,
    derive_army_name,
    get_valid_super_troops,
    parse_army_share_code,
)
from services.workers.cwl_scout import AsyncRateLimiter, MAX_REQUESTS_PER_SECOND

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env", override=True)
logger = logging.getLogger(__name__)

API_TOKEN = os.environ.get("COC_API_TOKEN", "").strip().strip('"').strip("'")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

DEFAULT_PAGE_SIZE = 200
MAX_CONCURRENCY = 10

# Legend League tier IDs from official league tier data
LEGEND_TIER_IDS = {105000034, 105000035, 105000036}
LEGEND_LEAGUE_ID = 29000022

# Known Siege Machine names in CoC API `troops` list
KNOWN_SIEGE_MACHINE_NAMES: Tuple[str, ...] = (
    "Wall Wrecker",
    "Battle Blimp",
    "Stone Slammer",
    "Siege Barracks",
    "Log Launcher",
    "Flame Flinger",
    "Battle Drill",
    "Troop Launcher",
    "Sky Wagon",
)


class ProfileFetchResult(list):
    """
    List of player profiles that also transparently carries `failed_count`
    (inaccessible or empty battlelog players) without breaking list operations.
    """

    def __init__(self, items=None, failed_count: int = 0):
        super().__init__(items or [])
        self.failed_count = failed_count


# ---------------------------------------------------------------------------
# 1. Pagination + Rate-Limited Leaderboard & Profile Fetching
# ---------------------------------------------------------------------------

async def fetch_top_leaderboard_players(
    api_client: CoCAPIClient,
    *,
    top_n: int = 200,
    sample_size: Optional[int] = None,
    location_id: str = "global",
    page_size: int = DEFAULT_PAGE_SIZE,
    rate_limiter: Optional[AsyncRateLimiter] = None,
) -> List[Dict[str, Any]]:
    """
    Paginate through `/locations/{location_id}/rankings/players` with `limit=200`
    and `after` cursor up to `sample_size` / `top_n` players while respecting
    rate limits. Sorts results by current season trophies descending.
    """
    target_n = sample_size if sample_size is not None else top_n
    limiter = rate_limiter or AsyncRateLimiter(max_calls=MAX_REQUESTS_PER_SECOND, period=1.0)
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    effective_page_size = max(1, min(page_size, target_n, DEFAULT_PAGE_SIZE))
    max_pages = max(1, math.ceil(target_n / effective_page_size))

    after_cursor: Optional[str] = None
    pages_fetched = 0
    all_players: List[Dict[str, Any]] = []

    while pages_fetched < max_pages and len(all_players) < target_n:
        retries = 3
        response = None
        for attempt in range(retries):
            try:
                async with semaphore:
                    async with limiter:
                        page_limit = min(effective_page_size, target_n - len(all_players))
                        response = await api_client.get_global_player_rankings(
                            location_id=location_id,
                            limit=page_limit,
                            after=after_cursor,
                        )
                break
            except CoCAPIException as exc:
                if attempt < retries - 1:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                else:
                    logger.error("Error fetching leaderboard page %d: %s", pages_fetched + 1, exc)
                    break

        if not isinstance(response, dict):
            break

        items = response.get("items") or []
        if not items:
            break

        remaining_needed = target_n - len(all_players)
        all_players.extend(items[:remaining_needed])

        after_cursor = response.get("paging", {}).get("cursors", {}).get("after")
        pages_fetched += 1

        if not after_cursor:
            break

    # Sort descending by trophies
    all_players.sort(key=lambda p: int(p.get("trophies", 0)), reverse=True)
    return all_players[:target_n]


async def fetch_profiles_for_rankings(
    api_client: CoCAPIClient,
    ranking_items: List[Dict[str, Any]],
    *,
    rate_limiter: Optional[AsyncRateLimiter] = None,
    fetch_battlelog: bool = True,
    concurrency_limit: int = MAX_CONCURRENCY,
) -> ProfileFetchResult:
    """
    Fetch `/players/%23{tag}` AND `/players/%23{tag}/battlelog` in parallel for
    the ranked players using `asyncio.gather`, `asyncio.Semaphore(15)`, and
    `AsyncRateLimiter(max_calls=10, period=1.0)`.

    Retries on 429/5xx with exponential backoff.
    Tracks failed or empty battlelog players and returns a `ProfileFetchResult`.
    """
    limiter = rate_limiter or AsyncRateLimiter(max_calls=MAX_REQUESTS_PER_SECOND, period=1.0)
    semaphore = asyncio.Semaphore(concurrency_limit)
    has_battlelog_method = fetch_battlelog and hasattr(api_client, "get_player_battlelog")

    failed_counter = 0

    async def _fetch_with_backoff(coro_fn, max_retries: int = 4):
        for attempt in range(max_retries):
            try:
                return await coro_fn()
            except CoCAPIException as exc:
                if attempt < max_retries - 1:
                    status = getattr(exc, "status_code", 0)
                    base_delay = 1.0 if status in (429, 503) else 0.5
                    await asyncio.sleep(base_delay * (2 ** attempt))
                else:
                    raise

    async def _fetch_one(item: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
        tag = str(item.get("tag", "")).strip()
        if not tag:
            return item, True

        profile: Optional[Dict[str, Any]] = None
        is_failed = False

        try:
            async with semaphore:
                async with limiter:
                    res = await _fetch_with_backoff(lambda: api_client.get_player(tag))
                    if isinstance(res, dict) and res.get("tag"):
                        profile = dict(res)
        except Exception as exc:
            logger.debug("Failed to fetch profile for %s: %s", tag, exc)
            is_failed = True

        if profile is None:
            profile = dict(item)

        has_valid_bl = False
        if has_battlelog_method and "battlelog" not in profile:
            try:
                async with semaphore:
                    async with limiter:
                        bl_resp = await _fetch_with_backoff(lambda: api_client.get_player_battlelog(tag))
                if isinstance(bl_resp, dict) and isinstance(bl_resp.get("items"), list):
                    profile["battlelog"] = bl_resp["items"]
                    has_valid_bl = len(bl_resp["items"]) > 0
                elif isinstance(bl_resp, list):
                    profile["battlelog"] = bl_resp
                    has_valid_bl = len(bl_resp) > 0
                else:
                    profile["battlelog"] = []
            except Exception as exc:
                logger.debug("Battlelog fetch skipped/failed for %s: %s", tag, exc)
                profile["battlelog"] = []
        elif "battlelog" in profile and isinstance(profile["battlelog"], list):
            has_valid_bl = len(profile["battlelog"]) > 0

        if not has_valid_bl:
            is_failed = True

        return profile, is_failed

    results_with_status = await asyncio.gather(*(_fetch_one(item) for item in ranking_items))
    profiles: List[Dict[str, Any]] = []
    for prof, failed in results_with_status:
        profiles.append(prof)
        if failed:
            failed_counter += 1

    return ProfileFetchResult(profiles, failed_count=failed_counter)


# ---------------------------------------------------------------------------
# 2. Real Battlelog & Profile Meta Statistics Aggregator
# ---------------------------------------------------------------------------

def _extract_valid_battlelog_records(
    profiles: List[Dict[str, Any]],
    town_hall: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Extract strictly valid ranked attack records containing `armyShareCode`:
      1. ONLY take `attack = true`. Discard defense (`attack = false`) records completely.
      2. ONLY take ranked/legend/homevillage battles (`battleType in ("ranked", "legend", "homevillage")`).
      3. Deduplicate attacks using `(player_tag, battle_time, opponent_tag)`.
      4. Optionally filter by attacker's Town Hall level when `town_hall` is specified.
    """
    records: List[Dict[str, Any]] = []
    seen_dedup_keys: set[Tuple[str, str, str]] = set()

    for raw_player in profiles:
        if not isinstance(raw_player, dict):
            continue
        player_th = min(
            max(1, int(raw_player.get("townHallLevel", raw_player.get("townhallLevel", 18)))),
            MAX_TOWN_HALL_LEVEL,
        )

        if town_hall is not None and player_th != town_hall:
            continue

        player_tag = str(raw_player.get("tag", "")).strip()
        player_name = str(raw_player.get("name", "")).strip()
        bl_list = raw_player.get("battlelog")
        if not isinstance(bl_list, list):
            continue

        for entry in bl_list:
            if not isinstance(entry, dict):
                continue

            # STRICT RULE: Discard all defense records completely (attack must be True)
            if entry.get("attack") is not True:
                continue

            # STRICT RULE: Ranked / Legend / Home Village multiplayer battles only
            battle_type = str(entry.get("battleType") or "ranked").lower()
            if battle_type not in ("ranked", "legend", "homevillage"):
                continue

            code = str(entry.get("armyShareCode") or "").strip()
            if not code:
                continue

            battle_time = str(entry.get("battleTime", "")).strip()
            opp_obj = entry.get("opponent")
            opp_tag = ""
            if isinstance(opp_obj, dict):
                opp_tag = str(opp_obj.get("tag", "")).strip()
            if not opp_tag:
                opp_tag = str(entry.get("opponentPlayerTag", "")).strip()

            # Deduplicate attacks strictly by (player_tag, battle_time, opponent_tag) when provided
            if battle_time or opp_tag:
                dedup_key = (player_tag, battle_time, opp_tag)
                if dedup_key in seen_dedup_keys:
                    continue
                seen_dedup_keys.add(dedup_key)

            stars_raw = entry.get("stars", entry.get("attackStars", 0))
            stars = int(stars_raw) if isinstance(stars_raw, (int, float)) else 0
            dest_raw = entry.get("destructionPercentage", entry.get("destruction", 0.0))
            destruction = float(dest_raw) if isinstance(dest_raw, (int, float)) else 0.0

            decoded = parse_army_share_code(code)
            if not decoded.get("troops") and not decoded.get("heroes"):
                continue

            records.append({
                "playerTag": player_tag,
                "playerName": player_name,
                "townHallLevel": player_th,
                "battleType": battle_type,
                "battleTime": battle_time,
                "opponentTag": opp_tag,
                "attack": True,
                "stars": stars,
                "destructionPercentage": destruction,
                "armyShareCode": code,
                "decoded": decoded,
            })

    return records


def analyze_meta_statistics(
    profiles: List[Dict[str, Any]],
    *,
    town_hall: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Analyze real player profiles and their battlelogs and compute usage percentages
    (`usagePct`, `pickRatePct`, `pick_rate`) strictly from real API data.

    Pick rate denominator for all items (hero equipment, pets, super troops,
    troops, spells, siege machines) is `total_ranked_attacks`.
    """
    total_players = len(profiles)
    filtered_profiles = (
        [
            p for p in profiles
            if min(max(1, int(p.get("townHallLevel", p.get("townhallLevel", 18)))), MAX_TOWN_HALL_LEVEL) == town_hall
        ]
        if town_hall in (16, 17, 18)
        else list(profiles)
    )
    filtered_players_count = len(filtered_profiles)

    th_counter: Counter[int] = Counter()
    for raw_player in profiles:
        th = min(
            max(1, int(raw_player.get("townHallLevel", raw_player.get("townhallLevel", 18)))),
            MAX_TOWN_HALL_LEVEL,
        )
        th_counter[th] += 1

    valid_super_troops = get_valid_super_troops()
    valid_super_troop_names = set(valid_super_troops.values())
    known_siege_set = set(KNOWN_SIEGE_MACHINE_NAMES)

    # 1. Profile-level units for average level & % Max Seviye
    hero_level_sums: Dict[str, List[int]] = defaultdict(list)
    hero_maxed_counter: Counter[str] = Counter()
    pet_profile_levels: Dict[str, List[int]] = defaultdict(list)
    troop_level_sums: Dict[str, List[int]] = defaultdict(list)
    troop_maxed_counter: Counter[str] = Counter()
    spell_level_sums: Dict[str, List[int]] = defaultdict(list)
    spell_maxed_counter: Counter[str] = Counter()
    siege_level_sums: Dict[str, List[int]] = defaultdict(list)
    siege_maxed_counter: Counter[str] = Counter()

    for raw_player in filtered_profiles:
        for h in raw_player.get("heroes") or []:
            if not isinstance(h, dict) or h.get("village", "home") != "home":
                continue
            h_name = str(h.get("name", "")).strip()
            if not h_name:
                continue
            lvl = int(h.get("level", 1))
            max_lvl = max(lvl, int(h.get("maxLevel", lvl)))
            hero_level_sums[h_name].append(lvl)
            if lvl >= max_lvl - 1:
                hero_maxed_counter[h_name] += 1

        seen_pets_for_player: set[str] = set()
        for p in (raw_player.get("pets") or []) + (raw_player.get("troops") or []):
            if not isinstance(p, dict):
                continue
            p_name = str(p.get("name", "")).strip()
            if p_name in KNOWN_PET_NAMES and p_name not in seen_pets_for_player:
                seen_pets_for_player.add(p_name)
                lvl = int(p.get("level", 1))
                pet_profile_levels[p_name].append(lvl)

        for t in raw_player.get("troops") or []:
            if not isinstance(t, dict) or t.get("village", "home") != "home":
                continue
            t_name = str(t.get("name", "")).strip()
            if not t_name or t_name in KNOWN_PET_NAMES:
                continue
            lvl = int(t.get("level", 1))
            max_lvl = max(lvl, int(t.get("maxLevel", lvl)))
            if t_name in known_siege_set:
                siege_level_sums[t_name].append(lvl)
                if lvl >= max_lvl - 1:
                    siege_maxed_counter[t_name] += 1
            else:
                troop_level_sums[t_name].append(lvl)
                if lvl >= max_lvl - 1:
                    troop_maxed_counter[t_name] += 1

        for s in raw_player.get("spells") or []:
            if not isinstance(s, dict) or s.get("village", "home") != "home":
                continue
            s_name = str(s.get("name", "")).strip()
            if not s_name:
                continue
            lvl = int(s.get("level", 1))
            max_lvl = max(lvl, int(s.get("maxLevel", lvl)))
            spell_level_sums[s_name].append(lvl)
            if lvl >= max_lvl - 1:
                spell_maxed_counter[s_name] += 1

    # 2. Extract valid ranked attack records strictly
    ranked_attacks = _extract_valid_battlelog_records(filtered_profiles, town_hall=town_hall)
    total_ranked_attacks = len(ranked_attacks)

    if total_ranked_attacks == 0:
        return {
            "hasSufficientData": False,
            "message": "Yeterli veri yok",
            "totalPlayersAnalyzed": total_players,
            "filteredPlayersCount": filtered_players_count,
            "totalRankedAttacksAnalyzed": 0,
            "totalBattlesAnalyzed": 0,
            "townHallDistribution": {str(k): v for k, v in sorted(th_counter.items(), reverse=True)},
            "heroUsage": [],
            "heroEquipmentPairs": [],
            "equipmentByHero": {h: [] for h in KNOWN_HERO_NAMES},
            "equipmentUsage": [],
            "petUsage": [],
            "petUsageByHero": {h: [] for h in KNOWN_HERO_NAMES},
            "superTroopUsage": [],
            "troopUsage": [],
            "spellUsage": [],
            "siegeUsage": [],
            "archetypeUsage": [],
        }

    # 3. Counters across strictly ranked attacks
    pair_counter_by_hero: Dict[str, Counter[str]] = defaultdict(Counter)
    global_pair_counter: Counter[Tuple[str, str]] = Counter()
    equipment_counter: Counter[Tuple[str, str]] = Counter()
    hero_attack_counter: Counter[str] = Counter()

    pet_counter: Counter[str] = Counter()
    hero_pet_counter: Dict[str, Counter[str]] = defaultdict(Counter)
    super_troop_counter: Counter[str] = Counter()

    troop_usage_counter: Counter[str] = Counter()
    spell_usage_counter: Counter[str] = Counter()
    siege_usage_counter: Counter[str] = Counter()

    archetype_counter: Counter[str] = Counter()
    archetype_three_stars: Counter[str] = Counter()
    archetype_total_battles: Counter[str] = Counter()

    for rec in ranked_attacks:
        decoded = rec["decoded"]
        army_name = str(decoded.get("armyName") or "Bilinmeyen Ordu")
        archetype_counter[army_name] += 1
        archetype_total_battles[army_name] += 1
        if rec["stars"] >= 3:
            archetype_three_stars[army_name] += 1

        # Troops, Spells, Siege
        for t_slot in decoded.get("troops") or []:
            t_name = str(t_slot.get("name", "")).strip()
            if t_name:
                troop_usage_counter[t_name] += 1
                if t_name in valid_super_troop_names:
                    super_troop_counter[t_name] += 1

        for s_slot in decoded.get("spells") or []:
            s_name = str(s_slot.get("name", "")).strip()
            if s_name:
                spell_usage_counter[s_name] += 1

        for sg_slot in decoded.get("siegeMachines") or []:
            sg_name = str(sg_slot.get("name", "")).strip()
            if sg_name:
                siege_usage_counter[sg_name] += 1

        # Heroes, Equipment, Pets
        for h_slot in decoded.get("heroes") or []:
            if h_slot.get("unknown"):
                continue
            h_name = str(h_slot.get("name", "")).strip()
            if not h_name:
                continue

            hero_attack_counter[h_name] += 1

            # Hero Equipment
            eq_names = [
                str(e.get("name", "")).strip()
                for e in (h_slot.get("equipment") or [])
                if isinstance(e, dict) and e.get("name") and not e.get("unknown")
            ]
            if eq_names:
                for en in eq_names:
                    equipment_counter[(h_name, en)] += 1
                pair_label = f"{eq_names[0]} + {eq_names[1]}" if len(eq_names) >= 2 else eq_names[0]
                pair_counter_by_hero[h_name][pair_label] += 1
                global_pair_counter[(h_name, pair_label)] += 1

            # Pet
            pet_obj = h_slot.get("pet")
            if isinstance(pet_obj, dict) and pet_obj.get("name") and not pet_obj.get("unknown"):
                p_name = str(pet_obj["name"]).strip()
                if p_name:
                    pet_counter[p_name] += 1
                    hero_pet_counter[h_name][p_name] += 1

    # Hero Equipment Pairs breakdown
    equipment_by_hero: Dict[str, List[Dict[str, Any]]] = {h: [] for h in KNOWN_HERO_NAMES}
    for h_name in KNOWN_HERO_NAMES:
        h_attacks = hero_attack_counter.get(h_name, 0)
        pair_counts = pair_counter_by_hero.get(h_name, Counter())
        denom = max(1, h_attacks)
        equipment_by_hero[h_name] = [
            {
                "hero": h_name,
                "pair": pair_name,
                "equipments": [p.strip() for p in pair_name.split("+")],
                "count": cnt,
                "usagePct": round((cnt / denom) * 100.0, 2),
                "pickRatePct": round((cnt / denom) * 100.0, 2),
                "pick_rate": round((cnt / denom) * 100.0, 2),
            }
            for pair_name, cnt in pair_counts.most_common(10)
        ]

    hero_equipment_pairs = []
    for (h_name, pair_name), cnt in global_pair_counter.most_common(25):
        h_attacks = hero_attack_counter.get(h_name, total_ranked_attacks)
        pct = round((cnt / max(1, h_attacks)) * 100.0, 2)
        hero_equipment_pairs.append({
            "hero": h_name,
            "pair": pair_name,
            "equipments": [p.strip() for p in pair_name.split("+")],
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
        })

    equipment_usage = []
    seen_equipment: set[Tuple[str, str]] = set()
    for (h_name, eq_name), cnt in equipment_counter.most_common():
        seen_equipment.add((h_name, eq_name))
        h_attacks = hero_attack_counter.get(h_name, total_ranked_attacks)
        pct = round((cnt / max(1, h_attacks)) * 100.0, 2)
        equipment_usage.append({
            "hero": h_name,
            "name": eq_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
        })
    # Ensure every single equipment for every hero is included
    for h_name, eq_dict in sorted(EQUIPMENT_BY_HERO.items()):
        for eq_name in sorted(eq_dict.keys()):
            if (h_name, eq_name) not in seen_equipment:
                equipment_usage.append({
                    "hero": h_name,
                    "name": eq_name,
                    "count": 0,
                    "usagePct": 0.0,
                    "pickRatePct": 0.0,
                    "pick_rate": 0.0,
                })

    pet_avg_levels = {
        p: round(sum(lvls) / len(lvls), 1)
        for p, lvls in pet_profile_levels.items()
        if lvls
    }

    pet_usage = []
    seen_pets: set[str] = set()
    for p_name, cnt in pet_counter.most_common():
        seen_pets.add(p_name)
        pct = round((cnt / total_ranked_attacks) * 100.0, 2)
        avg_lvl = pet_avg_levels.get(p_name)
        pet_usage.append({
            "name": p_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "avgLevel": avg_lvl,
            "levelSource": "profil seviyesi" if avg_lvl is not None else None,
        })
    # Ensure every single pet is included
    for p_name in sorted(KNOWN_PET_NAMES):
        if p_name not in seen_pets:
            pet_usage.append({
                "name": p_name,
                "count": 0,
                "usagePct": 0.0,
                "pickRatePct": 0.0,
                "pick_rate": 0.0,
                "avgLevel": pet_avg_levels.get(p_name),
                "levelSource": "profil seviyesi" if pet_avg_levels.get(p_name) is not None else None,
            })

    pet_usage_by_hero: Dict[str, List[Dict[str, Any]]] = {h: [] for h in KNOWN_HERO_NAMES}
    for h_name in KNOWN_HERO_NAMES:
        h_attacks = hero_attack_counter.get(h_name, 0)
        for p_name, cnt in hero_pet_counter[h_name].most_common():
            pct = round((cnt / h_attacks) * 100.0, 2) if h_attacks > 0 else 0.0
            avg_lvl = pet_avg_levels.get(p_name)
            pet_usage_by_hero[h_name].append({
                "hero": h_name,
                "name": p_name,
                "count": cnt,
                "usagePct": pct,
                "pickRatePct": pct,
                "pick_rate": pct,
                "avgLevel": avg_lvl,
                "levelSource": "profil seviyesi" if avg_lvl is not None else None,
            })

    super_troop_usage = []
    seen_supers: set[str] = set()
    for st_name, cnt in super_troop_counter.most_common():
        seen_supers.add(st_name)
        pct = round((cnt / total_ranked_attacks) * 100.0, 2)
        super_troop_usage.append({
            "name": st_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
        })
    for st_name in sorted(valid_super_troop_names):
        if st_name not in seen_supers:
            super_troop_usage.append({
                "name": st_name,
                "count": 0,
                "usagePct": 0.0,
                "pickRatePct": 0.0,
                "pick_rate": 0.0,
            })

    troop_usage = []
    seen_troops: set[str] = set()
    for t_name, cnt in troop_usage_counter.most_common():
        seen_troops.add(t_name)
        pct = round(min(100.0, (cnt / total_ranked_attacks) * 100.0), 2)
        troop_usage.append({
            "name": t_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "maxedCount": troop_maxed_counter.get(t_name, 0),
            "maxedPct": round((troop_maxed_counter.get(t_name, 0) / max(1, filtered_players_count)) * 100.0, 2),
            "avgLevel": round(sum(troop_level_sums[t_name]) / len(troop_level_sums[t_name]), 1)
            if troop_level_sums.get(t_name)
            else 1.0,
        })
    canonical_troops = {
        meta.name for meta in TROOP_REGISTRY.values()
        if meta.category != UnitCategory.SUPER_TROOP and meta.category != UnitCategory.BUILDER_TROOP
    }
    for t_name in sorted(canonical_troops):
        if t_name not in seen_troops:
            troop_usage.append({
                "name": t_name,
                "count": 0,
                "usagePct": 0.0,
                "pickRatePct": 0.0,
                "pick_rate": 0.0,
                "maxedCount": 0,
                "maxedPct": 0.0,
                "avgLevel": 1.0,
            })

    spell_usage = []
    seen_spells: set[str] = set()
    for s_name, cnt in spell_usage_counter.most_common():
        seen_spells.add(s_name)
        pct = round(min(100.0, (cnt / total_ranked_attacks) * 100.0), 2)
        spell_usage.append({
            "name": s_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "maxedCount": spell_maxed_counter.get(s_name, 0),
            "maxedPct": round((spell_maxed_counter.get(s_name, 0) / max(1, filtered_players_count)) * 100.0, 2),
            "avgLevel": round(sum(spell_level_sums[s_name]) / len(spell_level_sums[s_name]), 1)
            if spell_level_sums.get(s_name)
            else 1.0,
        })
    canonical_spells = {meta.name for meta in SPELL_REGISTRY.values()}
    for s_name in sorted(canonical_spells):
        if s_name not in seen_spells:
            spell_usage.append({
                "name": s_name,
                "count": 0,
                "usagePct": 0.0,
                "pickRatePct": 0.0,
                "pick_rate": 0.0,
                "maxedCount": 0,
                "maxedPct": 0.0,
                "avgLevel": 1.0,
            })

    siege_usage = []
    seen_sieges: set[str] = set()
    for sg_name, cnt in siege_usage_counter.most_common():
        seen_sieges.add(sg_name)
        pct = round(min(100.0, (cnt / total_ranked_attacks) * 100.0), 2)
        siege_usage.append({
            "name": sg_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "maxedCount": siege_maxed_counter.get(sg_name, 0),
            "maxedPct": round((siege_maxed_counter.get(sg_name, 0) / max(1, filtered_players_count)) * 100.0, 2),
            "avgLevel": round(sum(siege_level_sums[sg_name]) / len(siege_level_sums[sg_name]), 1)
            if siege_level_sums.get(sg_name)
            else 5.0,
        })
    canonical_sieges = set(KNOWN_SIEGE_MACHINE_NAMES) | {meta.name for meta in SIEGE_REGISTRY.values()}
    for sg_name in sorted(canonical_sieges):
        if sg_name not in seen_sieges:
            siege_usage.append({
                "name": sg_name,
                "count": 0,
                "usagePct": 0.0,
                "pickRatePct": 0.0,
                "pick_rate": 0.0,
                "maxedCount": 0,
                "maxedPct": 0.0,
                "avgLevel": 5.0,
            })

    archetype_usage = []
    for arch_name, cnt in archetype_counter.most_common():
        pct = round((cnt / total_ranked_attacks) * 100.0, 2)
        tot_b = archetype_total_battles.get(arch_name, 0)
        three_s = archetype_three_stars.get(arch_name, 0)
        empirical_3star = round((three_s / tot_b) * 100.0, 1) if tot_b > 0 else 0.0
        archetype_usage.append({
            "archetype": arch_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "threeStarRatePct": empirical_3star,
        })

    hero_avg_levels = {
        h: round(sum(lvls) / len(lvls), 1)
        for h, lvls in hero_level_sums.items()
        if lvls
    }

    hero_usage = []
    for h_name in sorted(KNOWN_HERO_NAMES):
        cnt = hero_attack_counter.get(h_name, 0)
        pct = round((cnt / total_ranked_attacks) * 100.0, 2)
        avg_lvl = hero_avg_levels.get(h_name)
        maxed_cnt = hero_maxed_counter.get(h_name, 0)
        maxed_pct = (
            round((maxed_cnt / max(1, filtered_players_count)) * 100.0, 2)
            if filtered_players_count > 0
            else 0.0
        )
        hero_usage.append({
            "name": h_name,
            "count": cnt,
            "usagePct": pct,
            "pickRatePct": pct,
            "pick_rate": pct,
            "avgLevel": avg_lvl,
            "maxedCount": maxed_cnt,
            "maxedPct": maxed_pct,
        })
    hero_usage.sort(key=lambda x: (x["count"], x["name"]), reverse=True)

    return {
        "hasSufficientData": True,
        "message": None,
        "totalPlayersAnalyzed": total_players,
        "filteredPlayersCount": filtered_players_count,
        "totalRankedAttacksAnalyzed": total_ranked_attacks,
        "totalBattlesAnalyzed": total_ranked_attacks,
        "townHallDistribution": {str(k): v for k, v in sorted(th_counter.items(), reverse=True)},
        "heroUsage": hero_usage,
        "heroEquipmentPairs": hero_equipment_pairs,
        "equipmentByHero": equipment_by_hero,
        "equipmentUsage": equipment_usage,
        "petUsage": pet_usage,
        "petUsageByHero": pet_usage_by_hero,
        "superTroopUsage": super_troop_usage,
        "troopUsage": troop_usage,
        "spellUsage": spell_usage,
        "siegeUsage": siege_usage,
        "archetypeUsage": archetype_usage,
    }


# ---------------------------------------------------------------------------
# 3. Real Battlelog Meta Army Clustering (`recommend_meta_armies`)
# ---------------------------------------------------------------------------

def _build_real_clustered_army(
    rank_idx: int,
    group_key: str,
    group_records: List[Dict[str, Any]],
    total_battles_in_scope: int,
    th_level: int,
) -> Dict[str, Any]:
    """
    Build a Meta Army recommendation entry strictly from a cluster of real
    battlelog `armyShareCode` records sharing the same main troop combination.
    """
    code_counter: Counter[str] = Counter(r["armyShareCode"] for r in group_records)
    rep_code, _ = code_counter.most_common(1)[0]
    decoded = parse_army_share_code(rep_code)

    group_count = len(group_records)
    three_star_count = sum(1 for r in group_records if r["stars"] >= 3)
    avg_destruction = (
        round(sum(r["destructionPercentage"] for r in group_records) / group_count, 1)
        if group_count > 0
        else 0.0
    )

    usage_pct = round((group_count / max(1, total_battles_in_scope)) * 100.0, 2)
    three_star_pct = round((three_star_count / max(1, group_count)) * 100.0, 1)

    hero_loadout: Dict[str, Any] = {}
    for h_slot in decoded.get("heroes") or []:
        h_name = str(h_slot.get("name", "")).strip()
        if not h_name:
            continue
        eq_names = [
            str(e.get("name", ""))
            for e in (h_slot.get("equipment") or [])
            if isinstance(e, dict) and e.get("name")
        ]
        pet_obj = h_slot.get("pet")
        pet_name = (
            str(pet_obj.get("name"))
            if isinstance(pet_obj, dict) and pet_obj.get("name")
            else None
        )
        hero_loadout[h_name] = {
            "primaryPair": eq_names,
            "pet": pet_name,
        }

    siege_list = decoded.get("siegeMachines") or []
    siege_obj = siege_list[0] if siege_list else None
    army_name = str(decoded.get("armyName") or group_key or "Gerçek Saldırı Ordusu")

    return {
        "id": f"real_meta_{th_level}_{rank_idx}",
        "rank": rank_idx,
        "name": army_name,
        "townHallLevel": th_level,
        "style": f"Gerçek Battle Log Analizi ({group_count} kayıt)",
        "sampleCount": group_count,
        "threeStarCount": three_star_count,
        "avgDestructionPct": avg_destruction,
        "usagePct": usage_pct,
        "pickRatePct": usage_pct,
        "pick_rate": usage_pct,
        "threeStarRatePct": three_star_pct,
        "heroLoadout": hero_loadout,
        "heroes": decoded.get("heroes", []),
        "troops": decoded.get("troops", []),
        "spells": decoded.get("spells", []),
        "siegeMachine": siege_obj,
        "siegeMachines": siege_list,
        "clanCastle": decoded.get("clanCastle", []),
        "clanCastleTroops": decoded.get("clanCastleTroops", []),
        "clanCastleSpells": decoded.get("clanCastleSpells", []),
        "totalTroopHousing": decoded.get("totalTroopHousing", 0),
        "totalSpellSpace": decoded.get("totalSpellSpace", 0),
        "armyShareCode": rep_code,
        "armyLink": build_copy_army_link(rep_code),
    }


def recommend_meta_armies(
    meta_stats: Optional[Dict[str, Any]] = None,
    *,
    town_hall: Optional[int] = None,
    profiles: Optional[List[Dict[str, Any]]] = None,
    max_recommendations: int = 5,
) -> Dict[str, Any]:
    """
    Cluster real battlelog `armyShareCode` records from `profiles` by identical
    hero set + main-troop combination `(tuple(sorted_heroes), main_troop_key)`,
    preserving naming like 'Thrower + Healer + Ruin Witch'.

    Calculates usage rate (`usagePct`) and 3-star success rate (`threeStarRatePct`)
    strictly from those real records.
    """
    battle_records = _extract_valid_battlelog_records(profiles or [], town_hall=None)
    target_ths = [town_hall] if town_hall in (16, 17, 18) else [16, 17, 18]

    if not battle_records:
        empty_by_th = {f"TH{th}": [] for th in target_ths}
        return {
            "hasSufficientData": False,
            "message": "Yeterli veri yok",
            "totalBattlesAnalyzed": 0,
            "supportedTownHalls": [16, 17, 18],
            "recommendationsByTownHall": empty_by_th,
            "topRecommendations": [],
        }

    # Group by (sorted_heroes, main_troop_key)
    global_groups: Dict[Tuple[Tuple[str, ...], str], List[Dict[str, Any]]] = defaultdict(list)
    by_th_groups: Dict[int, Dict[Tuple[Tuple[str, ...], str], List[Dict[str, Any]]]] = {
        16: defaultdict(list),
        17: defaultdict(list),
        18: defaultdict(list),
    }
    by_th_totals: Counter[int] = Counter()

    for rec in battle_records:
        decoded = rec["decoded"]
        main_troop_key = str(decoded.get("armyName") or decoded.get("troopSignature") or "Bilinmeyen Ordu")
        sorted_heroes = tuple(
            sorted(
                [
                    str(h["name"]).strip()
                    for h in (decoded.get("heroes") or [])
                    if isinstance(h, dict) and h.get("name") and not h.get("unknown")
                ]
            )
        )
        cluster_key = (sorted_heroes, main_troop_key)

        global_groups[cluster_key].append(rec)
        rec_th = int(rec.get("townHallLevel", 18))
        if rec_th in by_th_groups:
            by_th_groups[rec_th][cluster_key].append(rec)
            by_th_totals[rec_th] += 1

    total_global_battles = len(battle_records)

    sorted_global_keys = sorted(
        global_groups.keys(),
        key=lambda k: (len(global_groups[k]), sum(1 for r in global_groups[k] if r["stars"] >= 3)),
        reverse=True,
    )
    global_recommendations: List[Dict[str, Any]] = []
    for rank_idx, key in enumerate(sorted_global_keys[:max_recommendations], start=1):
        recs = global_groups[key]
        rep_th = int(recs[0].get("townHallLevel", town_hall or 18))
        global_recommendations.append(
            _build_real_clustered_army(
                rank_idx=rank_idx,
                group_key=key[1],  # main_troop_key
                group_records=recs,
                total_battles_in_scope=total_global_battles,
                th_level=rep_th,
            )
        )

    recommendations_by_th: Dict[str, List[Dict[str, Any]]] = {}
    for th in target_ths:
        th_groups = by_th_groups.get(th, {})
        th_total = by_th_totals.get(th, 0)
        if th_groups and th_total > 0:
            sorted_th_keys = sorted(
                th_groups.keys(),
                key=lambda k: (len(th_groups[k]), sum(1 for r in th_groups[k] if r["stars"] >= 3)),
                reverse=True,
            )
            th_list: List[Dict[str, Any]] = []
            for rank_idx, key in enumerate(sorted_th_keys[:max_recommendations], start=1):
                th_list.append(
                    _build_real_clustered_army(
                        rank_idx=rank_idx,
                        group_key=key[1],
                        group_records=th_groups[key],
                        total_battles_in_scope=th_total,
                        th_level=th,
                    )
                )
            recommendations_by_th[f"TH{th}"] = th_list
        else:
            recommendations_by_th[f"TH{th}"] = []

    top_recs = (
        recommendations_by_th.get(f"TH{town_hall}", []) or global_recommendations
        if town_hall in (16, 17, 18)
        else global_recommendations
    )

    return {
        "hasSufficientData": len(top_recs) > 0,
        "message": None if len(top_recs) > 0 else "Yeterli veri yok",
        "totalBattlesAnalyzed": total_global_battles,
        "supportedTownHalls": [16, 17, 18],
        "recommendationsByTownHall": recommendations_by_th,
        "topRecommendations": top_recs,
    }


# ---------------------------------------------------------------------------
# 4. Background Job Management for Large Sample Sizes (1,000 / 10,000)
# ---------------------------------------------------------------------------

class MetaBackgroundJob:
    """
    Manages background fetching and progressive analytics computation for
    large sample sizes (e.g. 1,000 or 10,000 players).
    """

    def __init__(
        self,
        job_id: str,
        target_n: int,
        town_hall: Optional[int],
        location_id: str,
        ranking_items: List[Dict[str, Any]],
        initial_profiles: List[Dict[str, Any]],
        initial_failed_count: int,
    ):
        self.job_id = job_id
        self.target_n = target_n
        self.town_hall = town_hall
        self.location_id = location_id
        self.ranking_items = ranking_items
        self.profiles: List[Dict[str, Any]] = list(initial_profiles)
        self.failed_count = initial_failed_count
        self.is_completed = False
        self.current_dashboard: Optional[Dict[str, Any]] = None
        self._async_task: Optional[asyncio.Task] = None

    def get_progress_dict(self) -> Dict[str, Any]:
        processed = len(self.profiles) + self.failed_count
        pct = round((processed / max(1, self.target_n)) * 100.0, 1)
        return {
            "processed": processed,
            "target": self.target_n,
            "percentage": min(100.0, pct),
            "message": f"{processed:,} / {self.target_n:,} oyuncu işlendi (%{pct:.1f})",
        }

    async def run(self, api_client: CoCAPIClient, redis_client: Optional[aioredis.Redis]):
        batch_size = 50
        remaining_items = self.ranking_items[len(self.profiles):]
        limiter = AsyncRateLimiter(max_calls=MAX_REQUESTS_PER_SECOND, period=1.0)

        for i in range(0, len(remaining_items), batch_size):
            chunk = remaining_items[i : i + batch_size]
            try:
                batch_result = await fetch_profiles_for_rankings(
                    api_client,
                    chunk,
                    rate_limiter=limiter,
                    concurrency_limit=MAX_CONCURRENCY,
                )
                self.profiles.extend(batch_result)
                self.failed_count += batch_result.failed_count
            except Exception as exc:
                logger.warning("Error fetching batch in background job %s: %s", self.job_id, exc)
                self.failed_count += len(chunk)

            meta_stats = analyze_meta_statistics(self.profiles, town_hall=self.town_hall)
            recommended = recommend_meta_armies(meta_stats, town_hall=self.town_hall, profiles=self.profiles)
            filtered_count = meta_stats.get("filteredPlayersCount", len(self.profiles))
            total_ranked = meta_stats.get("totalRankedAttacksAnalyzed", 0)

            self.current_dashboard = {
                "status": "ok",
                "hasSufficientData": bool(recommended.get("hasSufficientData") or meta_stats.get("hasSufficientData")),
                "message": None,
                "sampleSize": self.target_n,
                "targetTopPlayers": self.target_n,
                "totalPlayersAnalyzed": len(self.profiles),
                "filteredPlayersCount": filtered_count,
                "failedPlayersCount": self.failed_count,
                "totalRankedAttacksAnalyzed": total_ranked,
                "totalBattlesAnalyzed": total_ranked,
                "dataFetchedAt": datetime.now(timezone.utc).isoformat(),
                "townHallFilter": self.town_hall,
                "isProcessing": True,
                "progress": self.get_progress_dict(),
                "statistics": meta_stats,
                "metaArmies": recommended,
            }

            if redis_client is not None:
                cache_key = CacheKey.leaderboard_global(
                    f"meta_v3_{self.location_id}_n_{self.target_n}_th_{self.town_hall or 'all'}"
                )
                try:
                    await redis_client.set(
                        cache_key,
                        json.dumps(self.current_dashboard),
                        ex=int(TTL.LEADERBOARD_HOT.value),
                    )
                except Exception:
                    pass

        self.is_completed = True
        # Free memory: Discard raw player profiles and battle logs from memory
        self.profiles.clear()
        import gc
        gc.collect()

        if self.current_dashboard:
            self.current_dashboard["isProcessing"] = False
            self.current_dashboard["progress"] = {
                "processed": len(self.profiles) + self.failed_count,
                "target": self.target_n,
                "percentage": 100.0,
                "message": f"{len(self.profiles) + self.failed_count:,} / {self.target_n:,} oyuncu işlendi (%100.0)",
            }
            if redis_client is not None:
                cache_key = CacheKey.leaderboard_global(
                    f"meta_v3_{self.location_id}_n_{self.target_n}_th_{self.town_hall or 'all'}"
                )
                try:
                    await redis_client.set(cache_key, json.dumps(self.current_dashboard), ex=3600)
                except Exception:
                    pass


class MetaTaskManager:
    """Registry for running background meta analysis tasks."""

    _jobs: Dict[str, MetaBackgroundJob] = {}

    @classmethod
    def get_job(cls, job_id: str) -> Optional[MetaBackgroundJob]:
        return cls._jobs.get(job_id)

    @classmethod
    def start_job(
        cls,
        job_id: str,
        target_n: int,
        town_hall: Optional[int],
        location_id: str,
        ranking_items: List[Dict[str, Any]],
        initial_profiles: List[Dict[str, Any]],
        initial_failed_count: int,
        api_client: CoCAPIClient,
        redis_client: Optional[aioredis.Redis],
    ) -> MetaBackgroundJob:
        existing = cls._jobs.get(job_id)
        if existing and not existing.is_completed and existing._async_task and not existing._async_task.done():
            return existing

        job = MetaBackgroundJob(
            job_id=job_id,
            target_n=target_n,
            town_hall=town_hall,
            location_id=location_id,
            ranking_items=ranking_items,
            initial_profiles=initial_profiles,
            initial_failed_count=initial_failed_count,
        )
        cls._jobs[job_id] = job
        job._async_task = asyncio.create_task(job.run(api_client, redis_client))
        return job


# ---------------------------------------------------------------------------
# 5. End-to-End Meta Dashboard Generator (FastAPI + Celery Integration)
# ---------------------------------------------------------------------------

async def generate_meta_dashboard(
    api_client: CoCAPIClient,
    redis_client: Optional[aioredis.Redis] = None,
    *,
    top_n: int = 200,
    sample_size: Optional[int] = None,
    town_hall: Optional[int] = 18,
    location_id: str = "global",
    force_refresh: bool = False,
    rate_limit_per_sec: int = MAX_REQUESTS_PER_SECOND,
) -> Dict[str, Any]:
    """
    Fetch global leaderboard players (top 200), scan profiles &
    battlelogs with rate limiting and exponential backoff, compute real usage
    percentages strictly for TH18, and cluster battlelog `armyShareCode` records
    to produce Meta Army Recommendations.
    """
    effective_n = sample_size if sample_size is not None else top_n
    cache_key = CacheKey.leaderboard_global(
        f"meta_v3_{location_id}_n_{effective_n}_th_{town_hall or 'all'}"
    )

    if redis_client is not None and not force_refresh:
        cached = await redis_client.get(cache_key)
        if cached and isinstance(cached, (str, bytes)):
            try:
                data = json.loads(cached)
                if not data.get("isProcessing"):
                    return data
            except (json.JSONDecodeError, TypeError):
                pass

    limiter = AsyncRateLimiter(max_calls=rate_limit_per_sec, period=1.0)
    job_id = f"{location_id}_{effective_n}_{town_hall or 'all'}"

    # If background job is already running, return its latest dashboard
    existing_job = MetaTaskManager.get_job(job_id)
    if existing_job and not force_refresh:
        if existing_job.current_dashboard:
            return existing_job.current_dashboard

    ranking_items = await fetch_top_leaderboard_players(
        api_client,
        top_n=effective_n,
        sample_size=effective_n,
        location_id=location_id,
        rate_limiter=limiter,
    )

    if effective_n <= 200 or len(ranking_items) <= 200:
        # Synchronous processing for sample sizes up to 200
        profiles_result = await fetch_profiles_for_rankings(
            api_client,
            ranking_items[:effective_n],
            rate_limiter=limiter,
            concurrency_limit=MAX_CONCURRENCY,
        )
        meta_stats = analyze_meta_statistics(profiles_result, town_hall=town_hall)
        recommended = recommend_meta_armies(meta_stats, town_hall=town_hall, profiles=profiles_result)
        has_sufficient = bool(recommended.get("hasSufficientData") or meta_stats.get("hasSufficientData"))
        filtered_count = meta_stats.get("filteredPlayersCount", len(profiles_result))
        total_ranked = meta_stats.get("totalRankedAttacksAnalyzed", 0)
        analyzed_count = len(profiles_result)
        failed_count = profiles_result.failed_count

        # Free memory: Discard raw profiles and battlelogs after summary calculation
        del profiles_result
        import gc
        gc.collect()

        dashboard = {
            "status": "ok" if has_sufficient else "insufficient_data",
            "hasSufficientData": has_sufficient,
            "message": None if has_sufficient else "Yeterli veri yok",
            "sampleSize": effective_n,
            "targetTopPlayers": effective_n,
            "totalPlayersAnalyzed": analyzed_count,
            "filteredPlayersCount": filtered_count,
            "failedPlayersCount": failed_count,
            "totalRankedAttacksAnalyzed": total_ranked,
            "totalBattlesAnalyzed": total_ranked,
            "dataFetchedAt": datetime.now(timezone.utc).isoformat(),
            "townHallFilter": town_hall,
            "isProcessing": False,
            "progress": {
                "processed": analyzed_count + failed_count,
                "target": effective_n,
                "percentage": 100.0,
                "message": f"{analyzed_count + failed_count:,} / {effective_n:,} oyuncu işlendi",
            },
            "statistics": meta_stats,
            "metaArmies": recommended,
        }

        if redis_client is not None and has_sufficient:
            await redis_client.set(
                cache_key,
                json.dumps(dashboard),
                ex=1800,  # 30 minutes TTL
            )
        return dashboard

    # For large sample sizes (1,000 / 10,000):
    # Fetch first 100 profiles immediately and return them without blocking
    initial_slice = ranking_items[:100]
    initial_result = await fetch_profiles_for_rankings(
        api_client,
        initial_slice,
        rate_limiter=limiter,
        concurrency_limit=MAX_CONCURRENCY,
    )
    meta_stats = analyze_meta_statistics(initial_result, town_hall=town_hall)
    recommended = recommend_meta_armies(meta_stats, town_hall=town_hall, profiles=initial_result)
    has_sufficient = bool(recommended.get("hasSufficientData") or meta_stats.get("hasSufficientData"))
    filtered_count = meta_stats.get("filteredPlayersCount", len(initial_result))
    total_ranked = meta_stats.get("totalRankedAttacksAnalyzed", 0)

    processed_initial = len(initial_result) + initial_result.failed_count
    pct_initial = round((processed_initial / max(1, effective_n)) * 100.0, 1)

    initial_dashboard = {
        "status": "ok" if has_sufficient else "insufficient_data",
        "hasSufficientData": has_sufficient,
        "message": None if has_sufficient else "Yeterli veri yok",
        "sampleSize": effective_n,
        "targetTopPlayers": effective_n,
        "totalPlayersAnalyzed": len(initial_result),
        "filteredPlayersCount": filtered_count,
        "failedPlayersCount": initial_result.failed_count,
        "totalRankedAttacksAnalyzed": total_ranked,
        "totalBattlesAnalyzed": total_ranked,
        "dataFetchedAt": datetime.now(timezone.utc).isoformat(),
        "townHallFilter": town_hall,
        "isProcessing": True,
        "progress": {
            "processed": processed_initial,
            "target": effective_n,
            "percentage": pct_initial,
            "message": f"{processed_initial:,} / {effective_n:,} oyuncu işlendi (%{pct_initial:.1f})",
        },
        "statistics": meta_stats,
        "metaArmies": recommended,
    }

    # Start background task to process the rest
    job = MetaTaskManager.start_job(
        job_id=job_id,
        target_n=effective_n,
        town_hall=town_hall,
        location_id=location_id,
        ranking_items=ranking_items,
        initial_profiles=initial_result,
        initial_failed_count=initial_result.failed_count,
        api_client=api_client,
        redis_client=redis_client,
    )
    job.current_dashboard = initial_dashboard

    return initial_dashboard


# ---------------------------------------------------------------------------
# Celery Worker Task & Ingestion Entrypoint
# ---------------------------------------------------------------------------

async def _ingest_leaderboard(
    max_pages: int = 50,
    *,
    top_n: Optional[int] = None,
    sample_size: Optional[int] = None,
    fetch_profiles: bool = False,
) -> Dict[str, Any]:
    """
    Paginate through top global rankings, optionally scan profiles & battlelogs,
    compute real meta statistics & recommendations, and cache in Redis.
    """
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    api_client = CoCAPIClient(api_token=API_TOKEN, redis_client=redis_client)

    try:
        effective_top = sample_size if sample_size is not None else top_n
        target_count = effective_top if effective_top is not None else (max_pages * DEFAULT_PAGE_SIZE)
        after_cursor: Optional[str] = None
        pages_fetched = 0
        all_players: List[Dict[str, Any]] = []

        while pages_fetched < max_pages and len(all_players) < target_count:
            try:
                page_limit = min(DEFAULT_PAGE_SIZE, target_count - len(all_players))
                response = await api_client.get_global_player_rankings(
                    limit=page_limit if effective_top is not None and effective_top < DEFAULT_PAGE_SIZE else DEFAULT_PAGE_SIZE,
                    after=after_cursor,
                )

                items = response.get("items", [])
                if not items:
                    break

                remaining = target_count - len(all_players)
                all_players.extend(items[:remaining])

                after_cursor = response.get("paging", {}).get("cursors", {}).get("after")
                pages_fetched += 1

                await asyncio.sleep(0.1)

                if not after_cursor:
                    break

            except CoCAPIException as exc:
                logger.error("Error fetching leaderboard page %d: %s", pages_fetched + 1, exc)
                break

        if all_players:
            cache_key = "coc:lb:global:players"
            await redis_client.set(
                cache_key,
                json.dumps(all_players),
                ex=int(TTL.LEADERBOARD_HOT.value),
            )
            logger.info(
                "Ingested %d top players across %d pages.",
                len(all_players),
                pages_fetched,
            )

        if fetch_profiles and all_players:
            limiter = AsyncRateLimiter(max_calls=MAX_REQUESTS_PER_SECOND, period=1.0)
            profiles = await fetch_profiles_for_rankings(
                api_client,
                all_players,
                rate_limiter=limiter,
                concurrency_limit=MAX_CONCURRENCY,
            )
            stats = analyze_meta_statistics(profiles)
            armies = recommend_meta_armies(stats, profiles=profiles)
            has_sufficient = bool(armies.get("hasSufficientData") or stats.get("hasSufficientData"))
            dashboard = {
                "status": "ok" if has_sufficient else "insufficient_data",
                "hasSufficientData": has_sufficient,
                "message": None if has_sufficient else "Yeterli veri yok",
                "sampleSize": target_count,
                "targetTopPlayers": target_count,
                "totalPlayersAnalyzed": stats["totalPlayersAnalyzed"],
                "totalBattlesAnalyzed": stats.get("totalBattlesAnalyzed", 0),
                "statistics": stats,
                "metaArmies": armies,
            }
            if has_sufficient:
                await redis_client.set(
                    "coc:meta:dashboard",
                    json.dumps(dashboard),
                    ex=int(TTL.LEADERBOARD_HOT.value),
                )
            return dashboard

        return {"ingestedPlayers": len(all_players), "pagesFetched": pages_fetched}

    finally:
        await api_client.close()
        await redis_client.aclose()


@shared_task(name="ingest_global_leaderboard", rate_limit="1/m")
def ingest_global_leaderboard(
    top_n: int = 10_000,
    sample_size: Optional[int] = None,
    fetch_profiles: bool = False,
):
    """
    Celery task to run bulk leaderboard ingestion and meta analysis.
    """
    effective_n = sample_size if sample_size is not None else top_n
    max_pages = max(1, math.ceil(effective_n / DEFAULT_PAGE_SIZE))
    return asyncio.run(
        _ingest_leaderboard(
            max_pages=max_pages,
            top_n=effective_n,
            sample_size=effective_n,
            fetch_profiles=fetch_profiles,
        )
    )
