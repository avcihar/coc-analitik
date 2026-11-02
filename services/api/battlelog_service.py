"""
Battle Log Service & Decoded Army Enrichment
=============================================
Unified, resilient battle log fetcher, decoder, and army statistical engine used across:
  - Individual player endpoint: `GET /api/v1/players/{player_tag}/battlelog`
  - CWL scout engine: `services/workers/cwl_scout.py`

Key Features:
  1. Strict Tag Sanitization: Handles tags with/without `#` or `%23`.
  2. Bounded Concurrency & Retry/Backoff: Recovers from transient 429 / 5xx errors.
  3. Short-Term Caching: Uses Redis (if provided) or high-efficiency in-memory TTL cache.
  4. Exact Failure Categorisation:
       - "API hatası (403/429/5xx)"
       - "Battle log boş"
       - "Saldırı kaydı yok"
       - "Ranked kayıt yok"
       - "armyShareCode yok"
  5. Deterministic Attack Army Extraction:
       - 1. Ranked attacks (`battleType == "ranked"` and `attack == True`) -> "Son ranked saldırısı"
       - 2. Village attacks (`attack == True`, non-ranked) -> "Köy saldırısı"
       - DEFENSES (`attack: false`) ARE NEVER SHOWN AS PLAYER ARMIES.
  6. Player Army Statistics:
       - Normalised signature based on 'u' (units/sieges) and 's' (spells).
       - Hero/Pet/Equipment ('h') and Clan Castle ('i', 'd') excluded from signature.
       - Most-used and best 3-star army identification.
       - Support sample size ("Son N ranked saldırı üzerinden") and low-data badge.
  7. Defenses Against Player List:
       - Separate listing of attacks made by opponents against this player.
  8. Clan-Wide Meta Army Breakdown:
       - Archetype usage frequency across roster players and overall 3-star rate.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from cache.redis_strategy import TTL
from services.api.client import (
    AuthenticationError,
    CoCAPIClient,
    CoCAPIException,
    MaintenanceBreakError,
    NotFoundError,
    RateLimitError,
    sanitize_tag,
)
from services.army_parser.parser import (
    build_copy_army_link,
    parse_army_share_code,
)

logger = logging.getLogger(__name__)

# Fallback in-memory TTL cache for battlelog payloads (1800-second / 30-minute TTL)
_IN_MEMORY_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_TTL_SECONDS = 1800.0

# CoC API canonical battleType string for standard non-ranked/loot village attacks
LOOT_BATTLE_TYPE: str = "homeVillage"

_ARMY_SHARE_SECTION_RE = re.compile(
    r"h(?P<heroes>[^idus]+)"
    r"|i(?P<castle_troops>[\dx\-]+)"
    r"|d(?P<castle_spells>[\dx\-]+)"
    r"|u(?P<units>[\dx\-]+)"
    r"|s(?P<spells>[\dx\-]+)",
    re.IGNORECASE,
)
_COUNT_ID_RE = re.compile(r"^(\d+)x(\d+)$")


def clear_battlelog_cache() -> None:
    """Clear the in-memory battlelog cache (useful for testing)."""
    _IN_MEMORY_CACHE.clear()


def _get_cached_battlelog(key: str) -> Optional[Dict[str, Any]]:
    cached = _IN_MEMORY_CACHE.get(key)
    if cached is not None:
        cached_time, val = cached
        if (time.time() - cached_time) < _CACHE_TTL_SECONDS:
            return val
        _IN_MEMORY_CACHE.pop(key, None)
    return None


def _set_cached_battlelog(key: str, val: Dict[str, Any]) -> None:
    if len(_IN_MEMORY_CACHE) > 500:
        oldest_key = min(_IN_MEMORY_CACHE.keys(), key=lambda k: _IN_MEMORY_CACHE[k][0])
        _IN_MEMORY_CACHE.pop(oldest_key, None)
    _IN_MEMORY_CACHE[key] = (time.time(), val)


def _format_battlelog_timestamp(raw_ts: Optional[str]) -> Optional[str]:
    """Format a CoC ISO timestamp (`YYYYMMDDTHHmmss.SSSZ`) into `YYYY-MM-DD HH:MM` if present."""
    if not raw_ts or not isinstance(raw_ts, str):
        return None
    ts = raw_ts.strip()
    if len(ts) >= 13 and "T" in ts and ts[:8].isdigit():
        return f"{ts[:4]}-{ts[4:6]}-{ts[6:8]} {ts[9:11]}:{ts[11:13]}"
    return ts


def compute_army_signature(raw_code: str) -> str:
    """
    Compute a normalized army composition signature from armyShareCode.
    Only includes the 'u' section (troops, including workshop sieges) and 's'
    section (spells), normalized by unit/spell ID and count in sorted order.
    Heroes, pets, equipments ('h'), and Clan Castle ('i', 'd') are strictly excluded.
    """
    code = str(raw_code or "").strip()
    if not code:
        return ""
    if "army=" in code:
        code = code.split("army=")[-1].split("&")[0]

    unit_counts: Dict[int, int] = {}
    spell_counts: Dict[int, int] = {}

    for m in _ARMY_SHARE_SECTION_RE.finditer(code):
        if m.group("units"):
            for token in m.group("units").split("-"):
                em = _COUNT_ID_RE.match(token.strip())
                if em:
                    cnt, uid = int(em.group(1)), int(em.group(2))
                    unit_counts[uid] = unit_counts.get(uid, 0) + cnt
        elif m.group("spells"):
            for token in m.group("spells").split("-"):
                em = _COUNT_ID_RE.match(token.strip())
                if em:
                    cnt, sid = int(em.group(1)), int(em.group(2))
                    spell_counts[sid] = spell_counts.get(sid, 0) + cnt

    norm_u = "-".join(f"{cnt}x{uid}" for uid, cnt in sorted(unit_counts.items()))
    norm_s = "-".join(f"{cnt}x{sid}" for sid, cnt in sorted(spell_counts.items()))
    return f"u:{norm_u}|s:{norm_s}"


def extract_defenses_against(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract all defense records (attack: false) where opponents attacked this player.
    Contains: opponent name, TH, stars, destruction, armyShareCode, armyLink, decodedArmy, timestamp.
    These records NEVER enter the player's own attack statistics.
    """
    defenses: List[Dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        if item.get("attack") is not False:
            continue
        code = str(item.get("armyShareCode") or "").strip()
        if not code:
            continue
        decoded = item.get("decodedArmy") or parse_army_share_code(code)
        defenses.append({
            "opponentName": str(item.get("opponentName") or "Bilinmeyen Rakip"),
            "opponentPlayerTag": str(item.get("opponentPlayerTag") or ""),
            "opponentTownHallLevel": item.get("opponentTownHallLevel"),
            "stars": int(item.get("stars", 0)),
            "destructionPercentage": float(item.get("destructionPercentage", 0.0)),
            "battleType": str(item.get("battleType", "unknown")),
            "armyShareCode": code,
            "armyLink": item.get("armyLink") or build_copy_army_link(code),
            "armyName": decoded.get("armyName", "Bilinmeyen Ordu"),
            "timestamp": item.get("timestamp"),
            "decodedArmy": decoded,
        })
    return defenses


def extract_three_star_defenses(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract ONLY ranked defense records where the player was three-starred (100% / 3 stars).
    Condition:
      - attack === False
      - battleType.lower() in ("ranked", "legend")
      - stars == 3
      - armyShareCode present
    """
    three_star_defs: List[Dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        if item.get("attack") is not False:
            continue
        b_type = str(item.get("battleType") or "").lower()
        if b_type not in ("ranked", "legend"):
            continue
        if int(item.get("stars", 0)) != 3:
            continue
        code = str(item.get("armyShareCode") or "").strip()
        if not code:
            continue
        decoded = item.get("decodedArmy") or parse_army_share_code(code)
        three_star_defs.append({
            "opponentName": str(item.get("opponentName") or "Bilinmeyen Rakip"),
            "opponentPlayerTag": str(item.get("opponentPlayerTag") or ""),
            "opponentTownHallLevel": item.get("opponentTownHallLevel"),
            "stars": 3,
            "destructionPercentage": float(item.get("destructionPercentage", 100.0)),
            "battleType": str(item.get("battleType", "ranked")),
            "armyShareCode": code,
            "armyLink": item.get("armyLink") or build_copy_army_link(code),
            "armyName": decoded.get("armyName", "Bilinmeyen Ordu"),
            "timestamp": item.get("timestamp"),
            "troops": decoded.get("troops", []),
            "spells": decoded.get("spells", []),
            "siegeMachines": decoded.get("siegeMachines", []),
            "heroes": decoded.get("heroes", []),
            "clanCastle": decoded.get("clanCastle", []),
            "decodedArmy": decoded,
        })
    return three_star_defs


def compute_player_army_stats(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate player army statistics strictly from:
      - battleType === 'ranked'
      - attack === True
      - armyShareCode present
    Village attacks (homeVillage) do NOT enter statistics.
    attack: false records do NOT enter statistics.

    Returns:
      - totalRankedAttacks
      - sampleSize
      - sampleSizeLabel ("Son N ranked saldırı üzerinden")
      - isLowData (True if sampleSize < 3)
      - lowDataBadge ("Düşük veri" or None)
      - mostUsedArmy (dict or None)
      - bestThreeStarArmy (dict or None)
      - bestThreeStarSummary ("3 yıldız yok" if 0 three-stars)
      - isCombined (True if mostUsedArmy == bestThreeStarArmy)
      - summaryLabel ("En çok kullandığı ve en çok 3 yıldız aldığı ordu", etc.)
      - armyGroups (list of clustered army statistics)
    """
    ranked_attacks: List[Dict[str, Any]] = [
        it for it in (items or [])
        if isinstance(it, dict)
        and str(it.get("battleType", "")).lower() == "ranked"
        and it.get("attack") is True
        and str(it.get("armyShareCode") or "").strip()
    ]

    n = len(ranked_attacks)
    is_low_data = n < 3
    sample_size_label = f"Son {n} ranked saldırı üzerinden"
    low_data_badge = "Düşük veri" if is_low_data else None

    if n == 0:
        return {
            "totalRankedAttacks": 0,
            "sampleSize": 0,
            "sampleSizeLabel": sample_size_label,
            "isLowData": True,
            "lowDataBadge": "Düşük veri",
            "mostUsedArmy": None,
            "bestThreeStarArmy": None,
            "bestThreeStarSummary": "3 yıldız yok",
            "isCombined": False,
            "summaryLabel": "Ranked saldırı verisi yok",
            "armyGroups": [],
        }

    clusters: Dict[str, Dict[str, Any]] = {}

    for idx, item in enumerate(ranked_attacks):
        code = str(item.get("armyShareCode")).strip()
        sig = compute_army_signature(code)
        if not sig:
            sig = f"raw:{code}"

        if sig not in clusters:
            clusters[sig] = {
                "signature": sig,
                "records": [],
                "codeCounts": {},
                "newestIndex": idx,  # 0 is the newest battle in API battlelog
            }
        clusters[sig]["records"].append(item)
        clusters[sig]["codeCounts"][code] = clusters[sig]["codeCounts"].get(code, 0) + 1

    group_list: List[Dict[str, Any]] = []

    for sig, cluster in clusters.items():
        recs = cluster["records"]
        usage_count = len(recs)
        three_stars = sum(1 for r in recs if int(r.get("stars", 0)) == 3)
        three_star_rate = round((three_stars / usage_count) * 100, 1)
        avg_dest = round(
            sum(float(r.get("destructionPercentage", 0.0)) for r in recs) / usage_count,
            1,
        )
        recency_idx = cluster["newestIndex"]

        # Pick representative code (most frequent code; tie-breaker: newest in recs)
        code_counts = cluster["codeCounts"]
        rep_code = max(
            code_counts.keys(),
            key=lambda c: (code_counts[c], -next(i for i, r in enumerate(recs) if r.get("armyShareCode") == c)),
        )

        decoded = parse_army_share_code(rep_code)
        army_name = decoded.get("armyName") or "Bilinmeyen Ordu"
        army_link = build_copy_army_link(rep_code)

        group_list.append({
            "signature": sig,
            "armyName": army_name,
            "representativeArmyShareCode": rep_code,
            "armyLink": army_link,
            "usageCount": usage_count,
            "threeStarCount": three_stars,
            "threeStarRate": three_star_rate,
            "avgDestruction": avg_dest,
            "recencyIndex": recency_idx,
            "troops": decoded.get("troops", []),
            "spells": decoded.get("spells", []),
            "siegeMachines": decoded.get("siegeMachines", []),
            "heroes": decoded.get("heroes", []),
        })

    # Sort groups for "En çok kullandığı ordu":
    # 1. usageCount desc
    # 2. threeStarRate desc
    # 3. recencyIndex asc (smaller index = more recent)
    sorted_by_usage = sorted(
        group_list,
        key=lambda g: (g["usageCount"], g["threeStarRate"], -g["recencyIndex"]),
        reverse=True,
    )
    most_used_army = sorted_by_usage[0] if sorted_by_usage else None

    # Determine "En çok 3 yıldız aldığı ordu":
    three_star_candidates = [g for g in group_list if g["threeStarCount"] > 0]
    if three_star_candidates:
        sorted_by_three_stars = sorted(
            three_star_candidates,
            key=lambda g: (g["threeStarCount"], g["threeStarRate"], -g["recencyIndex"]),
            reverse=True,
        )
        best_three_star_army = sorted_by_three_stars[0]
        best_three_star_summary = None
    else:
        best_three_star_army = None
        best_three_star_summary = "3 yıldız yok"

    if (
        most_used_army is not None
        and best_three_star_army is not None
        and most_used_army["signature"] == best_three_star_army["signature"]
    ):
        is_combined = True
        summary_label = "En çok kullandığı ve en çok 3 yıldız aldığı ordu"
    else:
        is_combined = False
        summary_label = "En çok kullandığı ordu"

    return {
        "totalRankedAttacks": n,
        "sampleSize": n,
        "sampleSizeLabel": sample_size_label,
        "isLowData": is_low_data,
        "lowDataBadge": low_data_badge,
        "mostUsedArmy": most_used_army,
        "bestThreeStarArmy": best_three_star_army,
        "bestThreeStarSummary": best_three_star_summary,
        "isCombined": is_combined,
        "summaryLabel": summary_label,
        "armyGroups": sorted_by_usage,
    }


def compute_clan_army_meta(opponents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clan-wide army meta summary:
    Which army archetype is used by how many players as their primary army,
    along with total usage and overall 3-star rate across the clan.
    """
    clan_meta: Dict[str, Dict[str, Any]] = {}

    for opp in opponents or []:
        stats = opp.get("playerArmyStats") or {}
        most_used = stats.get("mostUsedArmy")
        if not most_used:
            continue
        name = most_used.get("armyName") or "Bilinmeyen Ordu"
        sig = most_used.get("signature") or name

        if name not in clan_meta:
            clan_meta[name] = {
                "armyName": name,
                "signature": sig,
                "representativeArmyLink": most_used.get("armyLink", ""),
                "representativeArmyShareCode": most_used.get("representativeArmyShareCode", ""),
                "playerCount": 0,
                "players": [],
                "totalAttacks": 0,
                "totalThreeStars": 0,
            }
        clan_meta[name]["playerCount"] += 1
        clan_meta[name]["players"].append({
            "name": opp.get("opponentName") or opp.get("name", "Unknown"),
            "tag": opp.get("playerTag") or opp.get("tag", ""),
            "townHallLevel": opp.get("townHallLevel"),
        })
        clan_meta[name]["totalAttacks"] += int(most_used.get("usageCount", 0))
        clan_meta[name]["totalThreeStars"] += int(most_used.get("threeStarCount", 0))

    meta_list: List[Dict[str, Any]] = []
    for item in clan_meta.values():
        tot = item["totalAttacks"]
        stars = item["totalThreeStars"]
        rate = round((stars / tot) * 100, 1) if tot > 0 else 0.0
        item["overallThreeStarRate"] = rate
        meta_list.append(item)

    meta_list.sort(
        key=lambda x: (x["playerCount"], x["overallThreeStarRate"]),
        reverse=True,
    )
    return meta_list


async def fetch_and_enrich_player_battlelog(
    api_client: CoCAPIClient,
    player_tag: str,
    cache: Optional[Any] = None,
    *,
    max_retries: int = 3,
    retry_delay: float = 0.5,
) -> Dict[str, Any]:
    """
    Fetch and decode a player's official battle log from Supercell API.
    Enriches with decoded armies, per-player army stats, and defenses against player.
    """
    cleaned_tag = sanitize_tag(player_tag)
    if not cleaned_tag:
        return {
            "status": "error",
            "reason": "Geçersiz oyuncu etiketi",
            "items": [],
            "rankedItems": [],
            "rankedCount": 0,
            "totalCount": 0,
            "hasRanked": False,
            "hasArmyCode": False,
            "playerArmyStats": compute_player_army_stats([]),
            "defensesAgainst": [],
        }

    cache_key = f"coc:player:battlelog:v2:{cleaned_tag}"

    # 1. Try Redis cache if available
    if cache is not None and hasattr(cache, "get"):
        try:
            cached_data = await cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                return cached_data
        except Exception as exc:
            logger.debug("Redis cache read skipped for %s: %s", cleaned_tag, exc)

    # 2. Try In-Memory cache fallback
    mem_cached = _get_cached_battlelog(cache_key)
    if mem_cached is not None:
        return mem_cached

    # 3. Fetch from API with retry & exponential backoff on 429 / 5xx
    raw_bl: Optional[Any] = None
    last_exception: Optional[Exception] = None

    for attempt in range(max_retries):
        try:
            raw_bl = await api_client.get_player_battlelog(cleaned_tag)
            last_exception = None
            break
        except RateLimitError as exc:
            last_exception = exc
            wait_time = retry_delay * (2 ** attempt)
            logger.warning(
                "CoC API Rate limit (429) on %s (attempt %d/%d). Backing off %.2fs",
                cleaned_tag,
                attempt + 1,
                max_retries,
                wait_time,
            )
            await asyncio.sleep(wait_time)
        except (MaintenanceBreakError, CoCAPIException) as exc:
            last_exception = exc
            if isinstance(exc, (AuthenticationError, NotFoundError)):
                break
            wait_time = retry_delay * (2 ** attempt)
            logger.warning(
                "CoC API transient error (%s) on %s (attempt %d/%d). Backing off %.2fs",
                exc,
                cleaned_tag,
                attempt + 1,
                max_retries,
                wait_time,
            )
            await asyncio.sleep(wait_time)
        except Exception as exc:
            last_exception = exc
            break

    # 4. Handle persistent API errors with explicit categorization
    if last_exception is not None or raw_bl is None:
        if isinstance(last_exception, AuthenticationError):
            reason = "API hatası (403)"
        elif isinstance(last_exception, RateLimitError):
            reason = "API hatası (429)"
        elif isinstance(last_exception, MaintenanceBreakError):
            reason = "API hatası (5xx)"
        elif isinstance(last_exception, NotFoundError):
            reason = "API hatası (404 - Oyuncu bulunamadı)"
        elif isinstance(last_exception, CoCAPIException):
            reason = "API hatası (5xx)"
        else:
            reason = "API hatası (5xx)"

        logger.info("Battlelog fetch failed for opponent %s: %s", cleaned_tag, reason)
        error_result = {
            "status": "error",
            "reason": reason,
            "items": [],
            "rankedItems": [],
            "rankedCount": 0,
            "totalCount": 0,
            "hasRanked": False,
            "hasArmyCode": False,
            "playerArmyStats": compute_player_army_stats([]),
            "defensesAgainst": [],
        }
        return error_result

    # 5. Extract items
    raw_items: List[Dict[str, Any]] = []
    if isinstance(raw_bl, dict) and isinstance(raw_bl.get("items"), list):
        raw_items = [x for x in raw_bl["items"] if isinstance(x, dict)]
    elif isinstance(raw_bl, list):
        raw_items = [x for x in raw_bl if isinstance(x, dict)]

    if not raw_items:
        empty_result = {
            "status": "empty",
            "reason": "Battle log boş",
            "items": [],
            "rankedItems": [],
            "rankedCount": 0,
            "totalCount": 0,
            "hasRanked": False,
            "hasArmyCode": False,
            "playerArmyStats": compute_player_army_stats([]),
            "defensesAgainst": [],
        }
        _set_cached_battlelog(cache_key, empty_result)
        return empty_result

    # 6. Enrich each battle item with armyLink and decodedArmy
    enriched_items: List[Dict[str, Any]] = []
    ranked_items: List[Dict[str, Any]] = []

    for entry in raw_items:
        item_copy = dict(entry)
        code = str(item_copy.get("armyShareCode") or "").strip()
        b_type = str(item_copy.get("battleType") or "unknown").strip()
        item_copy["timestamp"] = _format_battlelog_timestamp(
            item_copy.get("timestamp") or item_copy.get("battleTime")
        )

        if code:
            item_copy["armyLink"] = build_copy_army_link(code)
            item_copy["decodedArmy"] = parse_army_share_code(code)
        else:
            item_copy["armyLink"] = ""
            item_copy["decodedArmy"] = None

        enriched_items.append(item_copy)
        if b_type.lower() == "ranked":
            ranked_items.append(item_copy)

    # 7. Diagnose status based on actual records
    has_ranked_attacks = any(
        it.get("attack") is True and str(it.get("armyShareCode") or "").strip()
        for it in ranked_items
    )
    has_any_attacks = any(
        it.get("attack") is True
        for it in enriched_items
    )
    has_any_attack_code = any(
        it.get("attack") is True and str(it.get("armyShareCode") or "").strip()
        for it in enriched_items
    )

    if not has_any_attacks:
        reason = "Saldırı kaydı yok"
    elif not ranked_items:
        reason = "Ranked kayıt yok"
    elif not has_ranked_attacks and not has_any_attack_code:
        reason = "armyShareCode yok"
    else:
        reason = "ok"

    player_army_stats = compute_player_army_stats(enriched_items)
    defenses_against = extract_defenses_against(enriched_items)

    result = {
        "status": "ok" if reason == "ok" else reason,
        "reason": reason,
        "items": enriched_items,
        "rankedItems": ranked_items,
        "rankedCount": len(ranked_items),
        "totalCount": len(enriched_items),
        "hasRanked": len(ranked_items) > 0,
        "hasArmyCode": any(bool(it.get("armyShareCode")) for it in enriched_items),
        "playerArmyStats": player_army_stats,
        "defensesAgainst": defenses_against,
    }

    # 8. Cache result in memory and in Redis
    _set_cached_battlelog(cache_key, result)
    if cache is not None and hasattr(cache, "set"):
        try:
            await cache.set(cache_key, result, ttl=int(TTL.PLAYER_PROFILE))
        except Exception as exc:
            logger.debug("Redis cache write skipped for %s: %s", cleaned_tag, exc)

    return result


def extract_scout_armies(
    battlelog_data: Optional[Dict[str, Any]],
    max_distinct: int = 20,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Extract candidate attack armies from an enriched battle log using strict source priority
    and greedy ranking:

    1. Source Priority (Never mixed for the same player!):
       - If ANY `battleType == "ranked"` and `attack == True` record exists:
           Use ONLY ranked attacks. Loot (ganimet) attacks are completely ignored.
           Badge: "Ranked"
       - If NO ranked attacks exist, but `battleType != "ranked"` and `attack == True` exists:
           Fallback to loot attacks (canonical `homeVillage`).
           Badge: "Ganimet (ranked yok)"
           Warning: "Ranked tespit edilemedi"
       - If NEITHER exists:
           Return failure reason: "Saldırı kaydı yok", "Battle log boş", "armyShareCode yok",
           or "API hatası (403/429/5xx)".
       - DEFENSES (`attack: false`) ARE STRICTLY DISCARDED in all cases!

    2. Greedy Ranking (within chosen source):
       Group records by `armyShareCode`. For each army calculate:
         - 3-star count (descending, strongest criterion)
         - 3-star rate % (descending)
         - Average destruction % (descending)
         - Recency (newest battle index ascending)
       The top army is the primary army with summary label `En iyi ordu (3★ x{count} / {usage})`.
    """
    if not battlelog_data or not isinstance(battlelog_data, dict):
        return [], "Battle log boş"

    status = str(battlelog_data.get("status", "")).strip()
    reason = str(battlelog_data.get("reason", "")).strip()
    items = battlelog_data.get("items") or []

    # 1. API error handling
    if status == "error" or reason.startswith("API hatası"):
        return [], reason or "API hatası (5xx)"

    # 2. Empty log handling
    if not items or reason == "Battle log boş":
        return [], "Battle log boş"

    ranked_candidates: List[Dict[str, Any]] = []
    loot_candidates: List[Dict[str, Any]] = []
    total_attacks_count = 0

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        is_attack = bool(item.get("attack") is True)
        if not is_attack:
            continue  # STRICTLY EXCLUDE DEFENSES (attack: false)

        total_attacks_count += 1
        code = str(item.get("armyShareCode") or "").strip()
        if not code:
            continue

        decoded = item.get("decodedArmy") or parse_army_share_code(code)
        b_type = str(item.get("battleType") or "unknown").strip()
        ts = item.get("timestamp")

        cand = {
            "idx": idx,
            "item": item,
            "code": code,
            "decoded": decoded,
            "battleType": b_type,
            "isAttack": True,
            "timestamp": ts,
        }

        if b_type.lower() == "ranked":
            ranked_candidates.append(cand)
        else:
            logger.info(
                "Non-ranked attack found with battleType: '%s' (fallback loot attack)",
                b_type,
            )
            loot_candidates.append(cand)

    # 3. Priority decision: Ranked attacks take absolute precedence.
    if ranked_candidates:
        selected_candidates = ranked_candidates
        source_type = "ranked"
        source_badge = "Ranked"
        warning = None
    elif loot_candidates:
        selected_candidates = loot_candidates
        source_type = "fallback"
        source_badge = "Ganimet (ranked yok)"
        warning = "Ranked tespit edilemedi"
    else:
        if total_attacks_count == 0:
            return [], "Saldırı kaydı yok"
        return [], "armyShareCode yok"

    # 4. Group by armyShareCode
    clusters: Dict[str, Dict[str, Any]] = {}
    for cand in selected_candidates:
        code = cand["code"]
        if code not in clusters:
            clusters[code] = {
                "code": code,
                "records": [],
                "newest_idx": cand["idx"],
                "sample_cand": cand,
            }
        clusters[code]["records"].append(cand)
        if cand["idx"] < clusters[code]["newest_idx"]:
            clusters[code]["newest_idx"] = cand["idx"]

    # 5. Calculate statistics per army group
    grouped_armies: List[Dict[str, Any]] = []
    for code, cluster in clusters.items():
        recs = cluster["records"]
        usage_count = len(recs)
        three_stars = sum(1 for r in recs if int(r["item"].get("stars", 0)) == 3)
        three_star_rate = round((three_stars / usage_count) * 100, 1) if usage_count > 0 else 0.0
        avg_dest = round(
            sum(float(r["item"].get("destructionPercentage", 0.0)) for r in recs) / usage_count,
            1,
        )
        newest_idx = cluster["newest_idx"]
        sample_cand = cluster["sample_cand"]
        decoded = sample_cand["decoded"]
        raw_entry = sample_cand["item"]
        ts = sample_cand["timestamp"]
        b_type = sample_cand["battleType"]

        summary = f"3★ x{three_stars} / {usage_count} saldırı"
        source_label = f"En iyi ordu (3★ x{three_stars} / {usage_count})"

        grouped_armies.append({
            "armyShareCode": code,
            "armyLink": raw_entry.get("armyLink") or build_copy_army_link(code),
            "armyName": decoded.get("armyName", "Bilinmeyen Ordu"),
            "battleType": b_type,
            "isAttack": True,
            "source": source_type,
            "sourceBadge": source_badge,
            "sourceLabel": source_label,
            "summary": summary,
            "warning": warning,
            "usageCount": usage_count,
            "threeStarCount": three_stars,
            "threeStarRate": three_star_rate,
            "avgDestruction": avg_dest,
            "newestIndex": newest_idx,
            "timestamp": ts,
            "stars": int(raw_entry.get("stars", 0)),
            "destructionPercentage": float(raw_entry.get("destructionPercentage", 0.0)),
            "opponentName": raw_entry.get("opponentName"),
            "opponentTownHallLevel": raw_entry.get("opponentTownHallLevel"),
            "heroes": decoded.get("heroes", []),
            "siegeMachines": decoded.get("siegeMachines", []),
            "clanCastle": decoded.get("clanCastle", []),
            "clanCastleTroops": decoded.get("clanCastleTroops", []),
            "clanCastleSpells": decoded.get("clanCastleSpells", []),
            "troops": decoded.get("troops", []),
            "spells": decoded.get("spells", []),
            "totalTroopHousing": decoded.get("totalTroopHousing", 0),
            "totalSpellSpace": decoded.get("totalSpellSpace", 0),
            "unknownIds": decoded.get("unknownIds", []),
        })

    # 6. Greedy sorting
    # 1st criterion: threeStarCount (desc)
    # 2nd criterion: threeStarRate (desc)
    # 3rd criterion: avgDestruction (desc)
    # 4th criterion: newestIndex (asc - smaller index means more recent)
    sorted_armies = sorted(
        grouped_armies,
        key=lambda a: (a["threeStarCount"], a["threeStarRate"], a["avgDestruction"], -a["newestIndex"]),
        reverse=True,
    )

    # Set otherArmiesCount metadata on each army
    total_distinct = len(sorted_armies)
    for army in sorted_armies:
        army["otherArmiesCount"] = max(0, total_distinct - 1)

    return sorted_armies[:max_distinct], None
