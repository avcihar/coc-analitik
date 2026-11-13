"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  RotateCcw,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ClanBadge from "@/components/game/ClanBadge";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
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

interface ActiveSearchMeta {
  query: string;
  minMembers?: number;
  minClanLevel?: number;
}

/**
 * ClanSearchView component
 * - Supports clan name OR #tag directly (only treats as tag if starts with '#' or >=4 valid chars + digit)
 * - Green search & filter controls (.game-btn-panel-green) with >=44px tap targets
 * - Select & numeric points inputs use >=16px font on mobile (text-base sm:text-sm) to prevent iOS zoom
 * - Results flow naturally with the page (no max-h-[60vh] scroll trap)
 * - Compact member count badge (X/50) visible on all viewports including 390px mobile
 * - Full EN/TR i18n via useLanguage() and warm espresso/cream palette
 */
export default function ClanSearchView({
  initialQuery = "",
  onSelectClan,
  className,
}: ClanSearchViewProps) {
  const { isTr, t, fmtNum, fmtTemplate, getApiErrorMessage } = useLanguage();

  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Search filter options
  const [minClanLevel, setMinClanLevel] = useState<number | undefined>(undefined);
  const [minMembers, setMinMembers] = useState<number | undefined>(undefined);
  const [minClanPointsText, setMinClanPointsText] = useState<string>("");
  const pointsInputRef = useRef<HTMLInputElement | null>(null);

  const minClanPoints = useMemo(() => {
    const trimmed = minClanPointsText.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [minClanPointsText]);

  // Search results & pagination cursor state
  const [rawClans, setRawClans] = useState<ClanSearchItemData[]>([]);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const activeSearchMetaRef = useRef<ActiveSearchMeta | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentClanSearchItem[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentClanSearches());
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQueryInput(initialQuery);
    }
  }, [initialQuery]);

  const handleMinPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const raw = inputEl.value;
    const selectionStart = inputEl.selectionStart ?? raw.length;
    const digitsBeforeCursor = raw.slice(0, selectionStart).replace(/\D/g, "").length;
    const cleaned = raw.replace(/\D/g, "");

    setMinClanPointsText(cleaned);

    if (raw !== cleaned) {
      requestAnimationFrame(() => {
        if (pointsInputRef.current) {
          pointsInputRef.current.setSelectionRange(digitsBeforeCursor, digitsBeforeCursor);
        }
      });
    }
  };

  const handleMinPointsBlur = () => {
    if (!minClanPointsText) return;
    const parsed = Number.parseInt(minClanPointsText, 10);
    setMinClanPointsText(Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "");
  };

  const visibleClans = useMemo(() => {
    if (!minClanPoints || minClanPoints <= 0) return rawClans;
    return rawClans.filter((c) => (c.clanPoints ?? 0) >= minClanPoints);
  }, [rawClans, minClanPoints]);

  const executeSearch = useCallback(
    async (rawQuery: string, cursor?: string) => {
      const isPaginating = Boolean(cursor);
      const activeMeta = isPaginating ? activeSearchMetaRef.current : null;
      const trimmed = (isPaginating && activeMeta ? activeMeta.query : rawQuery).trim();

      if (!trimmed) {
        setErrorMessage(t.search.clanInvalidEmpty);
        return;
      }

      const isExplicitTag = trimmed.startsWith("#");
      const isImplicitTag = !isExplicitTag && looksLikeTag(trimmed);

      if (!isPaginating && !isExplicitTag && !isImplicitTag && trimmed.length < 3) {
        setErrorMessage(t.search.clanMinChars);
        return;
      }

      if (isPaginating) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setErrorMessage(null);
        setHasSearched(true);
        setAfterCursor(null);
        activeSearchMetaRef.current = null;
      }

      try {
        // Direct Tag Lookup Check
        if (!isPaginating && (isExplicitTag || isImplicitTag)) {
          const cleanTag = normalizeTag(trimmed);
          if (!isValidTag(cleanTag)) {
            setErrorMessage(t.search.playerInvalidChars);
            setIsLoading(false);
            return;
          }

          const clanData = await safeFetchJson<ClanSearchItemData>(
            `/api/v1/clans/${encodeURIComponent(cleanTag)}`
          );

          setRawClans([clanData]);
          setAfterCursor(null);

          const updated = saveRecentClanSearch({
            query: cleanTag,
            isTag: true,
            tag: cleanTag,
            name: clanData.name,
          });
          setRecentSearches(updated);
          return;
        }

        // Clan Name Search with Server Filters + Accurate Pagination Cursor
        const searchMinMembers = isPaginating && activeMeta ? activeMeta.minMembers : minMembers;
        const searchMinLevel = isPaginating && activeMeta ? activeMeta.minClanLevel : minClanLevel;

        const params = new URLSearchParams();
        params.set("name", trimmed);
        params.set("limit", "16");

        if (searchMinMembers !== undefined && searchMinMembers > 0) {
          params.set("min_members", String(searchMinMembers));
        }
        if (searchMinLevel !== undefined && searchMinLevel > 1) {
          params.set("min_clan_level", String(searchMinLevel));
        }
        if (cursor) {
          params.set("after", cursor);
        }

        const data = await safeFetchJson<any>(`/api/v1/clans/search?${params.toString()}`);
        const fetchedItems: ClanSearchItemData[] = Array.isArray(data?.items) ? data.items : [];

        activeSearchMetaRef.current = {
          query: trimmed,
          minMembers: searchMinMembers,
          minClanLevel: searchMinLevel,
        };

        if (isPaginating) {
          setRawClans((prev) => {
            const seen = new Set(prev.map((c) => normalizeTag(c.tag)));
            const uniqueNext = fetchedItems.filter((c) => {
              const key = normalizeTag(c.tag);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return [...prev, ...uniqueNext];
          });
        } else {
          setRawClans(fetchedItems);
          const updated = saveRecentClanSearch({
            query: trimmed,
            isTag: false,
            name: trimmed,
          });
          setRecentSearches(updated);
        }

        const nextCursor: string | null = data?.paging?.cursors?.after || null;
        setAfterCursor(nextCursor && nextCursor !== cursor ? nextCursor : null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setErrorMessage(t.errors.notFound);
        } else {
          setErrorMessage(getApiErrorMessage(err));
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [minClanLevel, minMembers, t, getApiErrorMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(queryInput);
  };

  const handleSelectClanRow = (clan: ClanSearchItemData) => {
    const cleanTag = normalizeTag(clan.tag);

    const updated = saveRecentClanSearch({
      query: cleanTag,
      isTag: true,
      tag: cleanTag,
      name: clan.name,
    });
    setRecentSearches(updated);

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

  const handleRemoveRecent = (qOrTag: string) => {
    const updated = removeRecentClanSearch(qOrTag);
    setRecentSearches(updated);
  };

  const handleResetFilters = () => {
    setMinClanLevel(undefined);
    setMinMembers(undefined);
    setMinClanPointsText("");
  };

  const hasActiveFilters =
    minClanLevel !== undefined || minMembers !== undefined || minClanPoints !== undefined;

  const formatClanType = (type?: string) => {
    if (!type) return isTr ? "Belirtilmemiş" : "Unspecified";
    const lower = type.toLowerCase();
    if (lower === "open") return t.search.openType;
    if (lower === "inviteonly" || lower === "invite_only") return t.search.inviteType;
    if (lower === "closed") return t.search.closedType;
    return type;
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto py-2 px-1 sm:px-4 space-y-4", className)}>
      {/* Top Search Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="clan-search-input"
            className="block font-bold text-[#2D251E] text-sm sm:text-base select-none"
          >
            {t.search.clanInputLabel}
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="game-input-container flex-1 min-w-0 focus-within:ring-2 focus-within:ring-amber-400">
              <input
                id="clan-search-input"
                type="text"
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t.search.clanPlaceholder}
                autoCapitalize="words"
                spellCheck={false}
                disabled={isLoading}
                className="game-input-field font-sans text-base"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isLoading || !queryInput.trim()}
                className="game-btn-panel-green min-h-[44px] flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-white" />
                )}
                <span className="game-text-stroke-sm">
                  {isLoading ? t.common.searching : t.common.search}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
                className={cn(
                  "game-btn-panel-green min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer select-none",
                  hasActiveFilters && "ring-2 ring-amber-300"
                )}
              >
                <SlidersHorizontal className="w-4 h-4 text-white" />
                <span className="game-text-stroke-sm">{t.search.clanFilterBtn}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-white transition-transform duration-200",
                    showFilters && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>

          <p className="text-[#5A4A3E] text-xs sm:text-sm font-medium select-none">
            {t.search.clanHint}
          </p>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="p-4 rounded-xl bg-[#EFE8DA] border-2 border-[#C2B39C] shadow-inner space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C2B39C]">
              <span className="font-bold text-[#2D251E] text-sm">{t.search.clanFilterBtn}</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[44px] px-2 -my-2 flex items-center gap-1.5 text-xs text-[#5A4A3E] hover:text-[#2D251E] font-bold cursor-pointer underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t.search.resetFilters}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Min Clan Level */}
              <div>
                <label
                  htmlFor="clan-filter-min-level"
                  className="block text-xs font-bold text-[#2D251E] mb-1.5 select-none"
                >
                  {t.search.minClanLevel}
                </label>
                <select
                  id="clan-filter-min-level"
                  value={minClanLevel ?? ""}
                  onChange={(e) =>
                    setMinClanLevel(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full min-h-[44px] bg-[#FFFDF8] border-2 border-[#C2B39C] rounded-xl py-2 px-3 text-base sm:text-sm font-semibold text-[#2D251E] outline-none focus:border-amber-600 cursor-pointer tabular-nums"
                >
                  <option value="">{t.common.all}</option>
                  <option value="2">{t.common.levelShort} {fmtNum(2)}+</option>
                  <option value="5">{t.common.levelShort} {fmtNum(5)}+</option>
                  <option value="10">{t.common.levelShort} {fmtNum(10)}+</option>
                  <option value="15">{t.common.levelShort} {fmtNum(15)}+</option>
                  <option value="20">{t.common.levelShort} {fmtNum(20)}+</option>
                </select>
              </div>

              {/* Min Members */}
              <div>
                <label
                  htmlFor="clan-filter-min-members"
                  className="block text-xs font-bold text-[#2D251E] mb-1.5 select-none"
                >
                  {t.search.minMembers}
                </label>
                <select
                  id="clan-filter-min-members"
                  value={minMembers ?? ""}
                  onChange={(e) =>
                    setMinMembers(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full min-h-[44px] bg-[#FFFDF8] border-2 border-[#C2B39C] rounded-xl py-2 px-3 text-base sm:text-sm font-semibold text-[#2D251E] outline-none focus:border-amber-600 cursor-pointer tabular-nums"
                >
                  <option value="">{t.common.all}</option>
                  <option value="10">{fmtNum(10)}+ {t.search.membersUnit}</option>
                  <option value="20">{fmtNum(20)}+ {t.search.membersUnit}</option>
                  <option value="30">{fmtNum(30)}+ {t.search.membersUnit}</option>
                  <option value="40">{fmtNum(40)}+ {t.search.membersUnit}</option>
                </select>
              </div>

              {/* Min Clan Points (Numeric input with cursor-safe sanitization) */}
              <div>
                <label
                  htmlFor="clan-filter-min-points"
                  className="block text-xs font-bold text-[#2D251E] mb-1.5 select-none"
                >
                  {t.search.minClanPoints}
                </label>
                <input
                  ref={pointsInputRef}
                  id="clan-filter-min-points"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minClanPointsText}
                  onChange={handleMinPointsChange}
                  onBlur={handleMinPointsBlur}
                  placeholder={isTr ? "Örn: 20000" : "e.g. 20000"}
                  className="w-full min-h-[44px] bg-[#FFFDF8] border-2 border-[#C2B39C] rounded-xl py-2 px-3 text-base sm:text-sm font-semibold text-[#2D251E] placeholder:text-[#847B70] outline-none focus:border-amber-600 tabular-nums"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Error Message Box */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-100 border-2 border-red-400 text-red-900 flex items-start justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold leading-snug">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="min-w-[44px] min-h-[44px] -my-2 -mr-2 inline-flex items-center justify-center text-red-700 hover:text-red-950 cursor-pointer rounded-lg transition-colors shrink-0"
            aria-label={t.common.close}
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {isLoading && (
        <div
          aria-live="polite"
          className="space-y-2.5 rounded-2xl bg-[#EFE8DA] border-2 border-[#C2B39C] p-3 sm:p-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#5A4A3E] pb-1">
            <span className="inline-block w-3.5 h-3.5 border-2 border-[#6B4A2E] border-t-transparent rounded-full animate-spin" />
            <span>{t.common.searching}</span>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#FFFDF8]/70 border border-[#C2B39C] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SkeletonBlock width={48} height={48} className="rounded-xl shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <SkeletonBlock width="52%" height={18} />
                  <SkeletonBlock width="34%" height={14} />
                </div>
              </div>
              <SkeletonBlock width={84} height={28} className="rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Results List (Flows naturally with the page — no max-h scroll trap) */}
      {!isLoading && visibleClans.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs text-[#5A4A3E] font-bold select-none">
            <span className="tabular-nums">
              {fmtTemplate(t.search.resultsFound, { count: fmtNum(visibleClans.length) })}
            </span>
            <span>{t.search.resultsHint}</span>
          </div>

          <div className="space-y-2.5">
            {visibleClans.map((clan) => {
              const cleanTag = normalizeTag(clan.tag);
              return (
                <button
                  key={cleanTag}
                  type="button"
                  onClick={() => handleSelectClanRow(clan)}
                  className="group w-full text-left p-3 sm:p-3.5 rounded-xl bg-[#FFFDF8] hover:bg-[#F5ECD9] border-2 border-[#C2B39C] hover:border-[#A87146] transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                >
                  {/* Top / Left: Badge + Names + Metadata */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ClanBadge
                      url={clan.badgeUrls?.medium || clan.badgeUrls?.small}
                      name={clan.name}
                      size={48}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#2D251E] text-base group-hover:text-[#7C4408] transition-colors truncate">
                          {clan.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-400/70 text-[#7C4408] text-xs font-extrabold shrink-0 tabular-nums">
                          {t.common.levelShort} {fmtNum(clan.clanLevel)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#5A4A3E] font-medium mt-0.5 flex-wrap">
                        <span className="font-sans font-semibold tabular-nums">#{cleanTag}</span>
                        <span aria-hidden="true">•</span>
                        <span>{formatClanType(clan.type)}</span>
                        {clan.location?.name && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#6B4A2E] shrink-0" />
                              <span className="truncate max-w-[160px]">{clan.location.name}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right / Bottom Mobile Strip: Member Count (Always Visible!) & Clan Points */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DDD2C0]">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE8DA] border border-[#C2B39C] text-[#2D251E] text-xs sm:text-sm font-bold tabular-nums">
                      <Users className="w-3.5 h-3.5 text-[#6B4A2E] shrink-0" />
                      <span>{fmtNum(clan.members ?? 0)}/50</span>
                      <span className="text-[11px] font-semibold text-[#5A4A3E] sm:hidden">
                        {t.search.membersUnit}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-400/60 text-[#7C4408] text-xs sm:text-sm font-extrabold tabular-nums">
                      <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{fmtNum(clan.clanPoints ?? 0)}</span>
                      <span className="text-[11px] font-semibold text-[#7C4408]/80 sm:hidden">
                        {t.search.pointsUnit}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination: Load More */}
          {afterCursor && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => executeSearch(queryInput, afterCursor)}
                disabled={isLoadingMore}
                className="game-btn-panel-green min-h-[44px] px-6 py-2.5 rounded-xl text-white font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none"
              >
                {isLoadingMore && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span className="game-text-stroke-sm">{t.common.showMore}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State after search */}
      {!isLoading && hasSearched && visibleClans.length === 0 && !errorMessage && (
        <div className="p-6 sm:p-8 text-center rounded-2xl bg-[#EFE8DA] border-2 border-[#C2B39C] space-y-3">
          <Shield className="w-10 h-10 text-[#6B4A2E] mx-auto" />
          <h4 className="font-extrabold text-[#2D251E] text-base">{t.search.noClansTitle}</h4>
          <p className="text-sm text-[#5A4A3E] max-w-md mx-auto font-medium">
            {t.search.noClansDesc}
          </p>
          {afterCursor && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => executeSearch(queryInput, afterCursor)}
                disabled={isLoadingMore}
                className="game-btn-panel-green min-h-[44px] px-5 py-2 rounded-xl text-white font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none"
              >
                {isLoadingMore && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span className="game-text-stroke-sm">{t.common.showMore}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Clan Searches Section */}
      {!hasSearched && (
        <div className="mt-6 pt-5 border-t border-[#C2B39C]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-[#2D251E]">
              <Clock className="w-4 h-4 text-[#6B4A2E]" />
              <span className="font-bold text-sm select-none">
                {isTr ? "Son Aranan Klanlar" : t.search.recentTitle}
              </span>
            </div>

            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearRecentClanSearches();
                  setRecentSearches([]);
                }}
                className="min-h-[44px] px-2 text-xs text-[#5A4A3E] hover:text-[#2D251E] font-bold cursor-pointer underline select-none"
              >
                {t.search.clearHistory}
              </button>
            )}
          </div>

          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item, idx) => {
                const label = item.isTag && item.tag ? `#${item.tag}` : item.query;
                return (
                  <div
                    key={`${item.query}-${idx}`}
                    className="inline-flex items-stretch rounded-xl bg-[#EFE8DA] border-2 border-[#C2B39C] shadow-sm overflow-hidden transition-colors hover:border-[#A87146]"
                  >
                    <button
                      type="button"
                      onClick={() => handleRecentClick(item)}
                      disabled={isLoading}
                      className="min-h-[44px] px-3 py-1.5 inline-flex items-center gap-2 text-sm font-bold text-[#2D251E] hover:bg-[#E4DAC7] transition-colors cursor-pointer disabled:opacity-50 text-left"
                      title={label}
                    >
                      <Shield className="w-4 h-4 text-[#6B4A2E] shrink-0" />
                      <span className="tabular-nums">{label}</span>
                      {item.name && item.name !== item.query && (
                        <span className="text-xs text-[#5A4A3E] font-medium truncate max-w-[140px]">
                          ({item.name})
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecent(item.tag || item.query)}
                      disabled={isLoading}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center border-l border-[#C2B39C] text-[#5A4A3E] hover:text-[#2D251E] hover:bg-[#E4DAC7] transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`${t.search.removeItem} ${label}`}
                      title={t.search.removeItem}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#5A4A3E] italic select-none">
              {t.search.recentEmpty}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
