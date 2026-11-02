"use client";

import React, { useState, useEffect, useCallback } from "react";
import HomeHubView from "@/components/home/HomeHubView";
import PlayerClanSearchView, {
  type ImportedPlayerForOre,
} from "@/components/search/PlayerClanSearchView";
import MetaDashboardView from "@/components/meta/MetaDashboardView";
import ScoutedArmyCard from "@/components/cwl/ScoutedArmyCard";
import OreCalculatorView from "@/components/ore/OreCalculatorView";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  LayoutGrid,
  Search,
  Award,
  Swords,
  Sparkles,
  Sun,
  Moon,
  Flame,
  Menu,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabKey = "home" | "search" | "meta" | "cwl" | "ore";

const HASH_TO_TAB: Record<string, TabKey> = {
  "#/": "home",
  "#/home": "home",
  "#/oyuncu": "search",
  "#/arama": "search",
  "#/meta": "meta",
  "#/ordu": "meta",
  "#/cwl": "cwl",
  "#/cevher": "ore",
};

const TAB_TO_HASH: Record<TabKey, string> = {
  home: "#/home",
  search: "#/oyuncu",
  meta: "#/meta",
  cwl: "#/cwl",
  ore: "#/cevher",
};

const TAB_BREADCRUMBS: Record<TabKey, string> = {
  home: "Ana Sayfa",
  search: "Oyuncu & Klan Arama",
  meta: "Meta & Ordu Tavsiyesi",
  cwl: "CWL Keşif Kartı",
  ore: "Cevher Analizi & Fulleme",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importedPlayer, setImportedPlayer] = useState<ImportedPlayerForOre | null>(null);
  const [cwlClanTag, setCwlClanTag] = useState<string>("#2PP");
  const [searchInitialQuery, setSearchInitialQuery] = useState<string | undefined>(undefined);
  const [searchInitialMode, setSearchInitialMode] = useState<"player" | "clan">("player");
  const { theme, toggleTheme } = useTheme();

  // Sync state with URL hash for seamless browser back/forward and sharing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (HASH_TO_TAB[hash]) {
        setActiveTab(HASH_TO_TAB[hash]);
      } else if (!hash || hash === "#") {
        setActiveTab("home");
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const switchTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.location.hash = TAB_TO_HASH[tab];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleHubNavigate = (tab: "search" | "ore" | "cwl" | "meta", _subAction?: string) => {
    switchTab(tab);
  };

  const handleHubSearchQuery = (mode: "player" | "clanTag" | "clanName", query: string) => {
    setSearchInitialQuery(query);
    setSearchInitialMode(mode === "player" ? "player" : "clan");
    switchTab("search");
  };

  const handleImportPlayerToOre = (player: ImportedPlayerForOre) => {
    setImportedPlayer(player);
    switchTab("ore");
  };

  const handleScoutClanInCwl = (clanTag: string) => {
    setCwlClanTag(clanTag);
    switchTab("cwl");
  };

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: "Ana Sayfa", icon: <LayoutGrid size={16} /> },
    { key: "search", label: "Oyuncu & Klan", icon: <Search size={16} /> },
    { key: "meta", label: "Meta & Ordu", icon: <Award size={16} /> },
    { key: "cwl", label: "CWL Keşif", icon: <Swords size={16} /> },
    { key: "ore", label: "Cevher Analizi", icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col selection:bg-blue-600 selection:text-white pb-16 lg:pb-0">
      {/* 1. Sticky Single-Row Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-app-card/95 backdrop-blur-md border-b border-app-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Title */}
          <div
            onClick={() => switchTab("home")}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Flame size={20} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-base tracking-tight text-app-text group-hover:text-blue-400 transition-colors">
                CoC Analitik
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                TH18
              </span>
            </div>
          </div>

          {/* Center: Desktop Icon Nav Menu */}
          <nav className="hidden lg:flex items-center gap-1 bg-app-cardSubtle p-1 rounded-xl border border-app-border">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => switchTab(item.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-app-muted hover:text-app-text hover:bg-app-card/60"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Theme Toggle (small icon button) & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-app-cardSubtle hover:bg-app-card border border-app-border text-app-muted hover:text-app-text transition-colors cursor-pointer"
              title={theme === "dark" ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
            >
              {theme === "dark" ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-blue-500" />}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-app-cardSubtle hover:bg-app-card border border-app-border text-app-text lg:hidden cursor-pointer"
              aria-label="Menüyü aç/kapat"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-app-border bg-app-card px-4 py-3 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => switchTab(item.key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-app-muted hover:text-app-text hover:bg-app-cardSubtle"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-app-muted select-none">
          <button
            onClick={() => switchTab("home")}
            className="hover:text-app-text transition-colors cursor-pointer"
          >
            Ana Sayfa
          </button>
          {activeTab !== "home" && (
            <>
              <ChevronRight size={13} className="text-app-border" />
              <span className="text-app-text font-bold">{TAB_BREADCRUMBS[activeTab]}</span>
            </>
          )}
        </div>

        {/* Tab Views */}
        {activeTab === "home" && (
          <HomeHubView
            onNavigate={handleHubNavigate}
            onSearchQuery={handleHubSearchQuery}
          />
        )}

        {activeTab === "search" && (
          <PlayerClanSearchView
            onImportPlayerToOre={handleImportPlayerToOre}
            onScoutClanInCwl={handleScoutClanInCwl}
            initialQuery={searchInitialQuery}
            initialMode={searchInitialMode}
          />
        )}

        {activeTab === "meta" && <MetaDashboardView />}

        {activeTab === "cwl" && <ScoutedArmyCard initialClanTag={cwlClanTag} />}

        {activeTab === "ore" && (
          <OreCalculatorView
            importedPlayer={importedPlayer}
            onClearImportedPlayer={() => setImportedPlayer(null)}
          />
        )}
      </main>

      {/* 3. Mobile Fixed Bottom Navigation Bar (4 most used tabs) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-app-card/95 backdrop-blur-md border-t border-app-border py-2 px-2 flex justify-around items-center lg:hidden shadow-lg">
        {[
          { key: "home" as TabKey, label: "Ana Sayfa", icon: <LayoutGrid size={18} /> },
          { key: "search" as TabKey, label: "Oyuncu", icon: <Search size={18} /> },
          { key: "meta" as TabKey, label: "Meta Ordu", icon: <Award size={18} /> },
          { key: "cwl" as TabKey, label: "CWL", icon: <Swords size={18} /> },
          { key: "ore" as TabKey, label: "Cevher", icon: <Sparkles size={18} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer",
                isActive ? "text-blue-500 font-extrabold" : "text-app-muted hover:text-app-text"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Footer with Supercell Fan Content Policy */}
      <footer className="border-t border-app-border bg-app-card mt-12 py-8 text-center text-xs text-app-muted space-y-2">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-semibold text-app-text">
            CoC Analitik • Clash of Clans İstatistik & Strateji Platformu (TH18 Meta)
          </p>
          <p className="text-[11px] text-app-muted mt-1 leading-relaxed">
            Bu içerik Supercell ile bağlantılı değildir, Supercell tarafından onaylanmamış, desteklenmemiş veya özel olarak onaylanmamıştır ve Supercell bundan sorumlu değildir. Daha fazla bilgi için Supercell Hayran İçeriği Politikası&apos;na bakın: <a href="https://supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-app-text">supercell.com/fan-content-policy</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
