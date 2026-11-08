"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import HomeHubView from "@/components/home/HomeHubView";
import { SearchHubView } from "@/components/search";
import { PlayerProfileView, type ImportedPlayerForOre } from "@/components/player";
import { ClanDetailsView } from "@/components/clan";
import MetaDashboardView from "@/components/meta/MetaDashboardView";
import ScoutedArmyCard from "@/components/cwl/ScoutedArmyCard";
import OreCalculatorView from "@/components/ore/OreCalculatorView";
import WallArtView from "@/components/wall/WallArtView";
import { AppShell, type TabKey } from "@/components/shell";

const HASH_TO_TAB: Record<string, TabKey> = {
  "#/": "home",
  "#/home": "home",
  "#/oyuncu": "search",
  "#/klan": "search",
  "#/arama": "search",
  "#/meta": "meta",
  "#/ordu": "meta",
  "#/cwl": "cwl",
  "#/cevher": "ore",
  "#/duvar": "wall",
  "#/duvaryazisi": "wall",
  "#/wall": "wall",
};

const TAB_TO_HASH: Record<TabKey, string> = {
  home: "#/home",
  search: "#/oyuncu",
  meta: "#/meta",
  cwl: "#/cwl",
  ore: "#/cevher",
  wall: "#/duvar",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [currentHash, setCurrentHash] = useState<string>("#/home");
  const [importedPlayer, setImportedPlayer] = useState<ImportedPlayerForOre | null>(null);
  const [cwlClanTag, setCwlClanTag] = useState<string>("#2PP");

  // Parse deep link routes: #/oyuncu/:tag and #/klan/:tag
  const routeInfo = useMemo(() => {
    const rawHash = currentHash.trim();
    const [pathPart, queryPart] = rawHash.split("?");
    const cleanPath = pathPart.toLowerCase();

    const queryParams = new URLSearchParams(queryPart || "");
    const highlightTag = queryParams.get("vurgula") || undefined;

    // 1. Player profile deep link: #/oyuncu/:tag
    const playerMatch = pathPart.match(/^#\/oyuncu\/([A-Za-z0-9]+)/i);
    if (playerMatch && playerMatch[1]) {
      return {
        view: "player" as const,
        tag: playerMatch[1].toUpperCase(),
      };
    }

    // 2. Clan details deep link: #/klan/:tag
    const clanMatch = pathPart.match(/^#\/klan\/([A-Za-z0-9]+)/i);
    if (clanMatch && clanMatch[1]) {
      return {
        view: "clan" as const,
        tag: clanMatch[1].toUpperCase(),
        highlightTag,
      };
    }

    // 3. Clan search hub tab: #/klan
    if (cleanPath === "#/klan") {
      return {
        view: "search" as const,
        defaultTab: "clan" as const,
      };
    }

    // 4. Default player search hub tab: #/oyuncu or #/arama
    if (cleanPath === "#/oyuncu" || cleanPath === "#/arama") {
      return {
        view: "search" as const,
        defaultTab: "player" as const,
      };
    }

    return null;
  }, [currentHash]);

  // Sync state with URL hash for seamless browser back/forward and deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const queryTab = searchParams.get("tab");
      if (queryTab && HASH_TO_TAB[`#/${queryTab}`]) {
        setActiveTab(HASH_TO_TAB[`#/${queryTab}`]);
        setCurrentHash(window.location.hash || `#/${queryTab}`);
        return;
      }

      const hash = window.location.hash || "#/home";
      setCurrentHash(hash);

      const basePath = hash.split("?")[0].toLowerCase();
      if (HASH_TO_TAB[basePath]) {
        setActiveTab(HASH_TO_TAB[basePath]);
      } else if (
        basePath.startsWith("#/oyuncu") ||
        basePath.startsWith("#/klan") ||
        basePath.startsWith("#/arama")
      ) {
        setActiveTab("search");
      } else if (!hash || hash === "#") {
        if (!queryTab) setActiveTab("home");
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const switchTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    window.location.hash = TAB_TO_HASH[tab];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleHubNavigate = (tab: "search" | "ore" | "cwl" | "meta" | "wall", subAction?: string) => {
    if (subAction === "clan") {
      window.location.hash = "#/klan";
    } else {
      switchTab(tab);
    }
  };

  const handleHubSearchQuery = (mode: "player" | "clanTag" | "clanName", query: string) => {
    const clean = query.replace(/^#/, "").toUpperCase();
    if (mode === "player") {
      window.location.hash = `#/oyuncu/${clean}`;
    } else if (mode === "clanTag") {
      window.location.hash = `#/klan/${clean}`;
    } else {
      window.location.hash = `#/klan?q=${encodeURIComponent(query)}`;
    }
  };

  const handleImportPlayerToOre = (player: ImportedPlayerForOre) => {
    setImportedPlayer(player);
    switchTab("ore");
  };

  const handleScoutClanInCwl = (clanTag: string) => {
    setCwlClanTag(clanTag);
    switchTab("cwl");
  };

  const handleSelectPlayer = (tag: string) => {
    const clean = tag.replace(/^#/, "").toUpperCase();
    window.location.hash = `#/oyuncu/${clean}`;
  };

  const handleSelectClan = (tag: string) => {
    const clean = tag.replace(/^#/, "").toUpperCase();
    window.location.hash = `#/klan/${clean}`;
  };

  const handleViewClanFromPlayer = (clanTag: string, playerTag?: string) => {
    const cleanClan = clanTag.replace(/^#/, "").toUpperCase();
    const highlight = playerTag ? `?vurgula=${playerTag.replace(/^#/, "").toUpperCase()}` : "";
    window.location.hash = `#/klan/${cleanClan}${highlight}`;
  };

  return (
    <AppShell activeTab={activeTab} onTabChange={switchTab}>
      {activeTab === "home" && (
        <HomeHubView
          onNavigate={handleHubNavigate}
          onSearchQuery={handleHubSearchQuery}
        />
      )}

      {activeTab === "search" && (
        <>
          {routeInfo?.view === "player" && (
            <PlayerProfileView
              tag={routeInfo.tag}
              onImportPlayerToOre={handleImportPlayerToOre}
              onViewClan={(clanTag) => handleViewClanFromPlayer(clanTag, routeInfo.tag)}
            />
          )}

          {routeInfo?.view === "clan" && (
            <ClanDetailsView
              clanTag={routeInfo.tag}
              highlightPlayerTag={routeInfo.highlightTag}
              onSelectPlayer={handleSelectPlayer}
              onScoutClanInCwl={handleScoutClanInCwl}
            />
          )}

          {(!routeInfo || routeInfo.view === "search") && (
            <SearchHubView
              defaultTab={routeInfo?.defaultTab || "player"}
              onSelectPlayer={handleSelectPlayer}
              onSelectClan={handleSelectClan}
            />
          )}
        </>
      )}

      {activeTab === "meta" && <MetaDashboardView />}

      {activeTab === "cwl" && <ScoutedArmyCard initialClanTag={cwlClanTag} />}

      {activeTab === "ore" && (
        <OreCalculatorView
          importedPlayer={importedPlayer}
          onClearImportedPlayer={() => setImportedPlayer(null)}
        />
      )}

      {activeTab === "wall" && <WallArtView />}
    </AppShell>
  );
}
