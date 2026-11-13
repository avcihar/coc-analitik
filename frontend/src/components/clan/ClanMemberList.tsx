"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Trophy, ArrowUpDown, ChevronDown, Check, Shield, ArrowUp, ArrowDown } from "lucide-react";
import TownHallImage from "@/components/game/TownHallImage";
import { useLanguage } from "@/lib/i18n";
import type { ClanMember, ClanSortField, ClanSortOption, ClanVillageTab } from "./types";
import { getMemberLeagueInfo } from "./leagueHelper";

export interface ClanMemberListProps {
  members: ClanMember[];
  maxMembers?: number;
  highlightPlayerTag?: string | null;
  onSelectPlayer?: (playerTag: string) => void;
  villageTab?: ClanVillageTab;
}

function cleanTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

export default function ClanMemberList({
  members,
  maxMembers = 50,
  highlightPlayerTag,
  onSelectPlayer,
  villageTab,
}: ClanMemberListProps) {
  const { locale, isTr, t, fmtNum, fmtTemplate } = useLanguage();

  const [sortField, setSortField] = useState<ClanSortField>("trophies");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const highlightedRowRef = useRef<HTMLElement | null>(null);

  const sortOptions = useMemo<ClanSortOption[]>(
    () => [
      { id: "trophies", label: t.clan.sortTrophies },
      { id: "donations", label: t.clan.sortDonations },
      { id: "donationsReceived", label: t.clan.received },
      { id: "name", label: isTr ? "Ad" : "Name" },
    ],
    [t, isTr]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Normalize highlight player tag from prop or URL hash (?vurgula=...)
  const activeHighlightTag = useMemo(() => {
    if (highlightPlayerTag) {
      return cleanTag(highlightPlayerTag);
    }
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex !== -1) {
        const params = new URLSearchParams(hash.substring(qIndex));
        const vurgula = params.get("vurgula");
        if (vurgula) return cleanTag(vurgula);
      }
    }
    return null;
  }, [highlightPlayerTag]);

  // Auto-scroll highlighted row into view on load
  useEffect(() => {
    if (activeHighlightTag && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeHighlightTag, members]);

  const sortedMembers = useMemo(() => {
    const list = [...members];
    list.sort((a, b) => {
      if (sortField === "trophies") {
        return (b.trophies || 0) - (a.trophies || 0);
      }
      if (sortField === "donations") {
        return (b.donations || 0) - (a.donations || 0);
      }
      if (sortField === "donationsReceived") {
        return (b.donationsReceived || 0) - (a.donationsReceived || 0);
      }
      if (sortField === "name") {
        return (a.name || "").localeCompare(b.name || "", locale === "tr" ? "tr" : "en", {
          sensitivity: "base",
        });
      }
      return 0;
    });
    return list;
  }, [members, sortField, locale]);

  const activeSortLabel = useMemo(() => {
    return sortOptions.find((opt) => opt.id === sortField)?.label || t.clan.sortLabel;
  }, [sortOptions, sortField, t]);

  const formatMemberRole = (role?: string): string => {
    if (!role) return t.player.roles.member;
    const lower = role.toLowerCase();
    if (lower === "leader") return t.player.roles.leader;
    if (lower === "coleader" || lower === "co_leader") return t.player.roles.coLeader;
    if (lower === "admin" || lower === "elder") return t.player.roles.admin;
    if (lower === "member") return t.player.roles.member;
    return role;
  };

  const getRoleBadgeClasses = (role?: string): string => {
    const lower = (role || "member").toLowerCase();
    if (lower === "leader") {
      return "bg-amber-200/90 border border-amber-500/70 text-[#5C3404]";
    }
    if (lower === "coleader" || lower === "co_leader") {
      return "bg-[#EFE0C9] border border-[#C9A87C] text-[#4E2F15]";
    }
    if (lower === "admin" || lower === "elder") {
      return "bg-[#E2F0D9] border border-[#8FC374] text-[#244B10]";
    }
    return "bg-[#EAE2D3] border border-[#C8BBA6] text-[#4A3D31]";
  };

  const handleMemberClick = (tag: string) => {
    const tagClean = cleanTag(tag);
    if (onSelectPlayer) {
      onSelectPlayer(tag);
    } else {
      window.location.hash = `#/oyuncu/${tagClean}`;
    }
  };

  const trophyTooltipSuffix =
    villageTab === "builderBase" ? t.player.builderTrophies : t.search.pointsUnit;

  return (
    <div className="w-full space-y-3">
      {/* 1. Header Row: Members (X/50) and Sort Dropdown */}
      <div className="clan-member-header">
        <div className="clan-member-count tabular-nums">
          {fmtTemplate(t.clan.membersTitle, {
            count: fmtNum(members.length),
            max: fmtNum(maxMembers),
          })}
        </div>

        {/* Sort Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            className="clan-sort-button min-h-[44px]"
            aria-expanded={isSortDropdownOpen}
            aria-label={t.clan.sortLabel}
          >
            <ArrowUpDown className="w-4 h-4 text-[#2D251E] shrink-0" />
            <span className="truncate max-w-[160px] sm:max-w-none">{activeSortLabel}</span>
            <ChevronDown className="w-4 h-4 text-[#5A4A3E] shrink-0" />
          </button>

          {isSortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#FFFDF8] border-2 border-[#C2B39C] shadow-xl py-1.5 z-30">
              <div className="px-3.5 py-1.5 text-xs font-extrabold text-[#5A4A3E] border-b border-[#DDD2C0] mb-1">
                {t.clan.sortLabel}
              </div>
              {sortOptions.map((opt) => {
                const isSelected = sortField === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortField(opt.id);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full min-h-[44px] text-left px-3.5 py-2 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-amber-100 text-[#4E2E04]"
                        : "text-[#2D251E] hover:bg-[#EFE8DA]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Member Rows */}
      {sortedMembers.length === 0 ? (
        <div className="p-8 text-center text-[#5A4A3E] font-bold bg-[#EFE8DA] rounded-xl border-2 border-[#C2B39C]">
          {isTr ? "Bu klana ait üye bilgisi bulunamadı." : "No member information found for this clan."}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member, idx) => {
            const memberClean = cleanTag(member.tag);
            const isHighlighted = activeHighlightTag === memberClean;
            const { iconUrl: leagueIconUrl, name: leagueName } = getMemberLeagueInfo(
              member,
              villageTab,
              locale
            );
            const roleLabel = formatMemberRole(member.role);

            return (
              <button
                key={member.tag || idx}
                type="button"
                ref={
                  isHighlighted
                    ? (el) => {
                        highlightedRowRef.current = el;
                      }
                    : undefined
                }
                onClick={() => handleMemberClick(member.tag)}
                className={`clan-member-row w-full text-left min-h-[56px] p-3 transition-all ${
                  isHighlighted ? "game-member-highlight" : ""
                }`}
                title={`${member.name} (${member.tag})`}
              >
                {/* MOBILE (< sm): Clean 2-Row Card preventing 94px name squishing */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {/* Mobile Top Row: Rank + 24px League Emblem + Full-Width Bold Player Name + Role Badge */}
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    <div className="clan-rank-badge !min-w-[30px] !h-[30px] !text-xs tabular-nums">
                      {fmtNum(idx + 1)}.
                    </div>

                    <div
                      className="w-6 h-6 flex items-center justify-center shrink-0"
                      title={leagueName}
                    >
                      {leagueIconUrl ? (
                        <img
                          src={leagueIconUrl}
                          alt={leagueName}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 object-contain filter drop-shadow-sm"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#EFE8DA] border border-[#C2B39C] flex items-center justify-center text-[#5A4A3E]">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <span className="min-w-0 flex-1 font-extrabold text-sm text-[#221C16] truncate">
                      {member.name}
                    </span>

                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold ${getRoleBadgeClasses(
                        member.role
                      )}`}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  {/* Mobile Bottom Row: TH Badge + Donations/Received + Trophies/BB Trophies */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#C8C1B4]/70 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* TH Badge */}
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#EFE8DA] border border-[#C2B39C] shrink-0">
                        <TownHallImage
                          level={member.townHallLevel || 1}
                          size={22}
                          className="filter drop-shadow-sm"
                        />
                        <span className="text-[11px] font-extrabold text-[#2D251E] tabular-nums">
                          {t.common.thShort} {fmtNum(member.townHallLevel || 1)}
                        </span>
                      </div>

                      {/* Donations / Received */}
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums">
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-[#FFFDF8] border border-[#C4BBA9] text-[#221C16] inline-flex items-center gap-0.5"
                          title={t.clan.donated}
                        >
                          <ArrowUp className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>{fmtNum(member.donations ?? 0)}</span>
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-[#FFFDF8] border border-[#C4BBA9] text-[#221C16] inline-flex items-center gap-0.5"
                          title={t.clan.received}
                        >
                          <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>{fmtNum(member.donationsReceived ?? 0)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile Trophy Pill */}
                    <div
                      className="clan-trophy-pill !py-1 !px-2.5 !min-w-[74px] !text-xs tabular-nums shrink-0"
                      title={`${fmtNum(member.trophies ?? 0)} ${trophyTooltipSuffix}`}
                    >
                      <span>{fmtNum(member.trophies ?? 0)}</span>
                      <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* DESKTOP (>= sm): Preserved Crisp Aligned Columns */}
                <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3 w-full">
                  {/* Left: Rank, League Icon, TownHall, Name + Exp Level + Role */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="clan-rank-badge tabular-nums">
                      {fmtNum(idx + 1)}.
                    </div>

                    <div
                      className="w-9 h-9 flex items-center justify-center shrink-0"
                      title={leagueName}
                    >
                      {leagueIconUrl ? (
                        <img
                          src={leagueIconUrl}
                          alt={leagueName}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#EFE8DA] border border-[#C2B39C] flex items-center justify-center text-[#5A4A3E]">
                          <Shield className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <TownHallImage
                        level={member.townHallLevel || 1}
                        size={40}
                        className="filter drop-shadow-sm"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-extrabold text-base text-[#221C16] truncate">
                          {member.name}
                        </span>
                        {Boolean(member.expLevel) && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-200/75 border border-amber-400/70 text-[#5C3404] shrink-0 tabular-nums">
                            {t.common.levelShort}{fmtNum(member.expLevel)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5A4A3E] font-semibold">
                        {roleLabel}
                      </div>
                    </div>
                  </div>

                  {/* Right: Aligned Donations Columns + Trophy Pill */}
                  <div className="flex items-center justify-end gap-4 shrink-0">
                    <div className="flex items-center gap-3.5 text-xs text-[#2D251E]">
                      <div className="min-w-[78px] flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[11px] text-[#5A4A3E] font-bold">
                          {t.clan.donated}
                        </span>
                        <div className="clan-donation-box tabular-nums w-full">
                          {fmtNum(member.donations ?? 0)}
                        </div>
                      </div>

                      <div className="w-px h-7 bg-[#C8C1B4]" />

                      <div className="min-w-[78px] flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[11px] text-[#5A4A3E] font-bold">
                          {t.clan.received}
                        </span>
                        <div className="clan-donation-box tabular-nums w-full">
                          {fmtNum(member.donationsReceived ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div
                      className="clan-trophy-pill min-w-[94px] tabular-nums"
                      title={`${fmtNum(member.trophies ?? 0)} ${trophyTooltipSuffix}`}
                    >
                      <span>{fmtNum(member.trophies ?? 0)}</span>
                      <Trophy className="w-5 h-5 text-amber-600 fill-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
