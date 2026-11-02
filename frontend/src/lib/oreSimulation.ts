/**
 * Ore Progression Pure Simulation Engine
 * =======================================
 * Deterministic calendar-aware simulation of ore accumulation across 3 scenarios:
 *   - Minimum (Optimistic): All wars won, maximum rewards, raid active.
 *   - Estimated (User Settings): Exact player configuration.
 *   - Maximum (Pessimistic): All wars lost, half reward floor, free event only.
 *
 * Ore Order: (Shiny, Glowy, Starry)
 */

import { OreCost } from "@/lib/equipmentCosts";
import {
  CWL_WAR_COUNT,
  DEFAULT_CW_WARS_MONTHLY,
  DEFAULT_CW_WIN_ORE,
  DEFAULT_CWL_WIN_ORE,
  DEFAULT_LEAGUE_TIER_ID,
  EPIC_CYCLE_MONTHS,
  EPIC_FULL_MAX_COST,
  EVENT_FREE_PLAN_ORE,
  MAX_CW_WARS_MONTHLY,
  WEEKLY_RAID_MEDALS_ORE,
  computeCwLossOre,
  computeCwlLossOre,
  computeSingleEventOre,
  getLeagueTierById,
} from "@/lib/gemIncomeConfig";

export interface SimulationOreSettings {
  leagueTierId: number;
  monthlyCwCount: number;
  cwWinCount: number;
  cwWinReward: OreCost;
  participatesCwl: boolean;
  cwlWinCount: number;
  cwlWinReward: OreCost;
  includeRaidMedals: boolean;
  inventory: OreCost;
  includeFutureEpics: boolean;
  hasEventPass: boolean;
  hasEventMedals: boolean;
}

export interface ScenarioResult {
  scenarioName: "min" | "estimated" | "max";
  daysToComplete: number;
  targetDate: Date;
  targetDateStr: string;
  bottleneckOre: "shiny" | "glowy" | "starry";
  daysShiny: number;
  daysGlowy: number;
  daysStarry: number;
  initialDeficit: OreCost;
  inventory: OreCost;
  netNeeded: OreCost;
  totalNeeded: OreCost;
  totalAccumulated: OreCost;
  dailyRates: OreCost;
  isCompletedToday: boolean;
}

export function getDefaultSimulationSettings(): SimulationOreSettings {
  return {
    leagueTierId: DEFAULT_LEAGUE_TIER_ID,
    monthlyCwCount: DEFAULT_CW_WARS_MONTHLY,
    cwWinCount: DEFAULT_CW_WARS_MONTHLY,
    cwWinReward: { ...DEFAULT_CW_WIN_ORE },
    participatesCwl: true,
    cwlWinCount: CWL_WAR_COUNT,
    cwlWinReward: { ...DEFAULT_CWL_WIN_ORE },
    includeRaidMedals: true,
    inventory: { shiny: 0, glowy: 0, starry: 0 },
    includeFutureEpics: true,
    hasEventPass: false,
    hasEventMedals: false,
  };
}

export function simulateOreScenario(
  baseDeficit: OreCost,
  settings: SimulationOreSettings,
  scenarioType: "min" | "estimated" | "max" = "estimated",
  startDate: Date = new Date(),
  maxSimulationDays: number = 5000
): ScenarioResult {
  const inv = settings.inventory || { shiny: 0, glowy: 0, starry: 0 };
  const netShiny = Math.max(0, (baseDeficit.shiny || 0) - (inv.shiny || 0));
  const netGlowy = Math.max(0, (baseDeficit.glowy || 0) - (inv.glowy || 0));
  const netStarry = Math.max(0, (baseDeficit.starry || 0) - (inv.starry || 0));
  const netNeeded: OreCost = { shiny: netShiny, glowy: netGlowy, starry: netStarry };

  // If already zero and no future epics, complete today
  if (
    netShiny === 0 &&
    netGlowy === 0 &&
    netStarry === 0 &&
    !settings.includeFutureEpics
  ) {
    return {
      scenarioName: scenarioType,
      daysToComplete: 0,
      targetDate: startDate,
      targetDateStr: "Bugün",
      bottleneckOre: "shiny",
      daysShiny: 0,
      daysGlowy: 0,
      daysStarry: 0,
      initialDeficit: baseDeficit,
      inventory: inv,
      netNeeded,
      totalNeeded: netNeeded,
      totalAccumulated: { shiny: 0, glowy: 0, starry: 0 },
      dailyRates: { shiny: 0, glowy: 0, starry: 0 },
      isCompletedToday: true,
    };
  }

  // 1. League Star Bonus daily rate
  const leagueTier = getLeagueTierById(settings.leagueTierId);
  const dailyStarShiny = leagueTier.dailyShiny;
  const dailyStarGlowy = leagueTier.dailyGlowy;
  const dailyStarStarry = leagueTier.dailyStarry;

  // 2. Regular Clan War
  const cwCount = Math.max(0, Math.min(MAX_CW_WARS_MONTHLY, settings.monthlyCwCount));
  const cwWinReward = settings.cwWinReward || DEFAULT_CW_WIN_ORE;
  const cwLossReward = computeCwLossOre(cwWinReward);

  let cwWins = 0;
  let cwLosses = 0;
  if (scenarioType === "min") {
    cwWins = cwCount;
    cwLosses = 0;
  } else if (scenarioType === "max") {
    cwWins = 0;
    cwLosses = cwCount;
  } else {
    cwWins = Math.max(0, Math.min(cwCount, settings.cwWinCount));
    cwLosses = cwCount - cwWins;
  }

  const monthlyCwShiny = cwWins * cwWinReward.shiny + cwLosses * cwLossReward.shiny;
  const monthlyCwGlowy = cwWins * cwWinReward.glowy + cwLosses * cwLossReward.glowy;
  const monthlyCwStarry = cwWins * cwWinReward.starry + cwLosses * cwLossReward.starry;

  // 3. CWL
  let monthlyCwlShiny = 0;
  let monthlyCwlGlowy = 0;
  let monthlyCwlStarry = 0;

  if (settings.participatesCwl) {
    const cwlWinReward = settings.cwlWinReward || DEFAULT_CWL_WIN_ORE;
    const cwlLossReward = computeCwlLossOre(cwlWinReward);

    let cwlWins = 0;
    let cwlLosses = 0;
    if (scenarioType === "min") {
      cwlWins = CWL_WAR_COUNT;
      cwlLosses = 0;
    } else if (scenarioType === "max") {
      cwlWins = 0;
      cwlLosses = CWL_WAR_COUNT;
    } else {
      cwlWins = Math.max(0, Math.min(CWL_WAR_COUNT, settings.cwlWinCount));
      cwlLosses = CWL_WAR_COUNT - cwlWins;
    }

    monthlyCwlShiny = cwlWins * cwlWinReward.shiny + cwlLosses * cwlLossReward.shiny;
    monthlyCwlGlowy = cwlWins * cwlWinReward.glowy + cwlLosses * cwlLossReward.glowy;
    monthlyCwlStarry = cwlWins * cwlWinReward.starry + cwlLosses * cwlLossReward.starry;
  }

  // 4. Raid Medals (Weekly)
  const raidDailyGlowy =
    settings.includeRaidMedals && scenarioType !== "max"
      ? WEEKLY_RAID_MEDALS_ORE.glowy / 7.0
      : 0;
  const raidDailyStarry =
    settings.includeRaidMedals && scenarioType !== "max"
      ? WEEKLY_RAID_MEDALS_ORE.starry / 7.0
      : 0;

  // Event Rewards accompanying bi-monthly epic releases
  let eventOre: OreCost;
  if (scenarioType === "max") {
    eventOre = EVENT_FREE_PLAN_ORE;
  } else if (scenarioType === "min") {
    eventOre = computeSingleEventOre(
      Boolean(settings.hasEventPass),
      Boolean(settings.hasEventMedals)
    );
  } else {
    eventOre = computeSingleEventOre(
      settings.hasEventPass,
      settings.hasEventMedals
    );
  }

  // Nominal daily rate
  const dailyRates: OreCost = {
    shiny: Math.round(dailyStarShiny + monthlyCwShiny / 30.0 + monthlyCwlShiny / 30.0),
    glowy: Math.round(dailyStarGlowy + monthlyCwGlowy / 30.0 + monthlyCwlGlowy / 30.0 + raidDailyGlowy),
    starry: Number(
      (dailyStarStarry + monthlyCwStarry / 30.0 + monthlyCwlStarry / 30.0 + raidDailyStarry).toFixed(1)
    ),
  };

  // Day-by-day accumulation
  let accShiny = 0;
  let accGlowy = 0;
  let accStarry = 0;

  let currTargetShiny = netShiny;
  let currTargetGlowy = netGlowy;
  let currTargetStarry = netStarry;

  let lastUnmetShiny = netShiny === 0 ? 0 : 1;
  let lastUnmetGlowy = netGlowy === 0 ? 0 : 1;
  let lastUnmetStarry = netStarry === 0 ? 0 : 1;

  const injectedMonthKeys = new Set<string>();
  let totalEpicAddedShiny = 0;
  let totalEpicAddedGlowy = 0;
  let totalEpicAddedStarry = 0;

  for (let day = 1; day <= maxSimulationDays; day++) {
    const currDate = new Date(startDate.getTime());
    currDate.setDate(currDate.getDate() + day);

    const monthKey = `${currDate.getFullYear()}-${currDate.getMonth() + 1}`;

    // Bi-monthly epic injection & event check on the 1st of cycle months (Feb, Apr, Jun, Aug, Oct, Dec)
    if (
      currDate.getDate() === 1 &&
      EPIC_CYCLE_MONTHS.includes(currDate.getMonth() + 1) &&
      !injectedMonthKeys.has(monthKey)
    ) {
      injectedMonthKeys.add(monthKey);
      if (settings.includeFutureEpics) {
        currTargetShiny += EPIC_FULL_MAX_COST.shiny;
        currTargetGlowy += EPIC_FULL_MAX_COST.glowy;
        currTargetStarry += EPIC_FULL_MAX_COST.starry;

        totalEpicAddedShiny += EPIC_FULL_MAX_COST.shiny;
        totalEpicAddedGlowy += EPIC_FULL_MAX_COST.glowy;
        totalEpicAddedStarry += EPIC_FULL_MAX_COST.starry;

        accShiny += eventOre.shiny;
        accGlowy += eventOre.glowy;
        accStarry += eventOre.starry;
      }
    }

    // Daily income
    accShiny += dailyStarShiny + monthlyCwShiny / 30.0 + monthlyCwlShiny / 30.0;
    accGlowy += dailyStarGlowy + monthlyCwGlowy / 30.0 + monthlyCwlGlowy / 30.0 + raidDailyGlowy;
    accStarry += dailyStarStarry + monthlyCwStarry / 30.0 + monthlyCwlStarry / 30.0 + raidDailyStarry;

    if (accShiny < currTargetShiny) lastUnmetShiny = day;
    if (accGlowy < currTargetGlowy) lastUnmetGlowy = day;
    if (accStarry < currTargetStarry) lastUnmetStarry = day;

    if (
      accShiny >= currTargetShiny &&
      accGlowy >= currTargetGlowy &&
      accStarry >= currTargetStarry
    ) {
      break;
    }
  }

  const daysShiny = netShiny === 0 && totalEpicAddedShiny === 0 ? 0 : lastUnmetShiny;
  const daysGlowy = netGlowy === 0 && totalEpicAddedGlowy === 0 ? 0 : lastUnmetGlowy;
  const daysStarry = netStarry === 0 && totalEpicAddedStarry === 0 ? 0 : lastUnmetStarry;

  const totalDays = Math.max(daysShiny, daysGlowy, daysStarry);
  const targetDate = new Date(startDate.getTime());
  targetDate.setDate(targetDate.getDate() + totalDays);

  const targetDateStr =
    totalDays === 0
      ? "Bugün"
      : targetDate.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  let bottleneckOre: "shiny" | "glowy" | "starry" = "starry";
  if (daysShiny >= daysGlowy && daysShiny >= daysStarry) {
    bottleneckOre = "shiny";
  } else if (daysGlowy >= daysShiny && daysGlowy >= daysStarry) {
    bottleneckOre = "glowy";
  } else {
    bottleneckOre = "starry";
  }

  return {
    scenarioName: scenarioType,
    daysToComplete: totalDays,
    targetDate,
    targetDateStr,
    bottleneckOre,
    daysShiny,
    daysGlowy,
    daysStarry,
    initialDeficit: baseDeficit,
    inventory: inv,
    netNeeded,
    totalNeeded: {
      shiny: netShiny + totalEpicAddedShiny,
      glowy: netGlowy + totalEpicAddedGlowy,
      starry: netStarry + totalEpicAddedStarry,
    },
    totalAccumulated: {
      shiny: Math.round(accShiny),
      glowy: Math.round(accGlowy),
      starry: Math.round(accStarry),
    },
    dailyRates,
    isCompletedToday: totalDays === 0,
  };
}

export function simulateAllOreScenarios(
  baseDeficit: OreCost,
  settings: SimulationOreSettings,
  startDate: Date = new Date()
): Record<"min" | "estimated" | "max", ScenarioResult> {
  return {
    min: simulateOreScenario(baseDeficit, settings, "min", startDate),
    estimated: simulateOreScenario(baseDeficit, settings, "estimated", startDate),
    max: simulateOreScenario(baseDeficit, settings, "max", startDate),
  };
}

