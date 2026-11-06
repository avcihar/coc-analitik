"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Award,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Flame,
  Shield,
  Sparkles,
  Swords,
  Crown,
  Zap,
  AlertCircle,
  Clock,
  Users,
  Edit3,
  Castle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  }[];
  armyShareCode: string;
  copyArmyLink?: string;
}

interface MetaDashboardPayload {
  status: string;
  hasSufficientData?: boolean;
  message?: string | null;
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

const SIX_HERO_OPTIONS = [
  "Tümü",
  "Barbarian King",
  "Archer Queen",
  "Minion Prince",
  "Grand Warden",
  "Royal Champion",
  "Dragon Duke",
];

// Single Army Card Component designed like in-game "Ordum -> Kaydedilen Setler"
function MetaArmyCard({ army }: { army: RecommendedArmy }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const copyUrl = army.copyArmyLink || buildCopyArmyLink(army.armyShareCode);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(army.armyShareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

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
      title={
        <div className="flex flex-wrap items-center gap-2">
          <Edit3 size={15} className="text-amber-300 opacity-80" />
          <span className="game-text-stroke-sm text-sm sm:text-base tracking-wide">
            #{army.rank} • {army.name}
          </span>
          {army.style && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 border border-amber-900/40 text-[10px] text-amber-200/90 font-bold uppercase tracking-wider">
              {army.style}
            </span>
          )}
        </div>
      }
      headerRight={
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Capacity StatPills (352/352, 11/11, 3/3, 61/61 as in game screenshot) */}
          <StatPill
            icon={<Swords size={12} className="text-sky-300" />}
            value={`${totalTroopUnits}/352`}
            title="Birlik Kapasitesi"
          />
          <StatPill
            icon={<Sparkles size={12} className="text-purple-300" />}
            value={`${totalSpellUnits}/11`}
            title="Büyü Kapasitesi"
          />
          <StatPill
            icon={<Shield size={12} className="text-amber-300" />}
            value={`${totalSiegeUnits}/3`}
            title="Kuşatma Makinesi"
          />
          <StatPill
            icon={<Castle size={12} className="text-emerald-300" />}
            value={`${totalCCUnits}/61`}
            title="Klan Kalesi Birimleri"
          />

          {/* Performance Badges */}
          <StatPill
            label="Kullanım"
            value={`%${army.usagePct.toFixed(1)}`}
            variant="amber"
          />
          <StatPill
            label="3 Yıldız"
            value={`%${army.threeStarRatePct.toFixed(1)}`}
            variant="green"
          />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Main Composition Box (Troop Slot Well + Side Action Buttons) */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {/* Left / Center: Units & Heroes in Inset Slot Well */}
          <div className="flex-1 space-y-3 game-slot-well">
            {/* 1. Row 1: Attack Troops, Spells, Siege Machines in order */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-amber-200/80 uppercase tracking-wider">
                <Swords size={12} className="text-amber-400" />
                <span>Saldırı Birlikleri ({totalTroopUnits} Birlik • {totalSpellUnits} Büyü)</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Troops */}
                {army.troops?.map((troop, idx) => (
                  <IconFrame
                    key={`troop-${troop.id}-${idx}`}
                    name={troop.name}
                    count={troop.count}
                    size="sm"
                  />
                ))}

                {/* Vertical Divider */}
                {army.spells && army.spells.length > 0 && (
                  <div className="h-8 w-px bg-amber-900/40 my-auto mx-0.5" />
                )}

                {/* Spells */}
                {army.spells?.map((spell, idx) => (
                  <IconFrame
                    key={`spell-${spell.id}-${idx}`}
                    name={spell.name}
                    count={spell.count}
                    size="sm"
                  />
                ))}

                {/* Vertical Divider */}
                {army.siegeMachines && army.siegeMachines.length > 0 && (
                  <div className="h-8 w-px bg-amber-900/40 my-auto mx-0.5" />
                )}

                {/* Siege Machines */}
                {army.siegeMachines?.map((sg, idx) => (
                  <IconFrame
                    key={`siege-${sg.id}-${idx}`}
                    name={sg.name}
                    count={sg.count}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* 2. Row 2: Heroes & Clan Castle Row */}
            <div className="pt-2 border-t border-amber-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Heroes, Equipments, Pets sub-block */}
              {hasLoadout && (
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-amber-200/80 uppercase tracking-wider">
                    <Crown size={12} className="text-amber-400" />
                    <span>Kahramanlar, Donanımlar ve Hayvanlar</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {Object.entries(army.heroLoadout).map(([heroName, loadout]) => (
                      <div
                        key={heroName}
                        className="inline-flex items-center gap-1 p-1 rounded-lg bg-black/35 border border-amber-950/40 shadow-inner"
                        title={`${heroName} - ${loadout.primaryPair.join(" + ")} ${loadout.pet ? `• ${loadout.pet}` : ""}`}
                      >
                        {/* Hero Icon */}
                        <IconFrame name={heroName} size="sm" />

                        {/* 2 Equipments Stacked / Beside */}
                        <div className="flex flex-col gap-0.5">
                          {loadout.primaryPair.slice(0, 2).map((eq, eIdx) => (
                            <IconFrame
                              key={`${heroName}-eq-${eIdx}`}
                              name={eq}
                              size="xs"
                              rarity="epic"
                            />
                          ))}
                        </div>

                        {/* Pet Icon */}
                        {loadout.pet && (
                          <IconFrame
                            name={loadout.pet}
                            size="xs"
                            rarity="legendary"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clan Castle Inset Box */}
              {army.clanCastle && army.clanCastle.length > 0 && (
                <div className="game-cc-well shrink-0 self-stretch sm:self-auto flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-amber-200/90 uppercase tracking-wider">
                    <Castle size={11} className="text-emerald-400" />
                    <span>Klan Kalesi</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {army.clanCastle.map((cc, idx) => (
                      <IconFrame
                        key={`cc-${cc.id}-${idx}`}
                        name={cc.name}
                        count={cc.count}
                        size="xs"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 3D Tactical Action Buttons */}
          <div className="flex flex-row lg:flex-col justify-center gap-2.5 shrink-0 self-stretch lg:w-44 pt-1 lg:pt-0">
            {/* Primary Action: Orduyu Kopyala (Green Button) */}
            <GameButton
              variant="green"
              size="md"
              href={copyUrl}
              target="_blank"
              icon={<ExternalLink size={15} />}
              className="flex-1 lg:flex-initial w-full"
              title="Doğrudan Clash of Clans oyununda açmak için ordu bağlantısını tıkla"
            >
              Orduyu Kopyala
            </GameButton>

            {/* Secondary Action: Kodu Kopyala (Blue Button) */}
            <GameButton
              variant="blue"
              size="md"
              onClick={handleCopyCode}
              icon={copiedCode ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
              className="flex-1 lg:flex-initial w-full"
              title="Ham ordu kodunu panoya kopyala (armyShareCode)"
            >
              {copiedCode ? "Kopyalandı!" : "Kodu Kopyala"}
            </GameButton>

            {/* Details toggle button */}
            {hasLoadout && (
              <GameButton
                variant="gold"
                size="sm"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full text-xs"
              >
                <span>{detailsExpanded ? "Gizle" : "Donanım"}</span>
                <ChevronDown
                  size={14}
                  className={cn("transition-transform duration-200", detailsExpanded && "rotate-180")}
                />
              </GameButton>
            )}
          </div>
        </div>

        {/* Collapsible Detay Section (Hero Equipment & Pets Text Details) */}
        {hasLoadout && (
          <AnimatePresence>
            {detailsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="game-slot-well p-3 space-y-2.5"
              >
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Crown size={14} />
                  <span>Kahraman Donanım ve Evcil Hayvan Detayları</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {Object.entries(army.heroLoadout).map(([heroName, loadout]) => (
                    <div
                      key={heroName}
                      className="p-2.5 rounded-lg bg-black/45 border border-amber-950/60 space-y-1 text-xs"
                    >
                      <div className="font-bold text-amber-200 flex items-center gap-1.5">
                        <IconFrame name={heroName} size="xs" />
                        <span>{heroName}</span>
                      </div>
                      <div className="text-[11px] text-amber-100/80">
                        <span className="text-purple-300 font-semibold block">
                          {loadout.primaryPair && loadout.primaryPair.length > 0
                            ? loadout.primaryPair.join(" + ")
                            : "Standart"}
                        </span>
                        {loadout.pet && (
                          <span className="text-cyan-300 font-semibold block mt-0.5">
                            🐾 {loadout.pet}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </GamePanel>
  );
}

export default function MetaDashboardView() {
  const topN = 200;
  const selectedTh = 18;
  const [selectedHeroFilter, setSelectedHeroFilter] = useState<string>("Tümü");
  const [selectedPetHeroFilter, setSelectedPetHeroFilter] = useState<string>("Tümü");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MetaDashboardPayload | null>(null);

  const fetchDashboard = useCallback(
    async (targetTopN: number, targetTh: number, force = false) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await safeFetchJson<MetaDashboardPayload>(
          `/api/v1/meta/top-analysis?sample_size=${targetTopN}&town_hall=${targetTh}&force_refresh=${force}`
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
    fetchDashboard(topN, selectedTh, false);
  }, [topN, selectedTh, fetchDashboard]);

  // Poll every 3.5 seconds while background meta analysis is in progress
  useEffect(() => {
    if (dashboard?.isProcessing) {
      const timer = setTimeout(() => {
        fetchDashboard(topN, selectedTh, false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [dashboard?.isProcessing, topN, selectedTh, fetchDashboard]);

  const stats = dashboard?.statistics;
  const activeArmies: RecommendedArmy[] =
    dashboard?.metaArmies?.recommendationsByTownHall?.["TH18"] ||
    dashboard?.metaArmies?.topRecommendations ||
    [];

  const displayedEquipmentPairs: EquipmentPairStat[] = !stats
    ? []
    : selectedHeroFilter === "Tümü"
    ? (stats.heroEquipmentPairs || []).slice(0, 8)
    : stats.equipmentByHero?.[selectedHeroFilter]?.length
    ? stats.equipmentByHero[selectedHeroFilter].slice(0, 6)
    : (stats.heroEquipmentPairs || [])
        .filter((item) => item.hero === selectedHeroFilter)
        .slice(0, 6);

  const displayedPets: PetStat[] = !stats
    ? []
    : selectedPetHeroFilter === "Tümü"
    ? (stats.petUsage || []).slice(0, 8)
    : (stats.petUsageByHero?.[selectedPetHeroFilter] || []).slice(0, 6);

  const formattedFetchedAt = dashboard?.dataFetchedAt
    ? new Date(dashboard.dataFetchedAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="game-theme w-full max-w-6xl mx-auto space-y-6 select-none font-sans">
      {/* 1. Header: Authentic In-Game Tab Bar (Ordum / Kaydedilen Setler / Ordu Tarifleri) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <GameTabBar>
            <GameTab>Ordum</GameTab>
            <GameTab active>Kaydedilen Setler</GameTab>
            <GameTab>Ordu Tarifleri</GameTab>
          </GameTabBar>

          {/* Quick Header Actions: TownHall Tag + Refresh Button */}
          <div className="flex items-center gap-2 pb-1.5 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              TH 18
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              İlk 200 Oyuncu
            </span>

            <GameButton
              variant="blue"
              size="sm"
              onClick={() => fetchDashboard(topN, selectedTh, true)}
              disabled={loading}
              icon={<RefreshCw size={13} className={cn(loading && "animate-spin")} />}
              title="Meta verilerini canlı yeniden tara"
            >
              Yenile
            </GameButton>
          </div>
        </div>

        {/* In-game Card Subtitle Strip */}
        <div className="game-panel game-panel-wood rounded-tl-none -mt-[3.5px] p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-100 font-medium">
            <span>
              <strong className="text-white font-black">{(dashboard?.totalPlayersAnalyzed ?? 200).toLocaleString("tr-TR")}</strong> oyuncu analizi
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-black">{(dashboard?.totalRankedAttacksAnalyzed ?? 0).toLocaleString("tr-TR")}</strong> ranked saldırı
            </span>
            <span>•</span>
            <span>Son güncelleme: <strong className="text-amber-300 font-bold">{formattedFetchedAt || "Az önce"}</strong></span>
          </div>

          <div className="text-[11px] text-amber-200/80 font-semibold">
            Oyundaki &quot;Kaydedilen Setler&quot; Arayüzü ile 1:1 Uyumlu
          </div>
        </div>
      </div>

      {/* Background Processing / Cold Start Banner */}
      {dashboard?.isProcessing && (
        <GamePanel variant="blue" className="p-3">
          <div className="flex items-center gap-3 text-xs text-blue-100">
            <RefreshCw size={18} className="animate-spin text-sky-300 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-sm text-white">Veriler Taranıyor...</div>
              <div className="text-blue-200/80 text-[11px] mt-0.5">
                {dashboard.progress?.message || "Lider tablosundaki TH18 oyuncuları taranıyor ve meta ordular analiz ediliyor, lütfen bekleyin."}
              </div>
            </div>
            {dashboard.progress?.percentage !== undefined && dashboard.progress.percentage > 0 && (
              <span className="font-mono font-bold text-sky-300 px-2 py-1 rounded bg-blue-900/60 border border-blue-500/40">
                %{dashboard.progress.percentage.toFixed(0)}
              </span>
            )}
          </div>
        </GamePanel>
      )}

      {/* Loading Skeleton */}
      {loading && !dashboard && (
        <div className="space-y-4">
          <div className="h-44 game-panel game-panel-wood rounded-2xl animate-pulse" />
          <div className="h-44 game-panel game-panel-wood rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && !loading && (
        <GamePanel variant="dark" className="border-red-600/50">
          <div className="flex items-center gap-3 text-sm text-red-200">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Veri Yüklenemedi</div>
              <div className="text-xs text-red-300/80 mt-0.5">{errorMsg}</div>
            </div>
          </div>
        </GamePanel>
      )}

      {/* 2. Top Recommended Armies Section FIRST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-amber-950/60 pb-2">
          <h2 className="game-text-stroke-sm text-base sm:text-lg flex items-center gap-2">
            <Flame size={18} className="text-amber-400" />
            <span>En Yüksek Başarılı TH18 Meta Orduları ({activeArmies.length})</span>
          </h2>
          <span className="text-xs text-amber-200/80 font-semibold hidden sm:inline-block">
            Gerçek armyShareCode Kopyalama Bağlantıları
          </span>
        </div>

        {activeArmies.length === 0 && !loading ? (
          <GamePanel variant="wood" className="text-center text-sm text-amber-200/80 py-8">
            Henüz yeterli battle log kaydı bulunamadı.
          </GamePanel>
        ) : (
          <div className="space-y-4">
            {activeArmies.map((army) => (
              <MetaArmyCard key={army.id} army={army} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Hero Pick Rates Section */}
      {stats && (stats.heroUsage || []).length > 0 && (
        <GamePanel
          variant="wood"
          title={
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-300" />
              <span>Kahraman Tercih Oranları (Hero Pick Rate %)</span>
            </div>
          }
          headerRight={
            <span className="text-xs text-amber-200/80 font-semibold hidden sm:inline-block">
              6 Kahraman (Minion Prince & Dragon Duke Dahil)
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(stats.heroUsage || []).map((hero) => (
              <div
                key={hero.name}
                className="game-slot-well p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconFrame name={hero.name} size="xs" />
                    <div>
                      <div className="text-xs font-bold text-white">{hero.name}</div>
                      {hero.avgLevel && (
                        <div className="text-[10px] text-amber-200/70 font-medium">
                          Ort. Lv.{hero.avgLevel} {hero.maxedPct ? `• %${hero.maxedPct} Max` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="game-text-stroke-gold text-sm font-black">
                    %{hero.usagePct.toFixed(1)}
                  </span>
                </div>

                {/* Clash Golden Progress Bar */}
                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-amber-950/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 shadow-sm"
                    style={{ width: `${Math.min(100, Math.max(0, hero.usagePct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GamePanel>
      )}

      {/* 4. Equipment Pairs & Pets Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipment Pairs */}
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-purple-300" />
                <span>Kahraman Ekipmanı İkilileri</span>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 pb-2 border-b border-amber-950/40">
                {SIX_HERO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedHeroFilter(opt)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors border",
                      selectedHeroFilter === opt
                        ? "bg-[#A97A52] text-white border-[#382014] shadow-sm font-black"
                        : "bg-black/30 text-amber-200/70 border-amber-950/40 hover:text-white"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {displayedEquipmentPairs.map((pair, idx) => (
                  <div
                    key={`${pair.hero}-${pair.pair}-${idx}`}
                    className="p-2.5 rounded-lg bg-black/30 border border-amber-950/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconFrame name={pair.hero} size="xs" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">
                          {pair.pair}
                        </div>
                        <div className="text-[10px] text-amber-200/60 font-medium">
                          {pair.count} saldırı örneği
                        </div>
                      </div>
                    </div>

                    <span className="game-text-stroke-sm text-xs font-bold text-purple-300 shrink-0">
                      %{pair.usagePct.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GamePanel>

          {/* Pets */}
          <GamePanel
            variant="wood"
            title={
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-300" />
                <span>Evcil Hayvan Tercihleri (Pets)</span>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 pb-2 border-b border-amber-950/40">
                {SIX_HERO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedPetHeroFilter(opt)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors border",
                      selectedPetHeroFilter === opt
                        ? "bg-[#A97A52] text-white border-[#382014] shadow-sm font-black"
                        : "bg-black/30 text-amber-200/70 border-amber-950/40 hover:text-white"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {displayedPets.map((pet, idx) => (
                  <div
                    key={`${pet.name}-${idx}`}
                    className="p-2.5 rounded-lg bg-black/30 border border-amber-950/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconFrame name={pet.name} size="xs" rarity="legendary" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">
                          {pet.name}
                        </div>
                        <div className="text-[10px] text-amber-200/60 font-medium">
                          {pet.hero ? `${pet.hero} ile` : `${pet.count} saldırı`}
                        </div>
                      </div>
                    </div>

                    <span className="game-text-stroke-sm text-xs font-bold text-cyan-300 shrink-0">
                      %{pet.usagePct.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GamePanel>
        </div>
      )}
    </div>
  );
}
