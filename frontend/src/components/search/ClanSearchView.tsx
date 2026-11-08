"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Users,
  Trophy,
  Shield,
  MapPin,
  Clock,
  X,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ClanBadge from "@/components/game/ClanBadge";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
import {
  normalizeTag,
  isValidTag,
  looksLikeTag,
  getRecentClanSearches,
  saveRecentClanSearch,
  removeRecentClanSearch,
  clearRecentClanSearches,
  type RecentClanSearchItem,
} from "./searchUtils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ClanSearchItemData {
  tag: string;
  name: string;
  clanLevel: number;
  clanPoints?: number;
  members: number;
  type?: "open" | "inviteOnly" | "closed" | string;
  location?: { id?: number; name?: string; isCountry?: boolean };
  badgeUrls?: { small?: string; medium?: string; large?: string };
  warWins?: number;
  warWinStreak?: number;
}

export interface ClanSearchViewProps {
  initialQuery?: string;
  onSelectClan?: (tag: string, clanData?: ClanSearchItemData) => void;
  className?: string;
}

/**
 * ClanSearchView component
 * Matches the official in-game clan search window (klan-ara.png):
 * - Input supporting clan name OR #tag directly
 * - Green 'Ara' button (.game-btn-panel-green)
 * - Green 'Arama Seçenekleri' toggle button (.game-btn-panel-green)
 * - Collapsible filter options (Min Level, Min Members, Min Points)
 * - Clan list rows with ClanBadge, level, tag, member count (X/50), type, location, trophies
 * - Cursor pagination ('Daha fazla göster')
 * - Turkish error and loading states (SkeletonBlock)
 */
export default function ClanSearchView({
  initialQuery = "",
  onSelectClan,
  className,
}: ClanSearchViewProps) {
  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Search filter options
  const [minClanLevel, setMinClanLevel] = useState<number | undefined>(undefined);
  const [minMembers, setMinMembers] = useState<number | undefined>(undefined);
  const [minClanPoints, setMinClanPoints] = useState<number | undefined>(undefined);

  // State
  const [clans, setClans] = useState<ClanSearchItemData[]>([]);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentClanSearchItem[]>([]);

  // Load recent clan searches
  useEffect(() => {
    setRecentSearches(getRecentClanSearches());
  }, []);

  // Update input if initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setQueryInput(initialQuery);
    }
  }, [initialQuery]);

  const executeSearch = useCallback(
    async (rawQuery: string, cursor?: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) {
        setErrorMessage("Lütfen aramak istediğin klan adını veya etiketini gir.");
        return;
      }

      const isPaginating = Boolean(cursor);
      if (isPaginating) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setErrorMessage(null);
        setHasSearched(true);
      }

      try {
        // Direct Tag Lookup Check (Starts with '#' or matches valid tag format without spaces)
        if (!isPaginating && (trimmed.startsWith("#") || (looksLikeTag(trimmed) && !trimmed.includes(" ")))) {
          const cleanTag = normalizeTag(trimmed);
          if (!isValidTag(cleanTag)) {
            setErrorMessage(
              "Geçersiz etiket biçimi! Clash etiketleri yalnızca 0, 2, 8, 9, P, Y, L, Q, G, R, J, C, U, V karakterlerini içerir."
            );
            setIsLoading(false);
            return;
          }

          const clanData = await safeFetchJson<ClanSearchItemData>(
            `/api/v1/clans/${encodeURIComponent(cleanTag)}`
          );

          setClans([clanData]);
          setAfterCursor(null);

          const updated = saveRecentClanSearch({
            query: cleanTag,
            isTag: true,
            tag: cleanTag,
            name: clanData.name,
          });
          setRecentSearches(updated);
          setIsLoading(false);
          return;
        }

        // Clan Name Search with Filters
        const params = new URLSearchParams();
        params.set("name", trimmed);
        params.set("limit", "16");

        if (minMembers !== undefined && minMembers > 0) {
          params.set("min_members", String(minMembers));
        }
        if (minClanLevel !== undefined && minClanLevel > 1) {
          params.set("min_clan_level", String(minClanLevel));
        }
        if (cursor) {
          params.set("after", cursor);
        }

        const data = await safeFetchJson<any>(`/api/v1/clans/search?${params.toString()}`);
        let fetchedItems: ClanSearchItemData[] = data.items || [];

        // Client-side minimum clan points filter if set
        if (minClanPoints && minClanPoints > 0) {
          fetchedItems = fetchedItems.filter(
            (c) => (c.clanPoints || 0) >= minClanPoints
          );
        }

        if (isPaginating) {
          setClans((prev) => [...prev, ...fetchedItems]);
        } else {
          setClans(fetchedItems);
          const updated = saveRecentClanSearch({
            query: trimmed,
            isTag: false,
            name: trimmed,
          });
          setRecentSearches(updated);
        }

        setAfterCursor(data.paging?.cursors?.after || null);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setErrorMessage("Klan bulunamadı (404). Lütfen adı veya etiketi kontrol edin.");
          } else if (err.status === 429) {
            setErrorMessage("Çok fazla istek yapıldı (429). Lütfen birkaç saniye bekleyin.");
          } else {
            setErrorMessage(err.message || "Klan araması sırasında bir hata oluştu.");
          }
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [minClanLevel, minMembers, minClanPoints]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(queryInput);
  };

  const handleSelectClanRow = (clan: ClanSearchItemData) => {
    const cleanTag = normalizeTag(clan.tag);

    // Save to history
    saveRecentClanSearch({
      query: cleanTag,
      isTag: true,
      tag: cleanTag,
      name: clan.name,
    });

    if (onSelectClan) {
      onSelectClan(cleanTag, clan);
    }

    if (typeof window !== "undefined") {
      window.location.hash = `#/klan/${cleanTag}`;
    }
  };

  const handleRecentClick = (item: RecentClanSearchItem) => {
    const q = item.isTag && item.tag ? `#${item.tag}` : item.query;
    setQueryInput(q);
    executeSearch(q);
  };

  const handleRemoveRecent = (e: React.MouseEvent, qOrTag: string) => {
    e.stopPropagation();
    const updated = removeRecentClanSearch(qOrTag);
    setRecentSearches(updated);
  };

  const handleResetFilters = () => {
    setMinClanLevel(undefined);
    setMinMembers(undefined);
    setMinClanPoints(undefined);
  };

  const hasActiveFilters =
    minClanLevel !== undefined || minMembers !== undefined || minClanPoints !== undefined;

  const formatClanType = (type?: string) => {
    if (type === "open") return "Herkese Açık";
    if (type === "inviteOnly") return "Davetle";
    if (type === "closed") return "Kapalı";
    return type || "Belirtilmemiş";
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto py-2 px-1 sm:px-4 space-y-4", className)}>
      {/* Top Search Form (Matches in-game klan-ara.png) */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="clan-search-input"
            className="font-bold text-stone-800 text-base sm:text-lg select-none whitespace-nowrap shrink-0"
          >
            Klan Ara:
          </label>

          {/* White input box */}
          <div className="game-input-container flex-1">
            <input
              id="clan-search-input"
              type="text"
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Klan adı veya #etiket gir"
              autoCapitalize="words"
              spellCheck={false}
              disabled={isLoading}
              className="game-input-field"
            />
          </div>

          {/* Buttons: Green 'Ara' and Green 'Arama Seçenekleri' */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={isLoading || !queryInput.trim()}
              className="game-btn-panel-green px-5 py-2.5 rounded-xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-white" />
              )}
              <span className="game-text-stroke-sm">Ara</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                "game-btn-panel-green px-4 py-2.5 rounded-xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer select-none",
                hasActiveFilters && "ring-2 ring-amber-300"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
              <span className="game-text-stroke-sm hidden sm:inline">Arama Seçenekleri</span>
              <span className="game-text-stroke-sm sm:hidden">Filtre</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-white transition-transform duration-200",
                  showFilters && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="p-4 rounded-xl bg-stone-200/80 border-2 border-stone-400/60 shadow-inner space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-300">
              <span className="font-bold text-stone-800 text-sm">Filtre Kriterleri</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Sıfırla
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Min Clan Level */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 select-none">
                  Min. Klan Seviyesi
                </label>
                <select
                  value={minClanLevel ?? ""}
                  onChange={(e) =>
                    setMinClanLevel(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border-2 border-stone-400 rounded-lg py-1.5 px-2.5 text-sm font-semibold text-stone-800 outline-none focus:border-amber-500"
                >
                  <option value="">Tümü</option>
                  <option value="2">Sv. 2+</option>
                  <option value="5">Sv. 5+</option>
                  <option value="10">Sv. 10+</option>
                  <option value="15">Sv. 15+</option>
                  <option value="20">Sv. 20+</option>
                </select>
              </div>

              {/* Min Members */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 select-none">
                  Min. Üye Sayısı
                </label>
                <select
                  value={minMembers ?? ""}
                  onChange={(e) =>
                    setMinMembers(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border-2 border-stone-400 rounded-lg py-1.5 px-2.5 text-sm font-semibold text-stone-800 outline-none focus:border-amber-500"
                >
                  <option value="">Tümü</option>
                  <option value="10">10+ Üye</option>
                  <option value="20">20+ Üye</option>
                  <option value="30">30+ Üye</option>
                  <option value="40">40+ Üye</option>
                </select>
              </div>

              {/* Min Clan Points */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 select-none">
                  Min. Klan Puanı
                </label>
                <select
                  value={minClanPoints ?? ""}
                  onChange={(e) =>
                    setMinClanPoints(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border-2 border-stone-400 rounded-lg py-1.5 px-2.5 text-sm font-semibold text-stone-800 outline-none focus:border-amber-500"
                >
                  <option value="">Tümü</option>
                  <option value="10000">10.000+ Kupa</option>
                  <option value="20000">20.000+ Kupa</option>
                  <option value="30000">30.000+ Kupa</option>
                  <option value="40000">40.000+ Kupa</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-100 border-2 border-red-300 text-red-800 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900 cursor-pointer p-0.5 rounded transition-colors"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {isLoading && (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-stone-200/60 border border-stone-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <SkeletonBlock width={48} height={48} className="rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <SkeletonBlock width="50%" height={18} />
                  <SkeletonBlock width="30%" height={14} />
                </div>
              </div>
              <SkeletonBlock width={80} height={24} className="rounded-md shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Results List */}
      {!isLoading && clans.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-xs text-stone-600 font-semibold select-none">
            <span>{clans.length} klan bulundu</span>
            <span>Satıra tıklayarak klan detayını aç</span>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {clans.map((clan) => {
              const cleanTag = normalizeTag(clan.tag);
              return (
                <div
                  key={cleanTag}
                  onClick={() => handleSelectClanRow(clan)}
                  className="group p-3 rounded-xl bg-white hover:bg-amber-50/80 border-2 border-stone-400/80 hover:border-amber-400 transition-all cursor-pointer shadow-sm flex items-center justify-between gap-3 select-none"
                >
                  {/* Left: Badge + Names */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ClanBadge
                      url={clan.badgeUrls?.medium || clan.badgeUrls?.small}
                      name={clan.name}
                      size={48}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-base group-hover:text-amber-800 transition-colors truncate">
                          {clan.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold shrink-0">
                          Sv. {clan.clanLevel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-600 mt-0.5 flex-wrap">
                        <span className="font-mono">#{cleanTag}</span>
                        <span>•</span>
                        <span>{formatClanType(clan.type)}</span>
                        {clan.location?.name && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-stone-500" />
                              {clan.location.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Member Count & Clan Points */}
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-stone-800">
                        <Users className="w-3.5 h-3.5 text-stone-600" />
                        {clan.members ?? 0}/50
                      </span>
                      <span className="text-xs text-stone-500">Üye</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        {(clan.clanPoints || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-500">Kupa</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination: 'Daha Fazla Göster' */}
          {afterCursor && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => executeSearch(queryInput, afterCursor)}
                disabled={isLoadingMore}
                className="game-btn-panel-green px-6 py-2 rounded-xl text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-sm"
              >
                {isLoadingMore ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span className="game-text-stroke-sm">Daha Fazla Göster</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State after search */}
      {!isLoading && hasSearched && clans.length === 0 && !errorMessage && (
        <div className="p-8 text-center rounded-xl bg-stone-200/50 border border-stone-300 space-y-2">
          <Shield className="w-10 h-10 text-stone-400 mx-auto" />
          <h4 className="font-bold text-stone-800 text-base">Klan Bulunamadı</h4>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Aradığın kriterlere uygun klan bulunamadı. Lütfen klan adını veya filtre seçeneklerini değiştirip tekrar dene.
          </p>
        </div>
      )}

      {/* Recent Searches Section (Son Aramalar) */}
      {!hasSearched && (
        <div className="mt-6 pt-5 border-t border-stone-300/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-stone-700">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm select-none">Son Aranan Klanlar</span>
            </div>

            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearRecentClanSearches();
                  setRecentSearches([]);
                }}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer underline select-none"
              >
                Geçmişi Temizle
              </button>
            )}
          </div>

          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item, idx) => (
                <div
                  key={`${item.query}-${idx}`}
                  onClick={() => handleRecentClick(item)}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/90 hover:bg-stone-300 border border-stone-400/80 text-stone-800 text-sm font-semibold cursor-pointer shadow-sm transition-all"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-600" />
                  <span>{item.isTag && item.tag ? `#${item.tag}` : item.query}</span>
                  {item.name && item.name !== item.query && (
                    <span className="text-xs text-stone-600 font-normal">
                      ({item.name})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRecent(e, item.query)}
                    className="ml-1 p-0.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer transition-colors"
                    title="Kaldır"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic select-none">
              Henüz klan arama geçmişi bulunmuyor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
