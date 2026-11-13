"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Clock, X, AlertCircle, Sparkles, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import GameInput from "@/components/game/GameInput";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import {
  normalizeTag,
  isValidTag,
  getRecentPlayerSearches,
  saveRecentPlayerSearch,
  removeRecentPlayerSearch,
  clearRecentPlayerSearches,
  type RecentPlayerSearchItem,
} from "./searchUtils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PlayerSearchViewProps {
  initialTag?: string;
  onSelectPlayer?: (tag: string, playerData?: any) => void;
  className?: string;
}

const SAMPLE_PLAYER_TAGS = ["P89PCUPUQ", "9JG8UVL0", "UUJL8CYP"] as const;

/**
 * PlayerSearchView component
 * - Fixed '#' prefix input with >=16px sans tabular-nums uppercase text
 * - Silver search button (.game-btn-silver) with >=44px tap target
 * - Strict tag normalization & validation (spaces, uppercase, O->0)
 * - Last 5 recent searches with accessible sibling buttons (never nested buttons)
 * - Realistic loading feedback and full EN/TR i18n via useLanguage()
 */
export default function PlayerSearchView({
  initialTag = "",
  onSelectPlayer,
  className,
}: PlayerSearchViewProps) {
  const { isTr, t, getApiErrorMessage } = useLanguage();

  const [tagInput, setTagInput] = useState<string>(() => {
    return initialTag ? normalizeTag(initialTag) : "";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchingTag, setSearchingTag] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentPlayerSearchItem[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentPlayerSearches());
  }, []);

  useEffect(() => {
    if (initialTag) {
      setTagInput(normalizeTag(initialTag));
    }
  }, [initialTag]);

  const executeSearch = useCallback(
    async (rawTag: string) => {
      const cleanTag = normalizeTag(rawTag);

      if (!cleanTag) {
        setErrorMessage(t.search.playerInvalidEmpty);
        return;
      }

      if (!isValidTag(cleanTag)) {
        setErrorMessage(t.search.playerInvalidChars);
        return;
      }

      setIsLoading(true);
      setSearchingTag(cleanTag);
      setErrorMessage(null);

      try {
        const playerData = await safeFetchJson<any>(
          `/api/v1/players/${encodeURIComponent(cleanTag)}`
        );

        const updated = saveRecentPlayerSearch(cleanTag, playerData?.name);
        setRecentSearches(updated);

        if (onSelectPlayer) {
          onSelectPlayer(cleanTag, playerData);
        }

        if (typeof window !== "undefined") {
          window.location.hash = `#/oyuncu/${cleanTag}`;
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setErrorMessage(`${t.errors.notFound} (#${cleanTag})`);
        } else {
          setErrorMessage(getApiErrorMessage(err));
        }
      } finally {
        setIsLoading(false);
        setSearchingTag("");
      }
    },
    [onSelectPlayer, t, getApiErrorMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(tagInput);
  };

  const handleChipClick = (tag: string) => {
    setTagInput(tag);
    executeSearch(tag);
  };

  const handleRemoveChip = (tag: string) => {
    const updated = removeRecentPlayerSearch(tag);
    setRecentSearches(updated);
  };

  const handleClearAll = () => {
    clearRecentPlayerSearches();
    setRecentSearches([]);
  };

  return (
    <div className={cn("w-full max-w-3xl mx-auto py-2 px-1 sm:px-4", className)}>
      {/* Search Form: Label, Input + Button, and Hint cleanly left-aligned */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <label
          htmlFor="player-search-input"
          className="block font-bold text-[#2D251E] text-sm sm:text-base select-none"
        >
          {t.search.playerLabel}
        </label>

        <div className="flex items-center gap-2 sm:gap-3">
          <GameInput
            id="player-search-input"
            prefixTag="#"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t.search.playerPlaceholder}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={16}
            disabled={isLoading}
            containerClassName="flex-1 min-w-0"
            className="font-sans tabular-nums uppercase text-base placeholder:normal-case placeholder:tracking-normal"
          />

          <button
            type="submit"
            disabled={isLoading || !tagInput.trim()}
            className="game-btn-silver min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-[#2D251E] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none shrink-0"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-[#2D251E] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-[#2D251E]" />
            )}
            <span>{isLoading ? t.common.searching : t.common.search}</span>
          </button>
        </div>

        <p className="text-[#5A4A3E] text-xs sm:text-sm font-medium select-none">
          {t.search.playerHint}
        </p>
      </form>

      {/* Error Message Box */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl bg-red-100 border-2 border-red-400 text-red-900 flex items-start justify-between gap-3 shadow-sm"
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

      {/* Realistic Loading Skeleton Feedback */}
      {isLoading && (
        <div
          aria-live="polite"
          className="mt-6 rounded-2xl bg-[#EFE8DA] border-2 border-[#C2B39C] p-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#5A4A3E]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-[#6B4A2E] border-t-transparent rounded-full animate-spin" />
              <span>
                {t.common.searching}{" "}
                {searchingTag && (
                  <span className="font-bold text-[#2D251E] tabular-nums">#{searchingTag}</span>
                )}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#5A4A3E]">
              {isTr ? "Profil getiriliyor" : "Fetching profile"}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <SkeletonBlock width={48} height={48} className="rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <SkeletonBlock width="48%" height={18} />
              <SkeletonBlock width="30%" height={14} />
            </div>
            <SkeletonBlock width={84} height={32} className="rounded-full shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <SkeletonBlock height={44} className="rounded-xl" />
            <SkeletonBlock height={44} className="rounded-xl" />
            <SkeletonBlock height={44} className="rounded-xl" />
            <SkeletonBlock height={44} className="rounded-xl" />
          </div>
        </div>
      )}

      {/* Recent Searches Section */}
      <div className="mt-6 pt-5 border-t border-[#C2B39C]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-[#2D251E]">
            <Clock className="w-4 h-4 text-[#6B4A2E]" />
            <span className="font-bold text-sm select-none">{t.search.recentTitle}</span>
          </div>

          {recentSearches.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="min-h-[44px] px-2 text-xs text-[#5A4A3E] hover:text-[#2D251E] font-bold cursor-pointer underline select-none"
            >
              {t.search.clearHistory}
            </button>
          )}
        </div>

        {recentSearches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <div
                key={item.tag}
                className="inline-flex items-stretch rounded-xl bg-[#EFE8DA] border-2 border-[#C2B39C] shadow-sm overflow-hidden transition-colors hover:border-[#A87146]"
              >
                <button
                  type="button"
                  onClick={() => handleChipClick(item.tag)}
                  disabled={isLoading}
                  className="min-h-[44px] px-3 py-1.5 inline-flex items-center gap-2 text-sm font-bold text-[#2D251E] hover:bg-[#E4DAC7] transition-colors cursor-pointer disabled:opacity-50 text-left"
                  title={item.displayTag}
                >
                  <User className="w-4 h-4 text-[#6B4A2E] shrink-0" />
                  <span className="tabular-nums font-semibold tracking-wide">
                    {item.displayTag}
                  </span>
                  {item.name && (
                    <span className="text-xs text-[#5A4A3E] font-medium truncate max-w-[140px]">
                      ({item.name})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(item.tag)}
                  disabled={isLoading}
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center border-l border-[#C2B39C] text-[#5A4A3E] hover:text-[#2D251E] hover:bg-[#E4DAC7] transition-colors cursor-pointer disabled:opacity-50"
                  aria-label={`${t.search.removeItem} ${item.displayTag}`}
                  title={t.search.removeItem}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5A4A3E] italic select-none">
            {t.search.recentEmpty}
          </p>
        )}

        {/* Quick Sample Tags */}
        <div className="mt-5 flex items-center flex-wrap gap-2 text-xs text-[#5A4A3E] select-none">
          <span className="flex items-center gap-1.5 font-bold text-[#2D251E]">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            {t.search.sampleTags}:
          </span>
          {SAMPLE_PLAYER_TAGS.map((exampleTag) => (
            <button
              key={exampleTag}
              type="button"
              onClick={() => handleChipClick(exampleTag)}
              disabled={isLoading}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#EFE8DA] hover:bg-[#E4DAC7] border border-[#C2B39C] font-sans font-bold tabular-nums tracking-wide text-[#2D251E] cursor-pointer transition-colors disabled:opacity-50"
            >
              #{exampleTag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
