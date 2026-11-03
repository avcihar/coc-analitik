"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Users,
  Trophy,
  Star,
  Shield,
  Sparkles,
  Swords,
  ArrowRight,
  Flame,
  Crown,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Filter,
  History,
  X,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  Hammer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
import {
  matchLeagueTo37Tiers,
  getLeagueTierById,
} from "@/lib/gemIncomeConfig";
import UnitIcon from "@/components/common/UnitIcon";

import { safeFetchJson } from "@/lib/apiClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface ImportedEquipmentItem {
  name: string;
  level: number;
  maxLevel: number;
  rarity: "Common" | "Epic" | string;
  hero?: string;
}

export interface ImportedPlayerForOre {
  tag: string;
  name: string;
  townHallLevel: number;
  leagueTierId?: number;
  leagueName: string;
  trophies: number;
  heroes: {
    name: string;
    level: number;
    maxLevel: number;
    equipment: ImportedEquipmentItem[];
    village?: string;
  }[];
  heroEquipment: ImportedEquipmentItem[];
}

interface UnitItem {
  name: string;
  level: number;
  maxLevel: number;
  village?: string;
  superTroopIsActive?: boolean;
}

interface PlayerProfileViewData extends ImportedPlayerForOre {
  warStars: number;
  bestTrophies: number;
  originalLeagueName?: string;
  clan?: { tag: string; name: string; clanLevel?: number; badgeUrls?: { small?: string } };
  pets: UnitItem[];
  troops: UnitItem[];
  spells: UnitItem[];
  builderHeroes?: UnitItem[];
}

interface ClanMember {
  tag: string;
  name: string;
  role: string;
  townHallLevel?: number;
  expLevel?: number;
  trophies: number;
  donations?: number;
  donationsReceived?: number;
  clanRank?: number;
}

interface ClanDetails {
  tag: string;
  name: string;
  description?: string;
  clanLevel: number;
  clanPoints?: number;
  warWins?: number;
  warLeague?: { name: string };
  members: number;
  memberList: ClanMember[];
  badgeUrls?: { small?: string; medium?: string };
}

export interface BattleLogEntry {
  battleType?: string;
  attack?: boolean;
  armyShareCode?: string;
  opponentPlayerTag?: string;
  opponentTag?: string;
  opponentName?: string;
  opponentTownHallLevel?: number;
  stars?: number;
  destructionPercentage?: number;
  trophyChange?: number;
  armyLink?: string;
  decodedArmy?: DecodedArmyShare;
}

const DARK_TROOP_NAMES = new Set([
  "Minion",
  "Hog Rider",
  "Valkyrie",
  "Golem",
  "Witch",
  "Lava Hound",
  "Bowler",
  "Ice Golem",
  "Headhunter",
  "Head Hunter",
  "Apprentice Warden",
  "Druid",
  "Furnace",
]);

const SIEGE_MACHINE_NAMES = new Set([
  "Wall Wrecker",
  "Battle Blimp",
  "Stone Slammer",
  "Siege Barracks",
  "Log Launcher",
  "Flame Flinger",
  "Battle Drill",
  "Troop Launcher",
  "Sky Wagon",
]);

const KNOWN_PET_NAMES = new Set([
  "L.A.S.S.I",
  "Electro Owl",
  "Mighty Yak",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Spirit Fox",
  "Angry Jelly",
  "Snoop",
  "Sneezy",
  "Greedy Raven",
]);

const KNOWN_SUPER_TROOP_NAMES = new Set([
  "Super Barbarian",
  "Super Archer",
  "Super Giant",
  "Sneaky Goblin",
  "Super Wall Breaker",
  "Rocket Balloon",
  "Super Wizard",
  "Super Dragon",
  "Inferno Dragon",
  "Super Minion",
  "Super Valkyrie",
  "Super Witch",
  "Ice Hound",
  "Super Bowler",
  "Super Miner",
  "Super Hog Rider",
  "Super Yeti",
  "Super P.E.K.K.A",
]);

const isSuperTroop = (name: string, isActive?: boolean): boolean => {
  return (
    Boolean(isActive) ||
    name.startsWith("Super ") ||
    name === "Sneaky Goblin" ||
    name === "Rocket Balloon" ||
    name === "Inferno Dragon" ||
    name === "Ice Hound" ||
    KNOWN_SUPER_TROOP_NAMES.has(name)
  );
};

interface SearchHistoryItem {
  query: string;
  mode: "player" | "clan";
  label: string;
  timestamp: number;
}

export default function PlayerClanSearchView({
  onImportPlayerToOre,
  onScoutClanInCwl,
  initialQuery,
  initialMode,
}: {
  onImportPlayerToOre: (player: ImportedPlayerForOre) => void;
  onScoutClanInCwl?: (clanTag: string) => void;
  initialQuery?: string;
  initialMode?: "player" | "clan";
}) {
  const [searchMode, setSearchMode] = useState<"player" | "clan">(initialMode || "player");
  const [queryInput, setQueryInput] = useState<string>(initialQuery || "#9JG8UVL0");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [playerResult, setPlayerResult] = useState<PlayerProfileViewData | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [expandedBattleIdx, setExpandedBattleIdx] = useState<number | null>(0);
  const [clanResult, setClanResult] = useState<ClanDetails | null>(null);
  const [clanSearchResults, setClanSearchResults] = useState<ClanDetails[]>([]);
  const [importedFlash, setImportedFlash] = useState<boolean>(false);
  const [showAdvancedClanFilter, setShowAdvancedClanFilter] = useState(false);
  const [minClanMembers, setMinClanMembers] = useState(1);

  // Search History (Last 5 items)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("coc-search-history");
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore JSON error
    }
  }, []);

  const saveToHistory = (query: string, mode: "player" | "clan", label: string) => {
    try {
      setSearchHistory((prev) => {
        const filtered = prev.filter((item) => item.query.toUpperCase() !== query.toUpperCase());
        const updated = [{ query, mode, label, timestamp: Date.now() }, ...filtered].slice(0, 5);
        localStorage.setItem("coc-search-history", JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore localStorage error
    }
  };

  const handleSearch = useCallback(
    async (overrideMode?: "player" | "clan", overrideQuery?: string) => {
      const mode = overrideMode || searchMode;
      const rawQ = (overrideQuery ?? queryInput).trim();
      if (!rawQ) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        if (mode === "player") {
          const cleanTag = rawQ.replace(/^#/, "");
          const [data, battleData] = await Promise.all([
            safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}`),
            safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}/battlelog`).catch(() => null),
          ]);

          const th = data.townHallLevel || 1;
          const rawHeroList = Array.isArray(data.heroes) ? data.heroes : [];

          // Match multiplayer league / leagueTier to the 37 tiers table
          let matchedTier: ReturnType<typeof getLeagueTierById> | null = null;
          if (data.leagueTier?.id && data.leagueTier.id >= 105000001 && data.leagueTier.id <= 105000036) {
            matchedTier = getLeagueTierById(data.leagueTier.id);
          } else if (data.leagueTier?.name && data.leagueTier.name.toLowerCase() !== "unranked") {
            const byName = matchLeagueTo37Tiers(data.leagueTier.name, data.leagueTier.id);
            if (!byName.isUnknown) matchedTier = byName;
          }
          if (!matchedTier && (data.league?.id || data.league?.name)) {
            const fromLeague = matchLeagueTo37Tiers(data.league.name, data.league.id);
            if (!fromLeague.isUnknown) matchedTier = fromLeague;
          }
          if (!matchedTier) {
            matchedTier = getLeagueTierById(data.leagueTier?.id || 105000000);
          }

          // Extract troops & pets cleanly
          const rawTroops: UnitItem[] = Array.isArray(data.troops) ? data.troops : [];
          const rawSpells: UnitItem[] = Array.isArray(data.spells) ? data.spells : [];
          const explicitPets: UnitItem[] = Array.isArray(data.pets) ? data.pets : [];

          // Extract pets that might be under troops
          const detectedPets: UnitItem[] = [...explicitPets];
          const standardTroops: UnitItem[] = [];

          for (const tr of rawTroops) {
            if (KNOWN_PET_NAMES.has(tr.name)) {
              if (!detectedPets.some((p) => p.name === tr.name)) {
                detectedPets.push(tr);
              }
            } else {
              standardTroops.push(tr);
            }
          }

          const parsedPlayer: PlayerProfileViewData = {
            tag: data.tag || `#${cleanTag}`,
            name: data.name || "Bilinmeyen Oyuncu",
            townHallLevel: th,
            leagueTierId: matchedTier.id,
            leagueName: matchedTier.nameTr,
            originalLeagueName: data.leagueTier?.name || data.league?.name || "Unranked",
            trophies: data.trophies || 0,
            bestTrophies: data.bestTrophies || 0,
            warStars: data.warStars || 0,
            clan: data.clan,
            heroes: rawHeroList,
            heroEquipment: data.heroEquipment || [],
            pets: detectedPets,
            troops: standardTroops,
            spells: rawSpells,
          };

          setPlayerResult(parsedPlayer);
          setClanResult(null);
          setClanSearchResults([]);

          saveToHistory(parsedPlayer.tag, "player", `${parsedPlayer.name} (${parsedPlayer.tag})`);

          // Battlelog extraction (strictly ranked attacks)
          if (battleData && Array.isArray(battleData.items)) {
            const rawItems: BattleLogEntry[] = battleData.items;
            const rankedOnly = rawItems.filter((item) => item && item.battleType === "ranked");
            setBattleLog(rankedOnly);
            setExpandedBattleIdx(rankedOnly.length > 0 ? 0 : null);
          } else {
            setBattleLog([]);
            setExpandedBattleIdx(null);
          }
        } else {
          // Clan Search: Tag or Name
          const isTag = rawQ.startsWith("#") || /^[0-9A-Z]{3,12}$/i.test(rawQ);
          if (isTag) {
            const cleanTag = rawQ.replace(/^#/, "");
            const data = await safeFetchJson<any>(`/api/v1/clans/${encodeURIComponent(cleanTag)}`);
            setClanResult(data);
            setPlayerResult(null);
            setClanSearchResults([]);
            saveToHistory(data.tag, "clan", `${data.name} (${data.tag})`);
          } else {
            const data = await safeFetchJson<any>(
              `/api/v1/clans/search?name=${encodeURIComponent(rawQ)}&limit=16`
            );
            const items: ClanDetails[] = data.items || [];
            const filtered = items.filter((c) => (c.members || 0) >= minClanMembers);
            setClanSearchResults(filtered);
            setPlayerResult(null);
            setClanResult(null);
            saveToHistory(rawQ, "clan", `"${rawQ}" (${filtered.length} klan)`);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Sorgulama sırasında bir hata oluştu.";
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
    },
    [queryInput, searchMode, minClanMembers]
  );

  // Auto-search default player on initial load
  useEffect(() => {
    handleSearch("player", queryInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTransferToOre = () => {
    if (!playerResult) return;
    onImportPlayerToOre(playerResult);
    setImportedFlash(true);
    setTimeout(() => setImportedFlash(false), 2000);
  };

  // ClashSpot Style Progress Computations strictly from real API levels
  const progressMetrics = useMemo(() => {
    if (!playerResult) return null;

    const computeGroup = (items: { level: number; maxLevel: number }[]) => {
      if (!items || items.length === 0) return { current: 0, max: 0, pct: 100, count: 0, maxedCount: 0 };
      let current = 0;
      let max = 0;
      let maxedCount = 0;
      for (const item of items) {
        current += item.level;
        max += Math.max(item.level, item.maxLevel);
        if (item.level >= item.maxLevel && item.maxLevel > 0) {
          maxedCount++;
        }
      }
      const pct = max > 0 ? Math.round((current / max) * 100) : 100;
      return { current, max, pct, count: items.length, maxedCount };
    };

    const isBuilderBaseUnit = (u: UnitItem) =>
      Boolean(u.village && u.village.toLowerCase() === "builderbase");

    const isSuperTroopUnit = (t: UnitItem) =>
      !isBuilderBaseUnit(t) && isSuperTroop(t.name, t.superTroopIsActive);

    const isSiegeUnit = (t: UnitItem) =>
      !isBuilderBaseUnit(t) && !isSuperTroopUnit(t) && SIEGE_MACHINE_NAMES.has(t.name);

    const isDarkTroopUnit = (t: UnitItem) =>
      !isBuilderBaseUnit(t) &&
      !isSuperTroopUnit(t) &&
      !isSiegeUnit(t) &&
      DARK_TROOP_NAMES.has(t.name);

    const isPetUnit = (t: UnitItem) =>
      !isBuilderBaseUnit(t) && !isSuperTroopUnit(t) && KNOWN_PET_NAMES.has(t.name);

    const isStandardTroopUnit = (t: UnitItem) =>
      !isBuilderBaseUnit(t) &&
      !isSuperTroopUnit(t) &&
      !isSiegeUnit(t) &&
      !isDarkTroopUnit(t) &&
      !isPetUnit(t);

    const homeHeroes = playerResult.heroes.filter((h) => !isBuilderBaseUnit(h));
    const builderHeroesList =
      playerResult.builderHeroes || playerResult.heroes.filter(isBuilderBaseUnit);
    const builderBaseTroopsList = playerResult.troops.filter(isBuilderBaseUnit);
    const builderBaseAllUnits = [...builderHeroesList, ...builderBaseTroopsList];

    const siegesList = playerResult.troops.filter(isSiegeUnit);
    const darkTroopsList = playerResult.troops.filter(isDarkTroopUnit);
    const standardTroopsList = playerResult.troops.filter(isStandardTroopUnit);

    const superTroopsList = playerResult.troops.filter(isSuperTroopUnit);
    const sortedSuperTroopsList = [...superTroopsList].sort((a, b) => {
      if (a.superTroopIsActive && !b.superTroopIsActive) return -1;
      if (!a.superTroopIsActive && b.superTroopIsActive) return 1;
      return a.name.localeCompare(b.name);
    });
    const activeSuperCount = superTroopsList.filter((s) => s.superTroopIsActive).length;

    const heroes = computeGroup(homeHeroes);
    const equipment = computeGroup(playerResult.heroEquipment);
    const pets = computeGroup(playerResult.pets);
    const sieges = computeGroup(siegesList);
    const darkTroops = computeGroup(darkTroopsList);
    const standardTroops = computeGroup(standardTroopsList);
    const superTroops = computeGroup(superTroopsList);
    const builderBase = computeGroup(builderBaseAllUnits);
    const spells = computeGroup(playerResult.spells);

    const grandCurrent =
      heroes.current +
      equipment.current +
      pets.current +
      sieges.current +
      darkTroops.current +
      standardTroops.current +
      spells.current;
    const grandMax =
      heroes.max +
      equipment.max +
      pets.max +
      sieges.max +
      darkTroops.max +
      standardTroops.max +
      spells.max;
    const totalProgressPct = grandMax > 0 ? Math.round((grandCurrent / grandMax) * 100) : 0;

    return {
      totalProgressPct,
      heroes,
      homeHeroes,
      equipment,
      pets,
      sieges,
      darkTroops,
      standardTroops,
      superTroops,
      builderBase,
      spells,
      superTroopsList,
      sortedSuperTroopsList,
      activeSuperCount,
      siegesList,
      darkTroopsList,
      standardTroopsList,
      builderBaseTroopsList,
      builderHeroesList,
      builderBaseAllUnits,
    };
  }, [playerResult]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans">
      {/* 1. ClashSpot Style Single Search Bar */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-app-cardSubtle p-1 rounded-xl border border-app-border w-fit">
            <button
              onClick={() => {
                setSearchMode("player");
                setQueryInput("#9JG8UVL0");
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                searchMode === "player"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-app-muted hover:text-app-text"
              )}
            >
              Oyuncu (#Etiket)
            </button>
            <button
              onClick={() => {
                setSearchMode("clan");
                setQueryInput("#2PP");
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                searchMode === "clan"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-app-muted hover:text-app-text"
              )}
            >
              Klan (#Etiket / İsim)
            </button>
          </div>

          {searchMode === "clan" && (
            <button
              onClick={() => setShowAdvancedClanFilter(!showAdvancedClanFilter)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-app-muted hover:text-app-text cursor-pointer self-start sm:self-auto"
            >
              <Filter size={13} />
              <span>Gelişmiş Filtreler</span>
              <ChevronDown size={13} className={cn("transition-transform", showAdvancedClanFilter && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Input & Submit Row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={
                searchMode === "player"
                  ? "Oyuncu etiketi girin (Örn: #9JG8UVL0)"
                  : "Klan etiketi (#2PP) veya klan adı (Anadolu) girin"
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-app-cardSubtle border border-app-border text-sm font-medium text-app-text placeholder:text-app-muted focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            <Search size={14} />
            {loading ? "Sorgulanıyor..." : "Sorgula"}
          </button>
        </div>

        {/* Collapsible Advanced Clan Filter */}
        {showAdvancedClanFilter && searchMode === "clan" && (
          <div className="p-3 rounded-xl bg-app-cardSubtle border border-app-border flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-app-muted">Min. Üye Sayısı:</span>
            {[1, 10, 25, 40].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setMinClanMembers(num);
                  if (clanSearchResults.length > 0) handleSearch("clan", queryInput);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors",
                  minClanMembers === num ? "bg-blue-600 text-white" : "bg-app-card text-app-muted hover:text-app-text"
                )}
              >
                {num}+ Üye
              </button>
            ))}
          </div>
        )}

        {/* Recent Search History Chips */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-app-muted flex items-center gap-1">
              <History size={12} /> Son Aramalar:
            </span>
            {searchHistory.map((item, idx) => (
              <button
                key={`${item.query}-${idx}`}
                onClick={() => {
                  setSearchMode(item.mode);
                  setQueryInput(item.query);
                  handleSearch(item.mode, item.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-app-cardSubtle hover:bg-app-border border border-app-border text-[11px] font-semibold text-app-text cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. PLAYER PROFILE VIEW (ClashSpot "Home Village" Style) */}
      {playerResult && progressMetrics && (
        <div className="space-y-6">
          {/* Player Header Banner */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Town Hall Badge */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-sm shrink-0 border border-blue-400/30">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-80">TH</span>
                <span className="text-xl font-black leading-tight">{playerResult.townHallLevel}</span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-black text-app-text">{playerResult.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-app-cardSubtle border border-app-border text-app-muted">
                    {playerResult.tag}
                  </span>
                  {/* League Tier Badge */}
                  {(() => {
                    const tier = getLeagueTierById(playerResult.leagueTierId);
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/25 flex items-center gap-1.5">
                        {tier.iconSmall && (
                          <img src={tier.iconSmall} alt={tier.name} className="w-3.5 h-3.5 object-contain" />
                        )}
                        <span>{tier.nameTr}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-semibold text-app-muted mt-1.5">
                  <span className="flex items-center gap-1 text-app-text font-bold">
                    <Trophy size={14} className="text-amber-500" /> {playerResult.trophies} Kupa
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-amber-500" /> {playerResult.warStars} Savaş Yıldızı
                  </span>
                  {playerResult.clan && (
                    <button
                      onClick={() => {
                        setSearchMode("clan");
                        setQueryInput(playerResult.clan!.tag);
                        handleSearch("clan", playerResult.clan!.tag);
                      }}
                      className="flex items-center gap-1 text-blue-400 hover:underline cursor-pointer"
                    >
                      <Shield size={14} /> {playerResult.clan.name} ({playerResult.clan.tag})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action: Transfer to Ore Calculator */}
            <button
              onClick={handleTransferToOre}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer shadow-sm active:scale-95 self-start md:self-auto",
                importedFlash
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
              )}
            >
              {importedFlash ? (
                <>
                  <CheckCircle2 size={15} /> Aktarıldı!
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Ekipmanları Cevher Analizine Aktar
                </>
              )}
            </button>
          </div>

          {/* Section: Total Progress Bar (ClashSpot "Home Village" Progress) */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-app-muted uppercase tracking-wider">Köy & Askeri Birim İlerlemesi</span>
              <span className="text-blue-400 font-black text-sm">%{progressMetrics.totalProgressPct}</span>
            </div>
            <div className="h-2.5 w-full bg-app-cardSubtle rounded-full overflow-hidden border border-app-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${progressMetrics.totalProgressPct}%` }}
              />
            </div>
          </div>

          {/* Progress Category Sections (ClashSpot Grid Format) */}
          <div className="space-y-6">
            {/* 1. Heroes */}
            {playerResult.heroes.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                    <Crown size={15} className="text-amber-400" />
                    Kahramanlar ({progressMetrics.heroes.maxedCount}/{progressMetrics.heroes.count} Max)
                  </h3>
                  <span className="text-xs font-bold text-amber-400">%{progressMetrics.heroes.pct}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {progressMetrics.homeHeroes.map((h) => (
                    <UnitIcon
                      key={h.name}
                      name={h.name}
                      level={h.level}
                      maxLevel={h.maxLevel}
                      size="md"
                      showNameBelow
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Hero Equipment */}
            {playerResult.heroEquipment.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                    <Shield size={15} className="text-purple-400" />
                    Kahraman Ekipmanları ({progressMetrics.equipment.maxedCount}/{progressMetrics.equipment.count} Max)
                  </h3>
                  <span className="text-xs font-bold text-purple-400">%{progressMetrics.equipment.pct}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {playerResult.heroEquipment.map((eq) => (
                    <UnitIcon
                      key={eq.name}
                      name={eq.name}
                      level={eq.level}
                      maxLevel={eq.maxLevel}
                      isEpic={eq.rarity === "Epic" || eq.maxLevel === 27}
                      size="sm"
                      showNameBelow
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Pets */}
            {playerResult.pets.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                    <Sparkles size={15} className="text-cyan-400" />
                    Evcil Hayvanlar ({progressMetrics.pets.maxedCount}/{progressMetrics.pets.count} Max)
                  </h3>
                  <span className="text-xs font-bold text-cyan-400">%{progressMetrics.pets.pct}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {playerResult.pets.map((p) => (
                    <UnitIcon
                      key={p.name}
                      name={p.name}
                      level={p.level}
                      maxLevel={p.maxLevel}
                      size="sm"
                      showNameBelow
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Siege Machines */}
            {progressMetrics.siegesList.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                    <Layers size={15} className="text-emerald-400" />
                    Kuşatma Makineleri ({progressMetrics.sieges.maxedCount}/{progressMetrics.sieges.count} Max)
                  </h3>
                  <span className="text-xs font-bold text-emerald-400">%{progressMetrics.sieges.pct}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {progressMetrics.siegesList.map((sg) => (
                    <UnitIcon
                      key={sg.name}
                      name={sg.name}
                      level={sg.level}
                      maxLevel={sg.maxLevel}
                      size="sm"
                      showNameBelow
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 5. Troops & Dark Troops */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Troops */}
              {progressMetrics.standardTroopsList.length > 0 && (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                      <Swords size={15} className="text-blue-400" />
                      İksir Birlikleri ({progressMetrics.standardTroops.maxedCount}/{progressMetrics.standardTroops.count} Max)
                    </h3>
                    <span className="text-xs font-bold text-blue-400">%{progressMetrics.standardTroops.pct}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {progressMetrics.standardTroopsList.map((tr) => (
                      <UnitIcon
                        key={tr.name}
                        name={tr.name}
                        level={tr.level}
                        maxLevel={tr.maxLevel}
                        size="xs"
                        showNameBelow
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Dark Troops */}
              {progressMetrics.darkTroopsList.length > 0 && (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                      <Flame size={15} className="text-indigo-400" />
                      Kara İksir Birlikleri ({progressMetrics.darkTroops.maxedCount}/{progressMetrics.darkTroops.count} Max)
                    </h3>
                    <span className="text-xs font-bold text-indigo-400">%{progressMetrics.darkTroops.pct}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {progressMetrics.darkTroopsList.map((tr) => (
                      <UnitIcon
                        key={tr.name}
                        name={tr.name}
                        level={tr.level}
                        maxLevel={tr.maxLevel}
                        size="xs"
                        showNameBelow
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Spells & Super Troops */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spells */}
              {playerResult.spells.length > 0 && (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                      <Zap size={15} className="text-amber-400" />
                      Büyüler ({progressMetrics.spells.maxedCount}/{progressMetrics.spells.count} Max)
                    </h3>
                    <span className="text-xs font-bold text-amber-400">%{progressMetrics.spells.pct}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {playerResult.spells.map((sp) => (
                      <UnitIcon
                        key={sp.name}
                        name={sp.name}
                        level={sp.level}
                        maxLevel={sp.maxLevel}
                        size="xs"
                        showNameBelow
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Super Troops (Dedicated Box) */}
              {progressMetrics.sortedSuperTroopsList.length > 0 && (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                      <Sparkles size={15} className="text-rose-400" />
                      Süper Birlikler ({progressMetrics.superTroops.maxedCount}/{progressMetrics.superTroops.count} Max)
                    </h3>
                    <div className="flex items-center gap-2">
                      {progressMetrics.activeSuperCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {progressMetrics.activeSuperCount} Aktif
                        </span>
                      )}
                      <span className="text-xs font-bold text-rose-400">%{progressMetrics.superTroops.pct}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {progressMetrics.sortedSuperTroopsList.map((st) => (
                      <div key={st.name} className="relative">
                        <UnitIcon
                          name={st.name}
                          level={st.level}
                          maxLevel={st.maxLevel}
                          isSuper
                          size="xs"
                          showNameBelow
                        />
                        {st.superTroopIsActive && (
                          <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-emerald-500 text-[8px] font-black text-white rounded-full shadow-sm leading-tight pointer-events-none">
                            Aktif
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 7. Dedicated Builder Base Section (İnşaatçı Üssü) */}
            {progressMetrics.builderBaseAllUnits.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                    <Hammer size={15} className="text-amber-400" />
                    İnşaatçı Üssü (Builder Base) ({progressMetrics.builderBase.maxedCount}/{progressMetrics.builderBase.count} Max)
                  </h3>
                  <span className="text-xs font-bold text-amber-400">%{progressMetrics.builderBase.pct}</span>
                </div>

                {/* Builder Heroes */}
                {progressMetrics.builderHeroesList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-app-muted uppercase tracking-wider">
                      Kahramanlar
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {progressMetrics.builderHeroesList.map((bh) => (
                        <UnitIcon
                          key={bh.name}
                          name={bh.name}
                          village="builderBase"
                          level={bh.level}
                          maxLevel={bh.maxLevel}
                          size="sm"
                          showNameBelow
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Builder Troops */}
                {progressMetrics.builderBaseTroopsList.length > 0 && (
                  <div className="space-y-2">
                    {progressMetrics.builderHeroesList.length > 0 && (
                      <div className="text-[11px] font-bold text-app-muted uppercase tracking-wider">
                        Birlikler
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {progressMetrics.builderBaseTroopsList.map((bt) => (
                        <UnitIcon
                          key={bt.name}
                          name={bt.name}
                          village="builderBase"
                          level={bt.level}
                          maxLevel={bt.maxLevel}
                          size="xs"
                          showNameBelow
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7. Ranked Battle Log Accordion Section */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                <Swords size={16} className="text-blue-500" />
                Ranked Battle Log Kayıtları ({battleLog.length})
              </h3>
              <span className="text-xs text-app-muted">Sadece ranked Efsane Ligi saldırıları</span>
            </div>

            {battleLog.length === 0 ? (
              <div className="text-xs font-medium text-app-muted py-4 text-center">
                Bu oyuncuda son ranked battle log kaydı bulunamadı.
              </div>
            ) : (
              <div className="space-y-3">
                {battleLog.map((b, idx) => {
                  const isAttack = Boolean(b.attack);
                  const rawCode = (b.armyShareCode || "").trim();
                  const copyUrl = rawCode ? buildCopyArmyLink(rawCode) : "";
                  const decoded = rawCode ? b.decodedArmy || parseArmyShareCode(rawCode) : null;
                  const isExpanded = expandedBattleIdx === idx;

                  return (
                    <div
                      key={idx}
                      className="bg-app-cardSubtle border border-app-border rounded-xl overflow-hidden transition-all"
                    >
                      <div
                        onClick={() => setExpandedBattleIdx(isExpanded ? null : idx)}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-app-border/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                              isAttack ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                            )}
                          >
                            {isAttack ? "Saldırı" : "Savunma"}
                          </span>
                          <span className="font-bold text-xs text-app-text">
                            {b.opponentName || b.opponentTag || "Bilinmeyen Rakip"}
                          </span>
                          {b.opponentTownHallLevel && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-app-card border border-app-border text-app-muted">
                              TH{b.opponentTownHallLevel}
                            </span>
                          )}
                          <span className="text-xs font-bold text-amber-400">
                            ★ {b.stars ?? 0} ({b.destructionPercentage ?? 0}%)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {copyUrl && (
                            <a
                              href={copyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                            >
                              <span>Kopyala</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                          <ChevronDown
                            size={14}
                            className={cn("text-app-muted transition-transform", isExpanded && "rotate-180")}
                          />
                        </div>
                      </div>

                      {/* Decoded Army Preview */}
                      {isExpanded && decoded && (
                        <div className="p-3.5 pt-0 border-t border-app-border/50 space-y-2 mt-2">
                          <div className="text-xs font-bold text-blue-400">{decoded.armyName}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(decoded.troops || []).map((t, tIdx) => (
                              <UnitIcon key={tIdx} name={t.name} count={t.count} size="xs" showNameBelow />
                            ))}
                            {(decoded.spells || []).map((s, sIdx) => (
                              <UnitIcon key={sIdx} name={s.name} count={s.count} size="xs" showNameBelow />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CLAN SEARCH RESULTS OR CLAN DETAILS */}
      {clanResult && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-app-text">{clanResult.name}</h2>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-app-cardSubtle border border-app-border text-app-muted">
                  {clanResult.tag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                  Lv.{clanResult.clanLevel}
                </span>
              </div>
              <p className="text-xs text-app-muted mt-1">{clanResult.description || "Açıklama belirtilmemiş."}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-app-muted mt-2">
                <span>Üye: <strong className="text-app-text font-bold">{clanResult.members}/50</strong></span>
                <span>Puan: <strong className="text-app-text font-bold">{clanResult.clanPoints?.toLocaleString()}</strong></span>
                {clanResult.warLeague && (
                  <span>Lig: <strong className="text-amber-400 font-bold">{clanResult.warLeague.name}</strong></span>
                )}
              </div>
            </div>

            {onScoutClanInCwl && (
              <button
                onClick={() => onScoutClanInCwl(clanResult.tag)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Swords size={15} />
                <span>CWL Keşif Kartında Aç</span>
              </button>
            )}
          </div>

          {/* Members Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted">Klan Üyeleri ({clanResult.memberList?.length ?? 0})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-app-muted">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">İsim & Etiket</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">TH</th>
                    <th className="py-2.5 px-3">Kupa</th>
                    <th className="py-2.5 px-3 text-right">Eylem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border font-medium">
                  {(clanResult.memberList || []).map((m, idx) => (
                    <tr key={m.tag} className="hover:bg-app-cardSubtle/60 transition-colors">
                      <td className="py-2.5 px-3 text-app-muted">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-app-text">{m.name}</div>
                        <div className="text-[10px] text-app-muted">{m.tag}</div>
                      </td>
                      <td className="py-2.5 px-3 capitalize text-app-muted">{m.role}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-400">TH{m.townHallLevel}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">{m.trophies}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSearchMode("player");
                            setQueryInput(m.tag);
                            handleSearch("player", m.tag);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors font-bold cursor-pointer"
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CLAN NAME SEARCH RESULTS GRID */}
      {clanSearchResults.length > 0 && !clanResult && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted">
            Bulunan Klanlar ({clanSearchResults.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clanSearchResults.map((c) => (
              <div
                key={c.tag}
                onClick={() => {
                  setSearchMode("clan");
                  setQueryInput(c.tag);
                  handleSearch("clan", c.tag);
                }}
                className="bg-app-cardSubtle hover:bg-app-border border border-app-border rounded-xl p-4 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-app-text truncate">{c.name}</span>
                  <span className="text-xs text-blue-400 font-extrabold">Lv.{c.clanLevel}</span>
                </div>
                <div className="text-[11px] text-app-muted flex items-center justify-between">
                  <span>{c.tag}</span>
                  <span>{c.members}/50 Üye</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
