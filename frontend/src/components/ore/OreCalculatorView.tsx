"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Settings,
  Sparkles,
  Table,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  X,
  Swords,
  Trophy,
  Package,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImportedPlayerForOre } from "@/components/player";
import UnitIcon from "@/components/common/UnitIcon";
import { GamePanel, GameButton } from "@/components/game";
import { useLanguage } from "@/lib/i18n";
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
  CWL_WAR_COUNT,
  DEFAULT_CWL_WIN_ORE,
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
  simulateAllOreScenarios,
} from "@/lib/oreSimulation";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// IN-GAME ORE SVG ICONS (Cohesive Warm Clash 3-Ore Faceted Crystals)
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
      <path
        d="M16 2L27 9L23 26L16 30L9 26L5 9L16 2Z"
        fill="url(#shinyGrad1)"
        stroke="#0B3948"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 2L22 10L16 19L10 10L16 2Z" fill="url(#shinyGrad2)" opacity="0.9" />
      <path d="M16 19L23 26L16 30L9 26L16 19Z" fill="#075985" opacity="0.95" />
      <path d="M5 9L10 10L9 26L5 9Z" fill="#0284C7" opacity="0.8" />
      <path d="M27 9L23 26L22 10L27 9Z" fill="#BAE6FD" opacity="0.9" />
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
      className={cn("shrink-0 drop-shadow-[0_2px_4px_rgba(224,109,59,0.5)]", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="glowyGrad1" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="50%" stopColor="#E06D3B" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="glowyGrad2" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFEDD5" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5L27 8L28 21L16 29.5L4 21L5 8L16 2.5Z"
        fill="url(#glowyGrad1)"
        stroke="#431407"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 2.5L22 9.5L16 18L10 9.5L16 2.5Z" fill="url(#glowyGrad2)" opacity="0.92" />
      <path d="M16 18L28 21L16 29.5L4 21L16 18Z" fill="#7C2D12" opacity="0.9" />
      <path d="M5 8L10 9.5L4 21L5 8Z" fill="#C2410C" opacity="0.75" />
      <path d="M27 8L28 21L22 9.5L27 8Z" fill="#FED7AA" opacity="0.9" />
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
      <path
        d="M16 2L19.5 11L28.5 7.5L23.5 16L28.5 24.5L19.5 21L16 30L12.5 21L3.5 24.5L8.5 16L3.5 7.5L12.5 11L16 2Z"
        fill="url(#starryGrad1)"
        stroke="#451A03"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 9.5L21 16L16 22.5L11 16L16 9.5Z" fill="url(#starryGrad2)" stroke="#78350F" strokeWidth="1" />
      <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

type OreKind = "shiny" | "glowy" | "starry";

function OreBadge({
  type,
  amount,
  suffix,
  className,
}: {
  type: OreKind;
  amount: number | string;
  suffix?: string;
  className?: string;
}) {
  const { fmtNum } = useLanguage();

  const config = {
    shiny: {
      icon: <ShinyOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-sky-200",
      wellClass: "bg-[#1B3442] border-[#31637D]",
    },
    glowy: {
      icon: <GlowyOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-orange-200",
      wellClass: "bg-[#4A251B] border-[#8B4330]",
    },
    starry: {
      icon: <StarryOreIcon className="w-3.5 h-3.5" />,
      textClass: "text-amber-200",
      wellClass: "bg-[#4D3612] border-[#966B20]",
    },
  }[type];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-sans font-bold text-xs tabular-nums tracking-tight shadow-sm select-none",
        config.wellClass,
        config.textClass,
        className
      )}
    >
      {config.icon}
      <span>{typeof amount === "number" ? fmtNum(amount) : amount}</span>
      {suffix && <span className="text-xs opacity-80 font-semibold">{suffix}</span>}
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

const TH_LEVELS = [11, 12, 13, 14, 15, 16, 17, 18] as const;

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
  const { locale, isTr, t, fmtNum, fmtDec, fmtTemplate } = useLanguage();

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
  const [showCwlEditor, setShowCwlEditor] = useState<boolean>(false);

  // 4. Raid Medals State
  const [includeRaidMedals, setIncludeRaidMedals] = useState<boolean>(true);

  // 5. Inventory State (Shiny, Glowy, Starry)
  const [invShinyInput, setInvShinyInput] = useState<string>("0");
  const [invGlowyInput, setInvGlowyInput] = useState<string>("0");
  const [invStarryInput, setInvStarryInput] = useState<string>("0");

  // 6. Future Epic Cost & Bi-Monthly Event Income State
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

  const handleResetSettings = () => {
    setThLevel(
      importedPlayer
        ? Math.min(18, Math.max(11, importedPlayer.townHallLevel || 18))
        : 18
    );
    setLeagueTierId(
      importedPlayer?.leagueTierId ||
        (importedPlayer?.leagueName
          ? getLeagueTierByName(importedPlayer.leagueName).id
          : DEFAULT_LEAGUE_TIER_ID)
    );
    setMonthlyCwCount(DEFAULT_CW_WARS_MONTHLY);
    setCwWinCount(DEFAULT_CW_WARS_MONTHLY);
    setCwWinShiny(DEFAULT_CW_WIN_ORE.shiny);
    setCwWinGlowy(DEFAULT_CW_WIN_ORE.glowy);
    setCwWinStarry(DEFAULT_CW_WIN_ORE.starry);
    setParticipatesCwl(true);
    setCwlWinCount(CWL_WAR_COUNT);
    setCwlWinShiny(DEFAULT_CWL_WIN_ORE.shiny);
    setCwlWinGlowy(DEFAULT_CWL_WIN_ORE.glowy);
    setCwlWinStarry(DEFAULT_CWL_WIN_ORE.starry);
    setIncludeRaidMedals(true);
    setInvShinyInput("0");
    setInvGlowyInput("0");
    setInvStarryInput("0");
    setIncludeFutureEpics(true);
    setHasEventPass(false);
    setHasEventMedals(false);
  };

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

  // Compute exact equipment deficit synced with currentThMeta (smithCap)
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
      const capForTh = isEpic ? currentThMeta.epicMax : currentThMeta.commonMax;
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

  const selectedLeagueTier = useMemo(
    () => getLeagueTierById(leagueTierId),
    [leagueTierId]
  );

  const effectiveCwWinCount = Math.min(monthlyCwCount, cwWinCount);
  const cwLosses = Math.max(0, monthlyCwCount - effectiveCwWinCount);

  const cwWinReward = useMemo(
    () => ({ shiny: cwWinShiny, glowy: cwWinGlowy, starry: cwWinStarry }),
    [cwWinShiny, cwWinGlowy, cwWinStarry]
  );
  const cwLossReward = useMemo(() => computeCwLossOre(cwWinReward), [cwWinReward]);

  const cwMonthlyIncome = useMemo(
    () => ({
      shiny:
        effectiveCwWinCount * cwWinReward.shiny + cwLosses * cwLossReward.shiny,
      glowy:
        effectiveCwWinCount * cwWinReward.glowy + cwLosses * cwLossReward.glowy,
      starry:
        effectiveCwWinCount * cwWinReward.starry +
        cwLosses * cwLossReward.starry,
    }),
    [effectiveCwWinCount, cwLosses, cwWinReward, cwLossReward]
  );

  const cwlLosses = Math.max(0, CWL_WAR_COUNT - cwlWinCount);
  const cwlWinReward = useMemo(
    () => ({ shiny: cwlWinShiny, glowy: cwlWinGlowy, starry: cwlWinStarry }),
    [cwlWinShiny, cwlWinGlowy, cwlWinStarry]
  );
  const cwlLossReward = useMemo(
    () => computeCwlLossOre(cwlWinReward),
    [cwlWinReward]
  );
  const cwlMonthlyIncome = useMemo(
    () => ({
      shiny: cwlWinCount * cwlWinReward.shiny + cwlLosses * cwlLossReward.shiny,
      glowy: cwlWinCount * cwlWinReward.glowy + cwlLosses * cwlLossReward.glowy,
      starry:
        cwlWinCount * cwlWinReward.starry + cwlLosses * cwlLossReward.starry,
    }),
    [cwlWinCount, cwlLosses, cwlWinReward, cwlLossReward]
  );

  const singleEventOre = useMemo(
    () => computeSingleEventOre(hasEventPass, hasEventMedals),
    [hasEventPass, hasEventMedals]
  );

  // Full Simulation Configuration
  const simulationSettings: SimulationOreSettings = useMemo(() => {
    return {
      leagueTierId,
      monthlyCwCount,
      cwWinCount: effectiveCwWinCount,
      cwWinReward,
      participatesCwl,
      cwlWinCount,
      cwlWinReward,
      includeRaidMedals,
      inventory,
      includeFutureEpics,
      hasEventPass,
      hasEventMedals,
    };
  }, [
    leagueTierId,
    monthlyCwCount,
    effectiveCwWinCount,
    cwWinReward,
    participatesCwl,
    cwlWinCount,
    cwlWinReward,
    includeRaidMedals,
    inventory,
    includeFutureEpics,
    hasEventPass,
    hasEventMedals,
  ]);

  // Execute 3 Scenarios Simulation with active locale
  const scenarios = useMemo(() => {
    return simulateAllOreScenarios(
      effectiveDeficit,
      simulationSettings,
      new Date(),
      locale
    );
  }, [effectiveDeficit, simulationSettings, locale]);

  const estimated = scenarios.estimated;
  const minScenario = scenarios.min;
  const maxScenario = scenarios.max;

  const showCwConflictWarning = participatesCwl && monthlyCwCount > 10;

  const netNeeded = estimated.netNeeded;
  const isCompletedToday = estimated.isCompletedToday;
  const bottleneckOreType = estimated.bottleneckOre;

  const bottleneckLabel = {
    starry: t.ore.starryFull,
    glowy: t.ore.glowyFull,
    shiny: t.ore.shinyFull,
  }[bottleneckOreType];

  const bottleneckShortLabel = {
    starry: t.ore.starry,
    glowy: t.ore.glowy,
    shiny: t.ore.shiny,
  }[bottleneckOreType];

  const maxBottleneckDays = Math.max(
    1,
    estimated.daysShiny,
    estimated.daysGlowy,
    estimated.daysStarry
  );

  const bottleneckPillStyle = isCompletedToday
    ? "bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
    : bottleneckOreType === "starry"
    ? "bg-gradient-to-r from-[#4D3612] to-[#33220A] border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
    : bottleneckOreType === "glowy"
    ? "bg-gradient-to-r from-[#4A251B] to-[#321710] border-[#E06D3B] text-orange-200 shadow-[0_0_8px_rgba(224,109,59,0.35)]"
    : "bg-gradient-to-r from-[#1B3442] to-[#11232D] border-sky-400 text-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.35)]";

  const renderOreIcon = (type: OreKind, className = "w-4 h-4") => {
    if (type === "shiny") return <ShinyOreIcon className={className} />;
    if (type === "glowy") return <GlowyOreIcon className={className} />;
    return <StarryOreIcon className={className} />;
  };

  const oreProgressRows: Array<{
    key: OreKind;
    label: string;
    days: number;
    barClass: string;
    textClass: string;
    badgeClass: string;
  }> = [
    {
      key: "shiny",
      label: t.ore.shiny,
      days: estimated.daysShiny,
      barClass: "bg-gradient-to-r from-[#0284C7] to-[#7DD3FC]",
      textClass: "text-sky-200",
      badgeClass: "bg-[#1B3442] border-[#31637D] text-sky-200",
    },
    {
      key: "glowy",
      label: t.ore.glowy,
      days: estimated.daysGlowy,
      barClass: "bg-gradient-to-r from-[#C2410C] to-[#FB923C]",
      textClass: "text-orange-200",
      badgeClass: "bg-[#4A251B] border-[#8B4330] text-orange-200",
    },
    {
      key: "starry",
      label: t.ore.starry,
      days: estimated.daysStarry,
      barClass: "bg-gradient-to-r from-[#D97706] to-[#FDE047]",
      textClass: "text-amber-200",
      badgeClass: "bg-[#4D3612] border-[#966B20] text-amber-200",
    },
  ];

  const smithCapLabel = `${t.ore.smithCap}: ${t.ore.commonRarity} Lv.${currentThMeta.commonMax} / ${t.ore.epicRarity} Lv.${currentThMeta.epicMax}`;

  return (
    <div className="game-theme w-full space-y-5 pb-6 select-none font-sans">
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
                <UserCheck size={24} className="text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-game text-base sm:text-lg text-amber-100 game-text-stroke-sm tracking-wide">
                    {importedPlayer.name} ({importedPlayer.tag})
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 border border-amber-300 font-bold tabular-nums shadow-sm">
                    TH {importedPlayer.townHallLevel}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-amber-200/85 mt-1">
                  {fmtTemplate(t.ore.importedNotice, {
                    name: importedPlayer.name,
                    count: activeDeficitAndItems.items.length,
                  })}
                </p>
              </div>
            </div>

            {onClearImportedPlayer && (
              <GameButton
                variant="red"
                size="sm"
                onClick={onClearImportedPlayer}
                className="shrink-0 flex items-center gap-1.5 self-end sm:self-center min-h-[40px]"
              >
                <X size={14} /> {t.ore.resetSim}
              </GameButton>
            )}
          </div>
        </motion.div>
      )}

      {/* 2. TOP BANNER / HEADER & TH SELECTOR (TH11-TH18 synced with smithCap) */}
      <div className="game-panel-wood rounded-2xl p-4 sm:p-6 border-3 border-[#2C180E] shadow-[0_8px_20px_rgba(0,0,0,0.65)] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />

        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
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
                  {t.ore.title}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 text-white border border-amber-300/60 shadow-sm tabular-nums">
                  TH11–TH18
                </span>
              </div>
              <p className="text-amber-200/80 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                {t.ore.subtitle}
              </p>
            </div>
          </div>

          {/* Town Hall Selector (All TH11-TH18 synced with smithCap) */}
          <div className="w-full xl:w-auto flex flex-col gap-1.5 bg-[#24130A] p-2.5 rounded-xl border border-[#442314] shadow-inner shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-amber-200">
                {t.ore.targetTh}
              </span>
              <span className="text-xs font-semibold text-amber-300/90 tabular-nums">
                {smithCapLabel}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1.5">
              {TH_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setThLevel(lvl)}
                  className={cn(
                    "min-h-[42px] px-2.5 py-1.5 rounded-lg font-sans font-bold text-xs sm:text-sm tabular-nums transition-all cursor-pointer flex items-center justify-center",
                    thLevel === lvl
                      ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-extrabold shadow-[0_2px_0_#6D3E08] border border-amber-300"
                      : "bg-[#331C0F] text-amber-200/80 hover:text-white hover:bg-[#432514] border border-[#261309]"
                  )}
                >
                  TH{lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MOBILE TOP KPI PROJECTION STRIP (lg:hidden, above Settings) */}
      <div className="lg:hidden sticky top-[49px] z-30">
        <div className="game-panel-wood rounded-2xl px-3.5 py-2.5 border-2 border-[#2C180E] shadow-[0_8px_20px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-[#24130A] text-amber-300 border border-[#4E2B17] tabular-nums">
                TH{thLevel}
              </span>
              <span className="text-xs font-semibold text-amber-200/85">
                {t.ore.projectionTitle}
              </span>
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold",
                bottleneckPillStyle
              )}
            >
              {isCompletedToday ? (
                <CheckCircle2 size={13} />
              ) : (
                renderOreIcon(bottleneckOreType, "w-3.5 h-3.5")
              )}
              <span>
                {isCompletedToday
                  ? t.ore.completedToday
                  : `${t.ore.bottleneck} ${bottleneckShortLabel}`}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-3 mt-1.5 flex-wrap">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-game text-2xl text-amber-300 game-title-stroke tabular-nums">
                {isCompletedToday
                  ? t.ore.completedToday
                  : `${fmtNum(estimated.daysToComplete)} ${t.ore.daysUnit}`}
              </span>
              <span className="text-sm font-bold text-sky-200 tabular-nums">
                • {estimated.targetDateStr}
              </span>
            </div>

            <div className="text-xs font-semibold text-amber-200/80 tabular-nums">
              +{fmtNum(estimated.dailyRates.shiny)} / +{fmtNum(estimated.dailyRates.glowy)} / +
              {fmtDec(estimated.dailyRates.starry, 1)} {t.ore.perDay}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN GRID: CONFIGURATION CONTROLS (LEFT) + SIMULATION RESULTS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ==================================================================
            LEFT COLUMN: SIMULATION SETTINGS
            ================================================================== */}
        <div className="lg:col-span-5">
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-amber-300" />
                  <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                    {t.ore.settingsTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    title={t.ore.resetSim}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#27150C] hover:bg-[#3A2013] text-xs font-semibold text-amber-200 border border-[#4E2B17] transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">{t.ore.resetSim}</span>
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#27150C] text-amber-300 border border-[#4E2B17] tabular-nums">
                    TH{thLevel}
                  </span>
                </div>
              </div>
            }
            bodyClassName="space-y-4 p-3.5 sm:p-5"
          >
            {/* A. CURRENT ORE INVENTORY */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="font-sans font-bold text-xs sm:text-sm text-amber-200 flex items-center gap-1.5 tracking-wide">
                  <Package size={15} className="text-amber-400" />
                  {t.ore.inventoryTitle}
                </label>
                <span className="text-xs text-amber-300/75 font-medium">
                  {t.ore.inventoryHint}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Shiny Input */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                    <ShinyOreIcon className="w-3.5 h-3.5" />
                    <span>{t.ore.shiny}</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invShinyInput}
                    onChange={(e) => setInvShinyInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#31637D] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-sky-200 focus:outline-none focus:border-sky-400 shadow-inner"
                  />
                </div>

                {/* Glowy Input (Warm Ember-Copper) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-orange-200">
                    <GlowyOreIcon className="w-3.5 h-3.5" />
                    <span>{t.ore.glowy}</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invGlowyInput}
                    onChange={(e) => setInvGlowyInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#8B4330] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-orange-200 focus:outline-none focus:border-orange-400 shadow-inner"
                  />
                </div>

                {/* Starry Input */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                    <StarryOreIcon className="w-3.5 h-3.5" />
                    <span>{t.ore.starry}</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={invStarryInput}
                    onChange={(e) => setInvStarryInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#180E09] border-2 border-[#966B20] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-amber-200 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* B. MULTIPLAYER LEAGUE (DAILY STAR BONUS) */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="font-sans font-bold text-xs sm:text-sm text-amber-200 tracking-wide flex items-center gap-1.5">
                  {selectedLeagueTier.iconSmall ? (
                    <img
                      src={selectedLeagueTier.iconSmall}
                      alt={locale === "tr" ? selectedLeagueTier.nameTr : selectedLeagueTier.name}
                      className="w-4 h-4 object-contain inline-block drop-shadow"
                    />
                  ) : (
                    <Trophy size={15} className="text-amber-400" />
                  )}
                  {t.ore.leagueTitle}
                </label>
              </div>

              <div className="relative">
                <select
                  value={leagueTierId}
                  onChange={(e) => setLeagueTierId(Number(e.target.value))}
                  className="w-full bg-[#1A0F0A] border-2 border-[#4A2614] text-amber-100 rounded-xl px-3 py-2 pr-9 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums outline-none focus:border-amber-400 transition-colors cursor-pointer appearance-none shadow-inner"
                >
                  {LEAGUE_TIERS.map((tier) => {
                    const tierLabel = locale === "tr" ? tier.nameTr : tier.name;
                    return (
                      <option
                        key={tier.id}
                        value={tier.id}
                        className="bg-[#24140C] text-amber-100 font-sans"
                      >
                        {tier.isUnknown
                          ? `${tierLabel} — 0 / 0 / 0`
                          : `${tierLabel} (+${fmtNum(tier.dailyShiny)} / +${fmtNum(tier.dailyGlowy)} / +${fmtNum(tier.dailyStarry)})`}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-amber-300">
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <OreBadge
                  type="shiny"
                  amount={`+${fmtNum(selectedLeagueTier.dailyShiny)}`}
                  suffix={t.ore.perDay}
                />
                <OreBadge
                  type="glowy"
                  amount={`+${fmtNum(selectedLeagueTier.dailyGlowy)}`}
                  suffix={t.ore.perDay}
                />
                <OreBadge
                  type="starry"
                  amount={`+${fmtNum(selectedLeagueTier.dailyStarry)}`}
                  suffix={t.ore.perDay}
                />
              </div>
            </div>

            {/* C. CLAN WARS (CW) */}
            <div className="game-slot-well p-3.5 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <span className="font-sans font-bold text-xs sm:text-sm text-amber-200 tracking-wide flex items-center gap-1.5">
                  <Swords size={15} className="text-amber-400" /> {t.ore.cwTitle}
                </span>
                <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 bg-gradient-to-b from-amber-500 to-amber-700 text-white rounded border border-amber-300/50 shadow-sm">
                  {fmtTemplate(t.ore.warsPerMonth, { count: monthlyCwCount })}
                </span>
              </div>

              {/* Monthly Wars Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-amber-200/85">
                  <span>{t.ore.monthlyWars}</span>
                  <span className="font-bold text-amber-100 tabular-nums">
                    {fmtTemplate(t.ore.warsPerMonth, { count: monthlyCwCount })}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={MAX_CW_WARS_MONTHLY}
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
                <div className="flex justify-between text-xs font-semibold text-amber-200/85 gap-2">
                  <span>{t.ore.warWins}</span>
                  <span className="font-bold text-amber-300 tabular-nums">
                    {fmtTemplate(t.ore.warRecord, {
                      wins: effectiveCwWinCount,
                      losses: cwLosses,
                    })}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={monthlyCwCount}
                  step="1"
                  value={effectiveCwWinCount}
                  onChange={(e) => setCwWinCount(Number(e.target.value))}
                  className="game-slider"
                />
              </div>

              {/* Custom Per-War Ore Inputs */}
              <div className="pt-2.5 border-t border-[#3B2215] space-y-2">
                <span className="text-xs font-semibold text-amber-200/80 block">
                  {t.ore.cwPerWinHint}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                      <ShinyOreIcon className="w-3.5 h-3.5" />
                      <span>{t.ore.shiny}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cwWinShiny}
                      onChange={(e) =>
                        setCwWinShiny(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full bg-[#180E09] border-2 border-[#31637D] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-sky-200 focus:outline-none focus:border-sky-400 shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-orange-200">
                      <GlowyOreIcon className="w-3.5 h-3.5" />
                      <span>{t.ore.glowy}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cwWinGlowy}
                      onChange={(e) =>
                        setCwWinGlowy(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full bg-[#180E09] border-2 border-[#8B4330] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-orange-200 focus:outline-none focus:border-orange-400 shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                      <StarryOreIcon className="w-3.5 h-3.5" />
                      <span>{t.ore.starry}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cwWinStarry}
                      onChange={(e) =>
                        setCwWinStarry(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full bg-[#180E09] border-2 border-[#966B20] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-amber-200 focus:outline-none focus:border-amber-400 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* D. CLAN WAR LEAGUE (CWL) */}
            <div className="game-slot-well p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="font-sans font-bold text-xs sm:text-sm text-amber-200 tracking-wide flex items-center gap-1.5">
                  <Trophy size={15} className="text-amber-400" /> {t.ore.cwlTitle}
                </label>
                <button
                  type="button"
                  onClick={() => setParticipatesCwl(!participatesCwl)}
                  className={cn(
                    "px-3 py-1.5 min-h-[38px] rounded-lg font-sans font-bold text-xs transition-all cursor-pointer shadow-sm border",
                    participatesCwl
                      ? "game-btn-green text-white border-[#142E06]"
                      : "game-btn-red text-white opacity-85 border-[#330305]"
                  )}
                >
                  {participatesCwl ? t.ore.participating : t.ore.notParticipating}
                </button>
              </div>

              {participatesCwl && (
                <div className="space-y-2.5 pt-2 border-t border-[#3B2215]">
                  <div className="flex justify-between text-xs font-semibold text-amber-200/85 gap-2">
                    <span>{t.ore.cwlWinsLabel}</span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      {fmtTemplate(t.ore.warRecord, {
                        wins: cwlWinCount,
                        losses: cwlLosses,
                      })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={CWL_WAR_COUNT}
                    step="1"
                    value={cwlWinCount}
                    onChange={(e) => setCwlWinCount(Number(e.target.value))}
                    className="game-slider"
                  />

                  {/* Dynamic CWL Calculation Preview matching oreSimulation.ts */}
                  <div className="p-2.5 rounded-lg bg-[#180E09] border border-[#3B2215] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-amber-200 tabular-nums">
                        {fmtTemplate(t.ore.cwlWinLossPreview, {
                          wins: cwlWinCount,
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCwlEditor((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal size={12} />
                        <span>
                          {showCwlEditor
                            ? isTr
                              ? "Gizle"
                              : "Hide"
                            : isTr
                            ? "Ödülü Düzenle"
                            : "Edit Win Ore"}
                        </span>
                      </button>
                    </div>

                    <div className="text-xs text-amber-200/75 tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        {isTr ? "Galibiyet:" : "Win:"} (
                        {fmtNum(cwlWinReward.shiny)}, {fmtNum(cwlWinReward.glowy)},{" "}
                        {fmtNum(cwlWinReward.starry)})
                      </span>
                      <span>
                        {isTr ? "Kayıp:" : "Loss:"} (
                        {fmtNum(cwlLossReward.shiny)},{" "}
                        {fmtNum(cwlLossReward.glowy)},{" "}
                        {fmtNum(cwlLossReward.starry)})
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-amber-300 tabular-nums">
                      {isTr ? "Aylık CWL Toplamı:" : "Monthly CWL Total:"} +
                      {fmtNum(cwlMonthlyIncome.shiny)} / +
                      {fmtNum(cwlMonthlyIncome.glowy)} / +
                      {fmtNum(cwlMonthlyIncome.starry)}
                    </div>

                    {showCwlEditor && (
                      <div className="pt-2 border-t border-[#3B2215] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                            <ShinyOreIcon className="w-3.5 h-3.5" />
                            <span>{t.ore.shiny}</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={cwlWinShiny}
                            onChange={(e) =>
                              setCwlWinShiny(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full bg-[#120A06] border-2 border-[#31637D] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-sky-200 focus:outline-none focus:border-sky-400 shadow-inner"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-orange-200">
                            <GlowyOreIcon className="w-3.5 h-3.5" />
                            <span>{t.ore.glowy}</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={cwlWinGlowy}
                            onChange={(e) =>
                              setCwlWinGlowy(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full bg-[#120A06] border-2 border-[#8B4330] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-orange-200 focus:outline-none focus:border-orange-400 shadow-inner"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                            <StarryOreIcon className="w-3.5 h-3.5" />
                            <span>{t.ore.starry}</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={cwlWinStarry}
                            onChange={(e) =>
                              setCwlWinStarry(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full bg-[#120A06] border-2 border-[#966B20] rounded-lg px-3 py-2 font-sans font-semibold text-base sm:text-sm min-h-[44px] tabular-nums text-amber-200 focus:outline-none focus:border-amber-400 shadow-inner"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showCwConflictWarning && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-semibold leading-relaxed">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.ore.cwlNote}</span>
                </div>
              )}
            </div>

            {/* E. RAID MEDALS INCOME */}
            <div className="game-slot-well p-3.5">
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <div className="space-y-1">
                  <span className="font-sans font-bold text-xs sm:text-sm text-amber-200 block">
                    {t.ore.raidTitle}
                  </span>
                  <span className="text-xs font-medium text-amber-200/80 block leading-relaxed">
                    {t.ore.raidHint}
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

            {/* F. UPCOMING EPIC GEAR (COST) & BI-MONTHLY EVENTS (INCOME) */}
            <div className="game-slot-well p-3.5 space-y-3">
              <label className="flex items-start justify-between cursor-pointer gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-bold text-xs sm:text-sm text-amber-200">
                      {t.ore.futureEpicTitle}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#4A251B] text-orange-200 border border-[#8B4330]">
                      {isTr ? "+Hedef Maliyet" : "+Target Cost"}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-amber-200/80 block leading-relaxed">
                    {t.ore.futureEpicHint}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeFutureEpics}
                  onChange={(e) => setIncludeFutureEpics(e.target.checked)}
                  className="game-checkbox mt-0.5"
                />
              </label>

              {includeFutureEpics && (
                <div className="pt-2.5 border-t border-[#3B2215] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      {t.ore.eventRow} ({isTr ? "Gelir" : "Income"})
                    </span>
                    <span className="text-xs font-semibold text-emerald-200/90 tabular-nums">
                      +{fmtNum(singleEventOre.shiny)} / +{fmtNum(singleEventOre.glowy)} / +
                      {fmtNum(singleEventOre.starry)}
                    </span>
                  </div>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#180E09] border border-[#3B2215] cursor-pointer gap-3">
                    <span className="text-xs font-semibold text-amber-100">
                      {t.ore.eventPassTitle}
                    </span>
                    <input
                      type="checkbox"
                      checked={hasEventPass}
                      onChange={(e) => setHasEventPass(e.target.checked)}
                      className="game-checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#180E09] border border-[#3B2215] cursor-pointer gap-3">
                    <span className="text-xs font-semibold text-amber-100">
                      {isTr
                        ? "Etkinlik Madalyası Paketi (+600 I, +80 ★)"
                        : "Event Medal Bundle (+600 Glowy, +80 ★)"}
                    </span>
                    <input
                      type="checkbox"
                      checked={hasEventMedals}
                      onChange={(e) => setHasEventMedals(e.target.checked)}
                      className="game-checkbox"
                    />
                  </label>

                  <p className="text-xs font-medium text-amber-200/75 leading-relaxed">
                    {t.ore.eventPassHint}
                  </p>
                </div>
              )}
            </div>
          </GamePanel>
        </div>

        {/* ==================================================================
            RIGHT COLUMN: PROJECTION & SCENARIO RESULTS
            ================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <span className="font-game text-sm sm:text-base text-amber-100 game-text-stroke-sm tracking-wide">
                  TH{thLevel} — {t.ore.projectionTitle}
                </span>

                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-sm",
                    bottleneckPillStyle
                  )}
                >
                  {isCompletedToday ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <ShieldAlert size={14} />
                  )}
                  <span>
                    {isCompletedToday ? (
                      t.ore.completedToday
                    ) : (
                      <>
                        {t.ore.bottleneck}{" "}
                        <strong className="font-extrabold">{bottleneckLabel}</strong>
                      </>
                    )}
                  </span>
                </div>
              </div>
            }
            bodyClassName="p-4 sm:p-6 space-y-5"
          >
            {/* 1. Big Hero Metric */}
            <div className="game-slot-well p-4 sm:p-5 rounded-2xl relative overflow-hidden space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-game text-4xl sm:text-5xl md:text-6xl text-amber-300 game-title-stroke tracking-tight tabular-nums">
                    {isCompletedToday
                      ? t.ore.completedToday
                      : `${fmtNum(estimated.daysToComplete)} ${t.ore.daysUnit}`}
                  </span>
                  <span className="font-game text-xl sm:text-2xl md:text-3xl text-sky-200 game-text-stroke-sm tabular-nums">
                    • {estimated.targetDateStr}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-amber-100/90 leading-relaxed">
                {isCompletedToday ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    {isTr
                      ? "Mevcut cevher envanteriniz tüm ekipman yükseltmelerini bugün tamamlamaya yetiyor!"
                      : "Your current ore inventory is enough to max all target equipment today!"}
                  </span>
                ) : (
                  fmtTemplate(t.ore.completionSummary, {
                    th: thLevel,
                    date: estimated.targetDateStr,
                  })
                )}
              </p>

              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#24130A] text-amber-200/90 border border-[#442314] tabular-nums">
                  {smithCapLabel}
                </span>
                {includeFutureEpics && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#4A251B] text-orange-200 border border-[#8B4330] tabular-nums">
                    {isTr ? "Gelecek Epikler Dahil" : "Includes Future Epics"} (+
                    {fmtNum(EPIC_FULL_MAX_COST.starry)} ★ / 2 {isTr ? "ay" : "mo"})
                  </span>
                )}
              </div>
            </div>

            {/* 2. Bottleneck Days Progress Comparison Bar */}
            <div className="game-slot-well p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                  {isTr
                    ? "Cevher Bazlı Tamamlama Süresi & Darboğaz Karşılaştırması"
                    : "Days to Max by Ore Type & Bottleneck Comparison"}
                </span>
                <span className="text-xs font-semibold text-amber-300/80 tabular-nums">
                  {isTr ? "En uzun süre darboğazı belirler" : "Longest track sets bottleneck"}
                </span>
              </div>

              <div className="space-y-2.5">
                {oreProgressRows.map((row) => {
                  const pct =
                    isCompletedToday || row.days === 0
                      ? 0
                      : Math.max(4, Math.min(100, Math.round((row.days / maxBottleneckDays) * 100)));
                  const isBottleneck = !isCompletedToday && bottleneckOreType === row.key;

                  return (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {renderOreIcon(row.key, "w-4 h-4")}
                          <span className={cn("font-bold", row.textClass)}>
                            {row.label}
                          </span>
                          {isBottleneck && (
                            <span
                              className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded border",
                                row.badgeClass
                              )}
                            >
                              {t.ore.bottleneck.replace(":", "")}
                            </span>
                          )}
                        </div>
                        <span className={cn("font-bold tabular-nums", row.textClass)}>
                          {fmtNum(row.days)} {t.ore.daysUnit}
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-[#180E09] border border-[#3A2315] overflow-hidden shadow-inner">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            row.barClass
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Scenario Comparison Strip (Min / Ort / Max) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-200/90 uppercase tracking-wider block">
                {t.ore.scenarioTitle}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Min Scenario (Best) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#153022] to-[#0B1C13] border-2 border-[#267349] shadow-inner flex flex-col justify-between gap-1">
                  <div className="text-xs font-bold text-emerald-300 tracking-wide">
                    {t.ore.scenarioBest}
                  </div>
                  <div className="font-game text-2xl text-emerald-200 game-text-stroke-sm tabular-nums">
                    {fmtNum(minScenario.daysToComplete)} {t.ore.daysUnit}
                  </div>
                  <div className="text-xs font-semibold text-emerald-200/85 tabular-nums">
                    {minScenario.targetDateStr}
                  </div>
                </div>

                {/* Estimated Scenario (Expected - Clash Gold Highlight) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#4D3612] to-[#2B1D09] border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex flex-col justify-between gap-1 relative">
                  <div className="text-xs font-bold text-amber-300 tracking-wide flex items-center justify-between gap-1">
                    <span>{t.ore.scenarioExpected}</span>
                    <Sparkles size={13} className="text-amber-300 shrink-0" />
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-amber-200 game-title-stroke tabular-nums">
                    {fmtNum(estimated.daysToComplete)} {t.ore.daysUnit}
                  </div>
                  <div className="text-xs font-semibold text-amber-100 tabular-nums">
                    {estimated.targetDateStr}
                  </div>
                </div>

                {/* Max Scenario (Slowest - Warm Copper-Terracotta) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#3A1E14] to-[#1F0F09] border-2 border-[#7D432E] shadow-inner flex flex-col justify-between gap-1">
                  <div className="text-xs font-bold text-orange-300 tracking-wide">
                    {t.ore.scenarioSlow}
                  </div>
                  <div className="font-game text-2xl text-orange-200 game-text-stroke-sm tabular-nums">
                    {fmtNum(maxScenario.daysToComplete)} {t.ore.daysUnit}
                  </div>
                  <div className="text-xs font-semibold text-orange-200/85 tabular-nums">
                    {maxScenario.targetDateStr}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. 3 Net Required Ore Cards (Sky-Azure / Ember-Copper / Clash Gold) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-amber-200/90 uppercase tracking-wider block">
                {t.ore.netNeedTitle}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Shiny Ore */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#1B3442] to-[#11232D] border-2 border-[#31637D] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-200">
                      <ShinyOreIcon className="w-4 h-4" />
                      <span>{t.ore.shiny}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#234354] text-sky-200 tabular-nums">
                      +{fmtNum(estimated.dailyRates.shiny)}
                      {t.ore.perDay}
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-sky-100 game-text-stroke-sm tabular-nums">
                    {fmtNum(netNeeded.shiny)}
                  </div>
                  <div className="text-xs font-semibold text-sky-200/80 tabular-nums">
                    {estimated.totalNeeded.shiny > netNeeded.shiny
                      ? `${t.ore.netRemainingDesc} (+${fmtNum(
                          estimated.totalNeeded.shiny - netNeeded.shiny
                        )})`
                      : t.ore.netRemainingDesc}
                  </div>
                </div>

                {/* Glowy Ore (Warm Ember-Copper / Terracotta) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#4A251B] to-[#2B140E] border-2 border-[#8B4330] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-200">
                      <GlowyOreIcon className="w-4 h-4" />
                      <span>{t.ore.glowy}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#663123] text-orange-200 tabular-nums">
                      +{fmtNum(estimated.dailyRates.glowy)}
                      {t.ore.perDay}
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-orange-100 game-text-stroke-sm tabular-nums">
                    {fmtNum(netNeeded.glowy)}
                  </div>
                  <div className="text-xs font-semibold text-orange-200/80 tabular-nums">
                    {estimated.totalNeeded.glowy > netNeeded.glowy
                      ? `${t.ore.netRemainingDesc} (+${fmtNum(
                          estimated.totalNeeded.glowy - netNeeded.glowy
                        )})`
                      : t.ore.netRemainingDesc}
                  </div>
                </div>

                {/* Starry Ore (Radiant Clash Gold) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#4D3612] to-[#2B1D09] border-2 border-[#966B20] shadow-inner flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                      <StarryOreIcon className="w-4 h-4" />
                      <span>{t.ore.starry}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#6B4A16] text-amber-200 tabular-nums">
                      +{fmtDec(estimated.dailyRates.starry, 1)}
                      {t.ore.perDay}
                    </span>
                  </div>
                  <div className="font-game text-2xl sm:text-3xl text-amber-100 game-title-stroke tabular-nums">
                    {fmtNum(netNeeded.starry)}
                  </div>
                  <div className="text-xs font-semibold text-amber-200/80 tabular-nums">
                    {estimated.totalNeeded.starry > netNeeded.starry
                      ? `${t.ore.netRemainingDesc} (+${fmtNum(
                          estimated.totalNeeded.starry - netNeeded.starry
                        )})`
                      : t.ore.netRemainingDesc}
                  </div>
                </div>
              </div>
            </div>
          </GamePanel>
        </div>
      </div>

      {/* 5. IMPORTED PLAYER EQUIPMENT BREAKDOWN CARDS */}
      {importedPlayer && activeDeficitAndItems.items.length > 0 && (
        <GamePanel
          variant="wood"
          title={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Swords size={18} className="text-amber-300" />
                <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                  {importedPlayer.name} — {t.ore.equipRemainingTitle}
                </span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#24130A] text-amber-300 border border-[#442314] tabular-nums">
                TH{thLevel} • {smithCapLabel}
              </span>
            </div>
          }
          bodyClassName="p-3.5 sm:p-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeDeficitAndItems.items.map((item) => {
              const isItemMaxed = item.level >= item.targetLevel;
              return (
                <div
                  key={item.name}
                  className={cn(
                    "p-3 rounded-xl border-2 flex flex-col justify-between gap-2.5 shadow-sm transition-all",
                    item.isEpic
                      ? "bg-gradient-to-b from-[#4D3612] to-[#2B1D09] border-[#966B20] shadow-[0_0_8px_rgba(234,179,8,0.18)]"
                      : "bg-gradient-to-b from-[#1B3442] to-[#11232D] border-[#31637D]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UnitIcon name={item.name} size="xs" isEpic={item.isEpic} />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-amber-100 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs font-semibold text-amber-200/75">
                          {item.isEpic ? t.ore.epicRarity : t.ore.commonRarity}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded border shrink-0 tabular-nums",
                        isItemMaxed
                          ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
                          : item.isEpic
                          ? "bg-[#6B4A16] border-amber-400 text-amber-200"
                          : "bg-[#234354] border-sky-400/70 text-sky-200"
                      )}
                    >
                      Lv.{item.level} → {item.targetLevel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-black/30 flex-wrap">
                    <OreBadge type="shiny" amount={item.shiny} />
                    <OreBadge type="glowy" amount={item.glowy} />
                    {item.isEpic ? (
                      <OreBadge type="starry" amount={item.starry} />
                    ) : (
                      <span className="text-xs font-semibold text-amber-200/50 px-1.5 tabular-nums">
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GamePanel>
      )}

      {/* 6. DETAILED INCOME BREAKDOWN TABLE */}
      <GamePanel
        variant="wood"
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Table size={18} className="text-amber-300" />
              <span className="font-game text-sm sm:text-base text-white game-text-stroke-sm tracking-wide">
                {t.ore.dailyBreakdownTitle} (TH{thLevel})
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 border border-amber-300 tabular-nums">
              {smithCapLabel}
            </span>
          </div>
        }
        bodyClassName="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[620px] tabular-nums">
            <thead>
              <tr className="bg-[#24130A] border-b-2 border-[#3E2112] text-xs font-bold text-amber-200 tracking-wide">
                <th className="py-3 px-4">{t.ore.sourceCol}</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-sky-200">
                    <ShinyOreIcon className="w-4 h-4" />
                    <span>{t.ore.shinyFull}</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-orange-200">
                    <GlowyOreIcon className="w-4 h-4" />
                    <span>{t.ore.glowyFull}</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-amber-200">
                    <StarryOreIcon className="w-4 h-4" />
                    <span>{t.ore.starryFull}</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  {isTr ? "Periyot" : "Cadence"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#331C0F] text-xs sm:text-sm font-semibold text-amber-100">
              {/* Row 1: Daily Star Bonus */}
              <tr className="hover:bg-[#3D2315]/40 transition-colors">
                <td className="py-3 px-4 text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                    <span>
                      {t.ore.dailyStarBonus} (
                      {locale === "tr"
                        ? selectedLeagueTier.nameTr
                        : selectedLeagueTier.name}
                      )
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sky-200 font-bold">
                  +{fmtNum(selectedLeagueTier.dailyShiny)} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-orange-200 font-bold">
                  +{fmtNum(selectedLeagueTier.dailyGlowy)} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-amber-200 font-bold">
                  +{fmtNum(selectedLeagueTier.dailyStarry)} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                    {isTr ? "Günlük" : "Daily"}
                  </span>
                </td>
              </tr>

              {/* Row 2: Clan Wars */}
              <tr className="hover:bg-[#3D2315]/40 transition-colors">
                <td className="py-3 px-4 text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span>
                      {t.ore.cwRow} (
                      {fmtTemplate(t.ore.warsPerMonth, { count: monthlyCwCount })} •{" "}
                      {fmtTemplate(t.ore.warRecord, {
                        wins: effectiveCwWinCount,
                        losses: cwLosses,
                      })}
                      )
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sky-200 font-bold">
                  ~+{fmtNum(Math.round(cwMonthlyIncome.shiny / 30))} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-orange-200 font-bold">
                  ~+{fmtNum(Math.round(cwMonthlyIncome.glowy / 30))} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-amber-200 font-bold">
                  ~+{fmtDec(cwMonthlyIncome.starry / 30, 1)} {t.ore.perDay}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-600/40">
                    {isTr ? "Aylık Ort." : "Monthly Avg"}
                  </span>
                </td>
              </tr>

              {/* Row 3: CWL (Warm Bronze-Amber) */}
              {participatesCwl && (
                <tr className="hover:bg-[#3D2315]/40 transition-colors">
                  <td className="py-3 px-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>
                        {t.ore.cwlRow} (
                        {fmtTemplate(t.ore.warRecord, {
                          wins: cwlWinCount,
                          losses: cwlLosses,
                        })}
                        )
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sky-200 font-bold">
                    ~+{fmtNum(Math.round(cwlMonthlyIncome.shiny / 30))} {t.ore.perDay}
                  </td>
                  <td className="py-3 px-4 text-orange-200 font-bold">
                    ~+{fmtNum(Math.round(cwlMonthlyIncome.glowy / 30))} {t.ore.perDay}
                  </td>
                  <td className="py-3 px-4 text-amber-200 font-bold">
                    ~+{fmtDec(cwlMonthlyIncome.starry / 30, 1)} {t.ore.perDay}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#3D2B19] text-amber-200 border border-amber-700/50">
                      {isTr ? "Lig Savaşları" : "League Wars"}
                    </span>
                  </td>
                </tr>
              )}

              {/* Row 4: Raid Medals */}
              {includeRaidMedals && (
                <tr className="hover:bg-[#3D2315]/40 transition-colors">
                  <td className="py-3 px-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{t.ore.raidRow}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-amber-200/50">
                    0 {t.ore.perDay}
                  </td>
                  <td className="py-3 px-4 text-orange-200 font-bold">
                    +{fmtDec(WEEKLY_RAID_MEDALS_ORE.glowy / 7, 1)} {t.ore.perDay}{" "}
                    <span className="text-xs font-medium opacity-75">
                      (+{fmtNum(WEEKLY_RAID_MEDALS_ORE.glowy)})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-amber-200 font-bold">
                    +{fmtDec(WEEKLY_RAID_MEDALS_ORE.starry / 7, 1)} {t.ore.perDay}{" "}
                    <span className="text-xs font-medium opacity-75">
                      (+{fmtNum(WEEKLY_RAID_MEDALS_ORE.starry)})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                      {isTr ? "Haftalık" : "Weekly"}
                    </span>
                  </td>
                </tr>
              )}

              {/* Row 5: Bi-Monthly Events (t.ore.eventRow) */}
              <tr
                className={cn(
                  "hover:bg-[#3D2315]/40 transition-colors",
                  !includeFutureEpics && "opacity-55"
                )}
              >
                <td className="py-3 px-4 text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E06D3B] shrink-0" />
                    <span>
                      {t.ore.eventRow}
                      {!includeFutureEpics &&
                        ` (${isTr ? "Kapalı" : "Disabled"})`}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sky-200 font-bold">
                  {includeFutureEpics
                    ? `+${fmtNum(singleEventOre.shiny)}`
                    : "0"}
                  {includeFutureEpics && (
                    <span className="text-xs font-medium opacity-75 block">
                      ~+{fmtNum(Math.round(singleEventOre.shiny / 60))} {t.ore.perDay}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-orange-200 font-bold">
                  {includeFutureEpics
                    ? `+${fmtNum(singleEventOre.glowy)}`
                    : "0"}
                  {includeFutureEpics && (
                    <span className="text-xs font-medium opacity-75 block">
                      ~+{fmtDec(singleEventOre.glowy / 60, 1)} {t.ore.perDay}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-amber-200 font-bold">
                  {includeFutureEpics
                    ? `+${fmtNum(singleEventOre.starry)}`
                    : "0"}
                  {includeFutureEpics && (
                    <span className="text-xs font-medium opacity-75 block">
                      ~+{fmtDec(singleEventOre.starry / 60, 1)} {t.ore.perDay}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#4A251B] text-orange-200 border border-[#8B4330]">
                    {isTr ? "2 Ayda 1" : "Bi-Monthly"}
                  </span>
                </td>
              </tr>

              {/* Footer Row: TOTAL DAILY RATE */}
              <tr className="bg-[#1C0E07] text-sm sm:text-base font-extrabold border-t-2 border-[#542B15]">
                <td className="py-3.5 px-4 text-amber-200">
                  {t.ore.totalDailyRow}
                </td>
                <td className="py-3.5 px-4 text-sky-200">
                  ~{fmtNum(estimated.dailyRates.shiny)} {t.ore.perDay}
                </td>
                <td className="py-3.5 px-4 text-orange-200">
                  ~{fmtNum(estimated.dailyRates.glowy)} {t.ore.perDay}
                </td>
                <td className="py-3.5 px-4 text-amber-200">
                  ~{fmtDec(estimated.dailyRates.starry, 1)} {t.ore.perDay}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-3 py-1 rounded-md text-xs font-extrabold bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-sm">
                    {isTr ? "Sabit Hız" : "Base Daily"}
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
