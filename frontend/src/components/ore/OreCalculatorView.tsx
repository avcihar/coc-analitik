"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Settings,
  CalendarClock,
  TrendingUp,
  Sparkles,
  Droplet,
  Star,
  Table,
  ShieldAlert,
  CheckCircle2,
  Crown,
  UserCheck,
  X,
  Swords,
  Trophy,
  Package,
  Layers,
  Flame,
  Award,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImportedPlayerForOre } from "@/components/search/PlayerClanSearchView";
import {
  detectEquipmentRarity,
  computeEquipmentUpgradeCost,
  OreCost,
} from "@/lib/equipmentCosts";
import {
  LEAGUE_TIERS,
  DEFAULT_LEAGUE_TIER_ID,
  DEFAULT_CW_WARS_MONTHLY,
  MAX_CW_WARS_MONTHLY,
  DEFAULT_CW_WIN_ORE,
  DEFAULT_CW_LOSS_ORE,
  CWL_WAR_COUNT,
  DEFAULT_CWL_WIN_ORE,
  DEFAULT_CWL_LOSS_ORE,
  WEEKLY_RAID_MEDALS_ORE,
  EPIC_FULL_MAX_COST,
  getLeagueTierById,
  getLeagueTierByName,
  computeCwLossOre,
  computeCwlLossOre,
  computeSingleEventOre,
} from "@/lib/gemIncomeConfig";
import {
  SimulationOreSettings,
  ScenarioResult,
  simulateAllOreScenarios,
} from "@/lib/oreSimulation";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
  }

interface OreDeficit {
  shiny: number;
  glowy: number;
  starry: number;
}

interface THMetaCap {
  commonMax: number;
  epicMax: number;
  petMax: number;
  campCapacity: number;
  spellCapacity: number;
  heroes: {
    bk: number;
    aq: number;
    gw: number;
    rc: number;
    mp: number;
    dd: number;
  };
  deficit: OreDeficit;
}

const TH_META_BY_LEVEL: Record<number, THMetaCap> = {
  11: {
    commonMax: 12,
    epicMax: 15,
    petMax: 0,
    campCapacity: 260,
    spellCapacity: 11,
    heroes: { bk: 50, aq: 50, gw: 20, rc: 0, mp: 30, dd: 0 },
    deficit: { shiny: 48000, glowy: 2400, starry: 260 },
  },
  12: {
    commonMax: 15,
    epicMax: 18,
    petMax: 0,
    campCapacity: 280,
    spellCapacity: 11,
    heroes: { bk: 65, aq: 65, gw: 40, rc: 0, mp: 40, dd: 0 },
    deficit: { shiny: 76000, glowy: 4100, starry: 480 },
  },
  13: {
    commonMax: 15,
    epicMax: 18,
    petMax: 0,
    campCapacity: 300,
    spellCapacity: 11,
    heroes: { bk: 75, aq: 75, gw: 50, rc: 25, mp: 50, dd: 0 },
    deficit: { shiny: 94000, glowy: 5200, starry: 620 },
  },
  14: {
    commonMax: 18,
    epicMax: 21,
    petMax: 10,
    campCapacity: 300,
    spellCapacity: 11,
    heroes: { bk: 80, aq: 80, gw: 55, rc: 30, mp: 60, dd: 0 },
    deficit: { shiny: 118000, glowy: 6600, starry: 840 },
  },
  15: {
    commonMax: 18,
    epicMax: 24,
    petMax: 10,
    campCapacity: 320,
    spellCapacity: 11,
    heroes: { bk: 90, aq: 90, gw: 65, rc: 40, mp: 70, dd: 20 },
    deficit: { shiny: 138000, glowy: 7500, starry: 1020 },
  },
  16: {
    commonMax: 18,
    epicMax: 27,
    petMax: 15,
    campCapacity: 320,
    spellCapacity: 11,
    heroes: { bk: 95, aq: 95, gw: 70, rc: 45, mp: 80, dd: 30 },
    deficit: { shiny: 154000, glowy: 8400, starry: 1200 },
  },
  17: {
    commonMax: 18,
    epicMax: 27,
    petMax: 15,
    campCapacity: 320,
    spellCapacity: 11,
    heroes: { bk: 100, aq: 100, gw: 75, rc: 50, mp: 90, dd: 40 },
    deficit: { shiny: 168000, glowy: 9200, starry: 1350 },
  },
  18: {
    commonMax: 18,
    epicMax: 27,
    petMax: 20,
    campCapacity: 340,
    spellCapacity: 12,
    heroes: { bk: 105, aq: 105, gw: 80, rc: 55, mp: 95, dd: 50 },
    deficit: { shiny: 182000, glowy: 9800, starry: 1480 },
  },
};

// --- Stat Card Component ---
const StatCard = ({
  title,
  value,
  subValue,
  icon,
  borderAccent,
  badgeText,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  borderAccent: string;
  badgeText: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-app-card border-2 rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden",
      borderAccent
    )}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
          {icon}
        </div>
        <h4 className="text-app-muted font-bold text-xs uppercase tracking-wider">
          {title}
        </h4>
      </div>
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-app-cardSubtle border border-app-border text-app-muted">
        {badgeText}
      </span>
    </div>
    <div className="text-3xl font-black text-app-text tracking-tight">
      {value}
    </div>
    {subValue && (
      <div className="text-[11px] font-semibold text-app-muted mt-1.5">
        {subValue}
      </div>
    )}
  </motion.div>
);

export default function OreCalculatorView({
  importedPlayer = null,
  onClearImportedPlayer,
}: {
  importedPlayer?: ImportedPlayerForOre | null;
  onClearImportedPlayer?: () => void;
}) {
  // Town Hall State
  const [thLevel, setThLevel] = useState<number>(18);

  // 1. League Selection State (37 leagues from low to high)
  const [leagueTierId, setLeagueTierId] = useState<number>(DEFAULT_LEAGUE_TIER_ID);

  // 2. Clan War (CW) State
  const [monthlyCwCount, setMonthlyCwCount] = useState<number>(DEFAULT_CW_WARS_MONTHLY);
  const [cwWinCount, setCwWinCount] = useState<number>(DEFAULT_CW_WARS_MONTHLY);
  const [cwWinShiny, setCwWinShiny] = useState<number>(DEFAULT_CW_WIN_ORE.shiny);
  const [cwWinGlowy, setCwWinGlowy] = useState<number>(DEFAULT_CW_WIN_ORE.glowy);
  const [cwWinStarry, setCwWinStarry] = useState<number>(DEFAULT_CW_WIN_ORE.starry);

  // 3. CWL State
  const [participatesCwl, setParticipatesCwl] = useState<boolean>(true);
  const [cwlWinCount, setCwlWinCount] = useState<number>(CWL_WAR_COUNT);
  const [cwlWinShiny, setCwlWinShiny] = useState<number>(DEFAULT_CWL_WIN_ORE.shiny);
  const [cwlWinGlowy, setCwlWinGlowy] = useState<number>(DEFAULT_CWL_WIN_ORE.glowy);
  const [cwlWinStarry, setCwlWinStarry] = useState<number>(DEFAULT_CWL_WIN_ORE.starry);

  // 4. Raid Medals State
  const [includeRaidMedals, setIncludeRaidMedals] = useState<boolean>(true);

  // 5. Inventory State (Shiny, Glowy, Starry)
  const [invShinyInput, setInvShinyInput] = useState<string>("0");
  const [invGlowyInput, setInvGlowyInput] = useState<string>("0");
  const [invStarryInput, setInvStarryInput] = useState<string>("0");

  // 6. Epic Injection & Event Passes State
  const [includeFutureEpics, setIncludeFutureEpics] = useState<boolean>(true);
  const [hasEventPass, setHasEventPass] = useState<boolean>(false);
  const [hasEventMedals, setHasEventMedals] = useState<boolean>(false);

  // Auto-detect player's league and TH if imported
  useEffect(() => {
    if (importedPlayer) {
      const clampedTh = Math.min(
        18,
        Math.max(11, importedPlayer.townHallLevel || 18)
      );
      setThLevel(clampedTh);

      if (importedPlayer.leagueTierId) {
        setLeagueTierId(importedPlayer.leagueTierId);
      } else if (importedPlayer.leagueName) {
        const found = getLeagueTierByName(importedPlayer.leagueName);
        setLeagueTierId(found.id);
      }
    }
  }, [importedPlayer]);

  const currentThMeta = useMemo(
    () => TH_META_BY_LEVEL[thLevel] ?? TH_META_BY_LEVEL[18],
    [thLevel]
  );

  // Parse inventory inputs (empty or invalid string defaults to 0)
  const inventory: OreCost = useMemo(() => {
    const s = parseInt(invShinyInput.replace(/\D/g, ""), 10);
    const g = parseInt(invGlowyInput.replace(/\D/g, ""), 10);
    const y = parseInt(invStarryInput.replace(/\D/g, ""), 10);
    return {
      shiny: isNaN(s) ? 0 : s,
      glowy: isNaN(g) ? 0 : g,
      starry: isNaN(y) ? 0 : y,
    };
  }, [invShinyInput, invGlowyInput, invStarryInput]);

  // Compute exact equipment deficit
  const activeDeficitAndItems = useMemo(() => {
    if (!importedPlayer) {
      return {
        deficit: currentThMeta.deficit,
        items: [],
      };
    }

    const eqSource =
      importedPlayer.heroEquipment && importedPlayer.heroEquipment.length > 0
        ? importedPlayer.heroEquipment
        : importedPlayer.heroes.flatMap((h) => h.equipment || []);

    let totalShiny = 0;
    let totalGlowy = 0;
    let totalStarry = 0;

    const itemBreakdowns: Array<{
      name: string;
      level: number;
      targetLevel: number;
      isEpic: boolean;
      shiny: number;
      glowy: number;
      starry: number;
    }> = [];

    for (const eq of eqSource) {
      const rarity = detectEquipmentRarity(eq.maxLevel);
      if (!rarity) continue;
      const isEpic = rarity === "Epic";
      const capForTh = isEpic
        ? currentThMeta.epicMax
        : currentThMeta.commonMax;
      const d = computeEquipmentUpgradeCost(rarity, eq.level, capForTh);

      totalShiny += d.shiny;
      totalGlowy += d.glowy;
      totalStarry += d.starry;

      itemBreakdowns.push({
        name: eq.name,
        level: eq.level,
        targetLevel: capForTh,
        isEpic,
        shiny: d.shiny,
        glowy: d.glowy,
        starry: d.starry,
      });
    }

    return {
      deficit: {
        shiny: totalShiny,
        glowy: totalGlowy,
        starry: totalStarry,
      },
      items: itemBreakdowns,
    };
  }, [importedPlayer, currentThMeta]);

  const effectiveDeficit = activeDeficitAndItems.deficit;

  // Selected League Info
  const selectedLeagueTier = useMemo(
    () => getLeagueTierById(leagueTierId),
    [leagueTierId]
  );

  // Full Simulation Configuration
  const simulationSettings: SimulationOreSettings = useMemo(() => {
    return {
      leagueTierId,
      monthlyCwCount,
      cwWinCount: Math.min(monthlyCwCount, cwWinCount),
      cwWinReward: { shiny: cwWinShiny, glowy: cwWinGlowy, starry: cwWinStarry },
      participatesCwl,
      cwlWinCount,
      cwlWinReward: { shiny: cwlWinShiny, glowy: cwlWinGlowy, starry: cwlWinStarry },
      includeRaidMedals,
      inventory,
      includeFutureEpics,
      hasEventPass,
      hasEventMedals,
    };
  }, [
    leagueTierId,
    monthlyCwCount,
    cwWinCount,
    cwWinShiny,
    cwWinGlowy,
    cwWinStarry,
    participatesCwl,
    cwlWinCount,
    cwlWinShiny,
    cwlWinGlowy,
    cwlWinStarry,
    includeRaidMedals,
    inventory,
    includeFutureEpics,
    hasEventPass,
    hasEventMedals,
  ]);

  // Execute 3 Scenarios Simulation
  const scenarios = useMemo(() => {
    return simulateAllOreScenarios(effectiveDeficit, simulationSettings);
  }, [effectiveDeficit, simulationSettings]);

  const estimated = scenarios.estimated;
  const minScenario = scenarios.min;
  const maxScenario = scenarios.max;

  // CW / CWL conflict check: In a 30-day month, 10 days are CWL, remaining 20 days fit at most 10 CWs
  const showCwConflictWarning = participatesCwl && monthlyCwCount > 10;

  // Net needed after inventory
  const netNeeded = estimated.netNeeded;
  const isCompletedToday = estimated.isCompletedToday;

  // Bottleneck label
  const bottleneckLabel = {
    starry: "Yıldızlı Cevher (Starry)",
    glowy: "Işıltılı Cevher (Glowy)",
    shiny: "Parlak Cevher (Shiny)",
  }[estimated.bottleneckOre];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-sans">
      {/* Imported Player Profile Banner */}
      {importedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600/10 border-2 border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-600 text-white">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-app-text">
                  Aktarılan Oyuncu Ekipmanları: {importedPlayer.name} (
                  {importedPlayer.tag})
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-600 text-white">
                  TH {importedPlayer.townHallLevel}
                </span>
              </div>
              <p className="text-xs font-bold text-app-muted mt-0.5">
                {activeDeficitAndItems.items.length} adet ekipmanın gerçek seviyeleri üzerinden net cevher ihtiyacı hesaplandı.
              </p>
            </div>
          </div>
          {onClearImportedPlayer && (
            <button
              onClick={onClearImportedPlayer}
              className="px-3.5 py-2 rounded-xl bg-app-card border-2 border-app-border text-xs font-black text-app-text hover:border-red-500/50 flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} /> Varsayılan Simülasyona Dön
            </button>
          )}
        </motion.div>
      )}

      {/* Top Title Banner */}
      <div className="bg-app-card border-2 border-app-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/10 border-2 border-blue-500/30 rounded-2xl text-blue-600 dark:text-blue-400">
            <TrendingUp size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-app-text tracking-wide flex items-center gap-3 flex-wrap">
              Cevher Gelişim ve Tahmin Motoru (TH18 Meta)
              <span className="text-xs bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                TH11–TH18 Dinamik Simülasyon
              </span>
            </h1>
            <p className="text-app-muted text-sm mt-1">
              37 Çok oyunculu lig, klan savaşları, CWL, baskın madalyası ve takvime bağlı epik ekipman etkinlik gelirleriyle net zaman tahmini.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-5 bg-app-card border-2 border-app-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b-2 border-app-border pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black text-app-text uppercase tracking-widest flex items-center gap-2">
              <Settings size={18} className="text-blue-600 dark:text-blue-400" />{" "}
              Simülasyon Ayarları
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              TH {thLevel}
            </span>
          </div>

          {/* 5. Inventory Inputs (Envanter Girişi) */}
          <div className="space-y-3 bg-app-cardSubtle p-4 rounded-xl border border-app-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-amber-500" /> Mevcut Envanter
              </label>
              <span className="text-[10px] font-bold text-app-muted">
                Boş bırakılırsa 0 kabul edilir
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Parlak
                </span>
                <input
                  type="text"
                  value={invShinyInput}
                  onChange={(e) => setInvShinyInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-app-text focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 block mb-1">
                  Işıltılı
                </span>
                <input
                  type="text"
                  value={invGlowyInput}
                  onChange={(e) => setInvGlowyInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-app-text focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block mb-1">
                  Yıldızlı
                </span>
                <input
                  type="text"
                  value={invStarryInput}
                  onChange={(e) => setInvStarryInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-app-text focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 1. Multiplayer League Select (37 Tiers: low to high) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-1.5">
                {selectedLeagueTier.iconSmall && (
                  <img
                    src={selectedLeagueTier.iconSmall}
                    alt={selectedLeagueTier.name}
                    className="w-4 h-4 object-contain inline-block"
                  />
                )}
                Çok Oyunculu Lig (Yıldız Bonusu)
              </label>
              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                +{selectedLeagueTier.dailyShiny} P, +{selectedLeagueTier.dailyGlowy} I, +{selectedLeagueTier.dailyStarry} Y / gün
              </span>
            </div>
            <select
              value={leagueTierId}
              onChange={(e) => setLeagueTierId(Number(e.target.value))}
              className="w-full bg-app-cardSubtle border-2 border-app-border text-app-text rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {LEAGUE_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id} className="bg-app-card text-app-text">
                  {tier.nameTr} ({tier.name}) [ID: {tier.id}]
                  {tier.isUnknown
                    ? " — Veri yok, 0 kabul edildi"
                    : ` — (${tier.dailyShiny}, ${tier.dailyGlowy}, ${tier.dailyStarry})`}
                </option>
              ))}
            </select>
            {selectedLeagueTier.isUnknown && (
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                Veri yok, günlük yıldız bonusu 0 kabul edildi.
              </p>
            )}
          </div>

          {/* 2. Clan War (CW) Controls */}
          <div className="space-y-3 bg-app-cardSubtle p-4 rounded-xl border border-app-border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
                <Swords size={14} className="text-blue-500" /> Klan Savaşı (CW)
              </span>
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-extrabold text-xs">
                {monthlyCwCount} Savaş / Ay ({cwWinCount} Galibiyet)
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-app-muted">
                <span>Aylık Savaş Sayısı (0–14)</span>
                <span>{monthlyCwCount} savaş</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={monthlyCwCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMonthlyCwCount(val);
                  if (cwWinCount > val) setCwWinCount(val);
                }}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-app-muted">
                <span>Kazanılan Savaş Sayısı</span>
                <span>{cwWinCount} galibiyet / {monthlyCwCount - cwWinCount} mağlubiyet</span>
              </div>
              <input
                type="range"
                min="0"
                max={monthlyCwCount}
                step="1"
                value={cwWinCount}
                onChange={(e) => setCwWinCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Custom Per-War Ore Inputs */}
            <div className="pt-2 border-t border-app-border space-y-1.5">
              <span className="text-[10px] font-bold text-app-muted block">
                Savaş Başına Kazanç (Varsayılan: 2220, 78, 12 — Kayıp yarısı taban alınır):
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">P (Win)</span>
                  <input
                    type="number"
                    value={cwWinShiny}
                    onChange={(e) => setCwWinShiny(Number(e.target.value) || 0)}
                    className="w-full bg-app-card border border-app-border rounded px-2 py-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold block">I (Win)</span>
                  <input
                    type="number"
                    value={cwWinGlowy}
                    onChange={(e) => setCwWinGlowy(Number(e.target.value) || 0)}
                    className="w-full bg-app-card border border-app-border rounded px-2 py-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">★ (Win)</span>
                  <input
                    type="number"
                    value={cwWinStarry}
                    onChange={(e) => setCwWinStarry(Number(e.target.value) || 0)}
                    className="w-full bg-app-card border border-app-border rounded px-2 py-1 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Clan War League (CWL) Controls */}
          <div className="space-y-3 bg-app-cardSubtle p-4 rounded-xl border border-app-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" /> CWL (Klan Savaşı Ligi)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-app-muted">Katılım:</span>
                <button
                  type="button"
                  onClick={() => setParticipatesCwl(!participatesCwl)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer",
                    participatesCwl
                      ? "bg-amber-600 text-white"
                      : "bg-app-card border border-app-border text-app-muted"
                  )}
                >
                  {participatesCwl ? "Evet" : "Hayır"}
                </button>
              </div>
            </div>

            {participatesCwl && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-[11px] font-bold text-app-muted">
                  <span>Kazanılan CWL Savaşı (0–7)</span>
                  <span className="text-app-text">{cwlWinCount} / 7 Savaş</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={cwlWinCount}
                  onChange={(e) => setCwlWinCount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="text-[10px] text-app-muted">
                  Savaş Başı Kazanç: (1110, 39, 6) • Kayıp: (555, 19, 3)
                </div>
              </div>
            )}

            {showCwConflictWarning && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  CWL süresince (10 gün) normal CW başlamaz. Kalan 20 günde en fazla ~10 normal savaş yapılabilir.
                </span>
              </div>
            )}
          </div>

          {/* 4. Raid Medals Toggle */}
          <div className="bg-app-cardSubtle p-3.5 rounded-xl border border-app-border">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-app-text block">
                  Baskın Madalyaları Geliri
                </span>
                <span className="text-[11px] font-semibold text-app-muted block">
                  Haftalık: +100 Işıltılı, +10 Yıldızlı (Günlük ortalama: +14.3 I, +1.4 ★)
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeRaidMedals}
                onChange={(e) => setIncludeRaidMedals(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-app-border text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
            </label>
          </div>

          {/* 6. Bi-Monthly Future Epic Equipment & Event Toggles */}
          <div className="bg-app-cardSubtle p-4 rounded-xl border border-app-border space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-app-text block">
                  Gelecek Epik Ekipmanları Dahil Et
                </span>
                <span className="text-[10px] font-bold text-app-muted block">
                  2 ayda bir (Şub, Nis, Haz, Ağu, Eki, Ara) +56.060 Parlak, +3.720 Işıltılı, +480 Yıldızlı
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeFutureEpics}
                onChange={(e) => setIncludeFutureEpics(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-app-border text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
              />
            </label>

            {includeFutureEpics && (
              <div className="pt-2 border-t border-app-border space-y-2">
                <div className="text-[10px] font-bold text-app-muted">
                  Etkinlik Gelirleri (Her yeni epik ekipmanla gelen etkinlik):
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg bg-app-card border border-app-border cursor-pointer">
                  <span className="text-[11px] font-bold text-app-text">
                    Etkinlik Bileti Aldım (Pass) (+600 Işıltılı, +80 Yıldızlı)
                  </span>
                  <input
                    type="checkbox"
                    checked={hasEventPass}
                    onChange={(e) => setHasEventPass(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-app-card border border-app-border cursor-pointer">
                  <span className="text-[11px] font-bold text-app-text">
                    Etkinlik Madalyası Aldım (+600 Işıltılı, +80 Yıldızlı)
                  </span>
                  <input
                    type="checkbox"
                    checked={hasEventMedals}
                    onChange={(e) => setHasEventMedals(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                <div className="text-[10px] font-semibold text-app-muted pt-1">
                  Ücretsiz Plan (5.000 Parlak, 400 Işıltılı) her etkinliğe otomatik dahildir.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Single Unified Primary Result Card */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-app-card border border-app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            {/* Header & Bottleneck Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-app-border">
              <span className="text-xs uppercase font-bold tracking-wider text-app-muted">
                TH{thLevel} Demirci Fulleme Projeksiyonu
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/25 px-3 py-1 rounded-full">
                <ShieldAlert size={14} /> Darboğaz: <strong className="text-app-text">{bottleneckLabel}</strong>
              </span>
            </div>

            {/* Single Big Main Metric: "510 gün • 26 Mart 2028" */}
            <div className="space-y-2">
              <div className="text-3xl md:text-5xl font-black text-app-text tracking-tight flex flex-wrap items-baseline gap-3">
                <span>{estimated.daysToComplete} Gün</span>
                <span className="text-xl md:text-2xl font-bold text-blue-400">• {estimated.targetDateStr}</span>
              </div>
              <p className="text-xs md:text-sm text-app-muted font-medium">
                {isCompletedToday ? (
                  <span className="text-emerald-400 font-bold">
                    Mevcut cevher envanteriniz tüm ekipman yükseltmelerini bugün tamamlamaya yetiyor!
                  </span>
                ) : (
                  <>
                    Mevcut tempo ve klan geliriyle TH{thLevel} ekipman havuzunuz{" "}
                    <span className="font-bold text-app-text">{estimated.targetDateStr}</span> tarihinde tamamen tamamlanacaktır.
                  </>
                )}
              </p>
            </div>

            {/* Min / Tahmini / Max Comparison Strip */}
            <div className="p-3.5 rounded-xl bg-app-cardSubtle border border-app-border space-y-2">
              <span className="text-[11px] font-bold text-app-muted uppercase tracking-wider block">
                Senaryo Karşılaştırma Şeridi:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-app-card border border-app-border">
                  <div className="text-[10px] text-emerald-400 font-bold">EN İYİ SENARYO (MIN)</div>
                  <div className="font-extrabold text-app-text mt-0.5">{minScenario.daysToComplete} Gün</div>
                  <div className="text-[10px] text-app-muted">{minScenario.targetDateStr}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="text-[10px] text-blue-400 font-bold">BEKLENEN SENARYO (ORT)</div>
                  <div className="font-extrabold text-app-text mt-0.5">{estimated.daysToComplete} Gün</div>
                  <div className="text-[10px] text-app-muted">{estimated.targetDateStr}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-app-card border border-app-border">
                  <div className="text-[10px] text-amber-400 font-bold">EN YAVAŞ SENARYO (MAX)</div>
                  <div className="font-extrabold text-app-text mt-0.5">{maxScenario.daysToComplete} Gün</div>
                  <div className="text-[10px] text-app-muted">{maxScenario.targetDateStr}</div>
                </div>
              </div>
            </div>

            {/* 3 Net Required Ore Pills */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-app-cardSubtle border border-app-border space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <Sparkles size={13} />
                  <span>Gereken Parlak</span>
                </div>
                <div className="text-base font-black text-app-text">{netNeeded.shiny.toLocaleString("tr-TR")}</div>
                <div className="text-[10px] text-app-muted">+{estimated.dailyRates.shiny} / gün</div>
              </div>

              <div className="p-3 rounded-xl bg-app-cardSubtle border border-app-border space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                  <Droplet size={13} />
                  <span>Gereken Işıltılı</span>
                </div>
                <div className="text-base font-black text-app-text">{netNeeded.glowy.toLocaleString("tr-TR")}</div>
                <div className="text-[10px] text-app-muted">+{estimated.dailyRates.glowy} / gün</div>
              </div>

              <div className="p-3 rounded-xl bg-app-cardSubtle border border-app-border space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                  <Star size={13} />
                  <span>Gereken Yıldızlı</span>
                </div>
                <div className="text-base font-black text-app-text">{netNeeded.starry.toLocaleString("tr-TR")}</div>
                <div className="text-[10px] text-app-muted">+{estimated.dailyRates.starry} / gün</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Imported Player Equipment Breakdown Table (if imported) */}
      {importedPlayer && activeDeficitAndItems.items.length > 0 && (
        <div className="bg-app-card border-2 border-app-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-app-border pb-3">
            <h3 className="text-base font-black text-app-text">
              {importedPlayer.name} — Ekipman Bazlı Kalan Cevher Tablosu
            </h3>
            <span className="text-xs font-bold text-app-muted">
              TH{thLevel} Demirci Sınırı
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeDeficitAndItems.items.map((item) => (
              <div
                key={item.name}
                className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-3 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-app-text truncate pr-1">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-black",
                      item.isEpic
                        ? "bg-purple-600/20 text-purple-600 dark:text-purple-400"
                        : "bg-blue-600/15 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    Lv.{item.level} → {item.targetLevel}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-app-muted">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    P: {item.shiny.toLocaleString()}
                  </span>
                  <span className="text-cyan-600 dark:text-cyan-400">
                    I: {item.glowy.toLocaleString()}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400">
                    ★: {item.starry.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis Table: Fixed Config Breakdown */}
      <div className="bg-app-card border-2 border-app-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b-2 border-app-border pb-3">
          <div className="flex items-center gap-2">
            <Table size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-black text-app-text tracking-wide">
              Günlük & Periyodik Cevher Gelir Dağılım Tablosu (TH{thLevel})
            </h3>
          </div>
          <span className="text-xs font-extrabold bg-blue-600 text-white px-3 py-1 rounded-lg">
            Sabit Gelir Modeli
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-app-border bg-app-cardSubtle text-xs font-black text-app-text uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-lg">Gelir Kaynağı</th>
                <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                  Parlak (Shiny)
                </th>
                <th className="py-3 px-4 text-cyan-600 dark:text-cyan-400">
                  Işıltılı (Glowy)
                </th>
                <th className="py-3 px-4 text-purple-600 dark:text-purple-400">
                  Yıldızlı (Starry)
                </th>
                <th className="py-3 px-4 rounded-r-lg text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-app-border text-sm font-semibold text-app-text">
              <tr className="hover:bg-app-cardSubtle/60 transition-colors">
                <td className="py-3 px-4 font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Günlük Yıldız Bonusu ({selectedLeagueTier.nameTr})
                </td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                  +{selectedLeagueTier.dailyShiny} / gün
                </td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                  +{selectedLeagueTier.dailyGlowy} / gün
                </td>
                <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                  +{selectedLeagueTier.dailyStarry} / gün
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Günlük
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-app-cardSubtle/60 transition-colors">
                <td className="py-3 px-4 font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Klan Savaşları ({monthlyCwCount} Savaş/Ay • {cwWinCount} Galibiyet)
                </td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                  ~+{Math.round((cwWinCount * cwWinShiny + (monthlyCwCount - cwWinCount) * Math.floor(cwWinShiny / 2)) / 30)} / gün
                </td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                  ~+{Math.round((cwWinCount * cwWinGlowy + (monthlyCwCount - cwWinCount) * Math.floor(cwWinGlowy / 2)) / 30)} / gün
                </td>
                <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                  ~+{Number(((cwWinCount * cwWinStarry + (monthlyCwCount - cwWinCount) * Math.floor(cwWinStarry / 2)) / 30).toFixed(1))} / gün
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Aylık Toplam
                  </span>
                </td>
              </tr>

              {participatesCwl && (
                <tr className="hover:bg-app-cardSubtle/60 transition-colors">
                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    CWL (7 Savaş • {cwlWinCount} Galibiyet)
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                    ~+{Math.round((cwlWinCount * cwlWinShiny + (7 - cwlWinCount) * Math.floor(cwlWinShiny / 2)) / 30)} / gün
                  </td>
                  <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                    ~+{Math.round((cwlWinCount * cwlWinGlowy + (7 - cwlWinCount) * Math.floor(cwlWinGlowy / 2)) / 30)} / gün
                  </td>
                  <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                    ~+{Number(((cwlWinCount * cwlWinStarry + (7 - cwlWinCount) * Math.floor(cwlWinStarry / 2)) / 30).toFixed(1))} / gün
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Lig Savaşları
                    </span>
                  </td>
                </tr>
              )}

              {includeRaidMedals && (
                <tr className="hover:bg-app-cardSubtle/60 transition-colors">
                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Baskın Madalyaları (Haftalık Sabit)
                  </td>
                  <td className="py-3 px-4 text-app-muted">0 / gün</td>
                  <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                    +14.3 / gün (+100/hf)
                  </td>
                  <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                    +1.4 / gün (+10/hf)
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Haftalık
                    </span>
                  </td>
                </tr>
              )}

              <tr className="bg-app-cardSubtle font-black text-base border-t-2 border-app-border">
                <td className="py-3.5 px-4 font-extrabold text-app-text">
                  TOPLAM GÜNLÜK HIZ
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-extrabold">
                  ~{estimated.dailyRates.shiny} / gün
                </td>
                <td className="py-3.5 px-4 text-cyan-600 dark:text-cyan-400 font-extrabold">
                  ~{estimated.dailyRates.glowy} / gün
                </td>
                <td className="py-3.5 px-4 text-purple-600 dark:text-purple-400 font-extrabold">
                  ~{estimated.dailyRates.starry} / gün
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-3 py-1 rounded-md text-xs font-black bg-blue-600 text-white">
                    Net Toplam
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
