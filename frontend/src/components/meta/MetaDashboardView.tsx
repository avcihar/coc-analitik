"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Swords,
  Crown,
  Castle,
  Zap,
  Shield,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import {
  GameButton,
  GamePanel,
  GameTabBar,
  GameTab,
  IconFrame,
  SkeletonBlock,
  StatPill,
} from "@/components/game";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type EquipmentRarityKind = "common" | "epic";

const ALL_HERO_FILTER = "ALL";

interface EquipmentPairStat {
  hero: string;
  pair: string;
  equipments: string[];
  count: number;
  usagePct: number;
}

interface PetStat {
  hero?: string;
  name: string;
  count: number;
  usagePct: number;
  avgLevel?: number | null;
  levelSource?: string | null;
}

interface UnitUsageStat {
  name: string;
  count: number;
  usagePct: number;
  maxedPct?: number;
  avgLevel?: number;
}

interface HeroUsageStat {
  name: string;
  count: number;
  usagePct: number;
  avgLevel?: number | null;
  maxedPct?: number;
  maxedCount?: number;
}

interface RecommendedArmy {
  id: string;
  rank: number;
  name: string;
  townHallLevel: number;
  style: string;
  sampleCount?: number;
  threeStarCount?: number;
  avgDestructionPct?: number;
  usagePct: number;
  threeStarRatePct: number;
  totalTroopHousing?: number;
  totalSpellSpace?: number;
  heroLoadout: Record<
    string,
    {
      primaryPair: string[];
      pet?: string | null;
    }
  >;
  troops: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
    totalHousingSpace?: number;
  }[];
  spells: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
    totalSpellSpace?: number;
  }[];
  siegeMachines?: {
    id: number;
    name: string;
    count: number;
  }[];
  clanCastle?: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
  }[];
  armyShareCode: string;
  copyArmyLink?: string;
  armyLink?: string;
}

interface MetaDashboardPayload {
  status: string;
  sampleSize: number;
  totalPlayersAnalyzed: number;
  filteredPlayersCount: number;
  failedPlayersCount: number;
  totalRankedAttacksAnalyzed: number;
  totalBattlesAnalyzed?: number;
  dataFetchedAt: string;
  townHallFilter: number;
  hasSufficientData?: boolean;
  isProcessing?: boolean;
  progress?: {
    processed: number;
    target: number;
    percentage: number;
    message: string;
  };
  statistics?: {
    hasSufficientData?: boolean;
    heroUsage?: HeroUsageStat[];
    heroEquipmentPairs?: EquipmentPairStat[];
    equipmentByHero?: Record<string, EquipmentPairStat[]>;
    equipmentUsage?: { hero: string; name: string; count: number; usagePct: number }[];
    petUsage?: PetStat[];
    petUsageByHero?: Record<string, PetStat[]>;
    superTroopUsage?: { name: string; count: number; usagePct: number }[];
    troopUsage?: UnitUsageStat[];
    spellUsage?: UnitUsageStat[];
    siegeUsage?: UnitUsageStat[];
    townHallDistribution?: Record<string, number>;
  };
  metaArmies?: {
    topRecommendations?: RecommendedArmy[];
    recommendationsByTownHall?: Record<string, RecommendedArmy[]>;
  };
}

// Canonical Item Definitions matching official icons in frontend/public/icons/
// Rarity verified against armyLink.ts (EQUIPMENT_BY_ID) and inference.py (EQUIPMENT_BY_HERO)
const CANONICAL_EQUIPMENTS: {
  hero: string;
  name: string;
  rarity: EquipmentRarityKind;
}[] = [
  // Barbarian King (8)
  { hero: "Barbarian King", name: "Barbarian Puppet", rarity: "common" },
  { hero: "Barbarian King", name: "Rage Vial", rarity: "common" },
  { hero: "Barbarian King", name: "Earthquake Boots", rarity: "common" },
  { hero: "Barbarian King", name: "Vampstache", rarity: "common" },
  { hero: "Barbarian King", name: "Giant Gauntlet", rarity: "epic" },
  { hero: "Barbarian King", name: "Spiky Ball", rarity: "epic" },
  { hero: "Barbarian King", name: "Snake Bracelet", rarity: "epic" },
  { hero: "Barbarian King", name: "Stick Horse", rarity: "epic" },
  // Archer Queen (8)
  { hero: "Archer Queen", name: "Archer Puppet", rarity: "common" },
  { hero: "Archer Queen", name: "Invisibility Vial", rarity: "common" },
  { hero: "Archer Queen", name: "Giant Arrow", rarity: "common" },
  { hero: "Archer Queen", name: "Healer Puppet", rarity: "common" },
  { hero: "Archer Queen", name: "Frozen Arrow", rarity: "epic" },
  { hero: "Archer Queen", name: "Magic Mirror", rarity: "epic" },
  { hero: "Archer Queen", name: "Action Figure", rarity: "epic" },
  { hero: "Archer Queen", name: "Monolith Arrow", rarity: "common" },
  // Grand Warden (7)
  { hero: "Grand Warden", name: "Eternal Tome", rarity: "common" },
  { hero: "Grand Warden", name: "Life Gem", rarity: "common" },
  { hero: "Grand Warden", name: "Rage Gem", rarity: "common" },
  { hero: "Grand Warden", name: "Healing Tome", rarity: "common" },
  { hero: "Grand Warden", name: "Fireball", rarity: "epic" },
  { hero: "Grand Warden", name: "Heroic Torch", rarity: "epic" },
  { hero: "Grand Warden", name: "Lavaloon Puppet", rarity: "epic" },
  // Royal Champion (7)
  { hero: "Royal Champion", name: "Seeking Shield", rarity: "common" },
  { hero: "Royal Champion", name: "Royal Gem", rarity: "common" },
  { hero: "Royal Champion", name: "Haste Vial", rarity: "common" },
  { hero: "Royal Champion", name: "Hog Rider Puppet", rarity: "common" },
  { hero: "Royal Champion", name: "Rocket Spear", rarity: "epic" },
  { hero: "Royal Champion", name: "Electro Boots", rarity: "epic" },
  { hero: "Royal Champion", name: "Frost Flake", rarity: "epic" },
  // Minion Prince (7)
  { hero: "Minion Prince", name: "Dark Crown", rarity: "epic" },
  { hero: "Minion Prince", name: "Dark Orb", rarity: "common" },
  { hero: "Minion Prince", name: "Henchmen Puppet", rarity: "common" },
  { hero: "Minion Prince", name: "Metal Pants", rarity: "common" },
  { hero: "Minion Prince", name: "Meteor Staff", rarity: "epic" },
  { hero: "Minion Prince", name: "Noble Iron", rarity: "common" },
  { hero: "Minion Prince", name: "Portal Pendant", rarity: "epic" },
  // Dragon Duke (6)
  { hero: "Dragon Duke", name: "Electro Fangs", rarity: "epic" },
  { hero: "Dragon Duke", name: "Fire Heart", rarity: "common" },
  { hero: "Dragon Duke", name: "Flame Blower", rarity: "common" },
  { hero: "Dragon Duke", name: "Revenge Deck", rarity: "epic" },
  { hero: "Dragon Duke", name: "Rocket Backpack", rarity: "epic" },
  { hero: "Dragon Duke", name: "Stun Blaster", rarity: "common" },
];

const EQUIPMENT_RARITY_BY_NAME: Record<string, EquipmentRarityKind> = Object.fromEntries(
  CANONICAL_EQUIPMENTS.map((eq) => [eq.name.trim().toLowerCase(), eq.rarity])
);

function resolveEquipmentRarity(
  equipmentName?: string | null,
  parsedArmy?: DecodedArmyShare | null
): EquipmentRarityKind {
  const key = (equipmentName || "").trim().toLowerCase();
  if (!key) return "common";

  if (parsedArmy?.heroes?.length) {
    for (const hero of parsedArmy.heroes) {
      const matched = hero.equipment.find(
        (eq) => (eq.name || "").trim().toLowerCase() === key && !eq.unknown
      );
      if (matched?.rarity) {
        return matched.rarity.toLowerCase() === "epic" ? "epic" : "common";
      }
    }
  }

  return EQUIPMENT_RARITY_BY_NAME[key] ?? "common";
}

function getEquipmentFrameClass(rarity: EquipmentRarityKind): string {
  return rarity === "epic" ? "!border-[#EAB308]" : "!border-[#78716C]";
}

const CANONICAL_PETS: string[] = [
  "L.A.S.S.I",
  "Mighty Yak",
  "Electro Owl",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Spirit Fox",
  "Angry Jelly",
  "Sneezy",
  "Greedy Raven",
];

const CANONICAL_SIEGES: string[] = [
  "Wall Wrecker",
  "Battle Blimp",
  "Stone Slammer",
  "Siege Barracks",
  "Log Launcher",
  "Flame Flinger",
  "Battle Drill",
  "Troop Launcher",
  "Sky Wagon",
];

const CANONICAL_SPELLS: string[] = [
  "Lightning Spell",
  "Healing Spell",
  "Rage Spell",
  "Jump Spell",
  "Freeze Spell",
  "Clone Spell",
  "Invisibility Spell",
  "Recall Spell",
  "Revive Spell",
  "Overgrowth Spell",
  "Poison Spell",
  "Earthquake Spell",
  "Haste Spell",
  "Skeleton Spell",
  "Bat Spell",
  "Ice Block Spell",
  "Totem Spell",
];

const CANONICAL_TROOPS: string[] = [
  // Regular Elixir Troops (19)
  "Barbarian",
  "Archer",
  "Giant",
  "Goblin",
  "Wall Breaker",
  "Balloon",
  "Wizard",
  "Healer",
  "Dragon",
  "P.E.K.K.A",
  "Baby Dragon",
  "Miner",
  "Electro Dragon",
  "Yeti",
  "Dragon Rider",
  "Electro Titan",
  "Root Rider",
  "Thrower",
  "Meteor Golem",
  // Regular Dark Elixir Troops (13)
  "Minion",
  "Hog Rider",
  "Valkyrie",
  "Golem",
  "Witch",
  "Lava Hound",
  "Bowler",
  "Ice Golem",
  "Headhunter",
  "Apprentice Warden",
  "Druid",
  "Furnace",
  "Ruin Witch",
];

const CANONICAL_SUPER_TROOPS: string[] = [
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
];

// Single Army Card Component matching in-game "Ordum -> Kaydedilen Setler"
function MetaArmyCard({
  army,
  defaultExpanded = false,
}: {
  army: RecommendedArmy;
  defaultExpanded?: boolean;
}) {
  const { locale, isTr, t, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const shareCode = army.armyShareCode || army.armyLink || "";
  const copyUrl = army.copyArmyLink || buildCopyArmyLink(shareCode);
  const bodyId = `meta-army-body-${army.id}`;

  const parsedArmy = useMemo(
    () => (shareCode ? parseArmyShareCode(shareCode, locale) : null),
    [shareCode, locale]
  );

  // Real housing space & capacity calculations (parsedArmy via armyLink registries + backend field fallback)
  const fallbackTroopHousing = (army.troops || []).reduce((acc, item) => {
    if (typeof item.totalHousingSpace === "number" && item.totalHousingSpace > 0) {
      return acc + item.totalHousingSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalTroopHousing =
    (parsedArmy && parsedArmy.totalTroopHousing > 0 ? parsedArmy.totalTroopHousing : null) ??
    (typeof army.totalTroopHousing === "number" && army.totalTroopHousing > 0
      ? army.totalTroopHousing
      : null) ??
    fallbackTroopHousing;

  const fallbackSpellSpace = (army.spells || []).reduce((acc, item) => {
    if (typeof item.totalSpellSpace === "number" && item.totalSpellSpace > 0) {
      return acc + item.totalSpellSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalSpellSpace =
    (parsedArmy && parsedArmy.totalSpellSpace > 0 ? parsedArmy.totalSpellSpace : null) ??
    (typeof army.totalSpellSpace === "number" && army.totalSpellSpace > 0
      ? army.totalSpellSpace
      : null) ??
    fallbackSpellSpace;

  const backendSiegeUnits = (army.siegeMachines || []).reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const parsedSiegeUnits = (parsedArmy?.siegeMachines || []).reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const totalSiegeUnits = backendSiegeUnits > 0 ? backendSiegeUnits : parsedSiegeUnits;

  const parsedCcTroopSpace = (parsedArmy?.clanCastleTroops || []).reduce(
    (acc, item) =>
      acc +
      (item.totalHousingSpace ??
        ((item.housingSpace || 0) * (item.count || 0))),
    0
  );
  const parsedCcSpellSpace = (parsedArmy?.clanCastleSpells || []).reduce(
    (acc, item) =>
      acc +
      (item.totalSpellSpace ??
        ((item.housingSpace || 0) * (item.count || 0))),
    0
  );
  const backendCcHousing = (army.clanCastle || []).reduce(
    (acc, cc) =>
      acc +
      (typeof cc.housingSpace === "number" && cc.housingSpace > 0
        ? cc.housingSpace * (cc.count || 0)
        : 0),
    0
  );
  const totalCCUnits = (army.clanCastle || []).reduce(
    (acc, cc) => acc + (cc.count || 0),
    0
  );
  const ccTroopOrTotalSpace =
    parsedCcTroopSpace > 0
      ? parsedCcTroopSpace
      : backendCcHousing > 0
      ? backendCcHousing
      : totalCCUnits;
  const ccDisplayValue =
    parsedCcSpellSpace > 0
      ? `${fmtNum(ccTroopOrTotalSpace)} + ${fmtNum(parsedCcSpellSpace)}`
      : fmtNum(ccTroopOrTotalSpace);

  const hasLoadout = army.heroLoadout && Object.keys(army.heroLoadout).length > 0;
  const hasRecordCount = typeof army.sampleCount === "number" && army.sampleCount > 0;

  return (
    <GamePanel
      variant="wood"
      className="transition-all"
      headerClassName="flex-wrap gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 [&>div:first-child]:basis-full sm:[&>div:first-child]:basis-0"
      onHeaderClick={() => setIsExpanded((prev) => !prev)}
      title={
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2.5 sm:gap-5 min-w-0">
          {/* Left: #1 • Army Name + real record count */}
          <div className="min-w-0 max-w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="game-title-stroke font-game font-extrabold text-base sm:text-lg md:text-xl tracking-wide break-words">
                #{army.rank} • {army.name}
              </span>
            </div>
            {hasRecordCount && (
              <div className="text-xs text-amber-200/80 font-semibold mt-0.5 tabular-nums">
                {fmtTemplate(t.meta.recordsCount, {
                  count: fmtNum(army.sampleCount as number),
                })}
              </div>
            )}
          </div>

          {/* Center: Wrapping Stat Boxes */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Box 1: Usage Rate */}
            <div className="game-stat-box">
              <span className="text-xs text-amber-200/90 font-bold uppercase tracking-wider">
                {t.meta.usageLabel}
              </span>
              <span className="font-game text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                {fmtPct(army.usagePct, 1)}
              </span>
            </div>

            {/* Box 2: 3-Star Rate */}
            <div className="game-stat-box">
              <span className="text-xs text-emerald-200/90 font-bold uppercase tracking-wider">
                {t.meta.threeStarLabel}
              </span>
              <span className="font-game text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums">
                {fmtPct(army.threeStarRatePct, 1)}
              </span>
            </div>
          </div>
        </div>
      }
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <GameButton
            variant="green"
            size="md"
            href={copyUrl || undefined}
            target={copyUrl ? "_blank" : undefined}
            disabled={!copyUrl}
            icon={<ExternalLink size={16} />}
            className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap shrink-0"
            title={t.meta.copyTooltip}
          >
            {t.meta.copyArmy}
          </GameButton>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            aria-label={
              isExpanded
                ? isTr
                  ? "Ordu detaylarını daralt"
                  : "Collapse army details"
                : isTr
                ? "Ordu detaylarını genişlet"
                : "Expand army details"
            }
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-[#2B1F16]/85 hover:bg-[#3E2B1E] active:scale-95 border-2 border-[#4A2E1E] text-amber-200 transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown
              size={20}
              className={cn(
                "transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </div>
      }
    >
      {isExpanded && (
        <div id={bodyId} className="space-y-2.5">
          {/* Real Capacity Row */}
          <div className="flex flex-wrap items-center gap-2">
            <StatPill
              variant="amber"
              icon={<Swords size={12} className="text-amber-300" />}
              label={t.meta.troopCapLabel}
              value={fmtNum(totalTroopHousing)}
              title={t.meta.troopCapLabel}
            />
            <StatPill
              variant="copper"
              icon={<Zap size={12} className="text-orange-300" />}
              label={t.meta.spellCapLabel}
              value={fmtNum(totalSpellSpace)}
              title={t.meta.spellCapLabel}
            />
            <StatPill
              variant="amber"
              icon={<Shield size={12} className="text-amber-400" />}
              label={t.meta.siegeCapLabel}
              value={fmtNum(totalSiegeUnits)}
              title={t.meta.siegeCapLabel}
            />
            <StatPill
              variant="green"
              icon={<Castle size={12} className="text-emerald-300" />}
              label={t.meta.ccCapLabel}
              value={ccDisplayValue}
              title={t.meta.ccCapLabel}
            />
          </div>

          {/* Unified Row 1 Box: Troops + Spells + Siege Machines */}
          <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1 w-full">
            <div
              className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
              title={t.meta.sectionAttack}
            >
              <Swords size={14} />
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
              {army.troops?.map((troop, idx) => (
                <IconFrame
                  key={`troop-${troop.id}-${idx}`}
                  name={troop.name}
                  count={troop.count}
                  size="unit"
                />
              ))}

              {army.spells && army.spells.length > 0 && (
                <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-amber-950/70 my-auto mx-0.5 shrink-0" />
              )}

              {army.spells?.map((spell, idx) => (
                <IconFrame
                  key={`spell-${spell.id}-${idx}`}
                  name={spell.name}
                  count={spell.count}
                  size="unit"
                />
              ))}

              {army.siegeMachines && army.siegeMachines.length > 0 && (
                <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-amber-950/70 my-auto mx-0.5 shrink-0" />
              )}

              {army.siegeMachines?.map((sg, idx) => (
                <IconFrame
                  key={`siege-${sg.id}-${idx}`}
                  name={sg.name}
                  count={sg.count}
                  size="unit"
                />
              ))}
            </div>
          </div>

          {/* Row 2: Heroes & Clan Castle */}
          <div className="flex flex-col lg:flex-row items-stretch gap-2.5 w-full">
            {hasLoadout && (
              <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1 w-full min-w-0 flex-1">
                <div
                  className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
                  title={t.meta.sectionHeroes}
                >
                  <Crown size={14} />
                </div>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {Object.entries(army.heroLoadout).map(([heroName, loadout]) => (
                    <div
                      key={heroName}
                      className="flex items-center gap-1 p-0.5 rounded-lg bg-[#2B1F16]/80 border border-[#4A2E1E]"
                    >
                      <IconFrame name={heroName} size="hero" />

                      <div className="flex flex-col gap-0.5 justify-between h-[44px] sm:h-[50px] md:h-[56px] lg:h-[58px]">
                        <div className="flex items-center gap-0.5">
                          {loadout.primaryPair.slice(0, 2).map((eq, eIdx) => {
                            const eqRarity = resolveEquipmentRarity(eq, parsedArmy);
                            return (
                              <IconFrame
                                key={`${heroName}-eq-${eIdx}`}
                                name={eq}
                                size="equipment"
                                tileType="equipment"
                                rarity={eqRarity}
                                className={getEquipmentFrameClass(eqRarity)}
                              />
                            );
                          })}
                        </div>
                        {loadout.pet && (
                          <IconFrame
                            name={loadout.pet}
                            size="pet"
                            rarity="legendary"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {army.clanCastle && army.clanCastle.length > 0 && (
              <div className="game-cc-well flex items-stretch gap-1 sm:gap-1.5 p-1 w-full lg:w-auto min-w-0 shrink-0">
                <div
                  className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
                  title={t.meta.sectionCC}
                >
                  <Castle size={14} />
                </div>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {army.clanCastle.map((cc, idx) => (
                    <IconFrame
                      key={`cc-${cc.id}-${idx}`}
                      name={cc.name}
                      count={cc.count}
                      size="unit"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GamePanel>
  );
}

export default function MetaDashboardView() {
  const {
    locale,
    isTr,
    t,
    fmtNum,
    fmtPct,
    fmtTime,
    fmtTemplate,
    getApiErrorMessage,
  } = useLanguage();

  const [activeTab, setActiveTab] = useState<"armies" | "stats">("armies");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<unknown>(null);
  const [dashboard, setDashboard] = useState<MetaDashboardPayload | null>(null);

  // Phase 2 State (Usage Statistics)
  const [selectedHeroEqFilter, setSelectedHeroEqFilter] = useState<string>(ALL_HERO_FILTER);
  const [unitCategoryTab, setUnitCategoryTab] = useState<
    "troops" | "spells" | "siege" | "super"
  >("troops");

  const errorMsg = fetchError ? getApiErrorMessage(fetchError, t.meta.errorLoad) : null;

  // Sync tab with URL hash parameter (e.g. #/meta?tab=stats or #/meta?tab=armies)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes("tab=stats")) {
        setActiveTab("stats");
      } else if (hash.includes("tab=armies")) {
        setActiveTab("armies");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const switchTab = (tab: "armies" | "stats") => {
    setActiveTab(tab);
    const base = window.location.hash.split("?")[0] || "#/meta";
    window.location.hash = `${base}?tab=${tab}`;
  };

  const fetchDashboard = useCallback(async (force = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await safeFetchJson<MetaDashboardPayload>(
        `/api/v1/meta/top-analysis?sample_size=200&town_hall=18&force_refresh=${force}`
      );
      setDashboard(data);
    } catch (err: unknown) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // Poll every 3500ms while backend scanning/assembling is in progress
  useEffect(() => {
    if (dashboard?.isProcessing && !loading) {
      const timer = setTimeout(() => {
        fetchDashboard(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [
    dashboard?.isProcessing,
    dashboard?.progress?.processed,
    dashboard?.progress?.percentage,
    dashboard?.dataFetchedAt,
    loading,
    fetchDashboard,
  ]);

  const activeArmies: RecommendedArmy[] =
    dashboard?.metaArmies?.recommendationsByTownHall?.["TH18"] ||
    dashboard?.metaArmies?.topRecommendations ||
    [];

  // Phase 2: Data Extraction & Complete Canonical Merging (100% item coverage)
  const stats = dashboard?.statistics;
  const heroes = stats?.heroUsage || [];
  const rawEquipments = stats?.equipmentUsage || [];
  const rawPairs = stats?.heroEquipmentPairs || [];
  const heroEqByHero = stats?.equipmentByHero || {};
  const combinedRawPairs = [...rawPairs];
  for (const hName of Object.keys(heroEqByHero)) {
    const list = heroEqByHero[hName] || [];
    combinedRawPairs.push(...list);
  }

  // Canonicalize pairs: strictly 2 valid equipment items, sorted alphabetically
  const pairMap = new Map<string, EquipmentPairStat>();
  for (const pair of combinedRawPairs) {
    if (!pair || !pair.hero) continue;
    const equips =
      pair.equipments && pair.equipments.length >= 2
        ? pair.equipments.slice(0, 2).map((s) => s.trim())
        : (pair.pair || "")
            .split("+")
            .map((s) => s.trim())
            .filter(Boolean);

    if (equips.length < 2) continue;

    const sortedEquips = [...equips].sort();
    const canonicalPairLabel = `${sortedEquips[0]} + ${sortedEquips[1]}`;
    const key = `${pair.hero}:::${canonicalPairLabel}`;

    const existing = pairMap.get(key);
    if (!existing) {
      pairMap.set(key, {
        hero: pair.hero,
        pair: canonicalPairLabel,
        equipments: sortedEquips,
        count: pair.count || 0,
        usagePct: pair.usagePct || 0,
      });
    } else {
      existing.count += pair.count || 0;
      existing.usagePct = Math.min(
        100.0,
        Number((existing.usagePct + (pair.usagePct || 0)).toFixed(2))
      );
    }
  }

  const allPairs = Array.from(pairMap.values());
  const rawPets = stats?.petUsage || [];
  const rawTroops = stats?.troopUsage || [];
  const rawSpells = stats?.spellUsage || [];
  const rawSieges = stats?.siegeUsage || [];
  const rawSuperTroops = stats?.superTroopUsage || [];

  // 1. Merge Equipments (43 official items)
  const validCanonicalKeys = new Set(CANONICAL_EQUIPMENTS.map((c) => `${c.hero}:::${c.name}`));
  const eqMap = new Map<string, { hero: string; name: string; count: number; usagePct: number }>();
  for (const eq of rawEquipments) {
    const key = `${eq.hero}:::${eq.name}`;
    if (!validCanonicalKeys.has(key)) continue;
    eqMap.set(key, { ...eq });
  }
  for (const c of CANONICAL_EQUIPMENTS) {
    const key = `${c.hero}:::${c.name}`;
    if (!eqMap.has(key)) {
      eqMap.set(key, { hero: c.hero, name: c.name, count: 0, usagePct: 0.0 });
    }
  }
  const allEquipments = Array.from(eqMap.values());

  // 2. Merge Pets (12 official items, zero fake default levels)
  const petMap = new Map<string, PetStat>();
  for (const p of rawPets) {
    if (!CANONICAL_PETS.includes(p.name)) continue;
    petMap.set(p.name, { ...p });
  }
  for (const name of CANONICAL_PETS) {
    if (!petMap.has(name)) {
      petMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const pets = Array.from(petMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  const isSuperTroop = (name: string) =>
    CANONICAL_SUPER_TROOPS.includes(name) || name.startsWith("Super ");

  // 3. Merge Troops (zero fake default levels)
  const troopMap = new Map<string, UnitUsageStat>();
  for (const item of rawTroops) {
    const cleanName = item.name === "Head Hunter" ? "Headhunter" : item.name;
    if (isSuperTroop(cleanName)) continue;
    if (!CANONICAL_TROOPS.includes(cleanName)) continue;
    troopMap.set(cleanName, { ...item, name: cleanName });
  }
  for (const name of CANONICAL_TROOPS) {
    if (!troopMap.has(name)) {
      troopMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const troops = Array.from(troopMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 4. Merge Spells (zero fake default levels)
  const spellMap = new Map<string, UnitUsageStat>();
  for (const sp of rawSpells) {
    if (!CANONICAL_SPELLS.includes(sp.name)) continue;
    spellMap.set(sp.name, { ...sp });
  }
  for (const name of CANONICAL_SPELLS) {
    if (!spellMap.has(name)) {
      spellMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const spells = Array.from(spellMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 5. Merge Sieges (zero fake default levels)
  const siegeMap = new Map<string, UnitUsageStat>();
  for (const s of rawSieges) {
    if (!CANONICAL_SIEGES.includes(s.name)) continue;
    siegeMap.set(s.name, { ...s });
  }
  for (const name of CANONICAL_SIEGES) {
    if (!siegeMap.has(name)) {
      siegeMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const sieges = Array.from(siegeMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 6. Merge Super Troops
  const superMap = new Map<string, UnitUsageStat>();
  for (const st of [...rawSuperTroops, ...rawTroops.filter((item) => isSuperTroop(item.name))]) {
    if (!CANONICAL_SUPER_TROOPS.includes(st.name)) continue;
    if (!superMap.has(st.name) || (st.usagePct || 0) > (superMap.get(st.name)?.usagePct || 0)) {
      superMap.set(st.name, { name: st.name, count: st.count || 0, usagePct: st.usagePct || 0.0 });
    }
  }
  for (const name of CANONICAL_SUPER_TROOPS) {
    if (!superMap.has(name)) {
      superMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const superTroops = Array.from(superMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  const HERO_FILTER_OPTIONS = [
    ALL_HERO_FILTER,
    "Barbarian King",
    "Archer Queen",
    "Grand Warden",
    "Royal Champion",
    "Minion Prince",
    "Dragon Duke",
  ];

  const filteredEquipments = allEquipments
    .filter((eq) => selectedHeroEqFilter === ALL_HERO_FILTER || eq.hero === selectedHeroEqFilter)
    .sort((a, b) => b.usagePct - a.usagePct);

  const filteredPairs = allPairs
    .filter(
      (pair) => selectedHeroEqFilter === ALL_HERO_FILTER || pair.hero === selectedHeroEqFilter
    )
    .sort((a, b) => b.usagePct - a.usagePct);

  const hasLiveSummary =
    Boolean(dashboard) &&
    ((dashboard?.totalPlayersAnalyzed ?? 0) > 0 ||
      (dashboard?.totalRankedAttacksAnalyzed ?? 0) > 0 ||
      !dashboard?.isProcessing);

  const summaryText =
    hasLiveSummary && dashboard
      ? fmtTemplate(t.meta.summary, {
          players: fmtNum(dashboard.totalPlayersAnalyzed ?? 0),
          attacks: fmtNum(dashboard.totalRankedAttacksAnalyzed ?? 0),
          time: dashboard.dataFetchedAt ? fmtTime(dashboard.dataFetchedAt) : "—",
        })
      : t.meta.summaryLoading;

  const progressPct = Math.max(
    5,
    Math.min(100, Math.round(dashboard?.progress?.percentage ?? 10))
  );

  const activeUnitItems: UnitUsageStat[] = {
    troops,
    spells,
    siege: sieges,
    super: superTroops,
  }[unitCategoryTab];

  return (
    <div className="game-theme w-full px-0 py-0 sm:py-1 flex flex-col">
      {/* Main Outer Wooden Window Frame */}
      <div className="game-window-frame flex flex-col">
        {/* Window Top Edge: Tab Bar */}
        <div className="game-tab-strip shrink-0 px-2.5 sm:px-4 overflow-x-auto scrollbar-none">
          <GameTabBar>
            <GameTab
              active={activeTab === "armies"}
              onClick={() => switchTab("armies")}
              icon={<Swords size={18} />}
              className="text-sm sm:text-base px-3 sm:px-5 py-2 sm:py-2.5"
            >
              {t.meta.tabArmies}
            </GameTab>
            <GameTab
              active={activeTab === "stats"}
              onClick={() => switchTab("stats")}
              icon={<Shield size={18} />}
              className="text-sm sm:text-base px-3 sm:px-5 py-2 sm:py-2.5"
            >
              {t.meta.tabStats}
            </GameTab>
          </GameTabBar>
        </div>

        {/* Pinned Live Summary Bar */}
        <div className="shrink-0 px-2.5 sm:px-6 py-2.5 border-b border-amber-950/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg bg-[#2B1F16]/85 border border-[#4A2E1E] text-xs sm:text-sm text-amber-100/95 font-medium">
            <div className="min-w-0 leading-relaxed tabular-nums">
              <span>{summaryText}</span>
            </div>

            <div className="self-end sm:self-auto shrink-0">
              <GameButton
                variant="green"
                size="sm"
                onClick={() => fetchDashboard(true)}
                disabled={loading || Boolean(dashboard?.isProcessing)}
                className="min-h-[44px] px-3.5 text-xs sm:text-sm font-extrabold"
                icon={
                  <RefreshCw
                    size={15}
                    className={loading || dashboard?.isProcessing ? "animate-spin" : ""}
                  />
                }
                title={
                  isTr
                    ? "En son lider tablosu verilerini yenile"
                    : "Refresh latest leaderboard data"
                }
              >
                {loading || dashboard?.isProcessing ? t.common.refreshing : t.common.refresh}
              </GameButton>
            </div>
          </div>

          {/* Background Processing Progress Banner */}
          {dashboard?.isProcessing && (
            <div className="game-panel-cream p-3 rounded-xl border border-amber-800 text-xs sm:text-sm text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <RefreshCw size={15} className="animate-spin text-amber-800 shrink-0" />
                <span className="font-bold leading-snug">{t.meta.scanning}</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                {dashboard.progress && dashboard.progress.target > 0 && (
                  <span className="text-xs font-extrabold text-amber-900 tabular-nums shrink-0">
                    {fmtNum(dashboard.progress.processed)}/{fmtNum(dashboard.progress.target)} (
                    {fmtPct(progressPct, 0)})
                  </span>
                )}
                <div className="flex-1 sm:w-32 bg-[#2B1F16]/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="game-panel-wood p-3 rounded-xl border border-red-800/80 text-xs sm:text-sm text-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle size={16} className="text-amber-300 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
              <GameButton
                variant="gold"
                size="sm"
                onClick={() => fetchDashboard(true)}
                className="min-h-[40px] px-3 text-xs font-extrabold self-end sm:self-auto shrink-0"
              >
                {t.common.retry}
              </GameButton>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-2.5 sm:px-6 py-3 sm:py-4 space-y-4">
          {/* Tab 1: Meta Armies */}
          {activeTab === "armies" && (
            <div className="space-y-4">
              {(loading && !dashboard) || (dashboard?.isProcessing && activeArmies.length === 0) ? (
                <div className="space-y-3">
                  {dashboard?.isProcessing && (
                    <div className="text-xs sm:text-sm text-amber-200/90 font-semibold px-1">
                      {t.meta.scanning}
                    </div>
                  )}
                  {[1, 2, 3].map((i) => (
                    <GamePanel key={i} variant="wood" className="p-3 sm:p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-[180px]">
                          <SkeletonBlock height="1.5rem" width="60%" />
                          <SkeletonBlock height="0.875rem" width="35%" />
                        </div>
                        <div className="flex items-center gap-2">
                          <SkeletonBlock height="2.75rem" width="5rem" />
                          <SkeletonBlock height="2.75rem" width="7.5rem" />
                        </div>
                      </div>
                      <SkeletonBlock height="4.25rem" width="100%" />
                    </GamePanel>
                  ))}
                </div>
              ) : activeArmies.length > 0 ? (
                <div className="space-y-4">
                  {activeArmies.map((army) => (
                    <MetaArmyCard
                      key={army.id}
                      army={army}
                      defaultExpanded={army.rank === 1}
                    />
                  ))}
                </div>
              ) : errorMsg && !dashboard ? (
                <GamePanel variant="wood" className="text-center py-10 space-y-3">
                  <div className="text-sm text-amber-100 font-bold">{errorMsg}</div>
                  <GameButton
                    variant="green"
                    size="sm"
                    onClick={() => fetchDashboard(true)}
                    className="min-h-[44px]"
                  >
                    {t.common.retry}
                  </GameButton>
                </GamePanel>
              ) : (
                <GamePanel variant="wood" className="text-center py-10">
                  <span className="text-sm text-amber-200/85 font-bold">
                    {t.meta.noDataTitle}
                  </span>
                </GamePanel>
              )}
            </div>
          )}

          {/* Tab 2: Usage Statistics */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              {/* Header Note */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#2B1F16]/85 border border-[#4A2E1E] text-xs text-amber-100/90 font-medium">
                <span className="leading-relaxed tabular-nums">
                  *{" "}
                  <strong className="text-amber-300 font-bold">
                    {isTr ? "Kullanım Oranı" : "Usage Rate"}:
                  </strong>{" "}
                  {typeof dashboard?.totalRankedAttacksAnalyzed === "number" &&
                  dashboard.totalRankedAttacksAnalyzed > 0
                    ? `${fmtNum(dashboard.totalRankedAttacksAnalyzed)} ${
                        isTr ? "saldırı" : "attacks"
                      } • `
                    : ""}
                  {t.meta.statsNote}
                </span>
                <span className="shrink-0 text-xs text-amber-200 font-bold px-2.5 py-0.5 rounded bg-[#3E2B1E] border border-[#4A2E1E]">
                  {isTr ? "TH18 Meta Havuzu" : "TH18 Meta Pool"}
                </span>
              </div>

              {(loading && !dashboard) ||
              (dashboard?.isProcessing &&
                (!stats || (dashboard?.totalRankedAttacksAnalyzed ?? 0) === 0)) ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <GamePanel key={i} variant="wood" className="p-3 sm:p-4 space-y-3">
                      <SkeletonBlock height="1.5rem" width="45%" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[1, 2, 3, 4, 5, 6].map((j) => (
                          <SkeletonBlock key={j} height="6.5rem" width="100%" />
                        ))}
                      </div>
                    </GamePanel>
                  ))}
                </div>
              ) : !stats ||
                (errorMsg && !dashboard) ||
                ((dashboard?.totalRankedAttacksAnalyzed ?? 0) === 0 && heroes.length === 0) ? (
                <GamePanel variant="wood" className="text-center py-10 space-y-3">
                  <div className="text-sm text-amber-200/85 font-bold">
                    {errorMsg || t.meta.noDataTitle}
                  </div>
                  <GameButton
                    variant="green"
                    size="sm"
                    onClick={() => fetchDashboard(true)}
                    className="min-h-[44px]"
                  >
                    {t.common.retry}
                  </GameButton>
                </GamePanel>
              ) : (
                <>
                  {/* 1. HEROES */}
                  <GamePanel
                    variant="wood"
                    title={
                      <div className="flex flex-wrap items-center gap-2">
                        <Crown size={18} className="text-amber-300 shrink-0" />
                        <span className="game-title-stroke font-game font-extrabold text-base sm:text-lg tracking-wide">
                          {isTr ? "Kahramanlar" : "Heroes"}
                        </span>
                        <span className="text-xs text-amber-200/80 font-semibold tabular-nums">
                          ({fmtNum(heroes.length)})
                        </span>
                      </div>
                    }
                  >
                    <div className="game-slot-well p-2.5 sm:p-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {heroes.map((hero) => (
                          <div
                            key={hero.name}
                            className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                          >
                            <IconFrame
                              name={hero.name}
                              size="unit"
                              level={hero.avgLevel ? Math.round(hero.avgLevel) : undefined}
                              isMax={hero.maxedPct ? hero.maxedPct > 95 : false}
                            />
                            <div className="text-xs text-amber-100 font-bold leading-snug break-words max-w-full text-center mt-0.5">
                              {hero.name}
                            </div>
                            <div className="font-game text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                              {fmtPct(hero.usagePct, 1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GamePanel>

                  {/* 2. HERO EQUIPMENT & TOP PAIRINGS */}
                  <GamePanel
                    variant="wood"
                    title={
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-amber-300 shrink-0" />
                        <span className="game-title-stroke font-game font-extrabold text-base sm:text-lg tracking-wide">
                          {t.meta.statsHeroEquipTitle}
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-3 p-0.5 sm:p-1">
                      {/* Hero Filter Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-amber-950/40">
                        {HERO_FILTER_OPTIONS.map((opt) => {
                          const isSelected = selectedHeroEqFilter === opt;
                          const label = opt === ALL_HERO_FILTER ? t.meta.filterAll : opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedHeroEqFilter(opt)}
                              className={cn(
                                "min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap tabular-nums cursor-pointer",
                                isSelected
                                  ? "bg-amber-600 text-white shadow-md border border-amber-400 font-extrabold"
                                  : "bg-[#2B1F16]/80 text-amber-200/85 hover:bg-[#3E2B1E] hover:text-white border border-[#4A2E1E]"
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Two Column Layout on Desktop */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                        {/* Left: Individual Equipment (7 cols) */}
                        <div className="lg:col-span-7 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200/85 font-bold px-1">
                            <span className="tabular-nums">
                              {isTr ? "Bireysel Ekipmanlar" : "Individual Equipment"} (
                              {fmtNum(filteredEquipments.length)})
                            </span>
                            <span className="text-xs text-amber-300/75 font-semibold">
                              {isTr ? "Kullanım sırasına göre" : "Sorted by usage"}
                            </span>
                          </div>
                          <div className="game-slot-well p-2.5 flex-1">
                            {filteredEquipments.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {filteredEquipments.map((eq) => {
                                  const eqRarity = resolveEquipmentRarity(eq.name);
                                  return (
                                    <div
                                      key={`${eq.hero}-${eq.name}`}
                                      className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1 text-center"
                                    >
                                      <IconFrame
                                        name={eq.name}
                                        size="unit"
                                        tileType="equipment"
                                        rarity={eqRarity}
                                        className={getEquipmentFrameClass(eqRarity)}
                                      />
                                      <div className="text-xs text-amber-100 font-bold leading-snug break-words max-w-full mt-0.5">
                                        {eq.name}
                                      </div>
                                      <div className="text-xs text-amber-300/85 font-semibold leading-tight max-w-full">
                                        {eq.hero}
                                      </div>
                                      <div className="font-game text-base font-extrabold text-amber-300 tabular-nums">
                                        {fmtPct(eq.usagePct, 1)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-xs sm:text-sm text-amber-200/75 font-medium">
                                {t.meta.statsNoEquipFilter}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Top Equipment Pairs (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200/85 font-bold px-1">
                            <span className="tabular-nums">
                              {t.meta.statsPairsTitle} ({fmtNum(filteredPairs.length)})
                            </span>
                            <span className="text-xs text-amber-300/75 font-semibold">
                              {t.meta.statsTogetherRate}
                            </span>
                          </div>
                          <div className="game-slot-well p-2.5 flex-1 space-y-2.5">
                            {filteredPairs.length > 0 ? (
                              filteredPairs.map((pair, pIdx) => {
                                const eq1 = pair.equipments?.[0] || pair.pair.split(" + ")[0];
                                const eq2 = pair.equipments?.[1] || pair.pair.split(" + ")[1];
                                const r1 = resolveEquipmentRarity(eq1);
                                const r2 = eq2 ? resolveEquipmentRarity(eq2) : "common";
                                const barWidth = Math.max(0, Math.min(100, pair.usagePct));

                                return (
                                  <div
                                    key={`${pair.hero}-${pair.pair}-${pIdx}`}
                                    className="game-stat-tile p-2.5 sm:p-3 space-y-2"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                                      {/* Icons row (+ mobile percentage right-aligned) */}
                                      <div className="flex items-center justify-between sm:justify-start gap-2">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <IconFrame
                                            name={eq1}
                                            size="unit"
                                            tileType="equipment"
                                            rarity={r1}
                                            className={getEquipmentFrameClass(r1)}
                                          />
                                          {eq2 && (
                                            <span className="text-amber-300 font-extrabold text-sm">
                                              +
                                            </span>
                                          )}
                                          {eq2 && (
                                            <IconFrame
                                              name={eq2}
                                              size="unit"
                                              tileType="equipment"
                                              rarity={r2}
                                              className={getEquipmentFrameClass(r2)}
                                            />
                                          )}
                                        </div>

                                        <div className="sm:hidden text-right shrink-0">
                                          <span className="font-game text-lg font-extrabold text-amber-300 tabular-nums">
                                            {fmtPct(pair.usagePct, 1)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Un-truncated wrapped pair title & hero subtitle */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-amber-100 font-bold leading-snug break-words">
                                          {pair.pair}
                                        </div>
                                        <div className="text-xs text-amber-300/85 font-semibold mt-0.5">
                                          {pair.hero}
                                        </div>
                                      </div>

                                      {/* Desktop percentage right-aligned */}
                                      <div className="hidden sm:block text-right shrink-0">
                                        <span className="font-game text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                                          {fmtPct(pair.usagePct, 1)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Warm Progress Bar */}
                                    <div className="game-progress-bar-slot" aria-hidden="true">
                                      <div
                                        className="game-progress-bar-fill"
                                        style={{ width: `${barWidth}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-xs sm:text-sm text-amber-200/75 font-medium">
                                {t.meta.statsNoPairs}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GamePanel>

                  {/* 3. PETS */}
                  <GamePanel
                    variant="wood"
                    title={
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="game-title-stroke font-game font-extrabold text-base sm:text-lg tracking-wide">
                          {t.player.pets}
                        </span>
                        <span className="text-xs text-amber-200/80 font-semibold tabular-nums">
                          ({fmtNum(pets.length)})
                        </span>
                      </div>
                    }
                  >
                    <div className="game-slot-well p-2.5 sm:p-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {pets.map((pet) => (
                          <div
                            key={pet.name}
                            className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                          >
                            <IconFrame
                              name={pet.name}
                              size="unit"
                              rarity="legendary"
                              level={pet.avgLevel ? Math.round(pet.avgLevel) : undefined}
                            />
                            <div className="text-xs text-amber-100 font-bold leading-snug break-words max-w-full text-center mt-0.5">
                              {pet.name}
                            </div>
                            <div className="font-game text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                              {fmtPct(pet.usagePct, 1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GamePanel>

                  {/* 4. TROOPS, SPELLS, SIEGE MACHINES, SUPER TROOPS */}
                  <GamePanel
                    variant="wood"
                    title={
                      <div className="flex items-center gap-2">
                        <Swords size={18} className="text-amber-300 shrink-0" />
                        <span className="game-title-stroke font-game font-extrabold text-base sm:text-lg tracking-wide">
                          {t.meta.statsUnitsTitle}
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-3 p-0.5 sm:p-1">
                      {/* Category Selector Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5 border-b border-amber-950/40 pb-2">
                        {[
                          {
                            id: "troops" as const,
                            label: t.meta.filterTroops,
                            count: troops.length,
                            icon: Swords,
                          },
                          {
                            id: "spells" as const,
                            label: t.meta.filterSpells,
                            count: spells.length,
                            icon: Zap,
                          },
                          {
                            id: "siege" as const,
                            label: t.meta.filterSiege,
                            count: sieges.length,
                            icon: Shield,
                          },
                          {
                            id: "super" as const,
                            label: t.meta.filterSuper,
                            count: superTroops.length,
                            icon: Sparkles,
                          },
                        ].map((cat) => {
                          const Icon = cat.icon;
                          const isActive = unitCategoryTab === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setUnitCategoryTab(cat.id)}
                              className={cn(
                                "flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums cursor-pointer",
                                isActive
                                  ? "bg-amber-600 text-white shadow-md border border-amber-400 font-extrabold"
                                  : "bg-[#2B1F16]/80 text-amber-200/85 hover:bg-[#3E2B1E] hover:text-white border border-[#4A2E1E]"
                              )}
                            >
                              <Icon size={14} />
                              <span>{cat.label}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#2B1F16]/80 font-semibold tabular-nums">
                                {fmtNum(cat.count)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Unified Grid for Active Category */}
                      <div className="game-slot-well p-2.5 sm:p-3.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                          {activeUnitItems.map((item) => (
                            <div
                              key={item.name}
                              className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                            >
                              <IconFrame
                                name={item.name}
                                size="unit"
                                level={item.avgLevel ? Math.round(item.avgLevel) : undefined}
                                isMax={item.maxedPct ? item.maxedPct > 95 : false}
                              />
                              <div className="text-xs text-amber-100 font-bold leading-snug break-words max-w-full">
                                {item.name}
                              </div>
                              <div className="font-game text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                                {fmtPct(item.usagePct, 1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GamePanel>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
