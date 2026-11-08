"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Trophy, ArrowUpDown, ChevronDown, Check, Shield } from "lucide-react";
import TownHallImage from "@/components/game/TownHallImage";
import type { ClanMember, ClanSortField, ClanSortOption } from "./types";

export interface ClanMemberListProps {
  members: ClanMember[];
  maxMembers?: number;
  highlightPlayerTag?: string | null;
  onSelectPlayer?: (playerTag: string) => void;
}

const SORT_OPTIONS: ClanSortOption[] = [
  { id: "trophies", label: "En Yüksek Lig ve Kupa" },
  { id: "donations", label: "Bağış" },
  { id: "donationsReceived", label: "Alınan Bağış" },
  { id: "name", label: "Ad" },
];

function formatMemberRole(role?: string): string {
  if (!role) return "Üye";
  const lower = role.toLowerCase();
  if (lower === "leader") return "Lider";
  if (lower === "coleader" || lower === "co_leader") return "Yardımcı Lider";
  if (lower === "admin" || lower === "elder") return "Büyük";
  if (lower === "member") return "Üye";
  return role;
}

function cleanTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

export default function ClanMemberList({
  members,
  maxMembers = 50,
  highlightPlayerTag,
  onSelectPlayer,
}: ClanMemberListProps) {
  const [sortField, setSortField] = useState<ClanSortField>("trophies");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const highlightedRowRef = useRef<HTMLDivElement | null>(null);

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

  // Sort member list
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
        return (a.name || "").localeCompare(b.name || "", "tr", { sensitivity: "base" });
      }
      return 0;
    });
    return list;
  }, [members, sortField]);

  const activeSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((opt) => opt.id === sortField)?.label || "Sırala";
  }, [sortField]);

  const handleMemberClick = (tag: string) => {
    const tagClean = cleanTag(tag);
    if (onSelectPlayer) {
      onSelectPlayer(tag);
    } else {
      window.location.hash = `#/oyuncu/${tagClean}`;
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* 1. Başlık Satırı: "Üye X/50" ve Sıralama Seçici */}
      <div className="clan-member-header">
        <div className="clan-member-count">
          Üye {members.length}/{maxMembers}
        </div>

        {/* Sıralama Seçici Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            className="clan-sort-button"
            aria-expanded={isSortDropdownOpen}
            aria-label="Üye sıralama seçici"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-700 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">{activeSortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          </button>

          {isSortDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white border border-gray-300 shadow-xl py-1.5 z-30">
              <div className="px-3 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
                Sıralama Ölçütü
              </div>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortField === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortField(opt.id);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-amber-100 text-amber-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Üye Listesi Satırları */}
      {sortedMembers.length === 0 ? (
        <div className="p-8 text-center text-gray-600 font-bold bg-white/40 rounded-xl border border-gray-300">
          Bu klana ait üye bilgisi bulunamadı.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member, idx) => {
            const memberClean = cleanTag(member.tag);
            const isHighlighted = activeHighlightTag === memberClean;

            return (
              <div
                key={member.tag || idx}
                ref={isHighlighted ? (el) => { highlightedRowRef.current = el; } : undefined}
                onClick={() => handleMemberClick(member.tag)}
                className={`clan-member-row p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isHighlighted ? "game-member-highlight" : ""
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleMemberClick(member.tag);
                  }
                }}
                title={`${member.name} (${member.tag}) profiline git`}
              >
                {/* Sol Taraf: Sıra No, Lig İkonu, BB Görseli, İsim & Rol */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Sıra Numarası (Yeşil Rozet) */}
                  <div className="clan-rank-badge">
                    {idx + 1}.
                  </div>

                  {/* Lig İkonu */}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                    {member.league?.iconUrls?.small ? (
                      <img
                        src={member.league.iconUrls.small}
                        alt={member.league.name || "Lig"}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain filter drop-shadow-sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-300/80 border border-gray-400/80 flex items-center justify-center text-gray-500">
                        <Shield className="w-4 h-4 opacity-70" />
                      </div>
                    )}
                  </div>

                  {/* Belediye Binası Görseli */}
                  <div className="shrink-0">
                    <TownHallImage
                      level={member.townHallLevel || 1}
                      size={40}
                      className="filter drop-shadow-sm"
                    />
                  </div>

                  {/* Oyuncu Adı ve Rolü */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-gray-900 truncate">
                        {member.name}
                      </span>
                      {member.expLevel && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/60 border border-amber-300/60 text-amber-900 shrink-0">
                          Lv.{member.expLevel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {formatMemberRole(member.role)}
                    </div>
                  </div>

                  {/* Mobil Ekran için Kupa Rozeti (üst satırda sağa yaslı) */}
                  <div className="sm:hidden ml-auto shrink-0">
                    <div className="clan-trophy-pill py-1 px-2.5 min-w-[70px] text-sm">
                      <span>{member.trophies?.toLocaleString() ?? 0}</span>
                      <Trophy className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Bağışlar ve Kupa Rozeti */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-black/10">
                  {/* Bağışlar Sütunu */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-700">
                    {/* Bağışlanan Birlikler */}
                    <div className="flex sm:flex-col items-center gap-1.5 sm:gap-0.5 text-left sm:text-center">
                      <span className="text-[10px] sm:text-[11px] text-gray-600 font-semibold sm:block">
                        Bağışlanan birlikler:
                      </span>
                      <div className="clan-donation-box">
                        {member.donations?.toLocaleString() ?? 0}
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-7 bg-gray-300/80" />

                    {/* Alınan Birlikler */}
                    <div className="flex sm:flex-col items-center gap-1.5 sm:gap-0.5 text-left sm:text-center">
                      <span className="text-[10px] sm:text-[11px] text-gray-600 font-semibold sm:block">
                        Alınan birlikler:
                      </span>
                      <div className="clan-donation-box">
                        {member.donationsReceived?.toLocaleString() ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Masaüstü Kupa Rozeti */}
                  <div className="hidden sm:inline-flex">
                    <div className="clan-trophy-pill" title={`${member.trophies} Kupa`}>
                      <span>{member.trophies?.toLocaleString() ?? 0}</span>
                      <Trophy className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
