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

  return (
    <div
      className={cn(
        "w-full flex items-end justify-between select-none relative z-20",
        className
      )}
    >
      {/* Left: Brand logo link + In-Game Tabs row */}
      <div className="flex items-end gap-1 sm:gap-1.5 pl-5 min-w-0">
        {/* Brand link */}
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all mr-2 mb-1.5 shrink-0 cursor-pointer shadow-sm"
          title="Ana Sayfa"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-black shadow-sm">
            <Flame size={14} />
          </div>
          <span className="font-extrabold text-xs tracking-tight text-white font-game drop-shadow-sm">
            CoC Analitik
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
            TH18
          </span>
        </button>

        {/* Tab Buttons */}
        <div className="flex items-end gap-1 lg:gap-1.5" role="tablist">
          {SHELL_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

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
                  isActive
                    ? activeClass
                    : "game-tab-stone-inactive hover:brightness-110"
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-stone-900" : "text-stone-300"
                  )}
                />
                <span className={cn(isActive ? "text-stone-900 font-extrabold" : "text-stone-200")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Theme Toggle (compact icon button, no red X button) */}
      <div className="pr-2 sm:pr-4 shrink-0 mb-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border-2 border-stone-700/60 text-amber-400 hover:text-amber-300 transition-all shadow-md cursor-pointer flex items-center justify-center"
          title={theme === "dark" ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
          aria-label="Tema Değiştir"
        >
          {theme === "dark" ? (
            <Sun size={17} className="text-amber-400" />
          ) : (
            <Moon size={17} className="text-sky-300" />
          )}
        </button>
      </div>
    </div>
  );
}
