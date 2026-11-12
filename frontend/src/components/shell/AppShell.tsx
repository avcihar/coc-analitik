"use client";

import React from "react";
import GameHeaderTabs, { type TabKey } from "./GameHeaderTabs";
import MobileNav from "./MobileNav";
import { GameWindow } from "@/components/game";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Flame, Sun, Moon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AppShellProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  variant?: "cream" | "bare";
  children: React.ReactNode;
}

/**
 * AppShell: Master In-Game Layout Shell
 * - Full-bleed background.webp with dark gradient overlay and #0B0E14 base color
 * - iOS Safari safe pseudo-fixed background element
 * - Desktop: in-game top tab strip flush with cream window (variant="cream") or standalone strip (variant="bare")
 * - Mobile: compact top bar (brand + theme toggle) and thumb-friendly fixed bottom nav with safe-area support
 * - Eliminates double borders, breadcrumbs, and red X close button
 */
export default function AppShell({
  activeTab,
  onTabChange,
  variant,
  children,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();

  // Compute variant if not explicitly provided
  const resolvedVariant =
    variant ?? (activeTab === "home" || activeTab === "search" ? "cream" : "bare");

  return (
    <div className="game-theme min-h-screen relative text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
      {/* 1. Global In-Game Background (Fixed container with cover, centered, dark overlay) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-stone-950"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background.webp')" }}
        />
        {/* Soft dark gradient overlay for optimal readability of text and game dialogs */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75 pointer-events-none" />
      </div>

      {/* 2. Mobile Compact Top Header (Brand + Theme toggle, lg:hidden) */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80 px-4 py-2.5 flex items-center justify-between lg:hidden select-none">
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className="flex items-center gap-2 select-none cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-black shadow-sm">
            <Flame size={16} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white font-game drop-shadow-sm">
              CoC Analitik
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
              TH18
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700/60 text-amber-400 transition-colors cursor-pointer"
          title={theme === "dark" ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
          aria-label="Tema Değiştir"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} className="text-sky-300" />}
        </button>
      </header>

      {/* 3. Main Body Container */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 pt-3 lg:pt-6 flex flex-col">
        {/* Desktop Top Tab Strip (hidden on mobile) */}
        <div className="hidden lg:block w-full relative z-20">
          <GameHeaderTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant={resolvedVariant}
          />
        </div>

        {/* Content Wrapper (GameWindow: cream for home/search, bare for meta/cwl/ore/wall) */}
        <main className="flex-1 w-full pb-28 lg:pb-8 relative z-10">
          <GameWindow
            variant={resolvedVariant}
            className={cn(
              resolvedVariant === "cream"
                ? "mt-0 sm:mt-0 rounded-2xl"
                : "mt-0 sm:mt-0 game-bare-flush"
            )}
          >
            {children}
          </GameWindow>
        </main>
      </div>

      {/* 4. Footer (Supercell Fan Content Policy disclaimer) */}
      <footer className="relative z-10 border-t border-stone-800/80 bg-stone-950/80 backdrop-blur-md mt-auto py-6 text-center text-xs text-stone-400 space-y-2 pb-28 lg:pb-6">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-semibold text-stone-200">
            CoC Analitik • Clash of Clans İstatistik & Strateji Platformu (TH18 Meta)
          </p>
          <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
            Bu içerik Supercell ile bağlantılı değildir, Supercell tarafından onaylanmamış, desteklenmemiş veya özel olarak onaylanmamıştır ve Supercell bundan sorumlu değildir. Daha fazla bilgi için Supercell Hayran İçeriği Politikası&apos;na bakın: <a href="https://supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-200">supercell.com/fan-content-policy</a>.
          </p>
        </div>
      </footer>

      {/* 5. Mobile Fixed Bottom Navigation Bar (lg:hidden) */}
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
