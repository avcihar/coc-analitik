"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Clock, X, AlertCircle, Sparkles, Hash } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import GameInput from "@/components/game/GameInput";
import GameButton from "@/components/game/GameButton";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import RecentTagChip from "./RecentTagChip";
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
 * - Desktop 2-column layout (lg:grid-cols-12: 5 cols search panel, 7 cols recent searches panel)
 * - Mobile stacked layout with zero horizontal overflow at 390px
 * - Fixed '#' prefix GameInput (>=16px) + full-width green GameButton (>=44px)
 * - Strict tag normalization & validation (spaces, uppercase, O->0)
 * - Recent searches persisted in localStorage["coc_recent_player_searches"]
 */
export default function PlayerSearchView({
  initialTag = "",
  onSelectPlayer,
  className,
}: PlayerSearchViewProps) {
  const { isTr, t, fmtNum, getApiErrorMessage } = useLanguage();

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
    <div className={cn("w-full max-w-6xl mx-auto py-1 sm:py-2 px-1 sm:px-4 space-y-4 min-w-0", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left 5 cols (Desktop) / Top (Mobile): Search Box Panel */}
        <section className="lg:col-span-5 ui-panel p-4 sm:p-5 space-y-4 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="player-search-input"
              className="flex items-center gap-2 font-extrabold text-[var(--ui-text-main)] text-sm sm:text-base select-none"
            >
              <Hash className="w-4 h-4 text-[var(--game-cream-light)] shrink-0" />
              <span>{t.search.playerLabel}</span>
            </label>

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
              containerClassName="w-full min-w-0"
              className="font-sans tabular-nums uppercase text-base placeholder:normal-case placeholder:tracking-normal"
            />

            <GameButton
              type="submit"
              variant="green"
              size="md"
              disabled={isLoading || !tagInput.trim()}
              icon={
                isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-[var(--ui-text-main)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )
              }
              className="w-full min-h-[44px] justify-center"
            >
              {isLoading ? t.common.searching : t.common.search}
            </GameButton>

            <p className="text-[var(--ui-text-muted)] text-xs sm:text-sm font-medium select-none">
              {t.search.playerHint}
            </p>
          </form>

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

          {/* Quick Sample Tags */}
          <div className="ui-well p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text-muted)] select-none">
              <Sparkles className="w-3.5 h-3.5 text-[var(--game-cream-light)] shrink-0" />
              <span>{t.search.sampleTags}:</span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {SAMPLE_PLAYER_TAGS.map((exampleTag) => (
                <button
                  key={exampleTag}
                  type="button"
                  onClick={() => handleChipClick(exampleTag)}
                  disabled={isLoading}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--game-dark-box-mid)] hover:bg-[var(--game-dark-box-light)] border border-[var(--ui-well-border)] hover:border-[var(--game-cream-mid)] font-sans font-bold text-xs sm:text-sm tabular-nums tracking-wide text-[var(--ui-text-main)] cursor-pointer transition-colors disabled:opacity-50"
                >
                  #{exampleTag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right 7 cols (Desktop) / Bottom (Mobile): Recent Searches Panel */}
        <section className="lg:col-span-7 ui-panel p-4 sm:p-5 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--ui-panel-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-[var(--game-cream-light)] shrink-0" />
              <h2 className="font-extrabold text-sm sm:text-base text-[var(--ui-text-main)] truncate select-none">
                {t.search.recentTitle}
              </h2>
              {recentSearches.length > 0 && (
                <span className="ui-pill px-2.5 py-0.5 text-xs font-bold tabular-nums shrink-0">
                  {fmtNum(recentSearches.length)}
                </span>
              )}
            </div>

            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="min-h-[44px] px-2.5 -my-1.5 text-xs text-[var(--game-cream-light)] hover:text-[var(--ui-text-main)] font-bold cursor-pointer underline select-none shrink-0"
              >
                {t.search.clearHistory}
              </button>
            )}
          </div>

          {recentSearches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentSearches.map((item) => (
                <RecentTagChip
                  key={item.tag}
                  icon="player"
                  label={item.displayTag}
                  subLabel={item.name}
                  onSelect={() => handleChipClick(item.tag)}
                  onRemove={() => handleRemoveChip(item.tag)}
                  removeAriaLabel={`${t.search.removeItem} ${item.displayTag}`}
                  removeTitle={t.search.removeItem}
                  disabled={isLoading}
                />
              ))}
            </div>
          ) : (
            <div className="ui-well p-5 text-center">
              <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] italic select-none">
                {t.search.recentEmpty}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Realistic Loading Skeleton Feedback */}
      {isLoading && (
        <div
          aria-live="polite"
          className="ui-panel p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--ui-text-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--game-cream-light)] border-t-transparent rounded-full animate-spin" />
              <span>
                {t.common.searching}{" "}
                {searchingTag && (
                  <span className="font-bold text-[var(--ui-text-main)] tabular-nums">
                    #{searchingTag}
                  </span>
                )}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)]">
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
    </div>
  );
}
