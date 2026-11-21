"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Users,
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
import GameButton from "@/components/game/GameButton";
import GameInput from "@/components/game/GameInput";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import RecentTagChip from "./RecentTagChip";
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
 * - GameInput (without '#' requirement, >=16px) + green GameButton "Ara" + green GameButton "Arama Seçenekleri"
 * - Collapsible ui-well filter panel with ONLY backend-supported filters (minClanLevel, minMembers, minClanPoints)
 * - 3-column desktop / 1-column mobile grid of ui-panel clan cards + "Daha Fazla Göster" pagination
 * - Styled strictly with --ui-*, .ui-*, and --game-* tokens
 */
export default function ClanSearchView({
  initialQuery = "",
  onSelectClan,
  className,
}: ClanSearchViewProps) {
  const { isTr, t, fmtNum, fmtTemplate, getApiErrorMessage } = useLanguage();

  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Backend-supported search filter options
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
    <div className={cn("w-full max-w-6xl mx-auto py-1 sm:py-2 px-1 sm:px-4 space-y-4 min-w-0", className)}>
      {/* Top Search & Filter Panel */}
      <section className="ui-panel p-4 sm:p-5 space-y-3 min-w-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="clan-search-input"
              className="block font-extrabold text-[var(--ui-text-main)] text-sm sm:text-base select-none"
            >
              {t.search.clanInputLabel}
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <GameInput
                id="clan-search-input"
                type="text"
                prefixTag=""
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t.search.clanPlaceholder}
                autoCapitalize="words"
                spellCheck={false}
                disabled={isLoading}
                containerClassName="flex-1 min-w-0"
                className="font-sans text-base"
              />

              <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <GameButton
                  type="submit"
                  variant="green"
                  size="md"
                  disabled={isLoading || !queryInput.trim()}
                  icon={
                    isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-[var(--ui-text-main)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )
                  }
                  className="min-h-[44px] flex-1 sm:flex-initial justify-center"
                >
                  {isLoading ? t.common.searching : t.common.search}
                </GameButton>

                <GameButton
                  type="button"
                  variant="green"
                  size="md"
                  onClick={() => setShowFilters((prev) => !prev)}
                  aria-expanded={showFilters}
                  icon={<SlidersHorizontal className="w-4 h-4" />}
                  className={cn(
                    "min-h-[44px] flex-1 sm:flex-initial justify-center",
                    hasActiveFilters && "ring-2 ring-[var(--game-cream-light)]"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t.search.clanFilterBtn}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        showFilters && "rotate-180"
                      )}
                    />
                  </span>
                </GameButton>
              </div>
            </div>

            <p className="text-[var(--ui-text-muted)] text-xs sm:text-sm font-medium select-none">
              {t.search.clanHint}
            </p>
          </div>

          {/* Collapsible Filter Panel (ONLY backend-supported filters) */}
          {showFilters && (
            <div className="ui-well p-3.5 sm:p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--ui-well-border)]">
                <span className="font-extrabold text-[var(--ui-text-main)] text-sm">
                  {t.search.clanFilterBtn}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-[44px] px-2 -my-2 flex items-center gap-1.5 text-xs text-[var(--game-cream-light)] hover:text-[var(--ui-text-main)] font-bold cursor-pointer underline"
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
                    className="block text-xs font-bold text-[var(--ui-text-muted)] mb-1.5 select-none"
                  >
                    {t.search.minClanLevel}
                  </label>
                  <select
                    id="clan-filter-min-level"
                    value={minClanLevel ?? ""}
                    onChange={(e) =>
                      setMinClanLevel(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="ui-input w-full min-h-[44px] py-2 px-3 text-base sm:text-sm font-semibold outline-none focus:border-[var(--game-cream-mid)] cursor-pointer tabular-nums"
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
                    className="block text-xs font-bold text-[var(--ui-text-muted)] mb-1.5 select-none"
                  >
                    {t.search.minMembers}
                  </label>
                  <select
                    id="clan-filter-min-members"
                    value={minMembers ?? ""}
                    onChange={(e) =>
                      setMinMembers(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="ui-input w-full min-h-[44px] py-2 px-3 text-base sm:text-sm font-semibold outline-none focus:border-[var(--game-cream-mid)] cursor-pointer tabular-nums"
                  >
                    <option value="">{t.common.all}</option>
                    <option value="10">{fmtNum(10)}+ {t.search.membersUnit}</option>
                    <option value="20">{fmtNum(20)}+ {t.search.membersUnit}</option>
                    <option value="30">{fmtNum(30)}+ {t.search.membersUnit}</option>
                    <option value="40">{fmtNum(40)}+ {t.search.membersUnit}</option>
                  </select>
                </div>

                {/* Min Clan Points */}
                <div>
                  <label
                    htmlFor="clan-filter-min-points"
                    className="block text-xs font-bold text-[var(--ui-text-muted)] mb-1.5 select-none"
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
                    className="ui-input w-full min-h-[44px] py-2 px-3 text-base sm:text-sm font-semibold placeholder:text-[var(--ui-text-muted)]/60 outline-none focus:border-[var(--game-cream-mid)] tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Error Message Box */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[var(--game-dark-box-dark)] border-2 border-[var(--game-btn-red-mid)] text-[var(--ui-text-main)] flex items-start justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-[var(--game-btn-red-top)] shrink-0 mt-0.5" />
            <p className="text-sm font-semibold leading-snug break-words">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="min-w-[44px] min-h-[44px] -my-2 -mr-2 inline-flex items-center justify-center text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] cursor-pointer rounded-lg transition-colors shrink-0"
            aria-label={t.common.close}
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {isLoading && (
        <div aria-live="polite" className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text-muted)] px-1">
            <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--game-cream-light)] border-t-transparent rounded-full animate-spin" />
            <span>{t.common.searching}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="ui-panel p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <SkeletonBlock width={48} height={48} className="rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <SkeletonBlock width="68%" height={18} />
                    <SkeletonBlock width="42%" height={14} />
                  </div>
                </div>
                <SkeletonBlock height={10} className="rounded-full" />
                <div className="flex items-center justify-between gap-2">
                  <SkeletonBlock width="38%" height={24} className="rounded-lg" />
                  <SkeletonBlock width="32%" height={24} className="rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid (3-column on desktop, 1-column on mobile) */}
      {!isLoading && visibleClans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 px-1 text-xs text-[var(--ui-text-muted)] font-bold select-none">
            <span className="tabular-nums text-[var(--ui-text-main)]">
              {fmtTemplate(t.search.resultsFound, { count: fmtNum(visibleClans.length) })}
            </span>
            <span>{t.search.resultsHint}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleClans.map((clan) => {
              const cleanTag = normalizeTag(clan.tag);
              const memberCount = clan.members ?? 0;
              const memberPct = Math.min(100, Math.max(0, Math.round((memberCount / 50) * 100)));

              return (
                <button
                  key={cleanTag}
                  type="button"
                  onClick={() => handleSelectClanRow(clan)}
                  className="group ui-panel p-3.5 sm:p-4 text-left flex flex-col justify-between gap-3 cursor-pointer transition-all hover:border-[var(--game-cream-mid)] hover:-translate-y-0.5 active:translate-y-0 min-w-0 min-h-[44px]"
                >
                  {/* Card Top: Badge + Name + Tag + Level Badge */}
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ClanBadge
                        url={clan.badgeUrls?.medium || clan.badgeUrls?.small}
                        name={clan.name}
                        size={48}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-extrabold text-[var(--ui-text-main)] text-base group-hover:text-[var(--game-cream-light)] transition-colors truncate">
                            {clan.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-sans text-xs font-semibold tabular-nums text-[var(--ui-text-muted)]">
                            #{cleanTag}
                          </span>
                          <span className="ui-pill px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-[var(--game-cream-light)]">
                            {t.common.levelShort} {fmtNum(clan.clanLevel)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--ui-text-muted)] group-hover:text-[var(--game-cream-light)] shrink-0 mt-1 transition-colors" />
                  </div>

                  {/* Card Middle: Members / 50 Capacity Bar */}
                  <div className="ui-well px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 text-[var(--ui-text-muted)]">
                        <Users className="w-3.5 h-3.5 text-[var(--game-cream-light)] shrink-0" />
                        <span>{t.search.membersUnit}</span>
                      </span>
                      <span className="tabular-nums text-[var(--ui-text-main)]">
                        {fmtNum(memberCount)} / 50
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-well-border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--game-btn-green-mid)] transition-all duration-300"
                        style={{ width: `${memberPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Footer: Clan Points + Type + Location */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-0.5 min-w-0">
                    <div className="inline-flex items-center gap-1.5 font-extrabold text-[var(--game-cream-light)] tabular-nums shrink-0">
                      <img
                        src="/icons/ui/trophy.png"
                        alt=""
                        aria-hidden="true"
                        className="w-3.5 h-3.5 object-contain shrink-0 select-none"
                      />
                      <span>{fmtNum(clan.clanPoints ?? 0)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[var(--ui-text-muted)] font-semibold min-w-0 truncate">
                      <span className="truncate">{formatClanType(clan.type)}</span>
                      {clan.location?.name && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-[var(--game-cream-light)] shrink-0" />
                            <span className="truncate">{clan.location.name}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination: Load More */}
          {afterCursor && (
            <div className="pt-2 text-center">
              <GameButton
                type="button"
                variant="green"
                size="md"
                onClick={() => executeSearch(queryInput, afterCursor)}
                disabled={isLoadingMore}
                icon={
                  isLoadingMore ? (
                    <span className="inline-block w-4 h-4 border-2 border-[var(--ui-text-main)] border-t-transparent rounded-full animate-spin" />
                  ) : undefined
                }
                className="min-h-[44px] px-6"
              >
                {t.common.showMore}
              </GameButton>
            </div>
          )}
        </div>
      )}

      {/* Empty State after search */}
      {!isLoading && hasSearched && visibleClans.length === 0 && !errorMessage && (
        <div className="ui-panel p-6 sm:p-8 text-center space-y-3">
          <Shield className="w-10 h-10 text-[var(--game-cream-light)] mx-auto" />
          <h4 className="font-extrabold text-[var(--ui-text-main)] text-base">
            {t.search.noClansTitle}
          </h4>
          <p className="text-sm text-[var(--ui-text-muted)] max-w-md mx-auto font-medium">
            {t.search.noClansDesc}
          </p>
          {afterCursor && (
            <div className="pt-1">
              <GameButton
                type="button"
                variant="green"
                size="md"
                onClick={() => executeSearch(queryInput, afterCursor)}
                disabled={isLoadingMore}
                icon={
                  isLoadingMore ? (
                    <span className="inline-block w-4 h-4 border-2 border-[var(--ui-text-main)] border-t-transparent rounded-full animate-spin" />
                  ) : undefined
                }
                className="min-h-[44px]"
              >
                {t.common.showMore}
              </GameButton>
            </div>
          )}
        </div>
      )}

      {/* Recent Clan Searches Section */}
      {!hasSearched && (
        <section className="ui-panel p-4 sm:p-5 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--ui-panel-border)]">
            <div className="flex items-center gap-2 text-[var(--ui-text-main)] min-w-0">
              <Clock className="w-4 h-4 text-[var(--game-cream-light)] shrink-0" />
              <h2 className="font-extrabold text-sm sm:text-base truncate select-none">
                {isTr ? "Son Aranan Klanlar" : t.search.recentTitle}
              </h2>
            </div>

            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearRecentClanSearches();
                  setRecentSearches([]);
                }}
                className="min-h-[44px] px-2.5 -my-1.5 text-xs text-[var(--game-cream-light)] hover:text-[var(--ui-text-main)] font-bold cursor-pointer underline select-none shrink-0"
              >
                {t.search.clearHistory}
              </button>
            )}
          </div>

          {recentSearches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentSearches.map((item, idx) => {
                const label = item.isTag && item.tag ? `#${item.tag}` : item.query;
                const subLabel =
                  item.name && item.name.trim() !== item.query.trim() ? item.name : undefined;
                return (
                  <RecentTagChip
                    key={`${item.query}-${idx}`}
                    icon="clan"
                    label={label}
                    subLabel={subLabel}
                    onSelect={() => handleRecentClick(item)}
                    onRemove={() => handleRemoveRecent(item.tag || item.query)}
                    removeAriaLabel={`${t.search.removeItem} ${label}`}
                    removeTitle={t.search.removeItem}
                    disabled={isLoading}
                  />
                );
              })}
            </div>
          ) : (
            <div className="ui-well p-4 text-center">
              <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] italic select-none">
                {t.search.recentEmpty}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
