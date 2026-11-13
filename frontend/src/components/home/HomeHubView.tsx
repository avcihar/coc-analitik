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
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import {
  ASSETS_CONFIG,
  getSceneryConfig,
  getSceneryDisplayName,
} from "@/lib/assetsConfig";

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
  footerLabel: string;
  hasLiveMetric: boolean;
}

interface RecentPlayerSummary {
  displayTag: string;
  name?: string;
}

interface RecentClanSummary {
  label: string;
  tag?: string;
}

export default function HomeHubView({ onNavigate, onSearchQuery: _onSearchQuery }: HomeHubViewProps) {
  const { locale, isTr, t, fmtNum, fmtTime, fmtTemplate } = useLanguage();

  // Live Meta API Data (store raw ISO timestamp so locale toggle re-formats cleanly)
  const [metaInfo, setMetaInfo] = useState<{
    sampleSize: number;
    totalRankedAttacks: number;
    lastUpdatedAt: string | null;
  } | null>(null);

  // Recent searches & saved Wall scenery synced from localStorage
  const [recentPlayer, setRecentPlayer] = useState<RecentPlayerSummary | null>(null);
  const [recentClan, setRecentClan] = useState<RecentClanSummary | null>(null);
  const [savedSceneryId, setSavedSceneryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJson<any>("/api/v1/meta/top-analysis?sample_size=200&town_hall=18");
        if (!cancelled && data) {
          setMetaInfo({
            sampleSize: Number(data.sampleSize) || 200,
            totalRankedAttacks: Number(data.totalRankedAttacksAnalyzed || data.totalBattlesAnalyzed) || 0,
            lastUpdatedAt: typeof data.dataFetchedAt === "string" ? data.dataFetchedAt : null,
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

  const readLocalState = useCallback(() => {
    try {
      const rawPlayers = localStorage.getItem("coc_recent_player_searches");
      if (rawPlayers) {
        const parsed = JSON.parse(rawPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed.find(
            (item) =>
              item &&
              typeof item === "object" &&
              (typeof item.displayTag === "string" || typeof item.tag === "string")
          );
          if (first) {
            const cleanTag = String(first.tag || first.displayTag || "")
              .replace(/^#+/, "")
              .trim();
            const displayTag =
              typeof first.displayTag === "string" && first.displayTag.trim()
                ? first.displayTag.trim()
                : cleanTag
                ? `#${cleanTag}`
                : "";
            if (displayTag) {
              setRecentPlayer({
                displayTag,
                name: typeof first.name === "string" && first.name.trim() ? first.name.trim() : undefined,
              });
            }
          }
        }
      } else {
        setRecentPlayer(null);
      }
    } catch {
      setRecentPlayer(null);
    }

    try {
      const rawClans = localStorage.getItem("coc_recent_clan_searches");
      if (rawClans) {
        const parsed = JSON.parse(rawClans);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed.find(
            (item) =>
              item &&
              typeof item === "object" &&
              (typeof item.query === "string" || typeof item.tag === "string" || typeof item.name === "string")
          );
          if (first) {
            const cleanTag = typeof first.tag === "string" ? first.tag.replace(/^#+/, "").trim() : "";
            const name = typeof first.name === "string" && first.name.trim() ? first.name.trim() : "";
            const query = typeof first.query === "string" ? first.query.trim() : "";
            const label =
              name ||
              (cleanTag
                ? `#${cleanTag}`
                : first.isTag && query
                ? `#${query.replace(/^#+/, "")}`
                : query);
            if (label) {
              setRecentClan({
                label,
                tag: cleanTag ? `#${cleanTag}` : undefined,
              });
            }
          }
        }
      } else {
        setRecentClan(null);
      }
    } catch {
      setRecentClan(null);
    }

    try {
      const sc = localStorage.getItem("wallart.scenery");
      setSavedSceneryId(sc && sc.trim() ? sc.trim() : null);
    } catch {
      setSavedSceneryId(null);
    }
  }, []);

  useEffect(() => {
    readLocalState();
    window.addEventListener("storage", readLocalState);
    return () => window.removeEventListener("storage", readLocalState);
  }, [readLocalState]);

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

  const sceneryDisplay = useMemo(() => {
    const cfg = getSceneryConfig(savedSceneryId || ASSETS_CONFIG.defaultSceneryId);
    return getSceneryDisplayName(cfg.id, cfg.name, locale);
  }, [savedSceneryId, locale]);

  const formattedMetaTime = useMemo(() => {
    if (!metaInfo?.lastUpdatedAt) return null;
    try {
      return fmtTime(metaInfo.lastUpdatedAt);
    } catch {
      return null;
    }
  }, [metaInfo?.lastUpdatedAt, fmtTime]);

  const cards: HubCardConfig[] = useMemo(
    () => [
      {
        id: "player-search",
        tab: "search",
        subAction: "player",
        hashRoute: "#/oyuncu",
        title: t.home.cards.playerSearch.title,
        subtitle: t.home.cards.playerSearch.subtitle,
        badgeTag: t.home.cards.playerSearch.badge,
        description: t.home.cards.playerSearch.desc,
        icon: <Users size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#3EA6F0] via-[#1D82D2] to-[#135994]",
        footerLabel: recentPlayer
          ? `${t.home.playerPrefix}: ${
              recentPlayer.name
                ? `${recentPlayer.name} (${recentPlayer.displayTag})`
                : recentPlayer.displayTag
            }`
          : isTr
          ? "6 Kahraman & Savaş Geçmişi"
          : "6 Heroes & Battle Log",
        hasLiveMetric: Boolean(recentPlayer),
      },
      {
        id: "clan-search",
        tab: "search",
        subAction: "clan",
        hashRoute: "#/klan",
        title: t.home.cards.clanSearch.title,
        subtitle: t.home.cards.clanSearch.subtitle,
        badgeTag: t.home.cards.clanSearch.badge,
        description: t.home.cards.clanSearch.desc,
        icon: <Shield size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#F5BC47] via-[#D98A2B] to-[#9E5B13]",
        footerLabel: recentClan
          ? `${t.home.clanPrefix}: ${
              recentClan.tag && recentClan.label !== recentClan.tag
                ? `${recentClan.label} (${recentClan.tag})`
                : recentClan.label
            }`
          : isTr
          ? "CWL Ligi & Bağış Analizi"
          : "CWL Standing & Donations",
        hasLiveMetric: Boolean(recentClan),
      },
      {
        id: "meta-armies",
        tab: "meta",
        hashRoute: "#/meta",
        title: t.home.cards.meta.title,
        subtitle: t.home.cards.meta.subtitle,
        badgeTag: t.home.cards.meta.badge,
        description: t.home.cards.meta.desc,
        icon: <Flame size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#EB7B4A] via-[#C85A32] to-[#8C3719]",
        footerLabel:
          metaInfo && metaInfo.totalRankedAttacks > 0
            ? `${fmtTemplate(t.home.cards.meta.sampleCount, {
                count: fmtNum(metaInfo.sampleSize),
              })} • ${fmtTemplate(t.home.cards.meta.attackCount, {
                count: fmtNum(metaInfo.totalRankedAttacks),
              })}`
            : isTr
            ? "Üst 200 Efsane Ligi Verisi"
            : "Top 200 Legend League Data",
        hasLiveMetric: Boolean(metaInfo && metaInfo.totalRankedAttacks > 0),
      },
      {
        id: "wall-art",
        tab: "wall",
        hashRoute: "#/duvar",
        title: t.home.cards.wall.title,
        subtitle: t.home.cards.wall.subtitle,
        badgeTag: t.home.cards.wall.badge,
        description: t.home.cards.wall.desc,
        icon: <PenTool size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#34B8AE] via-[#1D8A82] to-[#125C57]",
        footerLabel: fmtTemplate(t.home.cards.wall.scenery, { name: sceneryDisplay }),
        hasLiveMetric: true,
      },
      {
        id: "cwl-scout",
        tab: "cwl",
        hashRoute: "#/cwl",
        title: t.home.cards.cwl.title,
        subtitle: t.home.cards.cwl.subtitle,
        badgeTag: t.home.cards.cwl.badge,
        description: t.home.cards.cwl.desc,
        icon: <Swords size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#FFCE54] via-[#E09A1F] to-[#A66509]",
        footerLabel: isTr ? "15 / 30 Rakip Kadro Keşfi" : "15 / 30 Roster Scouting",
        hasLiveMetric: false,
      },
      {
        id: "ore-calc",
        tab: "ore",
        hashRoute: "#/cevher",
        title: t.home.cards.ore.title,
        subtitle: t.home.cards.ore.subtitle,
        badgeTag: t.home.cards.ore.badge,
        description: t.home.cards.ore.desc,
        icon: <TrendingUp size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]" />,
        iconGradient: "bg-gradient-to-b from-[#49C473] via-[#2B9952] to-[#1B6B38]",
        footerLabel: isTr ? "37 Lig Kademesi & Demirci" : "37 League Tiers & Smith",
        hasLiveMetric: false,
      },
    ],
    [t, isTr, fmtNum, fmtTemplate, recentPlayer, recentClan, metaInfo, sceneryDisplay]
  );

  const actionLabel = isTr ? "İncele" : "Explore";

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 font-sans">
      {/* 1. Hero Banner (Warm Wood Header Strip) */}
      <div
        className="w-full rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
        style={{
          background:
            "linear-gradient(180deg, var(--game-wood-header-light) 0%, var(--game-wood-header-dark) 100%)",
          border: "2.5px solid var(--game-wood-header-border)",
          boxShadow: "inset 0 1.5px 0 rgba(255, 255, 255, 0.15), 0 3px 6px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border-2 mt-0.5 sm:mt-0"
            style={{
              background:
                "linear-gradient(180deg, var(--game-btn-gold-top) 0%, var(--game-btn-gold-bot) 100%)",
              borderColor: "var(--game-btn-gold-border)",
              boxShadow:
                "0 2px 0 var(--game-btn-gold-bevel), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            }}
            aria-hidden="true"
          >
            <span className="font-game font-extrabold text-[#3B2214] text-base leading-none">
              i
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-game font-extrabold game-title-stroke text-sm sm:text-base md:text-lg tracking-tight uppercase leading-snug">
              {t.home.heroTitle}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#F5EBE0]/85 font-normal leading-relaxed mt-0.5">
              {t.home.heroSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {formattedMetaTime && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#FCD97E] tabular-nums"
              style={{
                background: "rgba(20, 16, 12, 0.45)",
                border: "1px solid rgba(255, 235, 117, 0.18)",
              }}
            >
              <Clock size={12} className="text-[#FFEB75]" />
              <span>
                {t.home.liveSample}: {formattedMetaTime}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => handleNavigate("search", "player", "#/oyuncu")}
            className="game-btn game-btn-silver text-xs font-game font-extrabold px-3.5 sm:px-4 min-h-[40px] shrink-0 flex items-center gap-1.5 uppercase tracking-wide"
          >
            <Search size={14} />
            <span>{t.home.quickSearch}</span>
          </button>
        </div>
      </div>

      {/* 2. Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
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
            aria-label={`${card.title} — ${card.description}`}
            className={cn(
              "group game-panel game-panel-wood rounded-xl sm:rounded-2xl p-3.5 sm:p-4 cursor-pointer select-none",
              "flex flex-col justify-between transition-all duration-150",
              "hover:brightness-105 hover:-translate-y-0.5",
              "active:scale-[0.985] active:translate-y-0.5 active:brightness-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFEB75]"
            )}
          >
            {/* Card Body */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Warm Cohesive Crest Badge */}
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 select-none",
                      card.iconGradient
                    )}
                    style={{
                      borderColor: "var(--game-wood-border)",
                      boxShadow:
                        "0 3px 0 var(--game-wood-shadow), inset 0 1.5px 0 rgba(255, 255, 255, 0.35)",
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0">
                    <h2 className="font-game font-extrabold game-title-stroke text-base sm:text-lg uppercase leading-tight truncate">
                      {card.title}
                    </h2>
                    <p className="text-xs font-bold text-[#FCD97E] tracking-tight truncate mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                {/* Top-Right Tag Chip */}
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase font-game tracking-wider text-[#FFEB75] select-none shrink-0 tabular-nums"
                  style={{
                    background: "rgba(20, 16, 12, 0.48)",
                    border: "1px solid rgba(255, 235, 117, 0.18)",
                  }}
                >
                  {card.badgeTag}
                </span>
              </div>

              {/* Concise Sans Description */}
              <p className="text-xs sm:text-[13px] text-[#F5EBE0]/90 font-normal leading-relaxed mt-2.5 mb-1 line-clamp-2">
                {card.description}
              </p>
            </div>

            {/* Balanced Recessed Slot Footer */}
            <div
              className="mt-3 py-2 px-2.5 sm:px-3 rounded-lg flex items-center justify-between gap-2 min-h-[38px]"
              style={{
                background:
                  "linear-gradient(180deg, var(--game-slot-bg-dark) 0%, var(--game-slot-bg-light) 100%)",
                border: "1.5px solid var(--game-slot-border)",
                boxShadow:
                  "inset 0 2px 4px var(--game-slot-inner-shadow), 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <span
                className={cn(
                  "text-[11px] sm:text-xs truncate min-w-0 tabular-nums",
                  card.hasLiveMetric
                    ? "font-semibold text-[#F5EFE6]"
                    : "font-medium text-[#D8C7B2]/85"
                )}
              >
                {card.footerLabel}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-extrabold font-game text-[#FFEB75] group-hover:translate-x-0.5 transition-transform shrink-0">
                <span>{actionLabel}</span>
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
