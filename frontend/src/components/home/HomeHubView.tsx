"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Users,
  Shield,
  Flame,
  PenTool,
  Swords,
  TrendingUp,
  Clock,
  ArrowRight,
  Trophy,
  Crown,
  Sparkles,
  Layers,
  Box,
  Target,
  Hammer,
  Zap,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { safeFetchJson } from "@/lib/apiClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface HomeHubViewProps {
  onNavigate?: (tab: "search" | "ore" | "cwl" | "meta" | "wall", subAction?: string) => void;
  onSearchQuery?: (mode: "player" | "clanTag" | "clanName", query: string) => void;
}

interface HubCardConfig {
  id: string;
  tab: "search" | "ore" | "cwl" | "meta" | "wall";
  subAction?: string;
  hashRoute: string;
  title: string;
  subtitle: string;
  badgeTag: string;
  description: string;
  icon: React.ReactNode;
  iconGradient: string;
  toneStyle: React.CSSProperties;
  miniBadges: React.ReactNode[];
  realData?: {
    label1: string;
    value1: string;
    label2?: string;
    value2?: string;
  } | null;
}

export default function HomeHubView({ onNavigate, onSearchQuery: _onSearchQuery }: HomeHubViewProps) {
  // Live Meta API Data
  const [metaInfo, setMetaInfo] = useState<{
    sampleSize: number;
    totalRankedAttacks: number;
    lastUpdated: string | null;
  } | null>(null);

  // Real search history & saved settings
  const [recentPlayer, setRecentPlayer] = useState<{ query: string; label?: string } | null>(null);
  const [recentClan, setRecentClan] = useState<{ query: string; label?: string } | null>(null);
  const [savedScenery, setSavedScenery] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJson<any>("/api/v1/meta/top-analysis?sample_size=200&town_hall=18");
        if (!cancelled && data) {
          setMetaInfo({
            sampleSize: data.sampleSize || 200,
            totalRankedAttacks: data.totalRankedAttacksAnalyzed || data.totalBattlesAnalyzed || 0,
            lastUpdated: data.dataFetchedAt
              ? new Date(data.dataFetchedAt).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
          });
        }
      } catch {
        // Fallback / offline mode
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("coc-search-history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const lastP = parsed.find((item: any) => item?.mode === "player");
          if (lastP) setRecentPlayer(lastP);
          const lastC = parsed.find((item: any) => item?.mode === "clan");
          if (lastC) setRecentClan(lastC);
        }
      }
    } catch {
      // Ignore localStorage error
    }

    try {
      const sc = localStorage.getItem("wallart.scenery");
      if (sc && sc !== "classic") {
        setSavedScenery(sc);
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const handleNavigate = useCallback(
    (tab: "search" | "ore" | "cwl" | "meta" | "wall", subAction?: string, hashRoute?: string) => {
      if (hashRoute) {
        window.location.hash = hashRoute;
      }
      if (onNavigate) {
        onNavigate(tab, subAction);
      }
    },
    [onNavigate]
  );

  const cards: HubCardConfig[] = useMemo(
    () => [
      {
        id: "player-search",
        tab: "search",
        subAction: "player",
        hashRoute: "#/oyuncu",
        title: "Oyuncu Ara",
        subtitle: "Oyuncu Profili & Analiz",
        badgeTag: "PROFİL",
        description: "Oyuncu profili arama ve analiz; 6 kahraman, aktif donanımlar ve battle log savaşları.",
        icon: <Users size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-sky-500 via-blue-600 to-indigo-800",
        toneStyle: { filter: "brightness(1.0)" },
        miniBadges: [
          <Users key="u" size={14} />,
          <Trophy key="t" size={14} />,
          <Shield key="s" size={14} />,
        ],
        realData: recentPlayer
          ? {
              label1: "Son Oyuncu",
              value1: recentPlayer.query,
              label2: recentPlayer.label ? "İsim" : undefined,
              value2: recentPlayer.label,
            }
          : null,
      },
      {
        id: "clan-search",
        tab: "search",
        subAction: "clan",
        hashRoute: "#/klan",
        title: "Klan Ara",
        subtitle: "Klan Arama & Filtreleme",
        badgeTag: "KLAN",
        description: "Klan arama ve filtreleme; CWL ligi, bağış oranları ve aktif klan kadrosu analizi.",
        icon: <Shield size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-indigo-500 via-indigo-600 to-violet-800",
        toneStyle: { filter: "brightness(0.97) contrast(1.02)" },
        miniBadges: [
          <Shield key="s" size={14} />,
          <Users key="u" size={14} />,
          <Flame key="f" size={14} />,
        ],
        realData: recentClan
          ? {
              label1: "Son Klan",
              value1: recentClan.query,
              label2: recentClan.label ? "İsim" : undefined,
              value2: recentClan.label,
            }
          : null,
      },
      {
        id: "meta-armies",
        tab: "meta",
        hashRoute: "#/meta",
        title: "Meta & Ordu",
        subtitle: "TH18 Meta Orduları & İkililer",
        badgeTag: "TH18 META",
        description: "TH18 meta orduları ve ekipman ikilileri; Top 200 Efsane Ligi canlı battle log analizleri.",
        icon: <Flame size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-purple-500 via-fuchsia-600 to-purple-900",
        toneStyle: { filter: "brightness(1.03) contrast(1.03)" },
        miniBadges: [
          <Flame key="f" size={14} />,
          <Crown key="c" size={14} />,
          <Sparkles key="sp" size={14} />,
        ],
        realData:
          metaInfo && metaInfo.totalRankedAttacks > 0
            ? {
                label1: "Örneklem",
                value1: `${metaInfo.sampleSize} Oyuncu`,
                label2: "Analiz",
                value2: `${metaInfo.totalRankedAttacks.toLocaleString("tr-TR")} Saldırı`,
              }
            : null,
      },
      {
        id: "wall-art",
        tab: "wall",
        hashRoute: "#/duvar",
        title: "Duvar Yazısı",
        subtitle: "3D Köy & Şablon Planı",
        badgeTag: "3D KÖY",
        description: "3D köy ve şablon planı oluşturucu; 44x44 ana köy ızgarasında izometrik plan.",
        icon: <PenTool size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-cyan-400 via-teal-500 to-sky-700",
        toneStyle: { filter: "brightness(0.95) contrast(1.03)" },
        miniBadges: [
          <Layers key="l" size={14} />,
          <Box key="b" size={14} />,
          <Sparkles key="sp" size={14} />,
        ],
        realData: savedScenery ? { label1: "Manzara", value1: savedScenery } : null,
      },
      {
        id: "cwl-scout",
        tab: "cwl",
        hashRoute: "#/cwl",
        title: "CWL Rakip Analizi",
        subtitle: "Klan Savaş Ligi Keşif Kartı",
        badgeTag: "LİG SAVAŞI",
        description: "Klan savaş ligi keşif kartı; 15/30 kişilik kadro, ranked saldırıları ve ordu tahminleri.",
        icon: <Swords size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-amber-400 via-amber-500 to-orange-700",
        toneStyle: { filter: "brightness(1.02) saturate(1.08)" },
        miniBadges: [
          <Swords key="s" size={14} />,
          <Target key="t" size={14} />,
          <Trophy key="tr" size={14} />,
        ],
        realData: null,
      },
      {
        id: "ore-calc",
        tab: "ore",
        hashRoute: "#/cevher",
        title: "Cevher Analizi",
        subtitle: "Kahraman Ekipmanı & Demirci",
        badgeTag: "DEMİRCİ",
        description: "Kahraman ekipmanları ve cevher yükseltme hesaplayıcı; 37 lig kademesiyle demirci süresi.",
        icon: <TrendingUp size={30} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />,
        iconGradient: "bg-gradient-to-b from-emerald-400 via-emerald-600 to-teal-800",
        toneStyle: { filter: "brightness(0.98) saturate(1.05)" },
        miniBadges: [
          <Hammer key="h" size={14} />,
          <Zap key="z" size={14} />,
          <TrendingUp key="tu" size={14} />,
        ],
        realData: null,
      },
    ],
    [recentPlayer, recentClan, metaInfo, savedScenery]
  );

  return (
    <div className="w-full space-y-3 sm:space-y-4 font-sans">
      {/* 1. Üst Bilgilendirici Şerit (Brown / Gold in-game token strip) */}
      <div
        className="w-full rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 select-none"
        style={{
          background: "linear-gradient(180deg, var(--game-wood-header-light) 0%, var(--game-wood-header-dark) 100%)",
          border: "2.5px solid var(--game-wood-header-border)",
          boxShadow: "inset 0 1.5px 0 rgba(255, 255, 255, 0.15), 0 3px 6px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* (i) Icon Badge */}
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border-2"
            style={{
              background: "linear-gradient(180deg, var(--game-btn-gold-top) 0%, var(--game-btn-gold-bot) 100%)",
              borderColor: "var(--game-btn-gold-border)",
              boxShadow: "0 2px 0 var(--game-btn-gold-bevel), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            }}
            aria-hidden="true"
          >
            <span className="font-game font-black text-amber-950 text-base leading-none">i</span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="game-text-stroke-sm text-xs sm:text-sm md:text-base font-bold tracking-wide uppercase truncate">
              EN GÜNCEL TH18 METASI VE RESMİ OYUN ANALİTİKLERİNİ KEŞFET!
            </h2>
            <p className="text-[11px] text-amber-100/80 font-medium truncate mt-0.5">
              Resmi Clash of Clans API verileriyle profesyonel strateji araçları
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {metaInfo?.lastUpdated && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-200/90"
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Clock size={12} className="text-amber-300" />
              <span>Canlı: {metaInfo.lastUpdated}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => handleNavigate("search", "player", "#/oyuncu")}
            className="game-btn game-btn-silver text-xs px-3 sm:px-4 py-2 shrink-0 flex items-center gap-1.5"
          >
            <Search size={14} />
            <span>HIZLI ARA</span>
          </button>
        </div>
      </div>

      {/* 2. Araç Kutucukları Izgarası (Desktop/Tablet: 2 Sütun, Mobil 390px: Tek Sütun) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4.5">
        {cards.map((card) => (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => handleNavigate(card.tab, card.subAction, card.hashRoute)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavigate(card.tab, card.subAction, card.hashRoute);
              }
            }}
            aria-label={`${card.title} - ${card.description}`}
            className={cn(
              "group game-panel game-panel-wood rounded-xl sm:rounded-2xl p-3.5 sm:p-4 cursor-pointer select-none",
              "flex flex-col justify-between transition-all duration-150",
              "hover:brightness-105 hover:-translate-y-0.5",
              "active:scale-[0.985] active:translate-y-0.5 active:brightness-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            )}
            style={card.toneStyle}
          >
            {/* Top Header Row */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Crest Badge */}
                  <div
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0 border-2 select-none",
                      card.iconGradient
                    )}
                    style={{
                      borderColor: "var(--game-wood-border)",
                      boxShadow: "0 3px 0 var(--game-wood-shadow), inset 0 1.5px 0 rgba(255, 255, 255, 0.35)",
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0">
                    <h3 className="game-title-stroke text-base sm:text-lg font-bold tracking-wide uppercase leading-tight truncate">
                      {card.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-bold text-amber-300 tracking-tight truncate mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right Tag Chip + Arrow */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase font-game tracking-wider text-amber-300 select-none"
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    {card.badgeTag}
                  </span>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-amber-200/70 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all"
                    style={{ background: "rgba(0, 0, 0, 0.25)" }}
                  >
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>

              {/* Single-line concise description */}
              <p className="text-xs sm:text-sm text-stone-200/90 font-medium leading-relaxed mt-2.5 mb-1 line-clamp-1 sm:line-clamp-2">
                {card.description}
              </p>
            </div>

            {/* Bottom Recessed Slot Bar (Tactical Badges + Real Data) */}
            <div
              className="mt-3 pt-2 pb-1.5 px-2.5 sm:px-3 rounded-lg flex items-center justify-between gap-2 min-h-[38px]"
              style={{
                background: "linear-gradient(180deg, var(--game-slot-bg-dark) 0%, var(--game-slot-bg-light) 100%)",
                border: "1.5px solid var(--game-slot-border)",
                boxShadow: "inset 0 2px 4px var(--game-slot-inner-shadow), 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Left 3 mini badge icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {card.miniBadges.map((badgeIcon, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-amber-300 shrink-0"
                    style={{
                      background: "rgba(0, 0, 0, 0.45)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    {badgeIcon}
                  </div>
                ))}
              </div>

              {/* Right Real Data info (displayed only if genuine data exists) */}
              {card.realData ? (
                <div className="text-right text-[11px] leading-tight font-medium text-stone-300 min-w-0">
                  <div className="truncate">
                    <span className="text-stone-400">{card.realData.label1}: </span>
                    <strong className="text-amber-300 font-bold">{card.realData.value1}</strong>
                  </div>
                  {card.realData.label2 && (
                    <div className="truncate">
                      <span className="text-stone-400">{card.realData.label2}: </span>
                      <strong className="text-amber-300 font-bold">{card.realData.value2}</strong>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
