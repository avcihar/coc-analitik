"use client";

import React from "react";
import GameHeaderTabs, { type TabKey } from "./GameHeaderTabs";
import MobileNav from "./MobileNav";
import { GameWindow } from "@/components/game";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/lib/i18n";
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
 * - Full-bleed background.webp with warm dark espresso evening scrim or sunlit parchment scrim
 * - Desktop: flush top tab strip with cream window (variant="cream") or bare container (variant="bare")
 * - Mobile: accessible top header (brand + TR|EN toggle + theme toggle) and fixed bottom MobileNav
 */
export default function AppShell({
  activeTab,
  onTabChange,
  variant,
  children,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, t } = useLanguage();
  const isDark = theme === "dark";

  const resolvedVariant =
    variant ?? (activeTab === "home" || activeTab === "search" ? "cream" : "bare");

  return (
    <div
      className={cn(
        "game-theme min-h-screen relative flex flex-col selection:bg-amber-500 selection:text-[#14100C] font-sans transition-colors duration-200",
        isDark ? "text-[#F5EFE6]" : "text-[#2A2018]"
      )}
    >
      {/* 1. Global In-Game Background with Light/Dark Scrim */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-200",
          isDark ? "bg-[#14100C]" : "bg-[#F6F1E7]"
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background.webp')" }}
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b pointer-events-none transition-opacity duration-200",
            isDark
              ? "from-[#14100C]/[0.68] via-[#14100C]/[0.48] to-[#14100C]/[0.88]"
              : "from-[#F6F1E7]/[0.55] via-[#EFE7D8]/[0.38] to-[#E4D5BF]/[0.80]"
          )}
        />
      </div>

      {/* 2. Mobile Compact Top Header (Brand + TR|EN + Theme toggle, lg:hidden) */}
      <header
        className={cn(
          "sticky top-0 z-40 backdrop-blur-md border-b px-3 sm:px-4 py-2 flex items-center justify-between gap-2 lg:hidden select-none transition-colors duration-200",
          isDark
            ? "bg-[#1B120C]/[0.92] border-[#3D2B1E]"
            : "bg-[#F6F1E7]/[0.94] border-[#CBBBA3] shadow-sm"
        )}
      >
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className="min-h-[44px] flex items-center gap-2 px-1 rounded-xl select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]"
          aria-label={t.nav.home}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#E09A1F] to-[#9E5B13] border border-[#5A3A28]/50 flex items-center justify-center text-[#1A1008] font-black shadow-sm shrink-0">
            <Flame size={16} />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={cn(
                "font-extrabold text-sm tracking-tight font-game truncate",
                isDark ? "text-[#FFFDF8]" : "text-[#2A2018]"
              )}
            >
              {t.nav.brand}
            </span>
            <span
              className={cn(
                "text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums shrink-0",
                isDark
                  ? "bg-[#D98A2B]/20 text-[#FFEB75] border-[#D98A2B]/45"
                  : "bg-[#D98A2B]/15 text-[#7A4B12] border-[#D98A2B]/40"
              )}
            >
              {t.nav.thBadge}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Language Switcher (TR | EN) */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t.nav.switchLanguage}
            title={t.nav.switchLanguage}
            className={cn(
              "min-h-[44px] min-w-[44px] px-2 rounded-xl border text-[11px] font-extrabold tracking-wide inline-flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]",
              isDark
                ? "bg-[#241911]/95 hover:bg-[#342318] border-[#5A3A28] text-[#E8D8C3]"
                : "bg-[#EFE7D8] hover:bg-[#E4D5BF] border-[#B8A487] text-[#3B2214]"
            )}
          >
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-md leading-none",
                locale === "tr" ? "bg-[#D98A2B] text-[#1A1008]" : "opacity-65"
              )}
            >
              TR
            </span>
            <span className="opacity-35 leading-none" aria-hidden="true">
              |
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-md leading-none",
                locale === "en" ? "bg-[#D98A2B] text-[#1A1008]" : "opacity-65"
              )}
            >
              EN
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "min-w-[44px] min-h-[44px] rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]",
              isDark
                ? "bg-[#241911]/95 hover:bg-[#342318] border-[#5A3A28] text-[#F8C12C]"
                : "bg-[#EFE7D8] hover:bg-[#E4D5BF] border-[#B8A487] text-[#4A2E1E]"
            )}
            title={isDark ? t.nav.switchToLight : t.nav.switchToDark}
            aria-label={t.nav.toggleTheme}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
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
        <main className="flex-1 w-full pb-6 lg:pb-8 relative z-10">
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

      {/* 4. Footer (Supercell Fan Content Policy disclaimer, clears MobileNav + safe-area) */}
      <footer
        className={cn(
          "relative z-10 border-t backdrop-blur-md mt-auto pt-6 text-center text-xs transition-colors duration-200 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-6",
          isDark
            ? "border-[#3D2B1E] bg-[#14100C]/90 text-[#B8A99A]"
            : "border-[#CBBBA3] bg-[#EFE7D8]/[0.92] text-[#5D4B3B]"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 space-y-1.5">
          <p className={cn("font-semibold", isDark ? "text-[#F5EFE6]" : "text-[#2A2018]")}>
            {t.footer.title}
          </p>
          <p className={cn("text-[11px] leading-relaxed", isDark ? "text-[#B8A99A]" : "text-[#5D4B3B]")}>
            {t.footer.disclaimer}{" "}
            <a
              href="https://supercell.com/fan-content-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline font-medium transition-colors",
                isDark
                  ? "text-[#D9B88C] hover:text-[#FFEB75]"
                  : "text-[#7A4B12] hover:text-[#2A2018]"
              )}
            >
              supercell.com/fan-content-policy
            </a>
            .
          </p>
        </div>
      </footer>

      {/* 5. Mobile Fixed Bottom Navigation Bar (lg:hidden) */}
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
