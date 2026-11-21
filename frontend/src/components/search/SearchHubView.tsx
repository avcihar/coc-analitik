"use client";

import React, { useState, useEffect } from "react";
import { User, Shield } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLanguage } from "@/lib/i18n";
import PlayerSearchView from "./PlayerSearchView";
import ClanSearchView, { type ClanSearchItemData } from "./ClanSearchView";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchTabType = "player" | "clan";

export interface SearchHubViewProps {
  defaultTab?: SearchTabType;
  initialPlayerTag?: string;
  initialClanQuery?: string;
  onSelectPlayer?: (tag: string, playerData?: any) => void;
  onSelectClan?: (tag: string, clanData?: ClanSearchItemData) => void;
  className?: string;
}

function extractHashQueryParam(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hash = window.location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return undefined;
  const params = new URLSearchParams(hash.slice(qIndex));
  const q = params.get("q");
  return q?.trim() ? q : undefined;
}

/**
 * SearchHubView component
 * Houses both Player Search and Clan Search controlled by a shared GraySegmented tab bar.
 * Synchronizes with URL hash routes (#/oyuncu and #/klan).
 */
export default function SearchHubView({
  defaultTab,
  initialPlayerTag,
  initialClanQuery,
  onSelectPlayer,
  onSelectClan,
  className,
}: SearchHubViewProps) {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<SearchTabType>(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#/klan")) return "clan";
      if (hash.startsWith("#/oyuncu")) return "player";
    }
    return "player";
  });

  const [hashClanQuery, setHashClanQuery] = useState<string | undefined>(() =>
    extractHashQueryParam()
  );

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Sync with browser hash changes (back/forward or external navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#/klan")) {
        setActiveTab("clan");
        setHashClanQuery(extractHashQueryParam());
      } else if (hash.startsWith("#/oyuncu")) {
        setActiveTab("player");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const tabItems = [
    { id: "player" as const, label: t.search.playerTab, icon: <User className="w-4 h-4 shrink-0" /> },
    { id: "clan" as const, label: t.search.clanTab, icon: <Shield className="w-4 h-4 shrink-0" /> },
  ];

  const handleTabChange = (tabId: SearchTabType) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const targetHash = tabId === "player" ? "#/oyuncu" : "#/klan";
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  };

  return (
    <div className={cn("w-full flex flex-col min-w-0", className)}>
      {/* Top Wood Segmented Sub-Tabs matching canonical wood panels */}
      <div className="w-full flex items-center pb-3 border-b border-[var(--ui-panel-border)]">
        <div
          role="tablist"
          aria-label={t.nav.search}
          className="ui-info p-1.5 rounded-xl grid grid-cols-2 sm:inline-flex items-center gap-1.5 w-full sm:w-auto shadow-inner"
        >
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "min-h-[44px] px-4 sm:px-5 py-2 rounded-lg text-sm font-game font-extrabold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-2 border-[var(--ui-tab-active-border)] shadow-sm"
                    : "bg-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] hover:bg-[var(--game-dark-box-mid)]/60 border-2 border-transparent"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="w-full pt-4 sm:pt-6 transition-opacity duration-200 relative z-0">
        {activeTab === "player" ? (
          <PlayerSearchView
            initialTag={initialPlayerTag}
            onSelectPlayer={onSelectPlayer}
          />
        ) : (
          <ClanSearchView
            initialQuery={initialClanQuery ?? hashClanQuery}
            onSelectClan={onSelectClan}
          />
        )}
      </div>
    </div>
  );
}
