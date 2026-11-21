"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy,
  Swords,
  Shield,
  Flame,
  Users,
  Search,
  X,
  RefreshCw,
  Info,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SectionPanel, SkeletonBlock, GameButton } from "@/components/game";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import type { LeagueGroupData, LeagueGroupMember } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type LeagueGroupSortKey =
  | "trophies"
  | "bestAttack"
  | "bestDefense"
  | "mostActive";

export interface PlayerLeagueGroupSectionProps {
  playerTag: string;
  leagueName?: string;
  leagueIconUrl?: string;
  className?: string;
}

const DEFAULT_VISIBLE_COUNT = 25;

function normalizeTag(tag?: string): string {
  return (tag || "").replace(/^#/, "").trim().toUpperCase();
}

function formatTagWithHash(tag?: string): string {
  const clean = normalizeTag(tag);
  return clean ? `#${clean}` : "";
}

function sortMembersList(
  members: LeagueGroupMember[],
  sortBy: LeagueGroupSortKey
): LeagueGroupMember[] {
  const list = [...members];
  list.sort((a, b) => {
    switch (sortBy) {
      case "bestAttack":
        return (
          b.attackWinCount - a.attackWinCount ||
          b.attackWinRate - a.attackWinRate ||
          b.leagueTrophies - a.leagueTrophies ||
          a.rank - b.rank
        );
      case "bestDefense":
        return (
          b.defenseWinCount - a.defenseWinCount ||
          b.defenseWinRate - a.defenseWinRate ||
          a.defenseLoseCount - b.defenseLoseCount ||
          b.leagueTrophies - a.leagueTrophies ||
          a.rank - b.rank
        );
      case "mostActive":
        return (
          b.attackTotal +
            b.defenseTotal -
            (a.attackTotal + a.defenseTotal) ||
          b.leagueTrophies - a.leagueTrophies ||
          a.rank - b.rank
        );
      case "trophies":
      default:
        return b.leagueTrophies - a.leagueTrophies || a.rank - b.rank;
    }
  });
  return list;
}

/**
 * PlayerLeagueGroupSection
 * Displays the player's 100-player ranked League Season Group leaderboard,
 * supporting current/previous season toggle, multi-metric sorting, search filtering,
 * Top 25 / All expansion, and current-player highlight summary.
 */
export default function PlayerLeagueGroupSection({
  playerTag,
  leagueName,
  leagueIconUrl,
  className,
}: PlayerLeagueGroupSectionProps) {
  const { isTr, t, fmtNum, fmtPct, getApiErrorMessage } = useLanguage();
  const cleanTag = useMemo(() => normalizeTag(playerTag), [playerTag]);

  const [seasonSelection, setSeasonSelection] = useState<{
    tag: string;
    season: "current" | "previous";
  }>({ tag: cleanTag, season: "current" });
  const seasonMode =
    seasonSelection.tag === cleanTag ? seasonSelection.season : "current";

  const [reloadNonce, setReloadNonce] = useState(0);
  const [data, setData] = useState<LeagueGroupData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(cleanTag));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<LeagueGroupSortKey>("trophies");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAll, setShowAll] = useState<boolean>(false);

  const currentPlayerDesktopRef = useRef<HTMLTableRowElement | null>(null);
  const currentPlayerMobileRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<boolean>(false);

  useEffect(() => {
    setSearchQuery("");
    setShowAll(false);
    setSortBy("trophies");
  }, [cleanTag]);

  useEffect(() => {
    if (!cleanTag) {
      setData(null);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setErrorMessage(null);

    safeFetchJson<LeagueGroupData>(
      `/api/v1/players/${encodeURIComponent(cleanTag)}/leaguegroup?season=${seasonMode}`
    )
      .then((resp) => {
        if (isCancelled) return;
        setData(resp);
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setData(null);
        setErrorMessage(
          getApiErrorMessage(
            err,
            isTr
              ? "Lig grubu sıralaması şu an yüklenemedi."
              : "Unable to load league group leaderboard."
          )
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cleanTag, seasonMode, reloadNonce, getApiErrorMessage, isTr]);

  const members = useMemo(() => data?.members ?? [], [data?.members]);

  const currentPlayerMember = useMemo(() => {
    return (
      members.find(
        (m) => m.isCurrentPlayer || normalizeTag(m.playerTag) === cleanTag
      ) ?? null
    );
  }, [members, cleanTag]);

  const sortedMembers = useMemo(
    () => sortMembersList(members, sortBy),
    [members, sortBy]
  );

  const indexedMembers = useMemo(() => {
    return sortedMembers.map((member, idx) => ({
      member,
      sortPosition: idx + 1,
    }));
  }, [sortedMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return indexedMembers;
    const qNoHash = q.replace(/^#/, "");
    return indexedMembers.filter(({ member }) => {
      const pName = (member.playerName || "").toLowerCase();
      const pTag = normalizeTag(member.playerTag).toLowerCase();
      const cName = (member.clanName || "").toLowerCase();
      const cTag = normalizeTag(member.clanTag).toLowerCase();
      return (
        pName.includes(q) ||
        pTag.includes(qNoHash) ||
        cName.includes(q) ||
        cTag.includes(qNoHash)
      );
    });
  }, [indexedMembers, searchQuery]);

  const visibleMembers = useMemo(() => {
    if (showAll || filteredMembers.length <= DEFAULT_VISIBLE_COUNT) {
      return filteredMembers;
    }
    return filteredMembers.slice(0, DEFAULT_VISIBLE_COUNT);
  }, [filteredMembers, showAll]);

  const pinnedCurrentEntry = useMemo(() => {
    if (!currentPlayerMember || showAll) return null;
    const idxInFiltered = filteredMembers.findIndex(
      ({ member }) =>
        member.isCurrentPlayer || normalizeTag(member.playerTag) === cleanTag
    );
    if (idxInFiltered === -1 || idxInFiltered < DEFAULT_VISIBLE_COUNT) {
      return null;
    }
    return filteredMembers[idxInFiltered];
  }, [currentPlayerMember, filteredMembers, showAll, cleanTag]);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const targetEl =
      currentPlayerDesktopRef.current &&
      currentPlayerDesktopRef.current.offsetParent !== null
        ? currentPlayerDesktopRef.current
        : currentPlayerMobileRef.current;

    if (targetEl) {
      pendingScrollRef.current = false;
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [visibleMembers, showAll]);

  const handleJumpToCurrentPlayer = () => {
    if (searchQuery.trim()) {
      setSearchQuery("");
    }
    if (!showAll) {
      pendingScrollRef.current = true;
      setShowAll(true);
      return;
    }
    const targetEl =
      currentPlayerDesktopRef.current &&
      currentPlayerDesktopRef.current.offsetParent !== null
        ? currentPlayerDesktopRef.current
        : currentPlayerMobileRef.current;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNavigatePlayer = (targetTag: string) => {
    const clean = normalizeTag(targetTag);
    if (!clean || clean === cleanTag) return;
    window.location.hash = `#/oyuncu/${clean}`;
  };

  const handleNavigateClan = (targetClanTag?: string) => {
    const clean = normalizeTag(targetClanTag);
    if (!clean) return;
    window.location.hash = `#/klan/${clean}`;
  };

  const sortOptions = useMemo(
    () => [
      {
        id: "trophies" as const,
        label: isTr ? "Kupa Sıralaması" : "League Trophies",
        icon: <Trophy size={13} aria-hidden="true" />,
      },
      {
        id: "bestAttack" as const,
        label: isTr ? "En İyi Saldıran" : "Best Attacker",
        icon: <Swords size={13} aria-hidden="true" />,
      },
      {
        id: "bestDefense" as const,
        label: isTr ? "En İyi Savunma Alan" : "Best Defender",
        icon: <Shield size={13} aria-hidden="true" />,
      },
      {
        id: "mostActive" as const,
        label: isTr ? "En Aktif" : "Most Active",
        icon: <Flame size={13} aria-hidden="true" />,
      },
    ],
    [isTr]
  );

  const resolvedLeagueIcon =
    leagueIconUrl ||
    data?.leagueTier?.iconUrls?.small ||
    data?.leagueTier?.iconUrls?.medium ||
    "/icons/ui/trophy.png";

  const titleText = isTr
    ? "Lig Sezonu Grup Sıralaması"
    : "League Season Group Leaderboard";

  const totalMembersCount = data?.totalMembers ?? members.length;
  const isPreviousActive = Boolean(data?.isPreviousSeason);
  const canToggleSeason = Boolean(data?.hasCurrent && data?.hasPrevious);
  const formattedGroupTag = formatTagWithHash(data?.groupTag);
  const winLabel = isTr ? "G" : "W";
  const lossLabel = isTr ? "M" : "L";

  const handleSeasonToggle = (nextSeason: "current" | "previous") => {
    if (nextSeason === seasonMode) return;
    setSeasonSelection({ tag: cleanTag, season: nextSeason });
  };

  const renderMemberRowDesktop = (
    entry: { member: LeagueGroupMember; sortPosition: number },
    isPinnedExtra = false
  ) => {
    const { member, sortPosition } = entry;
    const isSelf =
      member.isCurrentPlayer || normalizeTag(member.playerTag) === cleanTag;
    const hasClan = Boolean(normalizeTag(member.clanTag) || member.clanName);
    const showRankSubBadge =
      sortBy !== "trophies" || Boolean(searchQuery.trim());

    return (
      <tr
        key={`${isPinnedExtra ? "pinned-" : ""}${member.playerTag}-${sortPosition}`}
        ref={
          isSelf && !isPinnedExtra
            ? (el) => {
                currentPlayerDesktopRef.current = el;
              }
            : undefined
        }
        className={cn(
          "transition-colors",
          isSelf
            ? "bg-amber-950/60 hover:bg-amber-950/75"
            : "bg-[var(--game-slot-bg-dark)] hover:bg-[var(--game-slot-bg-light)]/75"
        )}
      >
        {/* Sorted # + Trophy Rank */}
        <td
          className={cn(
            "py-2.5 pl-3 pr-2 text-center align-middle",
            isSelf && "border-l-4 border-[var(--ui-text-gold)]"
          )}
        >
          <div className="flex flex-col items-center justify-center gap-0.5 tabular-nums">
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[30px] h-[28px] px-1.5 rounded-lg text-xs font-black border",
                sortPosition === 1
                  ? "bg-amber-500/20 border-[var(--ui-text-gold)] text-[var(--ui-text-gold)]"
                  : sortPosition === 2
                  ? "bg-stone-400/20 border-stone-300/60 text-stone-100"
                  : sortPosition === 3
                  ? "bg-orange-700/25 border-orange-400/60 text-orange-200"
                  : isSelf
                  ? "bg-[var(--game-dark-box-dark)] border-[var(--ui-text-gold)] text-[var(--ui-text-gold)]"
                  : "bg-[var(--game-dark-box-dark)] border-[var(--ui-info-border)] text-[var(--ui-text-main)]"
              )}
            >
              {fmtNum(sortPosition)}
            </span>
            {showRankSubBadge && (
              <span
                className="text-[10px] font-bold text-[var(--ui-text-muted)]"
                title={isTr ? "Kupa Sırası" : "Trophy Rank"}
              >
                #{fmtNum(member.rank)}
              </span>
            )}
          </div>
        </td>

        {/* Player Name & Tag */}
        <td className="py-2.5 px-3 align-middle">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => handleNavigatePlayer(member.playerTag)}
              disabled={isSelf}
              className={cn(
                "text-left min-w-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)] rounded",
                isSelf ? "cursor-default" : "cursor-pointer"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    "game-text-stroke-sm text-sm font-bold truncate max-w-[190px]",
                    isSelf
                      ? "text-[var(--ui-text-gold)]"
                      : "text-[var(--ui-text-main)] group-hover:text-[var(--ui-text-gold)] group-hover:underline"
                  )}
                >
                  {member.playerName || member.playerTag}
                </span>
                {isSelf && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[var(--ui-text-gold)] text-[#24130A] shrink-0 leading-none">
                    {isTr ? "Sen" : "You"}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums truncate">
                {formatTagWithHash(member.playerTag)}
              </div>
            </button>
          </div>
        </td>

        {/* Clan Name & Tag */}
        <td className="py-2.5 px-3 align-middle">
          {hasClan ? (
            <button
              type="button"
              onClick={() => handleNavigateClan(member.clanTag)}
              disabled={!normalizeTag(member.clanTag)}
              className={cn(
                "text-left min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]",
                normalizeTag(member.clanTag)
                  ? "cursor-pointer group"
                  : "cursor-default"
              )}
            >
              <div className="text-xs sm:text-sm font-semibold text-[var(--ui-text-main)] truncate max-w-[170px] group-hover:text-[var(--ui-text-gold)] group-hover:underline">
                {member.clanName || formatTagWithHash(member.clanTag)}
              </div>
              {member.clanTag && (
                <div className="text-[11px] font-medium text-[var(--ui-text-muted)] tabular-nums truncate">
                  {formatTagWithHash(member.clanTag)}
                </div>
              )}
            </button>
          ) : (
            <span className="text-xs font-medium text-[var(--ui-text-muted)]/70">
              —
            </span>
          )}
        </td>

        {/* League Trophies */}
        <td className="py-2.5 px-3 text-right align-middle tabular-nums">
          <div className="inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)]">
            <img
              src="/icons/ui/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 select-none"
            />
            <span className="text-xs sm:text-sm font-black text-[var(--ui-text-gold)]">
              {fmtNum(member.leagueTrophies)}
            </span>
          </div>
        </td>

        {/* Attack Win/Loss (Rate%) */}
        <td className="py-2.5 px-3 text-right align-middle tabular-nums">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-[var(--ui-text-main)]">
              {fmtNum(member.attackWinCount)}
              {winLabel} / {fmtNum(member.attackLoseCount)}
              {lossLabel}
            </span>
            <span
              className={cn(
                "text-[11px] font-extrabold",
                member.attackWinRate >= 60
                  ? "text-[var(--ui-text-green)]"
                  : member.attackWinRate >= 40
                  ? "text-[var(--ui-text-gold)]"
                  : "text-[var(--ui-text-muted)]"
              )}
            >
              {fmtPct(member.attackWinRate, 1)}
            </span>
          </div>
        </td>

        {/* Defense Win/Loss (Rate%) */}
        <td className="py-2.5 pl-3 pr-3.5 text-right align-middle tabular-nums">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-[var(--ui-text-main)]">
              {fmtNum(member.defenseWinCount)}
              {winLabel} / {fmtNum(member.defenseLoseCount)}
              {lossLabel}
            </span>
            <span
              className={cn(
                "text-[11px] font-extrabold",
                member.defenseWinRate >= 50
                  ? "text-[var(--ui-text-green)]"
                  : member.defenseWinRate >= 25
                  ? "text-[var(--ui-text-gold)]"
                  : "text-[var(--ui-text-muted)]"
              )}
            >
              {fmtPct(member.defenseWinRate, 1)}
            </span>
          </div>
        </td>
      </tr>
    );
  };

  const renderMemberCardMobile = (
    entry: { member: LeagueGroupMember; sortPosition: number },
    isPinnedExtra = false
  ) => {
    const { member, sortPosition } = entry;
    const isSelf =
      member.isCurrentPlayer || normalizeTag(member.playerTag) === cleanTag;
    const hasClan = Boolean(normalizeTag(member.clanTag) || member.clanName);
    const showRankSubBadge =
      sortBy !== "trophies" || Boolean(searchQuery.trim());

    return (
      <div
        key={`${isPinnedExtra ? "pinned-m-" : ""}${member.playerTag}-${sortPosition}`}
        ref={
          isSelf && !isPinnedExtra
            ? (el) => {
                currentPlayerMobileRef.current = el;
              }
            : undefined
        }
        className={cn(
          "rounded-xl p-3 border space-y-2 transition-colors",
          isSelf
            ? "bg-amber-950/60 border-[var(--ui-text-gold)] ring-1 ring-[var(--ui-text-gold)]/40"
            : "bg-[var(--game-slot-bg-dark)] border-[var(--ui-info-border)]"
        )}
      >
        {/* Top Row: Rank + Player + Trophies */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex flex-col items-center shrink-0 tabular-nums">
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[30px] h-[28px] px-1.5 rounded-lg text-xs font-black border",
                  sortPosition <= 3
                    ? "bg-amber-500/20 border-[var(--ui-text-gold)] text-[var(--ui-text-gold)]"
                    : "bg-[var(--game-dark-box-dark)] border-[var(--ui-info-border)] text-[var(--ui-text-main)]"
                )}
              >
                {fmtNum(sortPosition)}
              </span>
              {showRankSubBadge && (
                <span className="text-[10px] font-bold text-[var(--ui-text-muted)] mt-0.5">
                  #{fmtNum(member.rank)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleNavigatePlayer(member.playerTag)}
              disabled={isSelf}
              className={cn(
                "text-left min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]",
                isSelf ? "cursor-default" : "cursor-pointer"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    "game-text-stroke-sm text-sm font-bold truncate",
                    isSelf
                      ? "text-[var(--ui-text-gold)]"
                      : "text-[var(--ui-text-main)]"
                  )}
                >
                  {member.playerName || member.playerTag}
                </span>
                {isSelf && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[var(--ui-text-gold)] text-[#24130A] shrink-0 leading-none">
                    {isTr ? "Sen" : "You"}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums truncate">
                {formatTagWithHash(member.playerTag)}
              </div>
            </button>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] tabular-nums shrink-0">
            <img
              src="/icons/ui/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 select-none"
            />
            <span className="text-xs font-black text-[var(--ui-text-gold)]">
              {fmtNum(member.leagueTrophies)}
            </span>
          </div>
        </div>

        {/* Clan Row */}
        {hasClan && (
          <div className="flex items-center justify-between text-xs border-t border-[var(--ui-info-border)]/70 pt-1.5">
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] shrink-0">
              {isTr ? "Klan:" : "Clan:"}
            </span>
            <button
              type="button"
              onClick={() => handleNavigateClan(member.clanTag)}
              disabled={!normalizeTag(member.clanTag)}
              className={cn(
                "text-right truncate max-w-[75%] font-semibold text-[var(--ui-text-main)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]",
                normalizeTag(member.clanTag) && "hover:text-[var(--ui-text-gold)]"
              )}
            >
              {member.clanName || formatTagWithHash(member.clanTag)}{" "}
              {member.clanTag && (
                <span className="text-[10px] text-[var(--ui-text-muted)] tabular-nums">
                  ({formatTagWithHash(member.clanTag)})
                </span>
              )}
            </button>
          </div>
        )}

        {/* Attack & Defense 2-Col Mini Grid */}
        <div className="grid grid-cols-2 gap-2 pt-0.5 tabular-nums">
          <div className="bg-[var(--game-dark-box-dark)]/80 border border-[var(--ui-info-border)] rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--ui-text-muted)] uppercase">
              <Swords size={11} aria-hidden="true" />
              <span>{isTr ? "Saldırı" : "Attack"}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[var(--ui-text-main)]">
                {fmtNum(member.attackWinCount)}
                {winLabel} / {fmtNum(member.attackLoseCount)}
                {lossLabel}
              </span>
              <span className="text-[11px] font-extrabold text-[var(--ui-text-green)]">
                {fmtPct(member.attackWinRate, 1)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--game-dark-box-dark)]/80 border border-[var(--ui-info-border)] rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--ui-text-muted)] uppercase">
              <Shield size={11} aria-hidden="true" />
              <span>{isTr ? "Savunma" : "Defense"}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-xs font-bold text-[var(--ui-text-main)]">
                {fmtNum(member.defenseWinCount)}
                {winLabel} / {fmtNum(member.defenseLoseCount)}
                {lossLabel}
              </span>
              <span className="text-[11px] font-extrabold text-[var(--ui-text-gold)]">
                {fmtPct(member.defenseWinRate, 1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionPanel className={cn("space-y-3.5", className)}>
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-[var(--ui-panel-border)] pb-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] flex items-center justify-center shrink-0 p-1">
            <img
              src={resolvedLeagueIcon}
              alt={leagueName || titleText}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-game text-sm sm:text-base font-extrabold tracking-tight text-[var(--ui-text-main)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                {titleText}
              </h3>
              {formattedGroupTag && (
                <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-gold)] tabular-nums">
                  {formattedGroupTag}
                </span>
              )}
            </div>
            {leagueName && (
              <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {leagueName}
                {data?.seasonId !== undefined && data?.seasonId !== "" && (
                  <span className="ml-1.5 opacity-80 tabular-nums">
                    • {isTr ? "Sezon" : "Season"} {String(data.seasonId)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Season Toggle / Badge + Total Players Pill */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {data?.available && (
            <>
              {canToggleSeason ? (
                <div
                  className="inline-flex items-center p-0.5 rounded-xl bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)]"
                  role="group"
                  aria-label={isTr ? "Lig Sezonu Seçimi" : "League Season Toggle"}
                >
                  <button
                    type="button"
                    onClick={() => handleSeasonToggle("current")}
                    aria-pressed={!isPreviousActive && seasonMode === "current"}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors min-h-[34px] cursor-pointer",
                      !isPreviousActive && seasonMode === "current"
                        ? "bg-[var(--game-cream-mid)] text-[#24130A] shadow-sm"
                        : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                    )}
                  >
                    {isTr ? "Mevcut Sezon" : "Current Season"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeasonToggle("previous")}
                    aria-pressed={isPreviousActive || seasonMode === "previous"}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors min-h-[34px] cursor-pointer",
                      isPreviousActive || seasonMode === "previous"
                        ? "bg-[var(--game-cream-mid)] text-[#24130A] shadow-sm"
                        : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                    )}
                  >
                    {isTr ? "Önceki Sezon" : "Previous Season"}
                  </button>
                </div>
              ) : (
                <span className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-muted)]">
                  {isPreviousActive
                    ? isTr
                      ? "Önceki Sezon"
                      : "Previous Season"
                    : isTr
                    ? "Mevcut Sezon"
                    : "Current Season"}
                </span>
              )}

              <span className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-[var(--ui-text-main)] tabular-nums">
                <Users size={13} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
                <span>{fmtNum(totalMembersCount)}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="space-y-2.5">
          <SkeletonBlock height="64px" className="rounded-xl" />
          <div className="flex gap-2">
            <SkeletonBlock height="38px" className="w-32 rounded-lg" />
            <SkeletonBlock height="38px" className="w-32 rounded-lg" />
            <SkeletonBlock height="38px" className="w-32 rounded-lg" />
          </div>
          <SkeletonBlock height="52px" className="rounded-xl" />
          <SkeletonBlock height="52px" className="rounded-xl" />
          <SkeletonBlock height="52px" className="rounded-xl" />
        </div>
      )}

      {/* 3. Graceful Error State */}
      {!loading && errorMessage && (
        <div className="ui-info p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--ui-text-muted)] font-medium">
            <Info size={16} className="text-[var(--ui-text-gold)] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <GameButton
            variant="green"
            size="sm"
            onClick={() => setReloadNonce((n) => n + 1)}
            icon={<RefreshCw size={13} />}
            className="min-h-[40px] px-3 text-xs shrink-0"
          >
            {t.common.retry}
          </GameButton>
        </div>
      )}

      {/* 4. Unavailable State (Unranked / #0 / Legend I Global Pool / Expired) */}
      {!loading && !errorMessage && data && !data.available && (
        <div className="ui-info p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Info
              size={17}
              className="text-[var(--ui-text-gold)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[var(--ui-text-main)]">
                {isTr
                  ? "Bu oyuncu şu anda 100 kişilik bir Lig Grubu sıralamasına atanmamış."
                  : "This player is not currently assigned to a 100-player League Group leaderboard."}
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-[var(--ui-text-muted)]">
                {data.reason === "league_group_not_found"
                  ? isTr
                    ? "Grup kaydı süresi dolmuş veya sezon sıfırlanmış olabilir."
                    : "The league group record may have expired or rotated between seasons."
                  : isTr
                  ? "Sıralanmamış (#0) oyuncular veya küresel Efsane I havuzundaki oyuncular için grup tablosu oluşturulmaz."
                  : "Players who are Unranked (#0) or in the global Legend I pool do not belong to a 100-player league group."}
              </p>
            </div>
          </div>

          {data.reason === "league_group_unavailable" && (
            <GameButton
              variant="green"
              size="sm"
              onClick={() => setReloadNonce((n) => n + 1)}
              icon={<RefreshCw size={13} />}
              className="min-h-[40px] px-3 text-xs shrink-0"
            >
              {t.common.retry}
            </GameButton>
          )}
        </div>
      )}

      {/* 5. Available Leaderboard View */}
      {!loading && !errorMessage && data?.available && (
        <div className="space-y-3">
          {/* 5A. Current Player Highlight Summary Bar */}
          {currentPlayerMember && (
            <div className="ui-info p-3 border-[var(--ui-text-gold)]/55 shadow-inner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--ui-text-gold)] text-[#24130A] text-[11px] font-black uppercase tracking-wide shrink-0">
                    {isTr ? "Grup Konumun" : "Your Group Standing"}
                  </span>
                  <span className="game-text-stroke-sm text-sm font-black text-[var(--ui-text-gold)] tabular-nums">
                    #{fmtNum(currentPlayerMember.rank)} / {fmtNum(totalMembersCount)}
                  </span>
                  <span className="text-xs font-bold text-[var(--ui-text-main)] truncate max-w-[180px]">
                    {currentPlayerMember.playerName}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap tabular-nums">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-xs font-black text-[var(--ui-text-gold)]">
                    <img
                      src="/icons/ui/trophy.png"
                      alt=""
                      aria-hidden="true"
                      className="w-3.5 h-3.5 object-contain shrink-0 select-none"
                    />
                    <span>{fmtNum(currentPlayerMember.leagueTrophies)}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-xs font-bold">
                    <Swords size={12} className="text-[var(--ui-text-green)] shrink-0" aria-hidden="true" />
                    <span className="text-[var(--ui-text-muted)]">
                      {isTr ? "Saldırı:" : "Atk:"}
                    </span>
                    <span className="text-[var(--ui-text-main)]">
                      {fmtNum(currentPlayerMember.attackWinCount)} / {fmtNum(currentPlayerMember.attackTotal)}
                    </span>
                    <span className="text-[var(--ui-text-green)] font-extrabold">
                      ({fmtPct(currentPlayerMember.attackWinRate, 1)})
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-xs font-bold">
                    <Shield size={12} className="text-[var(--ui-text-gold)] shrink-0" aria-hidden="true" />
                    <span className="text-[var(--ui-text-muted)]">
                      {isTr ? "Savunma:" : "Def:"}
                    </span>
                    <span className="text-[var(--ui-text-main)]">
                      {fmtNum(currentPlayerMember.defenseWinCount)} / {fmtNum(currentPlayerMember.defenseTotal)}
                    </span>
                    <span className="text-[var(--ui-text-gold)] font-extrabold">
                      ({fmtPct(currentPlayerMember.defenseWinRate, 1)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleJumpToCurrentPlayer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--game-wood-mid)] hover:bg-[var(--game-wood-light)] border border-[var(--ui-panel-border)] text-xs font-bold text-[var(--ui-text-main)] transition-colors cursor-pointer min-h-[32px]"
                  >
                    <Crosshair size={12} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
                    <span>{isTr ? "Satırıma Git" : "Jump to Me"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5B. Controls Row: Sort Pills + Search Filter + Top 25 / All Toggle */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            {/* Sort Pills */}
            <div
              className="flex items-center gap-1.5 flex-wrap"
              role="group"
              aria-label={isTr ? "Sıralama ölçütü" : "Sort order"}
            >
              {sortOptions.map((opt) => {
                const active = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSortBy(opt.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer min-h-[38px]",
                      active
                        ? "bg-[var(--game-cream-mid)] text-[#24130A] border-[var(--game-cream-border)] shadow-sm"
                        : "bg-[var(--game-dark-box-mid)] text-[var(--ui-text-muted)] border-[var(--ui-info-border)] hover:text-[var(--ui-text-main)] hover:border-[var(--ui-panel-border)]"
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Top 25 / All Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="relative flex items-center bg-[var(--game-dark-box-dark)] border-2 border-[var(--ui-input-border)] rounded-xl min-h-[40px] px-2.5 focus-within:ring-2 focus-within:ring-[var(--ui-text-gold)] sm:w-64">
                <Search
                  size={15}
                  className="text-[var(--ui-text-muted)] shrink-0 mr-2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isTr
                      ? "Oyuncu veya klan ara..."
                      : "Search player or clan..."
                  }
                  aria-label={
                    isTr
                      ? "Oyuncu veya klan ara"
                      : "Search player or clan"
                  }
                  className="w-full bg-transparent text-base sm:text-xs font-semibold text-[var(--ui-text-main)] placeholder:text-[var(--ui-text-muted)]/65 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t.common.clear}
                    className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {filteredMembers.length > DEFAULT_VISIBLE_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--game-dark-box-mid)] hover:bg-[var(--game-dark-box-light)] border border-[var(--ui-info-border)] text-xs font-extrabold text-[var(--ui-text-gold)] min-h-[40px] cursor-pointer shrink-0 transition-colors tabular-nums"
                >
                  {showAll ? (
                    <>
                      <ChevronUp size={14} aria-hidden="true" />
                      <span>
                        {isTr
                          ? `İlk ${DEFAULT_VISIBLE_COUNT}'i Göster`
                          : `Show Top ${DEFAULT_VISIBLE_COUNT}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} aria-hidden="true" />
                      <span>
                        {isTr
                          ? `Tümünü Göster (${fmtNum(filteredMembers.length)})`
                          : `Show All (${fmtNum(filteredMembers.length)})`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 5C. Leaderboard Results */}
          {filteredMembers.length === 0 ? (
            <div className="ui-info p-5 text-center text-xs sm:text-sm font-semibold text-[var(--ui-text-muted)]">
              {isTr
                ? "Aramanızla eşleşen oyuncu veya klan bulunamadı."
                : "No players or clans matched your search."}
            </div>
          ) : (
            <>
              {/* Desktop Table (md+) */}
              <div className="hidden md:block ui-well p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="ui-panel-header text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)]">
                        <th scope="col" className="py-2.5 pl-3 pr-2 w-16 text-center">
                          #
                        </th>
                        <th scope="col" className="py-2.5 px-3 min-w-[180px]">
                          {isTr ? "Oyuncu" : "Player"}
                        </th>
                        <th scope="col" className="py-2.5 px-3 min-w-[150px]">
                          {isTr ? "Klan" : "Clan"}
                        </th>
                        <th scope="col" className="py-2.5 px-3 w-28 text-right">
                          {isTr ? "Lig Kupası" : "Trophies"}
                        </th>
                        <th scope="col" className="py-2.5 px-3 w-32 text-right">
                          {isTr ? "Saldırı" : "Attack"}
                        </th>
                        <th scope="col" className="py-2.5 pl-3 pr-3.5 w-32 text-right">
                          {isTr ? "Savunma" : "Defense"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--game-wood-header-border)]">
                      {visibleMembers.map((entry) => renderMemberRowDesktop(entry))}
                      {pinnedCurrentEntry && (
                        <>
                          <tr className="bg-[var(--game-dark-box-dark)]">
                            <td
                              colSpan={6}
                              className="py-1 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--ui-text-gold)]/85 border-y border-dashed border-[var(--ui-text-gold)]/35"
                            >
                              {isTr
                                ? `Senin Konumun (#${fmtNum(pinnedCurrentEntry.sortPosition)})`
                                : `Your Position (#${fmtNum(pinnedCurrentEntry.sortPosition)})`}
                            </td>
                          </tr>
                          {renderMemberRowDesktop(pinnedCurrentEntry, true)}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards (< md) */}
              <div className="md:hidden space-y-2">
                {visibleMembers.map((entry) => renderMemberCardMobile(entry))}
                {pinnedCurrentEntry && (
                  <>
                    <div className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--ui-text-gold)] border-y border-dashed border-[var(--ui-text-gold)]/40">
                      {isTr
                        ? `Senin Konumun (#${fmtNum(pinnedCurrentEntry.sortPosition)})`
                        : `Your Position (#${fmtNum(pinnedCurrentEntry.sortPosition)})`}
                    </div>
                    {renderMemberCardMobile(pinnedCurrentEntry, true)}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
