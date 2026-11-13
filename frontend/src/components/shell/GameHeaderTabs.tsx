"use client";

import React from "react";
import {
  LayoutGrid,
  Search,
  Award,
  Swords,
  Sparkles,
  PenTool,
  Sun,
  Moon,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TabKey = "home" | "search" | "meta" | "cwl" | "ore" | "wall";

export interface TabItem {
  key: TabKey;
  label: string;
  mobileLabel: string;
  hash: string;
  icon: LucideIcon;
}

export const SHELL_TABS: TabItem[] = [
  { key: "home", label: "Ana Sayfa", mobileLabel: "Ana Sayfa", hash: "#/home", icon: LayoutGrid },
  { key: "search", label: "Oyuncu & Klan", mobileLabel: "Oyuncu", hash: "#/oyuncu", icon: Search },
  { key: "meta", label: "Meta & Ordu", mobileLabel: "Meta", hash: "#/meta", icon: Award },
  { key: "cwl", label: "CWL Keşif", mobileLabel: "CWL", hash: "#/cwl", icon: Swords },
  { key: "ore", label: "Cevher Analizi", mobileLabel: "Cevher", hash: "#/cevher", icon: Sparkles },
  { key: "wall", label: "Duvar Yazısı", mobileLabel: "Duvar", hash: "#/duvar", icon: PenTool },
];

export interface GameHeaderTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  variant?: "cream" | "bare";
  className?: string;
}

export default function GameHeaderTabs({
  activeTab,
  onTabChange,
  variant = "cream",
  className,
}: GameHeaderTabsProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, t } = useLanguage();
  const isDark = theme === "dark";

  const tabLabels: Record<TabKey, string> = {
    home: t.nav.home,
    search: t.nav.search,
    meta: t.nav.meta,
    cwl: t.nav.cwl,
    ore: t.nav.ore,
    wall: t.nav.wall,
  };

  return (
    <div
      className={cn(
        "w-full flex items-end justify-between gap-2 select-none relative z-20",
        className
      )}
    >
      {/* Left: Brand badge + Flush In-Game Tabs row */}
      <div className="flex items-end gap-1.5 xl:gap-2 pl-2 xl:pl-4 min-w-0">
        {/* Brand link */}
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl border transition-all mb-1.5 shrink-0 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]",
            isDark
              ? "bg-[#241911]/95 hover:bg-[#342318] border-[#5A3A28] text-[#FFFDF8]"
              : "bg-[#F6F1E7]/95 hover:bg-[#EFE7D8] border-[#B8A487] text-[#2A2018]"
          )}
          title={t.nav.home}
          aria-label={t.nav.brand}
        >
          <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md bg-gradient-to-tr from-[#E09A1F] to-[#9E5B13] flex items-center justify-center text-[#1A1008] font-black shadow-sm shrink-0">
            <Flame size={13} />
          </div>
          <span className="font-extrabold text-[11px] xl:text-xs tracking-tight font-game whitespace-nowrap">
            {t.nav.brand}
          </span>
          <span
            className={cn(
              "hidden xl:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded border tabular-nums",
              isDark
                ? "bg-[#D98A2B]/20 text-[#FFEB75] border-[#D98A2B]/45"
                : "bg-[#D98A2B]/15 text-[#7A4B12] border-[#D98A2B]/40"
            )}
          >
            {t.nav.thBadge}
          </span>
        </button>

        {/* Tab Buttons (preserves .game-shell-tab, .game-tab-cream-active, .game-tab-wood-attached) */}
        <div className="flex items-end gap-1 min-w-0" role="tablist">
          {SHELL_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            const label = tabLabels[tab.key];

            const activeClass =
              variant === "cream"
                ? "game-tab-cream-active"
                : "game-tab-wood-attached";

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "game-tab game-shell-tab font-black transition-all cursor-pointer shrink-0",
                  "lg:!px-2 lg:!py-[7px] lg:!text-[12.5px] lg:!gap-1",
                  "xl:!px-3 xl:!py-[9px] xl:!text-[13.5px] xl:!gap-1.5",
                  isActive
                    ? activeClass
                    : "game-tab-stone-inactive hover:brightness-110"
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-[#2D2016]" : "text-[#EFE7D8]"
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap",
                    isActive ? "text-[#2D2016] font-extrabold" : "text-[#F5EFE6]"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Compact TR | EN Language Switcher + Theme Toggle */}
      <div className="flex items-center gap-1.5 pr-2 xl:pr-3 shrink-0 mb-1.5">
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={t.nav.switchLanguage}
          title={t.nav.switchLanguage}
          className={cn(
            "h-9 px-2 rounded-xl border-2 text-[11px] font-extrabold tracking-wide inline-flex items-center gap-1 transition-all shadow-md cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]",
            isDark
              ? "bg-[#241911]/95 hover:bg-[#342318] border-[#5A3A28] text-[#E8D8C3]"
              : "bg-[#F6F1E7]/95 hover:bg-[#EFE7D8] border-[#B8A487] text-[#3B2214]"
          )}
        >
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-md leading-none transition-colors",
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
              "px-1.5 py-0.5 rounded-md leading-none transition-colors",
              locale === "en" ? "bg-[#D98A2B] text-[#1A1008]" : "opacity-65"
            )}
          >
            EN
          </span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "w-9 h-9 rounded-xl border-2 transition-all shadow-md cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A2B]",
            isDark
              ? "bg-[#241911]/95 hover:bg-[#342318] border-[#5A3A28] text-[#F8C12C] hover:text-[#FFEB75]"
              : "bg-[#F6F1E7]/95 hover:bg-[#EFE7D8] border-[#B8A487] text-[#4A2E1E] hover:text-[#2A2018]"
          )}
          title={isDark ? t.nav.switchToLight : t.nav.switchToDark}
          aria-label={t.nav.toggleTheme}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </div>
  );
}
