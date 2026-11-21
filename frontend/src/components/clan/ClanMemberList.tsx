"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { ClanMember, ClanSortField, ClanSortOption, ClanVillageTab } from "./types";
import WoodDataTable from "./WoodDataTable";
import ResponsiveMemberList from "./ResponsiveMemberList";

export interface ClanMemberListProps {
  members: ClanMember[];
  maxMembers?: number;
  highlightPlayerTag?: string | null;
  onSelectPlayer?: (playerTag: string) => void;
  villageTab?: ClanVillageTab;
}

const INITIAL_PAGE_SIZE = 15;
const PAGE_STEP = 15;

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
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
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

  // Reset pagination when member list or sort changes
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [members, sortField]);

  // Ensure highlighted member is visible if present in sortedMembers
  const effectiveVisibleCount = useMemo(() => {
    if (!activeHighlightTag) return visibleCount;
    const highlightIdx = sortedMembers.findIndex(
      (m) => cleanTag(m.tag) === activeHighlightTag
    );
    if (highlightIdx >= visibleCount) {
      return highlightIdx + 1;
    }
    return visibleCount;
  }, [activeHighlightTag, sortedMembers, visibleCount]);

  const visibleMembers = useMemo(
    () => sortedMembers.slice(0, effectiveVisibleCount),
    [sortedMembers, effectiveVisibleCount]
  );

  // Auto-scroll highlighted row into view on load
  useEffect(() => {
    if (activeHighlightTag && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeHighlightTag, visibleMembers]);

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
      return "bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)] text-[var(--ui-text-gold)]";
    }
    if (lower === "coleader" || lower === "co_leader") {
      return "bg-[var(--game-dark-box-mid)] border border-[var(--game-cream-dark)] text-[var(--ui-text-muted)]";
    }
    if (lower === "admin" || lower === "elder") {
      return "bg-[var(--game-dark-box-mid)] border border-[var(--game-btn-green-mid)] text-[var(--ui-text-green)]";
    }
    return "bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] text-[var(--ui-text-main)]";
  };

  const handleMemberClick = (tag: string) => {
    const tagClean = cleanTag(tag);
    if (onSelectPlayer) {
      onSelectPlayer(tag);
    } else {
      window.location.hash = `#/oyuncu/${tagClean}`;
    }
  };

  const remainingCount = Math.max(0, sortedMembers.length - effectiveVisibleCount);

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
            <ArrowUpDown className="w-4 h-4 text-[var(--ui-text-main)] shrink-0" />
            <span className="truncate max-w-[160px] sm:max-w-none">{activeSortLabel}</span>
            <ChevronDown className="w-4 h-4 text-[var(--ui-text-muted)] shrink-0" />
          </button>

          {isSortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[var(--game-slot-bg-dark)] border-2 border-[var(--ui-panel-border)] shadow-xl py-1.5 z-30">
              <div className="px-3.5 py-1.5 text-xs font-extrabold text-[var(--ui-text-muted)] border-b border-[var(--ui-panel-border)] mb-1">
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
                        ? "bg-[var(--game-slot-bg-light)] text-[var(--ui-text-gold)]"
                        : "text-[var(--ui-text-main)] hover:bg-[var(--game-slot-bg-light)]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--ui-text-gold)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Member Rows: Desktop WoodDataTable + Mobile ResponsiveMemberList */}
      {sortedMembers.length === 0 ? (
        <div className="p-8 text-center text-[var(--ui-text-muted)] font-bold ui-well">
          {isTr ? "Bu klana ait üye bilgisi bulunamadı." : "No member information found for this clan."}
        </div>
      ) : (
        <>
          <WoodDataTable
            members={visibleMembers}
            activeHighlightTag={activeHighlightTag}
            highlightedRowRef={highlightedRowRef}
            villageTab={villageTab}
            onSelectMember={handleMemberClick}
            formatMemberRole={formatMemberRole}
            getRoleBadgeClasses={getRoleBadgeClasses}
          />

          <ResponsiveMemberList
            members={visibleMembers}
            activeHighlightTag={activeHighlightTag}
            highlightedRowRef={highlightedRowRef}
            villageTab={villageTab}
            onSelectMember={handleMemberClick}
            formatMemberRole={formatMemberRole}
            getRoleBadgeClasses={getRoleBadgeClasses}
          />

          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((prev) =>
                  Math.max(prev, effectiveVisibleCount) + PAGE_STEP
                )
              }
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--game-dark-box-mid)] hover:bg-[var(--game-slot-bg-light)] border-2 border-[var(--ui-panel-border)] text-[var(--ui-text-main)] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm tabular-nums"
            >
              <ChevronDown className="w-4 h-4 text-[var(--ui-text-gold)] shrink-0" />
              <span>
                {isTr
                  ? `Daha fazla göster (Kalan ${fmtNum(remainingCount)} Üye)`
                  : `Show more (${fmtNum(remainingCount)} remaining)`}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
