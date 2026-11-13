"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, Shield } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import GraySegmented, { type GraySegmentedItem } from "@/components/game/GraySegmented";
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

  const tabItems = useMemo<GraySegmentedItem<SearchTabType>[]>(
    () => [
      { id: "player", label: t.search.playerTab, icon: <User className="w-4 h-4 shrink-0" /> },
      { id: "clan", label: t.search.clanTab, icon: <Shield className="w-4 h-4 shrink-0" /> },
    ],
    [t]
  );

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
    <div className={cn("w-full -mt-3 sm:-mt-6 flex flex-col", className)}>
      {/* Top GraySegmented Sub-Tabs - Flush at top */}
      <div className="w-full flex items-end pl-2 sm:pl-4 overflow-x-auto scrollbar-none flex-nowrap border-b-2 border-[#5A5552]/50">
        <GraySegmented<SearchTabType>
          items={tabItems}
          activeId={activeTab}
          onChange={handleTabChange}
          className="w-full sm:w-auto"
        />
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
