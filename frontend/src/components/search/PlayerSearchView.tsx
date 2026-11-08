"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, History, Clock, X, AlertCircle, Sparkles, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import GameInput from "@/components/game/GameInput";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import { safeFetchJson, ApiError } from "@/lib/apiClient";
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

/**
 * PlayerSearchView component
 * Matches the official in-game social player search window (sosyal-oyuncu-ara.png):
 * - Fixed '#' prefix input with iOS zoom prevention
 * - Silver 'Ara' button (.game-btn-silver)
 * - 'Bulmak istediğin oyuncunun oyuncu kodunu gir' helper hint
 * - Strict tag normalization & validation (spaces, uppercase, O->0)
 * - Last 5 recent searches with localStorage persistence & chips
 * - Direct navigation to player profile with Turkish error states
 */
export default function PlayerSearchView({
  initialTag = "",
  onSelectPlayer,
  className,
}: PlayerSearchViewProps) {
  const [tagInput, setTagInput] = useState<string>(() => {
    return initialTag ? normalizeTag(initialTag) : "";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentPlayerSearchItem[]>([]);

  // Load recent searches on client mount
  useEffect(() => {
    setRecentSearches(getRecentPlayerSearches());
  }, []);

  // Update input if initialTag changes externally
  useEffect(() => {
    if (initialTag) {
      setTagInput(normalizeTag(initialTag));
    }
  }, [initialTag]);

  const executeSearch = useCallback(
    async (rawTag: string) => {
      const cleanTag = normalizeTag(rawTag);

      if (!cleanTag) {
        setErrorMessage("Lütfen bulmak istediğin oyuncunun oyuncu kodunu gir.");
        return;
      }

      if (!isValidTag(cleanTag)) {
        setErrorMessage(
          "Geçersiz etiket biçimi! Clash etiketleri yalnızca 0, 2, 8, 9, P, Y, L, Q, G, R, J, C, U, V karakterlerini içerir."
        );
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const playerData = await safeFetchJson<any>(
          `/api/v1/players/${encodeURIComponent(cleanTag)}`
        );

        // Save successful search to history
        const updated = saveRecentPlayerSearch(cleanTag, playerData?.name);
        setRecentSearches(updated);

        // Notify parent callback if provided
        if (onSelectPlayer) {
          onSelectPlayer(cleanTag, playerData);
        }

        // Direct navigation to player profile hash route
        if (typeof window !== "undefined") {
          window.location.hash = `#/oyuncu/${cleanTag}`;
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setErrorMessage(
              `Oyuncu bulunamadı (#${cleanTag}). Lütfen oyuncu kodunu kontrol edin veya oyuncunun aktif olduğundan emin olun.`
            );
          } else if (err.status === 429) {
            setErrorMessage(
              "Çok fazla istek yapıldı (429). Lütfen birkaç saniye bekleyip tekrar deneyin."
            );
          } else {
            setErrorMessage(err.message || "Oyuncu aranırken bir hata oluştu.");
          }
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onSelectPlayer]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(tagInput);
  };

  const handleChipClick = (tag: string) => {
    setTagInput(tag);
    executeSearch(tag);
  };

  const handleRemoveChip = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    const updated = removeRecentPlayerSearch(tag);
    setRecentSearches(updated);
  };

  const handleClearAll = () => {
    clearRecentPlayerSearches();
    setRecentSearches([]);
  };

  return (
    <div className={cn("w-full max-w-3xl mx-auto py-2 px-1 sm:px-4", className)}>
      {/* Search Input Bar (Matches in-game sosyal-oyuncu-ara.png) */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="player-search-input"
            className="font-bold text-stone-800 text-base sm:text-lg select-none whitespace-nowrap shrink-0"
          >
            Oyuncu Ara:
          </label>

          <div className="flex-1 flex items-center gap-2">
            <GameInput
              id="player-search-input"
              prefixTag="#"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="P89PCUPUQ"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={16}
              disabled={isLoading}
              containerClassName="flex-1"
            />

            <button
              type="submit"
              disabled={isLoading || !tagInput.trim()}
              className="game-btn-silver px-6 py-2.5 rounded-xl text-stone-900 font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none shrink-0"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-stone-800" />
              )}
              <span className="game-text-stroke-sm text-stone-900">Ara</span>
            </button>
          </div>
        </div>

        {/* Sub-label Hint (Exact Turkish text from official reference) */}
        <div className="sm:pl-32">
          <p className="text-stone-600 text-xs sm:text-sm font-medium select-none">
            Bulmak istediğin oyuncunun oyuncu kodunu gir
          </p>
        </div>
      </form>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-100 border-2 border-red-300 text-red-800 flex items-start justify-between gap-3 shadow-sm">
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
        <div className="mt-6 p-4 rounded-xl bg-stone-200/60 border border-stone-300/80 space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonBlock width={48} height={48} className="rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock width="40%" height={18} />
              <SkeletonBlock width="25%" height={14} />
            </div>
          </div>
          <SkeletonBlock width="100%" height={36} className="rounded-lg" />
        </div>
      )}

      {/* Recent Searches Section (Son Aramalar - Son 5 başarılı arama) */}
      <div className="mt-6 pt-5 border-t border-stone-300/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-stone-700">
            <Clock className="w-4 h-4" />
            <span className="font-bold text-sm select-none">Son Aramalar</span>
          </div>

          {recentSearches.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer underline select-none"
            >
              Geçmişi Temizle
            </button>
          )}
        </div>

        {recentSearches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <div
                key={item.tag}
                onClick={() => handleChipClick(item.tag)}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/90 hover:bg-stone-300 border border-stone-400/80 text-stone-800 text-sm font-semibold cursor-pointer shadow-sm transition-all"
                title={`${item.displayTag} profilini aç`}
              >
                <User className="w-3.5 h-3.5 text-stone-600" />
                <span>{item.displayTag}</span>
                {item.name && (
                  <span className="text-xs text-stone-600 font-normal">
                    ({item.name})
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveChip(e, item.tag)}
                  className="ml-1 p-0.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer transition-colors"
                  title="Geçmişten kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic select-none">
            Henüz geçmiş arama bulunmuyor.
          </p>
        )}

        {/* Quick Sample Tags for Instant Testing */}
        <div className="mt-5 flex items-center flex-wrap gap-2 text-xs text-stone-600 select-none">
          <span className="flex items-center gap-1 font-semibold text-stone-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Örnek Etiketler:
          </span>
          {["P89PCUPUQ", "9JG8UVL0", "UUJL8CYP"].map((exampleTag) => (
            <button
              key={exampleTag}
              type="button"
              onClick={() => handleChipClick(exampleTag)}
              className="px-2 py-0.5 rounded bg-stone-200/60 hover:bg-stone-200 border border-stone-300 font-mono text-stone-700 cursor-pointer transition-colors"
            >
              #{exampleTag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
