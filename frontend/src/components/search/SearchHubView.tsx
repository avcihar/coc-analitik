"use client";

import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import GraySegmented, { type GraySegmentedItem } from "@/components/game/GraySegmented";
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

const TAB_ITEMS: GraySegmentedItem<SearchTabType>[] = [
  { id: "player", label: "Oyuncu Ara" },
  { id: "clan", label: "Klan Ara" },
];

/**
 * SearchHubView component
 * Houses both Player Search (sosyal-oyuncu-ara.png) and Clan Search (klan-ara.png)
 * controlled by a shared GraySegmented tab bar. Synchronizes with URL hash routes:
 * - #/oyuncu -> Player search
 * - #/klan -> Clan search
 */
export default function SearchHubView({
  defaultTab,
  initialPlayerTag,
  initialClanQuery,
  onSelectPlayer,
  onSelectClan,
  className,
}: SearchHubViewProps) {
  const [activeTab, setActiveTab] = useState<SearchTabType>(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#/klan")) return "clan";
      if (hash.startsWith("#/oyuncu")) return "player";
    }
    return "player";
  });

  // Sync with browser hash changes (back/forward or external navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#/klan")) {
        setActiveTab("clan");
      } else if (hash.startsWith("#/oyuncu")) {
        setActiveTab("player");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
      {/* Top GraySegmented Sub-Tabs ("Oyuncu Ara" | "Klan Ara") - Flush at top */}
      <div className="w-full flex items-end pl-2 sm:pl-4 overflow-x-auto scrollbar-none flex-nowrap border-b-2 border-[#5A5552]/50">
        <GraySegmented<SearchTabType>
          items={TAB_ITEMS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Tab Panels: seamlessly integrated with active tab header */}
      <div className="w-full pt-4 sm:pt-6 transition-opacity duration-200 relative z-0">
        {activeTab === "player" ? (
          <PlayerSearchView
            initialTag={initialPlayerTag}
            onSelectPlayer={onSelectPlayer}
          />
        ) : (
          <ClanSearchView
            initialQuery={initialClanQuery}
            onSelectClan={onSelectClan}
          />
        )}
      </div>
    </div>
  );
}
