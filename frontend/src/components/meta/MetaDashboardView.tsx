"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { buildCopyArmyLink } from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import {
  GameButton,
  GamePanel,
  GameTabBar,
  GameTab,
  IconFrame,
  StatPill,
} from "@/components/game";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  isProcessing?: boolean;
  progress?: {
    processed: number;
    target: number;
    percentage: number;
    message: string;
  };
  statistics?: {
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

const HERO_MAX_LEVELS: Record<string, number> = {
  "Barbarian King": 110,
  "Archer Queen": 110,
  "Grand Warden": 85,
  "Royal Champion": 55,
  "Minion Prince": 95,
  "Dragon Duke": 25,
};

// Canonical Item Definitions to Guarantee 100% Item Coverage in Usage Statistics
const CANONICAL_EQUIPMENTS: { hero: string; name: string }[] = [
  // Barbarian King (7)
  { hero: "Barbarian King", name: "Barbarian Puppet" },
  { hero: "Barbarian King", name: "Rage Vial" },
  { hero: "Barbarian King", name: "Earthquake Boots" },
  { hero: "Barbarian King", name: "Vampstache" },
  { hero: "Barbarian King", name: "Giant Gauntlet" },
  { hero: "Barbarian King", name: "Spiky Ball" },
  { hero: "Barbarian King", name: "Snake Bracelet" },
  // Archer Queen (7)
  { hero: "Archer Queen", name: "Archer Puppet" },
  { hero: "Archer Queen", name: "Invisibility Vial" },
  { hero: "Archer Queen", name: "Giant Arrow" },
  { hero: "Archer Queen", name: "Healer Puppet" },
  { hero: "Archer Queen", name: "Frozen Arrow" },
  { hero: "Archer Queen", name: "Magic Mirror" },
  { hero: "Archer Queen", name: "Action Figure" },
  // Grand Warden (6)
  { hero: "Grand Warden", name: "Eternal Tome" },
  { hero: "Grand Warden", name: "Life Gem" },
  { hero: "Grand Warden", name: "Rage Gem" },
  { hero: "Grand Warden", name: "Healing Tome" },
  { hero: "Grand Warden", name: "Fireball" },
  { hero: "Grand Warden", name: "Heroic Torch" },
  // Royal Champion (6)
  { hero: "Royal Champion", name: "Seeking Shield" },
  { hero: "Royal Champion", name: "Royal Gem" },
  { hero: "Royal Champion", name: "Haste Vial" },
  { hero: "Royal Champion", name: "Hog Rider Puppet" },
  { hero: "Royal Champion", name: "Rocket Spear" },
  { hero: "Royal Champion", name: "Electro Boots" },
  // Minion Prince (5)
  { hero: "Minion Prince", name: "Henchmen Puppet" },
  { hero: "Minion Prince", name: "Dark Orb" },
  { hero: "Minion Prince", name: "Metal Pants" },
  { hero: "Minion Prince", name: "Meteor Staff" },
  { hero: "Minion Prince", name: "Dark Crown" },
  // Dragon Duke (6)
  { hero: "Dragon Duke", name: "Fire Heart" },
  { hero: "Dragon Duke", name: "Stick Horse" },
  { hero: "Dragon Duke", name: "Frost Flake" },
  { hero: "Dragon Duke", name: "Noble Iron" },
  { hero: "Dragon Duke", name: "Lavaloon Puppet" },
  { hero: "Dragon Duke", name: "Rocket Backpack" },
];

const CANONICAL_PETS: string[] = [
  "L.A.S.S.I",
  "Mighty Yak",
  "Electro Owl",
  "Unicorn",
  "Phoenix",
  "Poison Lizard",
  "Diggy",
  "Frosty",
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
  "Druid",
  "Thrower",
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
  "Furnace",
  "Elephant Rider",
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
];

// Single Army Card Component matching in-game "Ordum -> Kaydedilen Setler"
function MetaArmyCard({
  army,
  defaultExpanded = false,
}: {
  army: RecommendedArmy;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const copyUrl = army.copyArmyLink || buildCopyArmyLink(army.armyShareCode);
  const hasLoadout = army.heroLoadout && Object.keys(army.heroLoadout).length > 0;

  // Calculate capacities
  const totalTroopUnits = (army.troops || []).reduce((acc, t) => acc + (t.count || 0), 0);
  const totalSpellUnits = (army.spells || []).reduce((acc, s) => acc + (s.count || 0), 0);
  const totalSiegeUnits = (army.siegeMachines || []).reduce((acc, sg) => acc + (sg.count || 0), 0);
  const totalCCUnits = (army.clanCastle || []).reduce((acc, cc) => acc + (cc.count || 0), 0);

  return (
    <GamePanel
      variant="wood"
      className="transition-all"
      onHeaderClick={() => setIsExpanded((prev) => !prev)}
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
          {/* Left: #1 • Army Name + record count */}
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <span className="game-title-stroke text-base sm:text-lg md:text-xl tracking-wide">
                #{army.rank} • {army.name}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-amber-200/75 font-semibold mt-0.5">
              {army.sampleCount ? `${army.sampleCount} kayıt` : "649 kayıt"}
            </div>
          </div>

          {/* Center: Stat Boxes */}
          <div className="flex items-center gap-2">
            {/* Box 1: Usage Rate */}
            <div className="game-stat-box">
              <span className="text-[10px] text-amber-200/90 font-bold uppercase tracking-wider">
                Kullanım
              </span>
              <span className="text-base sm:text-lg font-black text-amber-300">
                %{army.usagePct.toFixed(1)}
              </span>
            </div>

            {/* Box 2: 3-Star Rate */}
            <div className="game-stat-box">
              <span className="text-[10px] text-emerald-200/90 font-bold uppercase tracking-wider">
                3 Yıldız
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                %{army.threeStarRatePct.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      }
      headerRight={
        <GameButton
          variant="green"
          size="md"
          href={copyUrl}
          target="_blank"
          icon={<ExternalLink size={16} />}
          className="px-4 py-2 text-xs sm:text-sm font-black whitespace-nowrap shrink-0 self-stretch sm:self-auto"
          title="Doğrudan Clash of Clans oyununda açmak için tıkla"
        >
          Orduyu Kopyala
        </GameButton>
      }
    >
      {isExpanded && (
        <div className="space-y-2.5">
          {/* Capacity Row (Single line of StatPills under header) */}
          <div className="flex flex-wrap items-center gap-2">
            <StatPill
              icon={<Swords size={12} className="text-amber-300" />}
              value={`${totalTroopUnits}/352`}
              title="Birlik Kapasitesi"
            />
            <StatPill
              icon={<Zap size={12} className="text-sky-300" />}
              value={`${totalSpellUnits}/11`}
              title="Büyü Kapasitesi"
            />
            <StatPill
              icon={<Shield size={12} className="text-amber-400" />}
              value={`${totalSiegeUnits}/3`}
              title="Kuşatma Makinesi Kapasitesi"
            />
            <StatPill
              icon={<Castle size={12} className="text-emerald-300" />}
              value={`${totalCCUnits}/61`}
              title="Klan Kalesi Birimleri"
            />
          </div>

          {/* Unified Row 1 Box: Askerler + Büyüler + Kuşatma Makineleri Birleşik Kutu (Logo En Başa Sabitlendi) */}
          <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1 w-full">
            {/* Left slot gutter icon - FIXED at the start */}
            <div
              className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
              title="Saldırı Birlikleri, Büyüler ve Kuşatma Makineleri"
            >
              <Swords size={14} />
            </div>

            {/* Units Container (wraps cleanly to the right of fixed gutter) */}
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
              {/* Troops (Askerler) */}
              {army.troops?.map((troop, idx) => (
                <IconFrame
                  key={`troop-${troop.id}-${idx}`}
                  name={troop.name}
                  count={troop.count}
                  size="unit"
                />
              ))}

              {/* Divider between Troops and Spells */}
              {army.spells && army.spells.length > 0 && (
                <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-amber-950/70 my-auto mx-0.5 shrink-0" />
              )}

              {/* Spells (Büyüler) */}
              {army.spells?.map((spell, idx) => (
                <IconFrame
                  key={`spell-${spell.id}-${idx}`}
                  name={spell.name}
                  count={spell.count}
                  size="unit"
                />
              ))}

              {/* Divider between Spells and Siege */}
              {army.siegeMachines && army.siegeMachines.length > 0 && (
                <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-amber-950/70 my-auto mx-0.5 shrink-0" />
              )}

              {/* Siege Machines (Kuşatma Makineleri) */}
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

          {/* Row 2: Kahramanlar & Klan Kalesi (Ayrı Kutular - Logolar En Başa Sabitlendi) */}
          <div className="flex flex-col lg:flex-row items-stretch gap-2.5 w-full">
            {/* 1. Kahramanlar, Donanımlar ve Hayvanlar Kutusu */}
            {hasLoadout && (
              <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1 flex-1 min-w-[280px]">
                {/* Left slot gutter icon - FIXED at the start */}
                <div
                  className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
                  title="Kahramanlar, Donanımlar ve Hayvanlar"
                >
                  <Crown size={14} />
                </div>

                {/* Heroes Container (wraps cleanly to the right of fixed gutter) */}
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {Object.entries(army.heroLoadout).map(([heroName, loadout]) => {
                    const maxLvl = HERO_MAX_LEVELS[heroName] || 110;
                    return (
                      <div
                        key={heroName}
                        className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-amber-950/50"
                      >
                        {/* Hero Tile */}
                        <IconFrame
                          name={heroName}
                          size="hero"
                          level={maxLvl}
                          isMax={true}
                        />

                        {/* 2 Equipments on top row, 1 Pet on bottom row */}
                        <div className="flex flex-col gap-0.5 justify-between h-[44px] sm:h-[50px] md:h-[56px] lg:h-[58px]">
                          <div className="flex items-center gap-0.5">
                            {loadout.primaryPair.slice(0, 2).map((eq, eIdx) => (
                              <IconFrame
                                key={`${heroName}-eq-${eIdx}`}
                                name={eq}
                                size="equipment"
                                rarity="epic"
                              />
                            ))}
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Klan Kalesi Kutusu */}
            {army.clanCastle && army.clanCastle.length > 0 && (
              <div className="game-cc-well flex items-stretch gap-1 sm:gap-1.5 p-1 shrink-0 min-w-[180px]">
                {/* Left slot gutter icon - FIXED at the start */}
                <div
                  className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] lg:min-h-[58px] flex items-center justify-center"
                  title="Klan Kalesi"
                >
                  <Castle size={14} />
                </div>

                {/* Clan Castle Container (wraps cleanly to the right of fixed gutter) */}
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
  const [activeTab, setActiveTab] = useState<"armies" | "stats">("armies");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MetaDashboardPayload | null>(null);

  // Phase 2 State (Usage Statistics)
  const [selectedHeroEqFilter, setSelectedHeroEqFilter] = useState<string>("Tümü");
  const [unitCategoryTab, setUnitCategoryTab] = useState<"troops" | "spells" | "siege" | "super">("troops");

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

  const fetchDashboard = useCallback(
    async (force = false) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await safeFetchJson<MetaDashboardPayload>(
          `/api/v1/meta/top-analysis?sample_size=200&town_hall=18&force_refresh=${force}`
        );
        setDashboard(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "API Hatası";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // Poll while background processing
  useEffect(() => {
    if (dashboard?.isProcessing) {
      const timer = setTimeout(() => {
        fetchDashboard(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [dashboard?.isProcessing, fetchDashboard]);

  const activeArmies: RecommendedArmy[] =
    dashboard?.metaArmies?.recommendationsByTownHall?.["TH18"] ||
    dashboard?.metaArmies?.topRecommendations ||
    [];

  // Phase 2: Data Extraction & Complete Canonical Merging (100% item coverage)
  const stats = dashboard?.statistics;
  const heroes = stats?.heroUsage || [];
  const rawEquipments = stats?.equipmentUsage || [];
  const allPairs = stats?.heroEquipmentPairs || [];
  const rawPets = stats?.petUsage || [];
  const rawTroops = stats?.troopUsage || [];
  const rawSpells = stats?.spellUsage || [];
  const rawSieges = stats?.siegeUsage || [];
  const rawSuperTroops = stats?.superTroopUsage || [];

  // 1. Merge Equipments
  const eqMap = new Map<string, { hero: string; name: string; count: number; usagePct: number }>();
  for (const eq of rawEquipments) {
    eqMap.set(`${eq.hero}:::${eq.name}`, { ...eq });
  }
  for (const c of CANONICAL_EQUIPMENTS) {
    const key = `${c.hero}:::${c.name}`;
    if (!eqMap.has(key)) {
      eqMap.set(key, { hero: c.hero, name: c.name, count: 0, usagePct: 0.0 });
    }
  }
  const allEquipments = Array.from(eqMap.values());

  // 2. Merge Pets
  const petMap = new Map<string, PetStat>();
  for (const p of rawPets) {
    petMap.set(p.name, { ...p });
  }
  for (const name of CANONICAL_PETS) {
    if (!petMap.has(name)) {
      petMap.set(name, { name, count: 0, usagePct: 0.0, avgLevel: 10 });
    }
  }
  const pets = Array.from(petMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 3. Merge Troops (31 regular troops)
  const troopMap = new Map<string, UnitUsageStat>();
  for (const t of rawTroops) {
    troopMap.set(t.name, { ...t });
  }
  for (const name of CANONICAL_TROOPS) {
    if (!troopMap.has(name)) {
      troopMap.set(name, { name, count: 0, usagePct: 0.0, avgLevel: 1 });
    }
  }
  const troops = Array.from(troopMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 4. Merge Spells (17 canonical spells)
  const spellMap = new Map<string, UnitUsageStat>();
  for (const sp of rawSpells) {
    spellMap.set(sp.name, { ...sp });
  }
  for (const name of CANONICAL_SPELLS) {
    if (!spellMap.has(name)) {
      spellMap.set(name, { name, count: 0, usagePct: 0.0, avgLevel: 1 });
    }
  }
  const spells = Array.from(spellMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 5. Merge Sieges (9 canonical siege machines)
  const siegeMap = new Map<string, UnitUsageStat>();
  for (const s of rawSieges) {
    siegeMap.set(s.name, { ...s });
  }
  for (const name of CANONICAL_SIEGES) {
    if (!siegeMap.has(name)) {
      siegeMap.set(name, { name, count: 0, usagePct: 0.0, avgLevel: 5 });
    }
  }
  const sieges = Array.from(siegeMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 6. Merge Super Troops (16 canonical super troops)
  const superMap = new Map<string, { name: string; count: number; usagePct: number }>();
  for (const st of rawSuperTroops) {
    superMap.set(st.name, { ...st });
  }
  for (const name of CANONICAL_SUPER_TROOPS) {
    if (!superMap.has(name)) {
      superMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const superTroops = Array.from(superMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  const HERO_FILTER_OPTIONS = [
    "Tümü",
    "Barbarian King",
    "Archer Queen",
    "Grand Warden",
    "Royal Champion",
    "Minion Prince",
    "Dragon Duke",
  ];

  const filteredEquipments = allEquipments
    .filter((eq) => selectedHeroEqFilter === "Tümü" || eq.hero === selectedHeroEqFilter)
    .sort((a, b) => b.usagePct - a.usagePct);

  const filteredPairs = allPairs
    .filter((pair) => selectedHeroEqFilter === "Tümü" || pair.hero === selectedHeroEqFilter)
    .sort((a, b) => b.usagePct - a.usagePct);

  const formattedFetchedAt = dashboard?.dataFetchedAt
    ? new Date(dashboard.dataFetchedAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="game-theme max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col">
      {/* Main Outer Wooden Window Frame (Natural flow with main page) */}
      <div className="game-window-frame flex flex-col">
        {/* Window Top Edge: Tab Bar Header stuck flush to the top edge of the panel */}
        <div className="game-tab-strip shrink-0">
          <GameTabBar>
            <GameTab
              active={activeTab === "armies"}
              onClick={() => switchTab("armies")}
              icon={<Swords size={18} />}
            >
              Meta Ordular
            </GameTab>
            <GameTab
              active={activeTab === "stats"}
              onClick={() => switchTab("stats")}
              icon={<Shield size={18} />}
            >
              Kullanım İstatistikleri
            </GameTab>
          </GameTabBar>
        </div>

        {/* Pinned Single-line Summary Bar */}
        <div className="shrink-0 px-3 sm:px-6 py-2.5 border-b border-amber-950/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-amber-950/50 text-xs sm:text-sm text-amber-100/90 font-medium">
            <div className="truncate">
              <span>
                <strong className="text-amber-300 font-bold">
                  {dashboard?.totalPlayersAnalyzed || 200}
                </strong>{" "}
                oyuncu •{" "}
                <strong className="text-amber-300 font-bold">
                  {(dashboard?.totalRankedAttacksAnalyzed || 3355).toLocaleString("tr-TR")}
                </strong>{" "}
                ranked saldırı • Son güncelleme:{" "}
                <strong className="text-amber-300 font-bold">
                  {formattedFetchedAt || "18:24"}
                </strong>
              </span>
            </div>

            <div className="self-end sm:self-auto shrink-0">
              <GameButton
                variant="green"
                size="sm"
                onClick={() => fetchDashboard(true)}
                disabled={loading || dashboard?.isProcessing}
                icon={
                  <RefreshCw
                    size={14}
                    className={loading || dashboard?.isProcessing ? "animate-spin" : ""}
                  />
                }
                title="En son liderlik tablosu verilerini yenile"
              >
                Yenile
              </GameButton>
            </div>
          </div>

          {/* Background Processing Progress Bar */}
          {dashboard?.isProcessing && dashboard.progress && (
            <div className="game-panel-cream p-2.5 rounded-xl border border-amber-800 text-xs text-amber-950 flex items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-amber-800" />
                <span className="font-bold">
                  {dashboard.progress.message || "Lider tablosu taranıyor..."}
                </span>
              </div>
              <div className="w-32 bg-amber-950/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${dashboard.progress.percentage || 15}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="game-panel-wood p-2.5 rounded-xl border border-red-800/80 text-xs text-red-200 flex items-center gap-2 mt-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* NATURAL CONTENT DIV (No inner scroll, expands with page) */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-4">
          {/* Tab 1: Meta Ordular (Phase 1) */}
          {activeTab === "armies" && (
            <div className="space-y-4">
              {loading && !dashboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl bg-amber-950/20 animate-pulse border border-amber-950/30"
                    />
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
              ) : (
                <GamePanel variant="wood" className="text-center py-10">
                  <span className="text-amber-200/80 font-bold">
                    Henüz yeterli battle log kaydı bulunamadı.
                  </span>
                </GamePanel>
              )}
            </div>
          )}

          {/* Tab 2: Kullanım İstatistikleri (Phase 2) */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              {/* Header Note */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-amber-950/50 text-xs text-amber-200/90 font-medium">
                <span>
                  * <strong className="text-amber-300">Kullanım Oranı:</strong> Analiz edilen{" "}
                  <strong className="text-amber-300 font-bold">
                  {(dashboard?.totalRankedAttacksAnalyzed || 3355).toLocaleString("tr-TR")}
                </strong>{" "}
                saldırı kaydının yüzde kaçında o öğenin orduya dahil edildiğini gösterir.
              </span>
              <span className="shrink-0 text-[11px] text-amber-300/80 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-900/50">
                TH18 Meta Havuzu
              </span>
            </div>

            {loading && !dashboard ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-2xl bg-amber-950/20 animate-pulse border border-amber-950/30"
                  />
                ))}
              </div>
            ) : !stats ? (
              <GamePanel variant="wood" className="text-center py-10">
                <span className="text-amber-200/80 font-bold">
                  İstatistik verileri yüklenemedi. Lütfen &quot;Yenile&quot; butonuna basarak tekrar deneyin.
                </span>
              </GamePanel>
            ) : (
              <>
                {/* 1. KAHRAMANLAR */}
                <GamePanel
                  variant="wood"
                  title={
                    <div className="flex items-center gap-2">
                      <Crown size={18} className="text-amber-300" />
                      <span className="game-title-stroke text-base sm:text-lg tracking-wide">
                        Kahramanlar
                      </span>
                      <span className="text-xs text-amber-200/75 font-semibold">
                        ({heroes.length} Kahraman)
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
                          <div
                            className="text-xs text-amber-100 font-bold truncate max-w-full text-center mt-0.5"
                            title={hero.name}
                          >
                            {hero.name}
                          </div>
                          <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                            %{hero.usagePct.toFixed(1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GamePanel>

                {/* 2. KAHRAMAN EKİPMANLARI & EN ÇOK KULLANILAN İKİLİLER */}
                <GamePanel
                  variant="wood"
                  title={
                    <div className="flex items-center gap-2">
                      <Zap size={18} className="text-amber-300" />
                      <span className="game-title-stroke text-base sm:text-lg tracking-wide">
                        Kahraman Ekipmanları & En Çok Kullanılan İkililer
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-3 p-1">
                    {/* Hero Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-amber-950/40">
                      {HERO_FILTER_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSelectedHeroEqFilter(opt)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            selectedHeroEqFilter === opt
                              ? "bg-amber-600 text-white shadow-md border border-amber-400 font-black"
                              : "bg-black/40 text-amber-200/80 hover:bg-black/60 hover:text-white border border-amber-950/40"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {/* Two Column Layout on Desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                      {/* Left: Individual Equipments (7 cols) */}
                      <div className="lg:col-span-7 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-amber-200/80 font-bold px-1">
                          <span>Bireysel Ekipmanlar ({filteredEquipments.length})</span>
                          <span className="text-[11px] text-amber-300/70">Kullanım sırasına göre</span>
                        </div>
                        <div className="game-slot-well p-2.5 flex-1">
                          {filteredEquipments.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {filteredEquipments.map((eq) => (
                                <div
                                  key={`${eq.hero}-${eq.name}`}
                                  className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1 text-center"
                                >
                                  <IconFrame name={eq.name} size="unit" rarity="epic" />
                                  <div
                                    className="text-xs text-amber-100 font-bold truncate max-w-full"
                                    title={`${eq.name} (${eq.hero})`}
                                  >
                                    {eq.name}
                                  </div>
                                  <div className="text-[10px] text-amber-300/80 font-semibold truncate max-w-full">
                                    {eq.hero}
                                  </div>
                                  <div className="text-base font-black text-amber-300 font-['Lilita_One']">
                                    %{eq.usagePct.toFixed(1)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-xs text-amber-200/60 font-medium">
                              Seçilen filtreye ait ekipman bulunamadı.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Top Pairs (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-amber-200/80 font-bold px-1">
                          <span>En Çok Kullanılan İkililer ({filteredPairs.length})</span>
                          <span className="text-[11px] text-amber-300/70">Birlikte kullanım</span>
                        </div>
                        <div className="game-slot-well p-2.5 flex-1 space-y-2">
                          {filteredPairs.length > 0 ? (
                            filteredPairs.map((pair, pIdx) => {
                              const eq1 = pair.equipments?.[0] || pair.pair.split(" + ")[0];
                              const eq2 = pair.equipments?.[1] || pair.pair.split(" + ")[1];
                              return (
                                <div
                                  key={`${pair.hero}-${pair.pair}-${pIdx}`}
                                  className="game-stat-tile p-2.5 flex items-center justify-between gap-3"
                                >
                                  {/* Two tiles side-by-side with uniform unit size */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <IconFrame name={eq1} size="unit" rarity="epic" />
                                    {eq2 && <span className="text-amber-300 font-black text-sm">+</span>}
                                    {eq2 && <IconFrame name={eq2} size="unit" rarity="epic" />}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0 px-1">
                                    <div
                                      className="text-xs sm:text-sm text-amber-100 font-bold truncate"
                                      title={pair.pair}
                                    >
                                      {pair.pair}
                                    </div>
                                    <div className="text-[11px] text-amber-300/80 font-semibold truncate">
                                      {pair.hero}
                                    </div>
                                  </div>

                                  {/* Usage Percentage Only */}
                                  <div className="text-right shrink-0">
                                    <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                                      %{pair.usagePct.toFixed(1)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-xs text-amber-200/60 font-medium">
                              Seçilen kahraman için ikili kombinasyon bulunamadı.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </GamePanel>

                {/* 3. EVCİL HAYVANLAR (PETS) */}
                <GamePanel
                  variant="wood"
                  title={
                    <div className="flex items-center gap-2">
                      <span className="game-title-stroke text-base sm:text-lg tracking-wide">
                        Evcil Hayvanlar
                      </span>
                      <span className="text-xs text-amber-200/75 font-semibold">
                        ({pets.length} Pet)
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
                            level={pet.avgLevel ? Math.round(pet.avgLevel) : 10}
                          />
                          <div
                            className="text-xs text-amber-100 font-bold truncate max-w-full text-center mt-0.5"
                            title={pet.name}
                          >
                            {pet.name}
                          </div>
                          <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                            %{pet.usagePct.toFixed(1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GamePanel>

                {/* 4. BİRLİKLER, BÜYÜLER, KUŞATMA MAKİNELERİ, SÜPER BİRLİKLER */}
                <GamePanel
                  variant="wood"
                  title={
                    <div className="flex items-center gap-2">
                      <Swords size={18} className="text-amber-300" />
                      <span className="game-title-stroke text-base sm:text-lg tracking-wide">
                        Birlikler, Büyüler ve Kuşatma Makineleri
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-3 p-1">
                    {/* Category Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-amber-950/40 pb-2">
                      {[
                        { id: "troops", label: "Birlikler", count: troops.length, icon: Swords },
                        { id: "spells", label: "Büyüler", count: spells.length, icon: Zap },
                        { id: "siege", label: "Kuşatma Makineleri", count: sieges.length, icon: Shield },
                        { id: "super", label: "Süper Birlikler", count: superTroops.length, icon: Sparkles },
                      ].map((cat) => {
                        const Icon = cat.icon;
                        const isActive = unitCategoryTab === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() =>
                              setUnitCategoryTab(
                                cat.id as "troops" | "spells" | "siege" | "super"
                              )
                            }
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                              isActive
                                ? "bg-amber-600 text-white shadow-md border border-amber-400 font-black"
                                : "bg-black/40 text-amber-200/80 hover:bg-black/60 hover:text-white border border-amber-950/40"
                            )}
                          >
                            <Icon size={14} />
                            <span>{cat.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-semibold">
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Content for Selected Category */}
                    <div className="game-slot-well p-2.5 sm:p-3.5 space-y-3">
                      {/* BİRLİKLER (Tam Katalog) */}
                      {unitCategoryTab === "troops" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                          {troops.map((t) => (
                            <div
                              key={t.name}
                              className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                            >
                              <IconFrame
                                name={t.name}
                                size="unit"
                                level={t.avgLevel ? Math.round(t.avgLevel) : undefined}
                                isMax={t.maxedPct ? t.maxedPct > 95 : false}
                              />
                              <div
                                className="text-xs text-amber-100 font-bold truncate max-w-full"
                                title={t.name}
                              >
                                {t.name}
                              </div>
                              <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                                %{t.usagePct.toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* BÜYÜLER (Tam Katalog) */}
                      {unitCategoryTab === "spells" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                          {spells.map((s) => (
                            <div
                              key={s.name}
                              className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                            >
                              <IconFrame
                                name={s.name}
                                size="unit"
                                level={s.avgLevel ? Math.round(s.avgLevel) : undefined}
                                isMax={s.maxedPct ? s.maxedPct > 95 : false}
                              />
                              <div
                                className="text-xs text-amber-100 font-bold truncate max-w-full"
                                title={s.name}
                              >
                                {s.name}
                              </div>
                              <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                                %{s.usagePct.toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* KUŞATMA MAKİNELERİ */}
                      {unitCategoryTab === "siege" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                          {sieges.map((sg) => (
                            <div
                              key={sg.name}
                              className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                            >
                              <IconFrame
                                name={sg.name}
                                size="unit"
                                level={sg.avgLevel ? Math.round(sg.avgLevel) : undefined}
                                isMax={sg.maxedPct ? sg.maxedPct > 95 : false}
                              />
                              <div
                                className="text-xs text-amber-100 font-bold truncate max-w-full"
                                title={sg.name}
                              >
                                {sg.name}
                              </div>
                              <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                                %{sg.usagePct.toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* SÜPER BİRLİKLER */}
                      {unitCategoryTab === "super" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                          {superTroops.map((st) => (
                            <div
                              key={st.name}
                              className="game-stat-tile p-2.5 flex flex-col items-center justify-center gap-1.5 text-center"
                            >
                              <IconFrame name={st.name} size="unit" />
                              <div
                                className="text-xs text-amber-100 font-bold truncate max-w-full"
                                title={st.name}
                              >
                                {st.name}
                              </div>
                              <div className="text-base sm:text-lg font-black text-amber-300 font-['Lilita_One']">
                                %{st.usagePct.toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
