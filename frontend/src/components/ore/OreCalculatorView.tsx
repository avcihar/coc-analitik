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
  ChevronDown,
  Info,
  Calendar,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImportedPlayerForOre } from "@/components/player";
import UnitIcon from "@/components/common/UnitIcon";
import { GamePanel, GameButton } from "@/components/game";
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

// ============================================================================
// IN-GAME ORE SVG ICONS (Faceted Clash of Clans Crystal Gems)
// ============================================================================

export function ShinyOreIcon({
  className = "w-5 h-5",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_4px_rgba(2,132,199,0.5)]", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="shinyGrad1" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="shinyGrad2" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* Outer Crystalline Facets */}
      <path
        d="M16 2L27 9L23 26L16 30L9 26L5 9L16 2Z"
        fill="url(#shinyGrad1)"
        stroke="#082F49"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Upper Reflective Table Facet */}
      <path d="M16 2L22 10L16 19L10 10L16 2Z" fill="url(#shinyGrad2)" opacity="0.9" />
      {/* Lower Shadowed Pavilion */}
      <path d="M16 19L23 26L16 30L9 26L16 19Z" fill="#075985" opacity="0.95" />
      {/* Side Glints */}
      <path d="M5 9L10 10L9 26L5 9Z" fill="#0284C7" opacity="0.8" />
      <path d="M27 9L23 26L22 10L27 9Z" fill="#BAE6FD" opacity="0.9" />
      {/* Specular Sparkle */}
      <circle cx="14" cy="7.5" r="1.5" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

export function GlowyOreIcon({
  className = "w-5 h-5",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_4px_rgba(192,38,211,0.5)]", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="glowyGrad1" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0ABFC" />
          <stop offset="50%" stopColor="#C026D3" />
          <stop offset="100%" stopColor="#701A75" />
        </linearGradient>
        <linearGradient id="glowyGrad2" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDF4FF" />
          <stop offset="100%" stopColor="#E879F9" />
        </linearGradient>
      </defs>
      {/* Outer Hex Crystal */}
      <path
        d="M16 2.5L27 8L28 21L16 29.5L4 21L5 8L16 2.5Z"
        fill="url(#glowyGrad1)"
        stroke="#2E0854"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Central Facet */}
      <path d="M16 2.5L22 9.5L16 18L10 9.5L16 2.5Z" fill="url(#glowyGrad2)" opacity="0.92" />
      {/* Bottom Facets */}
      <path d="M16 18L28 21L16 29.5L4 21L16 18Z" fill="#4A044E" opacity="0.9" />
      {/* Side Highlights */}
      <path d="M5 8L10 9.5L4 21L5 8Z" fill="#86198F" opacity="0.75" />
      <path d="M27 8L28 21L22 9.5L27 8Z" fill="#F5D0FE" opacity="0.9" />
      {/* Specular Highlight */}
      <circle cx="14.5" cy="7.5" r="1.5" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

export function StarryOreIcon({
  className = "w-5 h-5",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.6)]", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="starryGrad1" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="starryGrad2" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      {/* 8-Pointed Starry Crystal */}
      <path
        d="M16 2L19.5 11L28.5 7.5L23.5 16L28.5 24.5L19.5 21L16 30L12.5 21L3.5 24.5L8.5 16L3.5 7.5L12.5 11L16 2Z"
        fill="url(#starryGrad1)"
        stroke="#451A03"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Central Gem Core */}
      <path d="M16 9.5L21 16L16 22.5L11 16L16 9.5Z" fill="url(#starryGrad2)" stroke="#78350F" strokeWidth="1" />
      {/* Center Star Glimmer */}
      <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

// Inline Mini Ore Pill for Tables & Equipment Cards
function OreBadge({
  type,
  amount,
  suffix,
  className,
}: {
  type: "shiny" | "glowy" | "starry";
  amount: number | string;
  suffix?: string;
  className?: string;
}) {
  const config = {
    shiny: {
      icon: <ShinyOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-sky-300",
      wellClass: "bg-[#0E1F33] border-[#1D3E64]",
    },
    glowy: {
      icon: <GlowyOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-fuchsia-300",
      wellClass: "bg-[#231030] border-[#4A1E63]",
    },
    starry: {
      icon: <StarryOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-amber-300",
      wellClass: "bg-[#291708] border-[#5E3612]",
    },
  }[type];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-game text-xs tracking-tight shadow-sm select-none",
        config.wellClass,
        config.textClass,
        className
      )}
    >
      {config.icon}
      <span>{typeof amount === "number" ? amount.toLocaleString("tr-TR") : amount}</span>
      {suffix && <span className="text-[10px] opacity-75 font-sans font-semibold">{suffix}</span>}
    </div>
  );
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

  const bottleneckOreType = estimated.bottleneckOre;

  return (
    <div className="game-theme w-full space-y-6 pb-6 select-none font-sans">
      {/* 1. IMPORTED PLAYER PROFILE BANNER */}
      {importedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-panel-wood rounded-2xl p-4 sm:p-5 border-3 border-[#2C180E] shadow-[0_6px_16px_rgba(0,0,0,0.6)] relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#2E6A3B] to-[#173F20] border-2 border-[#4ED16F] flex items-center justify-center text-white shadow-inner shrink-0">
                <UserCheck size={26} className="text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-game text-base sm:text-lg text-amber-100 game-text-stroke-sm tracking-wide">
                    {importedPlayer.name} ({importedPlayer.tag})
                  </span>
                  <span className="font-game text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 border border-amber-300 font-bold shadow-sm">
                    TH {importedPlayer.townHallLevel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-200/80 mt-0.5">
                  <strong className="text-white">{activeDeficitAndItems.items.length}</strong> adet ekipmanın gerçek seviyeleri üzerinden net cevher ihtiyacı hesaplandı.
                </p>
              </div>
            </div>

            {onClearImportedPlayer && (
              <GameButton
                variant="red"
                size="sm"
                onClick={onClearImportedPlayer}
                className="shrink-0 flex items-center gap-1.5 self-end sm:self-center"
              >
                <X size={14} /> Varsayılan Simülasyona Dön
              </GameButton>
            )}
          </div>
        </motion.div>
      )}

      {/* 2. TOP BANNER / HEADER */}
      <div className="game-panel-wood rounded-2xl p-4 sm:p-6 border-3 border-[#2C180E] shadow-[0_8px_20px_rgba(0,0,0,0.65)] relative overflow-hidden">
        {/* Soft golden top highlight */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4.5">
            {/* 3 Ore Cluster Mascot Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-[#3B2214] to-[#1E0F08] border-2 border-[#6D4229] p-2 flex items-center justify-center relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] shrink-0">
              <div className="relative w-full h-full flex items-center justify-center">
                <ShinyOreIcon className="w-7 h-7 absolute -top-1 -left-1" />
                <GlowyOreIcon className="w-7 h-7 absolute -top-1 -right-1" />
                <StarryOreIcon className="w-8 h-8 absolute -bottom-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-game text-xl sm:text-2xl md:text-3xl text-amber-100 game-title-stroke tracking-wide">
                  Cevher Gelişim ve Tahmin Motoru
                </h1>
                <span className="font-game text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 text-white border border-amber-300/60 shadow-sm">
                  TH11–TH18 Meta
                </span>
              </div>
              <p className="text-amber-200/75 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                37 Çok oyunculu lig, klan savaşları, CWL, baskın madalyası ve epik ekipman etkinlik gelirleriyle net fulleme süresi.
              </p>
            </div>
          </div>

          {/* Town Hall Selector (When no player is imported, user can pick TH11-TH18) */}
          {!importedPlayer && (
            <div className="flex items-center gap-2 self-end sm:self-center bg-[#24130A] p-1.5 rounded-xl border border-[#442314] shadow-inner shrink-0">
              <span className="font-game text-xs text-amber-200/80 px-1">Hedef TH:</span>
              <div className="flex items-center gap-1">
                {[14, 15, 16, 17, 18].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setThLevel(lvl)}
                    className={cn(
                      "px-2 py-1 rounded-lg font-game text-xs transition-all cursor-pointer",
                      thLevel === lvl
                        ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-black shadow-[0_2px_0_#6D3E08] border border-amber-300"
                        : "bg-[#331C0F] text-amber-200/70 hover:text-white hover:bg-[#432514] border border-[#261309]"
                    )}
                  >
                    TH{lvl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN GRID: CONFIGURATION CONTROLS (LEFT) + SIMULATION RESULTS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ==================================================================
            LEFT COLUMN: SİMÜLASYON AYARLARI (Controls)
            ================================================================== */}
        <div className="lg:col-span-5">
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-amber-300" />
                  <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                    SİMÜLASYON AYARLARI
                  </span>
                </div>
                <span className="font-game text-xs px-2 py-0.5 rounded bg-[#27150C] text-amber-300 border border-[#4E2B17]">
                  TH {thLevel}
                </span>
              </div>
            }
            bodyClassName="space-y-4 p-3.5 sm:p-5"
          >
            {/* A. MEVCUT ENVANTER GİRİŞİ */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-game text-xs text-amber-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <Package size={15} className="text-amber-400" /> Mevcut Envanter
                </label>
                <span className="text-[10px] text-amber-300/60 font-semibold">
                  Boş bırakılırsa 0 kabul edilir
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Parlak Input */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-game text-sky-300">
                    <ShinyOreIcon className="w-3.5 h-3.5" />
                    <span>Parlak</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invShinyInput}
                    onChange={(e) => setInvShinyInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#22446A] rounded-lg px-2.5 py-1.5 font-game text-xs sm:text-sm text-sky-200 focus:outline-none focus:border-sky-400 shadow-inner"
                  />
                </div>

                {/* Işıltılı Input */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-game text-fuchsia-300">
                    <GlowyOreIcon className="w-3.5 h-3.5" />
                    <span>Işıltılı</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invGlowyInput}
                    onChange={(e) => setInvGlowyInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#54216E] rounded-lg px-2.5 py-1.5 font-game text-xs sm:text-sm text-fuchsia-200 focus:outline-none focus:border-fuchsia-400 shadow-inner"
                  />
                </div>

                {/* Yıldızlı Input */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-game text-amber-300">
                    <StarryOreIcon className="w-3.5 h-3.5" />
                    <span>Yıldızlı</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invStarryInput}
                    onChange={(e) => setInvStarryInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#6E3C0F] rounded-lg px-2.5 py-1.5 font-game text-xs sm:text-sm text-amber-200 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* B. ÇOK OYUNCULU LİG (YILDIZ BONUSU) */}
            <div className="game-slot-well p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-game text-xs text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                  {selectedLeagueTier.iconSmall ? (
                    <img
                      src={selectedLeagueTier.iconSmall}
                      alt={selectedLeagueTier.name}
                      className="w-4 h-4 object-contain inline-block drop-shadow"
                    />
                  ) : (
                    <Trophy size={14} className="text-amber-400" />
                  )}
                  Çok Oyunculu Lig (Yıldız Bonusu)
                </label>
              </div>

              <div className="relative">
                <select
                  value={leagueTierId}
                  onChange={(e) => setLeagueTierId(Number(e.target.value))}
                  className="w-full bg-[#1A0F0A] border-2 border-[#4A2614] text-amber-100 rounded-xl p-2.5 pr-8 font-game text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors cursor-pointer appearance-none shadow-inner"
                >
                  {LEAGUE_TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id} className="bg-[#24140C] text-amber-100 font-sans">
                      {tier.nameTr} ({tier.name}) [ID: {tier.id}]
                      {tier.isUnknown
                        ? " — Veri yok, 0 kabul edildi"
                        : ` — (+${tier.dailyShiny} P, +${tier.dailyGlowy} I, +${tier.dailyStarry} ★)`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-amber-300">
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Selected League Daily Reward Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <OreBadge type="shiny" amount={`+${selectedLeagueTier.dailyShiny}`} suffix="/ gün" />
                <OreBadge type="glowy" amount={`+${selectedLeagueTier.dailyGlowy}`} suffix="/ gün" />
                <OreBadge type="starry" amount={`+${selectedLeagueTier.dailyStarry}`} suffix="/ gün" />
              </div>
            </div>

            {/* C. KLAN SAVAŞI (CW) */}
            <div className="game-slot-well p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-game text-xs text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Swords size={15} className="text-amber-400" /> Klan Savaşı (CW)
                </span>
                <span className="font-game text-xs px-2 py-0.5 bg-gradient-to-b from-amber-500 to-amber-700 text-white rounded border border-amber-300/50 shadow-sm">
                  {monthlyCwCount} Savaş / Ay
                </span>
              </div>

              {/* Monthly Wars Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-amber-200/80">
                  <span>Aylık Savaş Sayısı</span>
                  <span className="font-game text-amber-100">{monthlyCwCount} savaş</span>
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
                  className="game-slider"
                />
              </div>

              {/* CW Wins Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-amber-200/80">
                  <span>Kazanılan Savaş Sayısı</span>
                  <span className="font-game text-amber-300">
                    {cwWinCount} Galibiyet / {monthlyCwCount - cwWinCount} Mağlubiyet
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={monthlyCwCount}
                  step="1"
                  value={cwWinCount}
                  onChange={(e) => setCwWinCount(Number(e.target.value))}
                  className="game-slider"
                />
              </div>

              {/* Custom Per-War Ore Inputs */}
              <div className="pt-2 border-t border-[#3B2215] space-y-1.5">
                <span className="text-[10px] font-semibold text-amber-300/70 block">
                  Savaş Başına Galibiyet Kazancı (Mağlubiyette yarısı):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-sky-300 font-game block">P (Win)</span>
                    <input
                      type="number"
                      value={cwWinShiny}
                      onChange={(e) => setCwWinShiny(Number(e.target.value) || 0)}
                      className="w-full bg-[#180E09] border border-[#22446A] rounded px-2 py-1 font-game text-xs text-sky-200 shadow-inner"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-fuchsia-300 font-game block">I (Win)</span>
                    <input
                      type="number"
                      value={cwWinGlowy}
                      onChange={(e) => setCwWinGlowy(Number(e.target.value) || 0)}
                      className="w-full bg-[#180E09] border border-[#54216E] rounded px-2 py-1 font-game text-xs text-fuchsia-200 shadow-inner"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-300 font-game block">★ (Win)</span>
                    <input
                      type="number"
                      value={cwWinStarry}
                      onChange={(e) => setCwWinStarry(Number(e.target.value) || 0)}
                      className="w-full bg-[#180E09] border border-[#6E3C0F] rounded px-2 py-1 font-game text-xs text-amber-200 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* D. KLAN SAVAŞI LİGİ (CWL) */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-game text-xs text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Trophy size={15} className="text-amber-400" /> CWL (Klan Savaşı Ligi)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipatesCwl(!participatesCwl)}
                    className={cn(
                      "px-3 py-1 rounded-lg font-game text-xs transition-all cursor-pointer shadow-sm",
                      participatesCwl
                        ? "game-btn-green text-white"
                        : "game-btn-red text-white opacity-80"
                    )}
                  >
                    {participatesCwl ? "Katılıyorum" : "Katılmıyorum"}
                  </button>
                </div>
              </div>

              {participatesCwl && (
                <div className="space-y-2 pt-1 border-t border-[#3B2215]">
                  <div className="flex justify-between text-xs font-semibold text-amber-200/80">
                    <span>Kazanılan CWL Savaşı (0–7)</span>
                    <span className="font-game text-amber-300">{cwlWinCount} / 7 Savaş</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="7"
                    step="1"
                    value={cwlWinCount}
                    onChange={(e) => setCwlWinCount(Number(e.target.value))}
                    className="game-slider"
                  />
                  <div className="text-[11px] text-amber-300/70 font-semibold">
                    Galibiyet: (1.110, 39, 6) • Kayıp: (555, 19, 3)
                  </div>
                </div>
              )}

              {showCwConflictWarning && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-semibold">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    CWL süresince (10 gün) normal CW başlamaz. Kalan 20 günde en fazla ~10 normal savaş yapılabilir.
                  </span>
                </div>
              )}
            </div>

            {/* E. BASKIN MADALYALARI GELİRİ */}
            <div className="game-slot-well p-3.5">
              <label className="flex items-center justify-between cursor-pointer gap-2">
                <div className="space-y-0.5">
                  <span className="font-game text-xs text-amber-200 block">
                    Baskın Madalyaları Geliri
                  </span>
                  <span className="text-[11px] font-semibold text-amber-300/70 block">
                    Haftalık: +100 Işıltılı, +10 Yıldızlı (Günlük: +14.3 I, +1.4 ★)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeRaidMedals}
                  onChange={(e) => setIncludeRaidMedals(e.target.checked)}
                  className="game-checkbox"
                />
              </label>
            </div>

            {/* F. GELECEK EPİK EKİPMANLAR & ETKİNLİK GELİRLERİ */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer gap-2">
                <div className="space-y-0.5">
                  <span className="font-game text-xs text-amber-200 block">
                    Gelecek Epik Ekipmanları Dahil Et
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300/70 block">
                    2 ayda bir (Şub, Nis, Haz...) +56k Parlak, +3.7k Işıltılı, +480 Yıldızlı
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeFutureEpics}
                  onChange={(e) => setIncludeFutureEpics(e.target.checked)}
                  className="game-checkbox"
                />
              </label>

              {includeFutureEpics && (
                <div className="pt-2 border-t border-[#3B2215] space-y-2">
                  <div className="text-[10px] font-game text-amber-300/80 uppercase">
                    Etkinlik Gelirleri (Her yeni epik ekipmanla):
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-[#180E09] border border-[#3B2215] cursor-pointer">
                    <span className="text-xs font-semibold text-amber-200">
                      Etkinlik Bileti (Pass) (+600 I, +80 ★)
                    </span>
                    <input
                      type="checkbox"
                      checked={hasEventPass}
                      onChange={(e) => setHasEventPass(e.target.checked)}
                      className="game-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-[#180E09] border border-[#3B2215] cursor-pointer">
                    <span className="text-xs font-semibold text-amber-200">
                      Etkinlik Madalyası (+600 I, +80 ★)
                    </span>
                    <input
                      type="checkbox"
                      checked={hasEventMedals}
                      onChange={(e) => setHasEventMedals(e.target.checked)}
                      className="game-checkbox"
                    />
                  </label>

                  <div className="text-[10px] font-semibold text-amber-300/60 pt-0.5">
                    Ücretsiz Plan (5.000 Parlak, 400 Işıltılı) her etkinliğe otomatik dahildir.
                  </div>
                </div>
              )}
            </div>
          </GamePanel>
        </div>

        {/* ==================================================================
            RIGHT COLUMN: SİMÜLASYON VE PROJEKSİYON SONUÇLARI (Results)
            ================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <span className="font-game text-sm sm:text-base text-amber-100 game-text-stroke-sm tracking-wide">
                  TH{thLevel} DEMİRCİ FULLEME PROJEKSİYONU
                </span>

                {/* Bottleneck Badge with In-Game Shield Style */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-game shadow-sm",
                    bottleneckOreType === "starry" &&
                      "bg-gradient-to-r from-amber-950/80 to-amber-900/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
                    bottleneckOreType === "glowy" &&
                      "bg-gradient-to-r from-purple-950/80 to-purple-900/80 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_8px_rgba(192,38,211,0.4)]",
                    bottleneckOreType === "shiny" &&
                      "bg-gradient-to-r from-sky-950/80 to-sky-900/80 border-sky-400 text-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                  )}
                >
                  <ShieldAlert size={14} />
                  <span>Darboğaz: <strong>{bottleneckLabel}</strong></span>
                </div>
              </div>
            }
            bodyClassName="p-4 sm:p-6 space-y-5"
          >
            {/* The Big Hero Metric: "510 Gün • 26 Mart 2028" */}
            <div className="game-slot-well p-4 sm:p-5 rounded-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-game text-4xl sm:text-5xl md:text-6xl text-amber-300 game-title-stroke tracking-tight">
                    {estimated.daysToComplete} Gün
                  </span>
                  <span className="font-game text-xl sm:text-2xl md:text-3xl text-sky-300 game-text-stroke-sm">
                    • {estimated.targetDateStr}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-amber-100/90 mt-2 leading-relaxed">
                {isCompletedToday ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Mevcut cevher envanteriniz tüm ekipman yükseltmelerini bugün tamamlamaya yetiyor!
                  </span>
                ) : (
                  <>
                    Mevcut tempo ve klan geliriyle TH{thLevel} ekipman havuzunuz{" "}
                    <strong className="text-amber-300 font-game">{estimated.targetDateStr}</strong> tarihinde tamamen tamamlanacaktır.
                  </>
                )}
              </p>
            </div>

            {/* Scenario Comparison Strip (Min / Ort / Max) */}
            <div className="space-y-2">
              <span className="font-game text-xs text-amber-200/90 uppercase tracking-wider block">
                SENARYO KARŞILAŞTIRMASI:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Min Scenario (En İyi) */}
                <div className="p-3 rounded-xl bg-gradient-to-b from-[#132B1E] to-[#0A1A12] border-2 border-[#206841] shadow-inner flex flex-col justify-between">
                  <div className="font-game text-[10px] text-emerald-300 tracking-wider">
                    EN İYİ SENARYO (MIN)
                  </div>
                  <div className="font-game text-xl sm:text-2xl text-emerald-200 game-text-stroke-sm my-1">
                    {minScenario.daysToComplete} Gün
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-300/80">
                    {minScenario.targetDateStr}
                  </div>
                </div>

                {/* Estimated Scenario (Beklenen - Highlighted) */}
                <div className="p-3 rounded-xl bg-gradient-to-b from-[#4A3212] to-[#2B1B08] border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] flex flex-col justify-between relative">
                  <div className="font-game text-[10px] text-amber-300 tracking-wider flex items-center justify-between">
                    <span>BEKLENEN SENARYO (ORT)</span>
                    <Sparkles size={12} className="text-amber-400" />
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-amber-200 game-title-stroke my-0.5">
                    {estimated.daysToComplete} Gün
                  </div>
                  <div className="text-[11px] font-semibold text-amber-100">
                    {estimated.targetDateStr}
                  </div>
                </div>

                {/* Max Scenario (En Yavaş) */}
                <div className="p-3 rounded-xl bg-gradient-to-b from-[#2A1710] to-[#170C08] border-2 border-[#5A3828] shadow-inner flex flex-col justify-between">
                  <div className="font-game text-[10px] text-orange-300 tracking-wider">
                    EN YAVAŞ SENARYO (MAX)
                  </div>
                  <div className="font-game text-xl sm:text-2xl text-orange-200 game-text-stroke-sm my-1">
                    {maxScenario.daysToComplete} Gün
                  </div>
                  <div className="text-[11px] font-semibold text-orange-300/80">
                    {maxScenario.targetDateStr}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Net Required Ore Jewel Cards */}
            <div className="space-y-2 pt-1">
              <span className="font-game text-xs text-amber-200/90 uppercase tracking-wider block">
                NET GEREKEN CEVHER İHTİYACI:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Gereken Parlak (Shiny) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#11243A] to-[#0A1624] border-2 border-[#1E5285] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-game text-xs text-sky-300">
                      <ShinyOreIcon className="w-4 h-4" />
                      <span>Parlak</span>
                    </div>
                    <span className="text-[10px] font-game px-1.5 py-0.5 rounded bg-[#1A3A5E] text-sky-200">
                      +{estimated.dailyRates.shiny}/gün
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-sky-100 game-text-stroke-sm">
                    {netNeeded.shiny.toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[10px] font-semibold text-sky-300/70">
                    Demirci kalan net ihtiyaç
                  </div>
                </div>

                {/* 2. Gereken Işıltılı (Glowy) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#2A133B] to-[#170921] border-2 border-[#68258E] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-game text-xs text-fuchsia-300">
                      <GlowyOreIcon className="w-4 h-4" />
                      <span>Işıltılı</span>
                    </div>
                    <span className="text-[10px] font-game px-1.5 py-0.5 rounded bg-[#491C63] text-fuchsia-200">
                      +{estimated.dailyRates.glowy}/gün
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-fuchsia-100 game-text-stroke-sm">
                    {netNeeded.glowy.toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[10px] font-semibold text-fuchsia-300/70">
                    Demirci kalan net ihtiyaç
                  </div>
                </div>

                {/* 3. Gereken Yıldızlı (Starry) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#38210A] to-[#1C0F04] border-2 border-[#8A4D14] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-game text-xs text-amber-300">
                      <StarryOreIcon className="w-4 h-4" />
                      <span>Yıldızlı</span>
                    </div>
                    <span className="text-[10px] font-game px-1.5 py-0.5 rounded bg-[#572F08] text-amber-200">
                      +{estimated.dailyRates.starry}/gün
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-amber-100 game-title-stroke">
                    {netNeeded.starry.toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-300/70">
                    Demirci kalan net ihtiyaç
                  </div>
                </div>
              </div>
            </div>
          </GamePanel>
        </div>
      </div>

      {/* 4. IMPORTED PLAYER EQUIPMENT BREAKDOWN CARDS */}
      {importedPlayer && activeDeficitAndItems.items.length > 0 && (
        <GamePanel
          variant="wood"
          title={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Swords size={18} className="text-amber-300" />
                <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                  {importedPlayer.name} — EKİPMAN BAZLI KALAN CEVHERLER
                </span>
              </div>
              <span className="font-game text-xs px-2.5 py-0.5 rounded bg-[#24130A] text-amber-300 border border-[#442314]">
                TH{thLevel} Demirci Sınırı
              </span>
            </div>
          }
          bodyClassName="p-3.5 sm:p-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeDeficitAndItems.items.map((item) => (
              <div
                key={item.name}
                className={cn(
                  "p-3 rounded-xl border-2 flex flex-col justify-between gap-2 shadow-sm transition-all",
                  item.isEpic
                    ? "bg-gradient-to-b from-[#331842] to-[#1C0D26] border-[#9C33D4] shadow-[0_0_8px_rgba(156,51,212,0.25)]"
                    : "bg-gradient-to-b from-[#1E2938] to-[#111720] border-[#3B5270]"
                )}
              >
                {/* Header: Icon + Name + Level Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <UnitIcon name={item.name} size="xs" isEpic={item.isEpic} />
                    <span className="font-game text-xs sm:text-sm text-amber-100 truncate">
                      {item.name}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "font-game text-[10px] px-2 py-0.5 rounded border shrink-0",
                      item.isEpic
                        ? "bg-[#4D186E] border-fuchsia-400 text-fuchsia-200"
                        : "bg-[#1E3B5C] border-sky-400 text-sky-200"
                    )}
                  >
                    Lv.{item.level} → {item.targetLevel}
                  </span>
                </div>

                {/* Ore Needed Badges */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-black/30">
                  <OreBadge type="shiny" amount={item.shiny} />
                  <OreBadge type="glowy" amount={item.glowy} />
                  {item.isEpic ? (
                    <OreBadge type="starry" amount={item.starry} />
                  ) : (
                    <span className="text-[10px] font-game text-stone-500 px-1">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GamePanel>
      )}

      {/* 5. DETAILED ANALYSIS TABLE: FIXED REVENUE MODEL */}
      <GamePanel
        variant="wood"
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Table size={18} className="text-amber-300" />
              <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                GÜNLÜK & PERİYODİK CEVHER GELİR DAĞILIM TABLOSU (TH{thLevel})
              </span>
            </div>
            <span className="font-game text-xs px-2.5 py-0.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-bold border border-amber-300">
              Sabit Gelir Modeli
            </span>
          </div>
        }
        bodyClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[580px]">
            <thead>
              <tr className="bg-[#24130A] border-b-2 border-[#3E2112] text-xs font-game text-amber-200 tracking-wider">
                <th className="py-3 px-4">Gelir Kaynağı</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-sky-300">
                    <ShinyOreIcon className="w-4 h-4" />
                    <span>Parlak (Shiny)</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-fuchsia-300">
                    <GlowyOreIcon className="w-4 h-4" />
                    <span>Işıltılı (Glowy)</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <StarryOreIcon className="w-4 h-4" />
                    <span>Yıldızlı (Starry)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Durum</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#331C0F] text-xs sm:text-sm font-semibold text-amber-100">
              {/* Row 1: Daily Star Bonus */}
              <tr className="hover:bg-[#3D2315]/40 transition-colors">
                <td className="py-3 px-4 font-game flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
                  Günlük Yıldız Bonusu ({selectedLeagueTier.nameTr})
                </td>
                <td className="py-3 px-4 font-game text-sky-300">
                  +{selectedLeagueTier.dailyShiny} / gün
                </td>
                <td className="py-3 px-4 font-game text-fuchsia-300">
                  +{selectedLeagueTier.dailyGlowy} / gün
                </td>
                <td className="py-3 px-4 font-game text-amber-300">
                  +{selectedLeagueTier.dailyStarry} / gün
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-game bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                    Günlük
                  </span>
                </td>
              </tr>

              {/* Row 2: Clan Wars */}
              <tr className="hover:bg-[#3D2315]/40 transition-colors">
                <td className="py-3 px-4 font-game flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                  Klan Savaşları ({monthlyCwCount} Savaş/Ay • {cwWinCount} Galibiyet)
                </td>
                <td className="py-3 px-4 font-game text-sky-300">
                  ~+{Math.round((cwWinCount * cwWinShiny + (monthlyCwCount - cwWinCount) * Math.floor(cwWinShiny / 2)) / 30)} / gün
                </td>
                <td className="py-3 px-4 font-game text-fuchsia-300">
                  ~+{Math.round((cwWinCount * cwWinGlowy + (monthlyCwCount - cwWinCount) * Math.floor(cwWinGlowy / 2)) / 30)} / gün
                </td>
                <td className="py-3 px-4 font-game text-amber-300">
                  ~+{Number(((cwWinCount * cwWinStarry + (monthlyCwCount - cwWinCount) * Math.floor(cwWinStarry / 2)) / 30).toFixed(1))} / gün
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-game bg-amber-950/70 text-amber-300 border border-amber-600/40">
                    Aylık Toplam
                  </span>
                </td>
              </tr>

              {/* Row 3: CWL */}
              {participatesCwl && (
                <tr className="hover:bg-[#3D2315]/40 transition-colors">
                  <td className="py-3 px-4 font-game flex items-center gap-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0"></span>
                    CWL (7 Savaş • {cwlWinCount} Galibiyet)
                  </td>
                  <td className="py-3 px-4 font-game text-sky-300">
                    ~+{Math.round((cwlWinCount * cwlWinShiny + (7 - cwlWinCount) * Math.floor(cwlWinShiny / 2)) / 30)} / gün
                  </td>
                  <td className="py-3 px-4 font-game text-fuchsia-300">
                    ~+{Math.round((cwlWinCount * cwlWinGlowy + (7 - cwlWinCount) * Math.floor(cwlWinGlowy / 2)) / 30)} / gün
                  </td>
                  <td className="py-3 px-4 font-game text-amber-300">
                    ~+{Number(((cwlWinCount * cwlWinStarry + (7 - cwlWinCount) * Math.floor(cwlWinStarry / 2)) / 30).toFixed(1))} / gün
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-game bg-purple-950/70 text-purple-300 border border-purple-600/40">
                      Lig Savaşları
                    </span>
                  </td>
                </tr>
              )}

              {/* Row 4: Raid Medals */}
              {includeRaidMedals && (
                <tr className="hover:bg-[#3D2315]/40 transition-colors">
                  <td className="py-3 px-4 font-game flex items-center gap-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                    Baskın Madalyaları (Haftalık Sabit)
                  </td>
                  <td className="py-3 px-4 font-game text-stone-500">0 / gün</td>
                  <td className="py-3 px-4 font-game text-fuchsia-300">
                    +14.3 / gün (+100/hf)
                  </td>
                  <td className="py-3 px-4 font-game text-amber-300">
                    +1.4 / gün (+10/hf)
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-game bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                      Haftalık
                    </span>
                  </td>
                </tr>
              )}

              {/* Footer Row: TOTAL DAILY SPEED */}
              <tr className="bg-[#1C0E07] font-game text-sm sm:text-base border-t-2 border-[#542B15]">
                <td className="py-3.5 px-4 font-game text-amber-200 game-text-stroke-sm">
                  TOPLAM GÜNLÜK HIZ
                </td>
                <td className="py-3.5 px-4 text-sky-200 game-text-stroke-sm">
                  ~{estimated.dailyRates.shiny} / gün
                </td>
                <td className="py-3.5 px-4 text-fuchsia-200 game-text-stroke-sm">
                  ~{estimated.dailyRates.glowy} / gün
                </td>
                <td className="py-3.5 px-4 text-amber-200 game-title-stroke">
                  ~{estimated.dailyRates.starry} / gün
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-3 py-1 rounded-md text-xs font-game bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-black shadow-sm">
                    Net Toplam
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GamePanel>
    </div>
  );
}
