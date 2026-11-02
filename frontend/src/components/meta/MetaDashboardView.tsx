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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { buildCopyArmyLink } from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import UnitIcon from "@/components/common/UnitIcon";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

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

// Single Army Card Component with In-game copy button and secondary raw code copy
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

  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm hover:border-blue-500/40 transition-all space-y-4">
      {/* Top Header: Rank, Name, Big Stats, Copy Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-app-border">
        <div className="flex items-start sm:items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-sm shrink-0">
            #{army.rank}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-app-text">{army.name}</h3>
              {army.style && (
                <span className="px-2 py-0.5 rounded-md bg-app-cardSubtle border border-app-border text-[11px] font-semibold text-app-muted">
                  {army.style}
                </span>
              )}
            </div>
            {army.sampleCount !== undefined && (
              <span className="text-xs text-app-muted font-medium">
                {army.sampleCount} saldırı örneği • {army.threeStarCount ?? 0} üç yıldız
              </span>
            )}
          </div>
        </div>

        {/* Big Performance Numbers & Copy Buttons */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start lg:self-center">
          {/* Usage % Metric */}
          <div className="text-right">
            <span className="text-[11px] font-bold text-app-muted block uppercase tracking-wider">
              Kullanım Oranı
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-400">
              %{army.usagePct.toFixed(1)}
            </span>
          </div>

          {/* 3-Star % Metric */}
          <div className="text-right pl-4 border-l border-app-border">
            <span className="text-[11px] font-bold text-app-muted block uppercase tracking-wider">
              3 Yıldız Başarısı
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              %{army.threeStarRatePct.toFixed(1)}
            </span>
          </div>

          {/* Action Buttons: Primary In-game Copy + Secondary Icon Code Copy */}
          <div className="flex items-center gap-2 pl-2">
            <a
              href={copyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <span>Orduyu Kopyala</span>
              <ExternalLink size={14} />
            </a>

            <button
              onClick={handleCopyCode}
              title={copiedCode ? "Kopyalandı!" : "Ham ordu kodunu kopyala (armyShareCode)"}
              className="p-2.5 rounded-xl bg-app-cardSubtle hover:bg-app-border border border-app-border text-app-muted hover:text-app-text cursor-pointer transition-colors relative"
            >
              {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Army Composition: Troops & Spells Grid */}
      <div className="space-y-3">
        {/* Troops Section */}
        {army.troops && army.troops.length > 0 && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block mb-2">
              Saldırı Birlikleri ({army.troops.reduce((acc, t) => acc + (t.count || 0), 0)} adet)
            </span>
            <div className="flex flex-wrap gap-2">
              {army.troops.map((troop, idx) => (
                <UnitIcon
                  key={`${troop.id}-${idx}`}
                  name={troop.name}
                  count={troop.count}
                  size="sm"
                  showNameBelow
                />
              ))}
            </div>
          </div>
        )}

        {/* Spells, Siege & CC Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-app-border">
          {/* Spells */}
          {army.spells && army.spells.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block mb-2">
                Büyüler ({army.spells.reduce((acc, s) => acc + (s.count || 0), 0)} adet)
              </span>
              <div className="flex flex-wrap gap-2">
                {army.spells.map((spell, idx) => (
                  <UnitIcon
                    key={`${spell.id}-${idx}`}
                    name={spell.name}
                    count={spell.count}
                    size="xs"
                    showNameBelow
                  />
                ))}
              </div>
            </div>
          )}

          {/* Siege Machine */}
          {army.siegeMachines && army.siegeMachines.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block mb-2">
                Kuşatma Makinesi
              </span>
              <div className="flex flex-wrap gap-2">
                {army.siegeMachines.map((sg, idx) => (
                  <UnitIcon
                    key={`${sg.id}-${idx}`}
                    name={sg.name}
                    count={sg.count}
                    size="xs"
                    showNameBelow
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clan Castle */}
          {army.clanCastle && army.clanCastle.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block mb-2">
                Klan Kalesi
              </span>
              <div className="flex flex-wrap gap-2">
                {army.clanCastle.map((cc, idx) => (
                  <UnitIcon
                    key={`${cc.id}-${idx}`}
                    name={cc.name}
                    count={cc.count}
                    size="xs"
                    showNameBelow
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Detay Section (Hero Equipment & Pets) */}
      {hasLoadout && (
        <div className="pt-2">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
          >
            <span>{detailsExpanded ? "Kahraman Donanımını Gizle" : "Kahraman Donanımı ve Evcil Hayvanları Göster"}</span>
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-200", detailsExpanded && "rotate-180")}
            />
          </button>

          <AnimatePresence>
            {detailsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-4 rounded-xl bg-app-cardSubtle border border-app-border space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(army.heroLoadout).map(([heroName, loadout]) => (
                    <div
                      key={heroName}
                      className="p-3 rounded-lg bg-app-card border border-app-border space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-app-text">
                        <Crown size={13} className="text-amber-400" />
                        <span>{heroName}</span>
                      </div>
                      <div className="text-[11px] text-app-muted space-y-0.5 font-medium">
                        <div>
                          Ekipman:{" "}
                          <strong className="text-purple-400">
                            {loadout.primaryPair && loadout.primaryPair.length > 0
                              ? loadout.primaryPair.join(" + ")
                              : "Standart"}
                          </strong>
                        </div>
                        {loadout.pet && (
                          <div>
                            Pet: <strong className="text-cyan-400">{loadout.pet}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
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
    <div className="w-full max-w-6xl mx-auto space-y-8 font-sans">
      {/* 1. Header & Clean Single-Line Summary Strip */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-extrabold text-app-text tracking-tight flex items-center gap-2">
              <Award className="text-blue-500" size={24} />
              <span>TH18 Meta & Ordu Tavsiyeleri</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
              TH 18
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">
              Örneklem: İlk 200
            </span>
          </div>

          {/* Clean One-Line Summary as requested */}
          <div className="text-xs text-app-muted font-medium mt-1.5 flex flex-wrap items-center gap-2">
            <span>
              <strong className="text-app-text font-bold">{(dashboard?.totalPlayersAnalyzed ?? 200).toLocaleString("tr-TR")}</strong> oyuncu
            </span>
            <span>•</span>
            <span>
              <strong className="text-app-text font-bold">{(dashboard?.totalRankedAttacksAnalyzed ?? 0).toLocaleString("tr-TR")}</strong> ranked saldırı
            </span>
            <span>•</span>
            <span>Son güncelleme: <strong className="text-app-text font-bold">{formattedFetchedAt || "Az önce"}</strong></span>
          </div>
        </div>

        <button
          onClick={() => fetchDashboard(topN, selectedTh, true)}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-app-cardSubtle hover:bg-app-border border border-app-border text-xs font-bold text-app-text cursor-pointer flex items-center gap-1.5 transition-colors self-start md:self-auto"
          title="Verileri Canlı Yenile"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin text-blue-400")} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Background Processing / Cold Start Banner */}
      {dashboard?.isProcessing && (
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 flex items-center gap-3.5 text-xs text-blue-300 shadow-sm animate-pulse">
          <RefreshCw size={18} className="animate-spin text-blue-400 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-sm text-blue-200">Veriler hazırlanıyor...</div>
            <div className="text-blue-300/80 mt-0.5">
              {dashboard.progress?.message || "Lider tablosundaki TH18 oyuncuları taranıyor ve meta ordular analiz ediliyor, lütfen bekleyin."}
            </div>
          </div>
          {dashboard.progress?.percentage !== undefined && dashboard.progress.percentage > 0 && (
            <span className="font-mono font-bold text-blue-400 px-2 py-1 rounded bg-blue-500/20">
              %{dashboard.progress.percentage.toFixed(0)}
            </span>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !dashboard && (
        <div className="space-y-4">
          <div className="h-44 bg-app-cardSubtle rounded-2xl animate-pulse border border-app-border" />
          <div className="h-44 bg-app-cardSubtle rounded-2xl animate-pulse border border-app-border" />
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && !loading && (
        <div className="bg-app-card border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 text-sm text-app-text">
          <AlertCircle size={20} className="text-red-400 shrink-0" />
          <div>
            <div className="font-bold">Veri Yüklenemedi</div>
            <div className="text-xs text-app-muted mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* 2. Top Recommended Armies Section FIRST (As required: User sees best armies first) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-app-border pb-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
            <Flame size={16} className="text-amber-500" />
            En Yüksek Başarılı TH18 Meta Orduları ({activeArmies.length})
          </h2>
          <span className="text-xs text-app-muted font-medium">
            Gerçek `armyShareCode` Kopyalama Linkleri
          </span>
        </div>

        {activeArmies.length === 0 && !loading ? (
          <div className="bg-app-card border border-app-border rounded-2xl p-6 text-sm text-app-muted text-center font-medium">
            Henüz yeterli battle log kaydı bulunamadı.
          </div>
        ) : (
          <div className="space-y-4">
            {activeArmies.map((army) => (
              <MetaArmyCard key={army.id} army={army} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Hero Pick Rates Section (ClashSpot Style) */}
      {stats && (stats.heroUsage || []).length > 0 && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              Kahraman Tercih Oranları (Hero Pick Rate %)
            </h2>
            <span className="text-xs font-semibold text-app-muted">
              6 Kahraman (Minion Prince & Dragon Duke Dahil)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stats.heroUsage || []).map((hero) => (
              <div
                key={hero.name}
                className="bg-app-cardSubtle border border-app-border rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UnitIcon name={hero.name} size="xs" />
                    <div>
                      <div className="text-xs font-bold text-app-text">{hero.name}</div>
                      {hero.avgLevel && (
                        <div className="text-[10px] text-app-muted font-medium">
                          Ort. Lv.{hero.avgLevel} {hero.maxedPct ? `• %${hero.maxedPct} Max` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-black text-amber-400">
                    %{hero.usagePct.toFixed(1)}
                  </span>
                </div>

                {/* Colored Progress Bar */}
                <div className="h-2 w-full bg-app-card rounded-full overflow-hidden border border-app-border/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                    style={{ width: `${Math.min(100, Math.max(0, hero.usagePct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Equipment Pairs & Pets Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipment Pairs */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="space-y-2 border-b border-app-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                <Shield size={16} className="text-purple-400" />
                Kahraman Ekipmanı İkilileri
              </h2>
              {/* Tabbed Hero Filter */}
              <div className="flex flex-wrap gap-1">
                {SIX_HERO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedHeroFilter(opt)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border",
                      selectedHeroFilter === opt
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-app-cardSubtle text-app-muted border-app-border hover:text-app-text"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {displayedEquipmentPairs.length === 0 ? (
                <div className="text-xs text-app-muted font-medium py-3">Veri bulunamadı.</div>
              ) : (
                displayedEquipmentPairs.map((item, idx) => (
                  <div
                    key={`${item.hero}-${item.pair}-${idx}`}
                    className="bg-app-cardSubtle border border-app-border rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-app-text truncate pr-2" title={item.pair}>
                        {item.pair}
                      </span>
                      <span className="text-purple-400 shrink-0 font-extrabold">
                        %{item.usagePct.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${Math.min(100, Math.max(0, item.usagePct))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pets & Super Troops */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            {/* Pets */}
            <div className="space-y-3">
              <div className="space-y-2 border-b border-app-border pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  Evcil Hayvan Tercih Oranları
                </h2>
                <div className="flex flex-wrap gap-1">
                  {SIX_HERO_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedPetHeroFilter(opt)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border",
                        selectedPetHeroFilter === opt
                          ? "bg-cyan-600 text-white border-cyan-500"
                          : "bg-app-cardSubtle text-app-muted border-app-border hover:text-app-text"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {displayedPets.length === 0 ? (
                  <div className="text-xs text-app-muted font-medium py-2">Veri bulunamadı.</div>
                ) : (
                  displayedPets.map((pet) => (
                    <div
                      key={`${pet.hero || "all"}-${pet.name}`}
                      className="bg-app-cardSubtle border border-app-border rounded-xl p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-app-text">{pet.name}</span>
                        <span className="text-cyan-400 font-extrabold">
                          %{pet.usagePct.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.min(100, Math.max(0, pet.usagePct))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Super Troops */}
            {stats.superTroopUsage && stats.superTroopUsage.length > 0 && (
              <div className="pt-3 border-t border-app-border space-y-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
                  <Flame size={16} className="text-rose-400" />
                  Aktif Süper Birlikler
                </h2>
                <div className="flex flex-wrap gap-2">
                  {stats.superTroopUsage.slice(0, 6).map((st) => (
                    <div
                      key={st.name}
                      className="px-3 py-1.5 rounded-lg bg-app-cardSubtle border border-app-border text-xs flex items-center gap-2"
                    >
                      <span className="font-bold text-app-text">{st.name}</span>
                      <span className="font-extrabold text-rose-400">%{st.usagePct.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
