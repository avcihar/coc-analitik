"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserSearch,
  Users,
  Medal,
  LayoutGrid,
  Swords,
  Gem,
  History,
  Award,
  Grid3X3,
  Shield,
  Wrench,
} from "lucide-react";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import WoodStatusBanner from "./WoodStatusBanner";
import ToolLauncherCard from "./ToolLauncherCard";

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
  description: string;
  icon: React.ReactNode;
  footerText: string | null;
  footerIcon?: React.ReactNode;
}

interface RecentPlayerSummary {
  displayTag: string;
  name?: string;
}

interface RecentClanSummary {
  label: string;
  tag?: string;
}

export default function HomeHubView({ onNavigate, onSearchQuery }: HomeHubViewProps) {
  const { isTr, t, fmtNum, fmtTime } = useLanguage();

  const [metaInfo, setMetaInfo] = useState<{
    sampleSize: number;
    totalRankedAttacks: number;
    lastUpdatedAt: string | null;
  } | null>(null);

  const [recentPlayer, setRecentPlayer] = useState<RecentPlayerSummary | null>(null);
  const [recentClan, setRecentClan] = useState<RecentClanSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJson<any>("/api/v1/meta/top-analysis?sample_size=200");
        if (!cancelled && data) {
          setMetaInfo({
            sampleSize: Number(data.sampleSize) || 200,
            totalRankedAttacks: Number(data.totalRankedAttacksAnalyzed || data.totalBattlesAnalyzed) || 0,
            lastUpdatedAt: typeof data.dataFetchedAt === "string" ? data.dataFetchedAt : null,
          });
        }
      } catch {
        // Offline / unavailable
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
            } else {
              setRecentPlayer(null);
            }
          } else {
            setRecentPlayer(null);
          }
        } else {
          setRecentPlayer(null);
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
            } else {
              setRecentClan(null);
            }
          } else {
            setRecentClan(null);
          }
        } else {
          setRecentClan(null);
        }
      } else {
        setRecentClan(null);
      }
    } catch {
      setRecentClan(null);
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

  const handleQuickSearch = useCallback(
    (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) {
        handleNavigate("search", "player", "#/oyuncu");
        return;
      }

      const startsWithHash = trimmed.startsWith("#");
      const clean = trimmed.replace(/^#+/, "").trim().toUpperCase();
      const isTagLike = startsWithHash || /^[0289PYLQGRJCUV]{3,}$/i.test(clean);

      if (isTagLike && clean) {
        if (onSearchQuery) {
          onSearchQuery("player", clean);
        } else {
          window.location.hash = `#/oyuncu/${clean}`;
        }
        return;
      }

      if (onSearchQuery) {
        onSearchQuery("clanName", trimmed);
      } else {
        window.location.hash = `#/klan?q=${encodeURIComponent(trimmed)}`;
      }
    },
    [handleNavigate, onSearchQuery]
  );

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
        description: isTr ? "Etiketle oyuncu profilini gör" : "View player profile by tag",
        icon: <UserSearch size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: recentPlayer
          ? `${isTr ? "Son aranan" : "Recent"}: ${
              recentPlayer.name
                ? `${recentPlayer.name} (${recentPlayer.displayTag})`
                : recentPlayer.displayTag
            }`
          : null,
        footerIcon: <History size={14} className="text-[var(--ui-text-gold)]" />,
      },
      {
        id: "clan-search",
        tab: "search",
        subAction: "clan",
        hashRoute: "#/klan",
        title: t.home.cards.clanSearch.title,
        description: isTr ? "Ad veya filtreyle klan bul" : "Find clans by name or filters",
        icon: <Users size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: recentClan
          ? `${isTr ? "Son aranan" : "Recent"}: ${
              recentClan.tag && recentClan.label !== recentClan.tag
                ? `${recentClan.label} (${recentClan.tag})`
                : recentClan.label
            }`
          : null,
        footerIcon: <History size={14} className="text-[var(--ui-text-gold)]" />,
      },
      {
        id: "meta-armies",
        tab: "meta",
        hashRoute: "#/meta",
        title: t.home.cards.meta.title,
        description: isTr ? "En çok kazanan meta ordular" : "Top winning Legend League armies",
        icon: <Medal size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: metaInfo
          ? formattedMetaTime
            ? isTr
              ? `${fmtNum(metaInfo.sampleSize)} oyuncu • Son güncelleme ${formattedMetaTime}`
              : `${fmtNum(metaInfo.sampleSize)} players • Updated ${formattedMetaTime}`
            : isTr
            ? `${fmtNum(metaInfo.sampleSize)} oyuncu`
            : `${fmtNum(metaInfo.sampleSize)} players`
          : null,
        footerIcon: <Award size={14} className="text-[var(--ui-text-green)]" />,
      },
      {
        id: "wall-art",
        tab: "wall",
        hashRoute: "#/duvar",
        title: t.home.cards.wall.title,
        description: isTr ? "Köyünde duvarlarla yazı yaz" : "Design wall art on your village",
        icon: <LayoutGrid size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: isTr ? "44×44 ana köy" : "44×44 home village",
        footerIcon: <Grid3X3 size={14} className="text-[var(--ui-text-gold)]" />,
      },
      {
        id: "cwl-scout",
        tab: "cwl",
        hashRoute: "#/cwl",
        title: isTr ? "CWL Rakip Analizi" : "CWL Rival Scout",
        description: isTr ? "Rakip kadroyu ve ordularını incele" : "Inspect rival roster and armies",
        icon: <Swords size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: isTr ? "Klan etiketiyle" : "By clan tag",
        footerIcon: <Shield size={14} className="text-[var(--ui-text-gold)]" />,
      },
      {
        id: "ore-calc",
        tab: "ore",
        hashRoute: "#/cevher",
        title: t.home.cards.ore.title,
        description: isTr ? "Ekipman cevher planı ve süre tahmini" : "Equipment ore plan and time estimate",
        icon: <Gem size={20} className="text-[var(--ui-text-gold)]" />,
        footerText: isTr ? "TH18 ekipmanları" : "TH18 equipment",
        footerIcon: <Wrench size={14} className="text-[var(--ui-text-green)]" />,
      },
    ],
    [t, isTr, fmtNum, recentPlayer, recentClan, metaInfo, formattedMetaTime]
  );

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 font-sans">
      <WoodStatusBanner
        title={isTr ? "Oyuncu ve klan araçlarını keşfet!" : "Explore player and clan tools!"}
        placeholder={isTr ? "Oyuncu etiketi veya klan adı..." : "Player tag or clan name..."}
        buttonLabel={t.home.quickSearch}
        onQuickSearch={handleQuickSearch}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {cards.map((card) => (
          <ToolLauncherCard
            key={card.id}
            title={card.title}
            description={card.description}
            icon={card.icon}
            footerText={card.footerText}
            footerIcon={card.footerIcon}
            onClick={() => handleNavigate(card.tab, card.subAction, card.hashRoute)}
          />
        ))}
      </div>
    </div>
  );
}
