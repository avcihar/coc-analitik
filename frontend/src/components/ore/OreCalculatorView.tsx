"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Settings,
  Table,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  X,
  Swords,
  Package,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImportedPlayerForOre } from "@/components/player";
import UnitIcon from "@/components/common/UnitIcon";
import { useLanguage } from "@/lib/i18n";
import OreDeficitCard from "./OreDeficitCard";
import type { OreKind } from "./ProgressBarWood";
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
// ORE ICONS (Official In-Game Ore Assets)
// ============================================================================

export function ShinyOreIcon({
  className = "w-5 h-5",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/icons/ores/shiny-ore.png"
      alt=""
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
      className={cn("shrink-0 object-contain select-none", className)}
    />
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
    <img
      src="/icons/ores/glowy-ore.png"
      alt=""
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
      className={cn("shrink-0 object-contain select-none", className)}
    />
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
    <img
      src="/icons/ores/starry-ore.png"
      alt=""
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
      className={cn("shrink-0 object-contain select-none", className)}
    />
  );
}

const ORE_STYLES: Record<
  OreKind,
  {
    textClass: string;
    pillClass: string;
    barClass: string;
  }
> = {
  shiny: {
    textClass: "text-sky-400",
    pillClass: "ui-pill text-sky-400",
    barClass: "bg-sky-400",
  },
  glowy: {
    textClass: "text-orange-400",
    pillClass: "ui-pill text-orange-400",
    barClass: "bg-orange-400",
  },
  starry: {
    textClass: "text-amber-400",
    pillClass: "ui-pill text-amber-400",
    barClass: "bg-amber-400",
  },
};

function renderOreIcon(type: OreKind, className = "w-4 h-4") {
  if (type === "shiny") return <ShinyOreIcon className={className} />;
  if (type === "glowy") return <GlowyOreIcon className={className} />;
  return <StarryOreIcon className={className} />;
}

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
  const style = ORE_STYLES[type];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 font-sans font-bold text-xs tabular-nums tracking-tight select-none",
        style.pillClass,
        className
      )}
    >
      {renderOreIcon(type, "w-3.5 h-3.5")}
      <span>{typeof amount === "number" ? fmtNum(amount) : amount}</span>
      {suffix && <span className="text-xs opacity-85 font-semibold">{suffix}</span>}
    </div>
  );
}

function SectionBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] text-[11px] font-extrabold text-[var(--ui-text-muted)] tabular-nums shrink-0">
      {num}
    </span>
  );
}

function ParchmentSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked
          ? "bg-[var(--game-btn-green-mid)] border-[var(--game-btn-green-border)]"
          : "bg-[var(--game-dark-box-dark)] border-[var(--ui-panel-border)]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-[var(--ui-text-main)] border border-[var(--ui-panel-border)] transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </span>
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

const TH_LEVELS = [11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

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
  19: {
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
  const [thLevel, setThLevel] = useState<number>(19);

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
        19,
        Math.max(11, importedPlayer.townHallLevel || 19)
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
        ? Math.min(19, Math.max(11, importedPlayer.townHallLevel || 19))
        : 19
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
    () => TH_META_BY_LEVEL[thLevel] ?? TH_META_BY_LEVEL[19],
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

  const maxBottleneckDays = Math.max(
    1,
    estimated.daysShiny,
    estimated.daysGlowy,
    estimated.daysStarry
  );

  const oreProgressRows: Array<{
    key: OreKind;
    label: string;
    days: number;
  }> = [
    {
      key: "shiny",
      label: t.ore.shiny,
      days: estimated.daysShiny,
    },
    {
      key: "glowy",
      label: t.ore.glowy,
      days: estimated.daysGlowy,
    },
    {
      key: "starry",
      label: t.ore.starry,
      days: estimated.daysStarry,
    },
  ];

  const smithCapLabel = `${t.ore.smithCap}: ${t.ore.commonRarity} Lv.${currentThMeta.commonMax} / ${t.ore.epicRarity} Lv.${currentThMeta.epicMax}`;

  const inventoryFields: Array<{
    key: OreKind;
    label: string;
    value: string;
    onChange: (v: string) => void;
  }> = [
    { key: "shiny", label: t.ore.shiny, value: invShinyInput, onChange: setInvShinyInput },
    { key: "glowy", label: t.ore.glowy, value: invGlowyInput, onChange: setInvGlowyInput },
    { key: "starry", label: t.ore.starry, value: invStarryInput, onChange: setInvStarryInput },
  ];

  const cwRewardFields: Array<{
    key: OreKind;
    label: string;
    value: number;
    onChange: (v: number) => void;
  }> = [
    { key: "shiny", label: t.ore.shiny, value: cwWinShiny, onChange: setCwWinShiny },
    { key: "glowy", label: t.ore.glowy, value: cwWinGlowy, onChange: setCwWinGlowy },
    { key: "starry", label: t.ore.starry, value: cwWinStarry, onChange: setCwWinStarry },
  ];

  const cwlRewardFields: Array<{
    key: OreKind;
    label: string;
    value: number;
    onChange: (v: number) => void;
  }> = [
    { key: "shiny", label: t.ore.shiny, value: cwlWinShiny, onChange: setCwlWinShiny },
    { key: "glowy", label: t.ore.glowy, value: cwlWinGlowy, onChange: setCwlWinGlowy },
    { key: "starry", label: t.ore.starry, value: cwlWinStarry, onChange: setCwlWinStarry },
  ];

  const netNeedCards: Array<{
    key: OreKind;
    label: string;
    dailyRateText: string;
    netAmount: number;
    totalAmount: number;
  }> = [
    {
      key: "shiny",
      label: t.ore.shiny,
      dailyRateText: `+${fmtNum(estimated.dailyRates.shiny)}${t.ore.perDay}`,
      netAmount: netNeeded.shiny,
      totalAmount: estimated.totalNeeded.shiny,
    },
    {
      key: "glowy",
      label: t.ore.glowy,
      dailyRateText: `+${fmtNum(estimated.dailyRates.glowy)}${t.ore.perDay}`,
      netAmount: netNeeded.glowy,
      totalAmount: estimated.totalNeeded.glowy,
    },
    {
      key: "starry",
      label: t.ore.starry,
      dailyRateText: `+${fmtDec(estimated.dailyRates.starry, 1)}${t.ore.perDay}`,
      netAmount: netNeeded.starry,
      totalAmount: estimated.totalNeeded.starry,
    },
  ];

  const incomeRows: Array<{
    id: string;
    visible: boolean;
    dimmed?: boolean;
    dotClass: string;
    label: string;
    cadence: string;
    cadenceClass: string;
    shinyPrimary: string;
    shinySub?: string;
    shinyMuted?: boolean;
    glowyPrimary: string;
    glowySub?: string;
    starryPrimary: string;
    starrySub?: string;
  }> = [
    {
      id: "starBonus",
      visible: true,
      dotClass: "bg-sky-400",
      label: `${t.ore.dailyStarBonus} (${
        locale === "tr" ? selectedLeagueTier.nameTr : selectedLeagueTier.name
      })`,
      cadence: isTr ? "Günlük" : "Daily",
      cadenceClass: "ui-pill text-[var(--ui-text-green)]",
      shinyPrimary: `+${fmtNum(selectedLeagueTier.dailyShiny)} ${t.ore.perDay}`,
      glowyPrimary: `+${fmtNum(selectedLeagueTier.dailyGlowy)} ${t.ore.perDay}`,
      starryPrimary: `+${fmtNum(selectedLeagueTier.dailyStarry)} ${t.ore.perDay}`,
    },
    {
      id: "cw",
      visible: true,
      dotClass: "bg-amber-400",
      label: `${t.ore.cwRow} (${fmtTemplate(t.ore.warsPerMonth, {
        count: monthlyCwCount,
      })} • ${fmtTemplate(t.ore.warRecord, {
        wins: effectiveCwWinCount,
        losses: cwLosses,
      })})`,
      cadence: isTr ? "Aylık Ort." : "Monthly Avg",
      cadenceClass: "ui-pill text-[var(--ui-text-gold)]",
      shinyPrimary: `~+${fmtNum(Math.round(cwMonthlyIncome.shiny / 30))} ${t.ore.perDay}`,
      glowyPrimary: `~+${fmtNum(Math.round(cwMonthlyIncome.glowy / 30))} ${t.ore.perDay}`,
      starryPrimary: `~+${fmtDec(cwMonthlyIncome.starry / 30, 1)} ${t.ore.perDay}`,
    },
    {
      id: "cwl",
      visible: participatesCwl,
      dotClass: "bg-[var(--ui-text-gold)]",
      label: `${t.ore.cwlRow} (${fmtTemplate(t.ore.warRecord, {
        wins: cwlWinCount,
        losses: cwlLosses,
      })})`,
      cadence: isTr ? "Lig Savaşları" : "League Wars",
      cadenceClass: "ui-pill text-[var(--ui-text-muted)]",
      shinyPrimary: `~+${fmtNum(Math.round(cwlMonthlyIncome.shiny / 30))} ${t.ore.perDay}`,
      glowyPrimary: `~+${fmtNum(Math.round(cwlMonthlyIncome.glowy / 30))} ${t.ore.perDay}`,
      starryPrimary: `~+${fmtDec(cwlMonthlyIncome.starry / 30, 1)} ${t.ore.perDay}`,
    },
    {
      id: "raid",
      visible: includeRaidMedals,
      dotClass: "bg-[var(--game-btn-green-mid)]",
      label: t.ore.raidRow,
      cadence: isTr ? "Haftalık" : "Weekly",
      cadenceClass: "ui-pill text-[var(--ui-text-green)]",
      shinyPrimary: `0 ${t.ore.perDay}`,
      shinyMuted: true,
      glowyPrimary: `+${fmtDec(WEEKLY_RAID_MEDALS_ORE.glowy / 7, 1)} ${t.ore.perDay}`,
      glowySub: `(+${fmtNum(WEEKLY_RAID_MEDALS_ORE.glowy)})`,
      starryPrimary: `+${fmtDec(WEEKLY_RAID_MEDALS_ORE.starry / 7, 1)} ${t.ore.perDay}`,
      starrySub: `(+${fmtNum(WEEKLY_RAID_MEDALS_ORE.starry)})`,
    },
    {
      id: "events",
      visible: true,
      dimmed: !includeFutureEpics,
      dotClass: "bg-orange-400",
      label: `${t.ore.eventRow}${
        !includeFutureEpics ? ` (${isTr ? "Kapalı" : "Disabled"})` : ""
      }`,
      cadence: isTr ? "2 Ayda 1" : "Bi-Monthly",
      cadenceClass: "ui-pill text-orange-400",
      shinyPrimary: includeFutureEpics ? `+${fmtNum(singleEventOre.shiny)}` : "0",
      shinySub: includeFutureEpics
        ? `~+${fmtNum(Math.round(singleEventOre.shiny / 60))} ${t.ore.perDay}`
        : undefined,
      glowyPrimary: includeFutureEpics ? `+${fmtNum(singleEventOre.glowy)}` : "0",
      glowySub: includeFutureEpics
        ? `~+${fmtDec(singleEventOre.glowy / 60, 1)} ${t.ore.perDay}`
        : undefined,
      starryPrimary: includeFutureEpics ? `+${fmtNum(singleEventOre.starry)}` : "0",
      starrySub: includeFutureEpics
        ? `~+${fmtDec(singleEventOre.starry / 60, 1)} ${t.ore.perDay}`
        : undefined,
    },
  ];

  const visibleIncomeRows = incomeRows.filter((row) => row.visible);

  const inputBaseClass =
    "ui-input w-full min-h-[44px] px-3 py-2 font-sans font-semibold text-base tabular-nums focus:outline-none focus:border-[var(--ui-text-gold)] transition-colors";

  const cwFrequencyPresets = [
    { label: isTr ? "Sürekli" : "Always", wars: 15 },
    { label: isTr ? "Haftada 2" : "2x / Week", wars: 8 },
    { label: isTr ? "Haftada 1" : "1x / Week", wars: 4 },
  ];

  return (
    <div className="w-full text-[var(--ui-text-main)] font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================================================================
            SAÄ ÃœST (Desktop) / Ä°LK (Mobile): TH11-TH18 SEÃ‡Ä°CÄ° & CEVHER SONUÃ‡ KARTI
            ================================================================== */}
        <div className="order-1 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-1 space-y-4 min-w-0">
          {/* TH11-TH18 Selector Bar */}
          <div className="ui-panel p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="ui-well w-10 h-10 flex items-center justify-center shrink-0">
                  <div className="flex items-center -space-x-1">
                    <ShinyOreIcon className="w-3.5 h-3.5" />
                    <GlowyOreIcon className="w-3.5 h-3.5" />
                    <StarryOreIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="font-game font-extrabold text-base sm:text-lg text-[var(--ui-text-main)] tracking-tight leading-tight truncate">
                    {t.ore.title}
                  </h1>
                  <p className="text-xs text-[var(--ui-text-muted)] truncate">
                    {t.ore.targetTh} • {smithCapLabel}
                  </p>
                </div>
              </div>

              {importedPlayer && (
                <div className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[var(--ui-text-green)] tabular-nums">
                  <UserCheck size={13} className="shrink-0" />
                  <span className="truncate max-w-[160px]">
                    {importedPlayer.name}
                  </span>
                  <span>• TH{importedPlayer.townHallLevel}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1.5">
              {TH_LEVELS.map((lvl) => {
                const isActive = thLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setThLevel(lvl)}
                    className={cn(
                      "min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg font-sans font-bold text-xs sm:text-sm tabular-nums transition-colors cursor-pointer flex items-center justify-center select-none border",
                      isActive
                        ? "game-btn-green text-white"
                        : "ui-well text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                    )}
                  >
                    TH{lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ore Deficit & Completion Projection Card */}
          <OreDeficitCard
            thLevel={thLevel}
            projectionTitle={t.ore.projectionTitle}
            isCompletedToday={isCompletedToday}
            completedTodayLabel={t.ore.completedToday}
            completedTodayMessage={
              isTr
                ? "Mevcut cevher envanteriniz tüm ekipman yükseltmelerini bugün tamamlamaya yetiyor!"
                : "Your current ore inventory is enough to max all target equipment today!"
            }
            completionSummaryText={fmtTemplate(t.ore.completionSummary, {
              th: thLevel,
              date: estimated.targetDateStr,
            })}
            bottleneckPrefix={t.ore.bottleneck}
            bottleneckLabel={bottleneckLabel}
            bottleneckBadgeLabel={t.ore.bottleneck.replace(":", "")}
            bottleneckOreType={bottleneckOreType}
            estimated={estimated}
            minScenario={minScenario}
            maxScenario={maxScenario}
            daysUnit={t.ore.daysUnit}
            targetDateLabel={isTr ? "Tamamlanma" : "Completion"}
            smithCapLabel={smithCapLabel}
            includeFutureEpics={includeFutureEpics}
            futureEpicsBadgeText={`${
              isTr ? "Gelecek Epikler Dahil" : "Includes Future Epics"
            } (+${fmtNum(EPIC_FULL_MAX_COST.starry)} ★ / 2 ${isTr ? "ay" : "mo"})`}
            progressTitle={
              isTr
                ? "Cevher Bazlı Tamamlama Süresi & Darboğaz"
                : "Days to Max by Ore Type & Bottleneck"
            }
            progressHint={
              isTr ? "En uzun süre darboğazı belirler" : "Longest track sets bottleneck"
            }
            maxBottleneckDays={maxBottleneckDays}
            oreProgressRows={oreProgressRows.map((r) => ({
              ...r,
              netNeeded: netNeeded[r.key],
              icon: renderOreIcon(r.key, "w-4 h-4"),
            }))}
            scenarioTitle={t.ore.scenarioTitle}
            scenarioBestLabel={t.ore.scenarioBest}
            scenarioEstimatedLabel={t.ore.scenarioExpected}
            scenarioWorstLabel={t.ore.scenarioSlow}
            netNeedTitle={t.ore.netNeedTitle}
            netRemainingDesc={t.ore.netRemainingDesc}
            netNeedCards={netNeedCards.map((c) => ({
              ...c,
              icon: renderOreIcon(c.key, "w-4 h-4"),
            }))}
            fmtNum={fmtNum}
          />
        </div>

        {/* ==================================================================
            SOL SÜTUN (Desktop) / İKİNCİ (Mobile): SİMÜLASYON AYARLARI
            ================================================================== */}
        <section className="order-2 lg:order-none lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:row-span-2 ui-panel overflow-hidden min-w-0">
          <div className="ui-panel-header px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Settings size={16} className="text-[var(--ui-text-gold)] shrink-0" />
              <h2 className="font-game font-extrabold text-sm sm:text-base text-[var(--ui-text-main)] truncate">
                {t.ore.settingsTitle}
              </h2>
            </div>
            <span className="ui-pill text-xs font-bold px-2.5 py-0.5 text-[var(--ui-text-muted)] tabular-nums shrink-0">
              TH{thLevel}
            </span>
          </div>

          <div className="divide-y divide-[var(--ui-panel-border)]">
            {/* 1. Mevcut Cevher Envanteri */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <SectionBadge num={1} />
                  <Package size={15} className="text-[var(--ui-text-muted)]" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                    {t.ore.inventoryTitle}
                  </span>
                </div>
                <span className="text-xs font-medium text-[var(--ui-text-muted)]">
                  {t.ore.inventoryHint}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {inventoryFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        ORE_STYLES[field.key].textClass
                      )}
                    >
                      {renderOreIcon(field.key, "w-3.5 h-3.5")}
                      <span>{field.label}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="0"
                      aria-label={`${t.ore.inventoryTitle} - ${field.label}`}
                      className={inputBaseClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Çok Oyunculu Lig + Günlük Oran Özeti */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <SectionBadge num={2} />
                {selectedLeagueTier.iconSmall ? (
                  <img
                    src={selectedLeagueTier.iconSmall}
                    alt={
                      locale === "tr"
                        ? selectedLeagueTier.nameTr
                        : selectedLeagueTier.name
                    }
                    className="w-4 h-4 object-contain shrink-0"
                  />
                ) : (
                  <img
                    src="/icons/ui/trophy.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain shrink-0 select-none"
                  />
                )}
                <label
                  htmlFor="ore-league-select"
                  className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]"
                >
                  {t.ore.leagueTitle}
                </label>
              </div>

              <div className="relative">
                <select
                  id="ore-league-select"
                  value={leagueTierId}
                  onChange={(e) => setLeagueTierId(Number(e.target.value))}
                  className="ui-input w-full min-h-[44px] px-3 py-2 pr-9 font-sans font-semibold text-base tabular-nums outline-none focus:border-[var(--ui-text-gold)] transition-colors cursor-pointer appearance-none"
                >
                  {LEAGUE_TIERS.map((tier) => {
                    const tierLabel = locale === "tr" ? tier.nameTr : tier.name;
                    return (
                      <option
                        key={tier.id}
                        value={tier.id}
                        className="bg-[var(--game-dark-box-dark)] text-[var(--ui-text-main)] font-sans"
                      >
                        {tier.isUnknown
                          ? `${tierLabel} — 0 / 0 / 0`
                          : `${tierLabel} (+${fmtNum(tier.dailyShiny)} / +${fmtNum(
                              tier.dailyGlowy
                            )} / +${fmtNum(tier.dailyStarry)})`}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--ui-text-muted)]">
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
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

            {/* 3. Klan Savaşı Segmented Presets, Slider & Galibiyet Kazancı */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <SectionBadge num={3} />
                  <Swords size={15} className="text-[var(--ui-text-muted)]" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                    {t.ore.cwTitle}
                  </span>
                </div>
                <span className="ui-pill text-xs font-bold tabular-nums px-2.5 py-0.5 text-[var(--ui-text-main)]">
                  {fmtTemplate(t.ore.warsPerMonth, { count: monthlyCwCount })}
                </span>
              </div>

              {/* Frequency Segmented Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {cwFrequencyPresets.map((preset) => {
                  const isActive = monthlyCwCount === preset.wars;
                  return (
                    <button
                      key={preset.wars}
                      type="button"
                      onClick={() => {
                        setMonthlyCwCount(preset.wars);
                        if (cwWinCount > preset.wars) setCwWinCount(preset.wars);
                      }}
                      className={cn(
                        "min-h-[44px] px-2.5 py-2 rounded-lg font-sans font-bold text-xs transition-colors cursor-pointer select-none border",
                        isActive
                          ? "game-btn-green text-white"
                          : "ui-well text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Monthly Wars Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[var(--ui-text-muted)] gap-2">
                  <label htmlFor="cw-monthly-slider">{t.ore.monthlyWars}</label>
                  <span className="font-bold text-[var(--ui-text-main)] tabular-nums">
                    {fmtTemplate(t.ore.warsPerMonth, { count: monthlyCwCount })}
                  </span>
                </div>
                <input
                  id="cw-monthly-slider"
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
                  className="w-full min-h-[44px] cursor-pointer accent-[var(--ui-text-gold)] bg-transparent"
                />
              </div>

              {/* CW Wins Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[var(--ui-text-muted)] gap-2">
                  <label htmlFor="cw-wins-slider">{t.ore.warWins}</label>
                  <span className="font-bold text-[var(--ui-text-main)] tabular-nums">
                    {fmtTemplate(t.ore.warRecord, {
                      wins: effectiveCwWinCount,
                      losses: cwLosses,
                    })}
                  </span>
                </div>
                <input
                  id="cw-wins-slider"
                  type="range"
                  min="0"
                  max={monthlyCwCount}
                  step="1"
                  disabled={monthlyCwCount === 0}
                  value={effectiveCwWinCount}
                  onChange={(e) => setCwWinCount(Number(e.target.value))}
                  className="w-full min-h-[44px] cursor-pointer accent-[var(--ui-text-gold)] bg-transparent disabled:opacity-45 disabled:cursor-not-allowed"
                />
              </div>

              {/* Custom Per-War Ore Inputs */}
              <div className="pt-2.5 border-t border-[var(--ui-panel-border)] space-y-2">
                <span className="text-xs font-semibold text-[var(--ui-text-muted)] block">
                  {t.ore.cwPerWinHint}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {cwRewardFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-bold",
                          ORE_STYLES[field.key].textClass
                        )}
                      >
                        {renderOreIcon(field.key, "w-3.5 h-3.5")}
                        <span>{field.label}</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Math.max(0, Number(e.target.value) || 0))
                        }
                        aria-label={`${t.ore.cwTitle} - ${field.label}`}
                        className={inputBaseClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. CWL Katılım & Ödül Düzenle */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <SectionBadge num={4} />
                  <img
                    src="/icons/ui/trophy.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain shrink-0 select-none"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                    {t.ore.cwlTitle}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={participatesCwl}
                  onClick={() => setParticipatesCwl(!participatesCwl)}
                  className="min-h-[44px] px-2 inline-flex items-center gap-2 cursor-pointer select-none"
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      participatesCwl
                        ? "text-[var(--ui-text-green)]"
                        : "text-[var(--ui-text-muted)]"
                    )}
                  >
                    {participatesCwl ? t.ore.participating : t.ore.notParticipating}
                  </span>
                  <ParchmentSwitch checked={participatesCwl} />
                </button>
              </div>

              {participatesCwl && (
                <div className="space-y-3 pt-2 border-t border-[var(--ui-panel-border)]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[var(--ui-text-muted)] gap-2">
                      <label htmlFor="cwl-wins-slider">{t.ore.cwlWinsLabel}</label>
                      <span className="font-bold text-[var(--ui-text-main)] tabular-nums">
                        {fmtTemplate(t.ore.warRecord, {
                          wins: cwlWinCount,
                          losses: cwlLosses,
                        })}
                      </span>
                    </div>
                    <input
                      id="cwl-wins-slider"
                      type="range"
                      min="0"
                      max={CWL_WAR_COUNT}
                      step="1"
                      value={cwlWinCount}
                      onChange={(e) => setCwlWinCount(Number(e.target.value))}
                      className="w-full min-h-[44px] cursor-pointer accent-[var(--ui-text-gold)] bg-transparent"
                    />
                  </div>

                  <div className="ui-well p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--ui-text-main)] tabular-nums">
                        {fmtTemplate(t.ore.cwlWinLossPreview, {
                          wins: cwlWinCount,
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCwlEditor((v) => !v)}
                        className="ui-pill min-h-[44px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text-main)] transition-colors cursor-pointer select-none"
                      >
                        <SlidersHorizontal
                          size={13}
                          className="text-[var(--ui-text-muted)]"
                        />
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

                    <div className="text-xs text-[var(--ui-text-muted)] tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
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

                    <div className="text-xs font-bold text-[var(--ui-text-gold)] tabular-nums">
                      {isTr ? "Aylık CWL Toplamı:" : "Monthly CWL Total:"} +
                      {fmtNum(cwlMonthlyIncome.shiny)} / +
                      {fmtNum(cwlMonthlyIncome.glowy)} / +
                      {fmtNum(cwlMonthlyIncome.starry)}
                    </div>

                    {showCwlEditor && (
                      <div className="pt-2.5 border-t border-[var(--ui-panel-border)] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {cwlRewardFields.map((field) => (
                          <div key={field.key} className="space-y-1">
                            <label
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-bold",
                                ORE_STYLES[field.key].textClass
                              )}
                            >
                              {renderOreIcon(field.key, "w-3.5 h-3.5")}
                              <span>{field.label}</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(Math.max(0, Number(e.target.value) || 0))
                              }
                              aria-label={`${t.ore.cwlTitle} - ${field.label}`}
                              className={inputBaseClass}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showCwConflictWarning && (
                <div className="ui-info flex items-start gap-2 p-3 text-[var(--ui-text-gold)] text-xs font-semibold leading-relaxed">
                  <AlertTriangle
                    size={15}
                    className="text-[var(--ui-text-gold)] shrink-0 mt-0.5"
                  />
                  <span>{t.ore.cwlNote}</span>
                </div>
              )}
            </div>

            {/* 5. Baskın Madalyası */}
            <div className="p-4 sm:p-5">
              <button
                type="button"
                role="switch"
                aria-checked={includeRaidMedals}
                onClick={() => setIncludeRaidMedals((v) => !v)}
                className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SectionBadge num={5} />
                    <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                      {t.ore.raidTitle}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--ui-text-muted)] block leading-relaxed pl-7">
                    {t.ore.raidHint}
                  </span>
                </div>
                <ParchmentSwitch checked={includeRaidMedals} />
              </button>
            </div>

            {/* 6. Gelecek Epik Ekipman & Etkinlikler */}
            <div className="p-4 sm:p-5 space-y-3">
              <button
                type="button"
                role="switch"
                aria-checked={includeFutureEpics}
                onClick={() => setIncludeFutureEpics((v) => !v)}
                className="w-full min-h-[44px] flex items-start justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SectionBadge num={6} />
                    <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                      {t.ore.futureEpicTitle}
                    </span>
                    <span className="ui-pill text-[11px] font-bold px-2 py-0.5 text-orange-400">
                      {isTr ? "+Hedef Maliyet" : "+Target Cost"}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--ui-text-muted)] block leading-relaxed pl-7">
                    {t.ore.futureEpicHint}
                  </span>
                </div>
                <div className="pt-0.5">
                  <ParchmentSwitch checked={includeFutureEpics} />
                </div>
              </button>

              {includeFutureEpics && (
                <div className="pt-3 border-t border-[var(--ui-panel-border)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--ui-text-green)] uppercase tracking-wide">
                      {t.ore.eventRow} ({isTr ? "Gelir" : "Income"})
                    </span>
                    <span className="text-xs font-bold text-[var(--ui-text-green)] tabular-nums">
                      +{fmtNum(singleEventOre.shiny)} / +
                      {fmtNum(singleEventOre.glowy)} / +
                      {fmtNum(singleEventOre.starry)}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasEventPass}
                    onClick={() => setHasEventPass((v) => !v)}
                    className="ui-well w-full min-h-[44px] flex items-center justify-between px-3 py-2 cursor-pointer gap-3 text-left transition-colors select-none"
                  >
                    <span className="text-xs font-semibold text-[var(--ui-text-main)]">
                      {t.ore.eventPassTitle}
                    </span>
                    <ParchmentSwitch checked={hasEventPass} />
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasEventMedals}
                    onClick={() => setHasEventMedals((v) => !v)}
                    className="ui-well w-full min-h-[44px] flex items-center justify-between px-3 py-2 cursor-pointer gap-3 text-left transition-colors select-none"
                  >
                    <span className="text-xs font-semibold text-[var(--ui-text-main)]">
                      {isTr
                        ? "Etkinlik Madalyası Paketi (+600 I, +80 ★)"
                        : "Event Medal Bundle (+600 Glowy, +80 â˜…)"}
                    </span>
                    <ParchmentSwitch checked={hasEventMedals} />
                  </button>

                  <p className="text-xs font-medium text-[var(--ui-text-muted)] leading-relaxed">
                    {t.ore.eventPassHint}
                  </p>
                </div>
              )}
            </div>

            {/* Reset & Remove Player Actions */}
            <div className="p-4 sm:p-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetSettings}
                className="ui-well min-h-[44px] px-3.5 py-2 text-[var(--ui-text-main)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none hover:border-[var(--ui-text-gold)]"
              >
                <RotateCcw size={14} className="text-[var(--ui-text-muted)]" />
                <span>{t.ore.resetSim}</span>
              </button>

              {importedPlayer && onClearImportedPlayer && (
                <button
                  type="button"
                  onClick={onClearImportedPlayer}
                  className="game-btn-red min-h-[44px] px-3.5 py-2 rounded-lg text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none border"
                >
                  <X size={14} />
                  <span>{isTr ? "Oyuncuyu Kaldır" : "Clear Player"}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ==================================================================
            SAÄ ALT (Desktop) / ÃœÃ‡ÃœNCÃœ (Mobile): GÃœNLÃœK VE PERÄ°YODÄ°K GELÄ°R
            ================================================================== */}
        <section className="order-3 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-2 ui-panel overflow-hidden min-w-0">
          <div className="ui-panel-header px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays
                size={16}
                className="text-[var(--ui-text-gold)] shrink-0"
              />
              <h3 className="font-game font-extrabold text-sm sm:text-base text-[var(--ui-text-main)] truncate">
                {t.ore.dailyBreakdownTitle} (TH{thLevel})
              </h3>
            </div>
            <span className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-green)] tabular-nums shrink-0">
              +{fmtNum(Math.round(estimated.dailyRates.shiny))} P / +
              {fmtNum(Math.round(estimated.dailyRates.glowy))} I / +
              {fmtDec(estimated.dailyRates.starry, 1)} Y {t.ore.perDay}
            </span>
          </div>

          {/* Mobile Stacked Rows (< md) */}
          <div className="md:hidden divide-y divide-[var(--ui-panel-border)]">
            {visibleIncomeRows.map((row) => (
              <div
                key={row.id}
                className={cn("p-4 space-y-2.5", row.dimmed && "opacity-55")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 mt-1.5",
                        row.dotClass
                      )}
                    />
                    <span className="text-xs font-bold text-[var(--ui-text-main)] leading-snug">
                      {row.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-bold shrink-0",
                      row.cadenceClass
                    )}
                  >
                    {row.cadence}
                  </span>
                </div>

                <div className="ui-well grid grid-cols-3 gap-2 p-2.5 tabular-nums">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      <ShinyOreIcon className="w-3 h-3" />
                      <span>{t.ore.shiny}</span>
                    </div>
                    <div
                      className={cn(
                        "text-xs font-bold mt-0.5",
                        row.shinyMuted
                          ? "text-[var(--ui-text-muted)]"
                          : "text-sky-400"
                      )}
                    >
                      {row.shinyPrimary}
                    </div>
                    {row.shinySub && (
                      <div className="text-[11px] text-[var(--ui-text-muted)]">
                        {row.shinySub}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      <GlowyOreIcon className="w-3 h-3" />
                      <span>{t.ore.glowy}</span>
                    </div>
                    <div className="text-xs font-bold text-orange-400 mt-0.5">
                      {row.glowyPrimary}
                    </div>
                    {row.glowySub && (
                      <div className="text-[11px] text-[var(--ui-text-muted)]">
                        {row.glowySub}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      <StarryOreIcon className="w-3 h-3" />
                      <span>{t.ore.starry}</span>
                    </div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">
                      {row.starryPrimary}
                    </div>
                    {row.starrySub && (
                      <div className="text-[11px] text-[var(--ui-text-muted)]">
                        {row.starrySub}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile Total Summary Row */}
            <div className="p-4 bg-[var(--game-dark-box-dark)] space-y-2 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[var(--ui-text-main)]">
                  {t.ore.totalDailyRow}
                </span>
                <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-muted)]">
                  {isTr ? "Sabit Hız" : "Base Daily"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs font-extrabold text-sky-400">
                  ~{fmtNum(estimated.dailyRates.shiny)} {t.ore.perDay}
                </div>
                <div className="text-xs font-extrabold text-orange-400">
                  ~{fmtNum(estimated.dailyRates.glowy)} {t.ore.perDay}
                </div>
                <div className="text-xs font-extrabold text-amber-400">
                  ~{fmtDec(estimated.dailyRates.starry, 1)} {t.ore.perDay}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop / Tablet Compact Unified Table (>= md) */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-[var(--game-dark-box-dark)] border-b border-[var(--ui-panel-border)] text-[11px] font-bold text-[var(--ui-text-muted)] tracking-wide">
                  <th className="py-2.5 pl-5 pr-2 text-[var(--ui-text-main)]">
                    {t.ore.sourceCol}
                  </th>
                  <th className="py-2.5 px-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sky-400">
                      <ShinyOreIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.ore.shiny}</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-orange-400">
                      <GlowyOreIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.ore.glowy}</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-amber-400">
                      <StarryOreIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.ore.starry}</span>
                    </div>
                  </th>
                  <th className="py-2.5 pl-2 pr-5 text-right whitespace-nowrap">
                    {isTr ? "Periyot" : "Cadence"}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--ui-panel-border)] text-xs font-semibold text-[var(--ui-text-main)]">
                {visibleIncomeRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "hover:bg-[var(--game-slot-bg-dark)] transition-colors",
                      row.dimmed && "opacity-55"
                    )}
                  >
                    <td className="py-2.5 pl-5 pr-2 align-top">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0 mt-1.5",
                            row.dotClass
                          )}
                        />
                        <span className="leading-snug">{row.label}</span>
                      </div>
                    </td>

                    <td
                      className={cn(
                        "py-2.5 px-2 font-bold align-top whitespace-nowrap",
                        row.shinyMuted
                          ? "text-[var(--ui-text-muted)] font-medium"
                          : "text-sky-400"
                      )}
                    >
                      {row.shinyPrimary}
                      {row.shinySub && (
                        <span className="text-[11px] font-medium text-[var(--ui-text-muted)] block">
                          {row.shinySub}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-orange-400 font-bold align-top whitespace-nowrap">
                      {row.glowyPrimary}
                      {row.glowySub && (
                        <span className="text-[11px] font-medium text-[var(--ui-text-muted)] block">
                          {row.glowySub}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-amber-400 font-bold align-top whitespace-nowrap">
                      {row.starryPrimary}
                      {row.starrySub && (
                        <span className="text-[11px] font-medium text-[var(--ui-text-muted)] block">
                          {row.starrySub}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 pl-2 pr-5 text-right align-top whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-bold inline-block",
                          row.cadenceClass
                        )}
                      >
                        {row.cadence}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Footer Row: TOTAL DAILY RATE */}
                <tr className="bg-[var(--game-dark-box-dark)] text-xs font-extrabold border-t border-[var(--ui-panel-border)]">
                  <td className="py-3 pl-5 pr-2 text-[var(--ui-text-main)]">
                    {t.ore.totalDailyRow}
                  </td>
                  <td className="py-3 px-2 text-sky-400 whitespace-nowrap">
                    ~{fmtNum(estimated.dailyRates.shiny)} {t.ore.perDay}
                  </td>
                  <td className="py-3 px-2 text-orange-400 whitespace-nowrap">
                    ~{fmtNum(estimated.dailyRates.glowy)} {t.ore.perDay}
                  </td>
                  <td className="py-3 px-2 text-amber-400 whitespace-nowrap">
                    ~{fmtDec(estimated.dailyRates.starry, 1)} {t.ore.perDay}
                  </td>
                  <td className="py-3 pl-2 pr-5 text-right whitespace-nowrap">
                    <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-muted)]">
                      {isTr ? "Sabit Hız" : "Base Daily"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ==================================================================
            ALT TAM GENÄ°ÅLÄ°K: Ä°Ã‡E AKTARILAN EKÄ°PMANLAR (Varsa)
            ================================================================== */}
        {importedPlayer && activeDeficitAndItems.items.length > 0 && (
          <section className="order-4 lg:order-none lg:col-span-12 ui-panel overflow-hidden min-w-0">
            <div className="ui-panel-header px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Swords
                  size={16}
                  className="text-[var(--ui-text-gold)] shrink-0"
                />
                <h2 className="font-game font-extrabold text-sm sm:text-base text-[var(--ui-text-main)] truncate">
                  {importedPlayer.name} — {t.ore.equipRemainingTitle}
                </h2>
              </div>
              <span className="ui-pill text-xs font-semibold px-2.5 py-0.5 text-[var(--ui-text-muted)] tabular-nums shrink-0">
                {activeDeficitAndItems.items.length}{" "}
                {isTr ? "Ekipman" : "Items"}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {activeDeficitAndItems.items.map((item) => {
                  const isItemMaxed = item.level >= item.targetLevel;
                  return (
                    <div
                      key={item.name}
                      className={cn(
                        "ui-well p-3 flex flex-col justify-between gap-2.5",
                        item.isEpic && "border-[var(--ui-text-gold)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UnitIcon
                            name={item.name}
                            size="xs"
                            isEpic={item.isEpic}
                          />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)] truncate">
                              {item.name}
                            </div>
                            <span
                              className={cn(
                                "inline-block text-[11px] font-semibold px-1.5 py-0.5 mt-0.5",
                                item.isEpic
                                  ? ORE_STYLES.starry.pillClass
                                  : ORE_STYLES.shiny.pillClass
                              )}
                            >
                              {item.isEpic
                                ? t.ore.epicRarity
                                : t.ore.commonRarity}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "ui-pill text-xs font-bold px-2 py-0.5 shrink-0 tabular-nums",
                            isItemMaxed
                              ? "text-[var(--ui-text-green)]"
                              : item.isEpic
                              ? "text-amber-400"
                              : "text-[var(--ui-text-muted)]"
                          )}
                        >
                          Lv.{item.level} â†’ {item.targetLevel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--ui-panel-border)] flex-wrap">
                        <OreBadge type="shiny" amount={item.shiny} />
                        <OreBadge type="glowy" amount={item.glowy} />
                        {item.isEpic ? (
                          <OreBadge type="starry" amount={item.starry} />
                        ) : (
                          <span className="text-xs font-semibold text-[var(--ui-text-muted)] px-1.5 tabular-nums">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
