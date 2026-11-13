"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Search,
  Award,
  Swords,
  MoreHorizontal,
  Sparkles,
  PenTool,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TabKey } from "./GameHeaderTabs";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MobileNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  className?: string;
}

export default function MobileNav({
  activeTab,
  onTabChange,
  className,
}: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme } = useTheme();
  const { isTr, t } = useLanguage();
  const isDark = theme === "dark";

  // Close "more" bottom sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && moreOpen) {
        setMoreOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  const isMoreActive = activeTab === "ore" || activeTab === "wall";

  const primaryItems: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: "home", label: t.nav.home, icon: LayoutGrid },
    { key: "search", label: t.nav.searchMobile, icon: Search },
    { key: "meta", label: t.nav.metaMobile, icon: Award },
    { key: "cwl", label: t.nav.cwlMobile, icon: Swords },
  ];

  const handleSelectTab = (tab: TabKey) => {
    onTabChange(tab);
    setMoreOpen(false);
  };

  return (
    <>
      {/* 1. "More Tools" Bottom Sheet & Backdrop */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[#14100C]/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.moreTools}
            className={cn(
              "fixed bottom-0 left-0 right-0 border-t-2 rounded-t-2xl shadow-2xl p-4 space-y-3 z-50",
              isDark
                ? "bg-gradient-to-b from-[#2A1B12] to-[#1A100A] border-[#5A3A28]"
                : "bg-gradient-to-b from-[#FBF7EE] to-[#EFE5D4] border-[#C2B094]"
            )}
            style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
          >
            {/* Sheet Header */}
            <div
              className={cn(
                "flex items-center justify-between pb-2 border-b",
                isDark ? "border-[#462E1F]" : "border-[#D6C6AD]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-extrabold font-game",
                    isDark ? "text-[#FFFDF8]" : "text-[#2A2018]"
                  )}
                >
                  {t.nav.moreTools}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums",
                    isDark
                      ? "bg-[#D98A2B]/20 text-[#FFEB75] border-[#D98A2B]/45"
                      : "bg-[#D98A2B]/15 text-[#7A4B12] border-[#D98A2B]/40"
                  )}
                >
                  {t.nav.thBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer",
                  isDark
                    ? "text-[#CBBBA3] hover:text-[#FFFDF8] hover:bg-[#3B2214]"
                    : "text-[#5D4B3B] hover:text-[#2A2018] hover:bg-[#E4D5BF]"
                )}
                aria-label={t.common.close}
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2 pt-1">
              {/* Ore Forecaster */}
              <button
                type="button"
                onClick={() => handleSelectTab("ore")}
                className={cn(
                  "w-full min-h-[56px] flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left",
                  activeTab === "ore"
                    ? isDark
                      ? "bg-[#3B2214] border-[#D98A2B]/70 text-[#FFEB75] shadow-sm"
                      : "bg-[#E6D4B8] border-[#B87D2A] text-[#3B2214] shadow-sm"
                    : isDark
                    ? "bg-[#14100C]/70 border-[#462E1F] text-[#F5EFE6] hover:bg-[#2F1D13]"
                    : "bg-[#FFFDF8]/85 border-[#D6C6AD] text-[#2A2018] hover:bg-[#EFE7D8]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "ore"
                        ? "bg-[#D98A2B]/25 border-[#D98A2B]/55 text-[#F8C12C]"
                        : isDark
                        ? "bg-[#2A1B12] border-[#5A3A28] text-[#E8D8C3]"
                        : "bg-[#EFE7D8] border-[#CBBBA3] text-[#4A2E1E]"
                    )}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-xs font-extrabold font-game truncate",
                        isDark ? "text-[#FFFDF8]" : "text-[#2A2018]"
                      )}
                    >
                      {t.nav.ore}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] truncate",
                        isDark ? "text-[#CBBBA3]" : "text-[#5D4B3B]"
                      )}
                    >
                      {t.home.cards.ore.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={cn("shrink-0", isDark ? "text-[#B8A99A]" : "text-[#6B5D4F]")}
                />
              </button>

              {/* Wall Planner */}
              <button
                type="button"
                onClick={() => handleSelectTab("wall")}
                className={cn(
                  "w-full min-h-[56px] flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left",
                  activeTab === "wall"
                    ? isDark
                      ? "bg-[#3B2214] border-[#D98A2B]/70 text-[#FFEB75] shadow-sm"
                      : "bg-[#E6D4B8] border-[#B87D2A] text-[#3B2214] shadow-sm"
                    : isDark
                    ? "bg-[#14100C]/70 border-[#462E1F] text-[#F5EFE6] hover:bg-[#2F1D13]"
                    : "bg-[#FFFDF8]/85 border-[#D6C6AD] text-[#2A2018] hover:bg-[#EFE7D8]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "wall"
                        ? "bg-[#D98A2B]/25 border-[#D98A2B]/55 text-[#F8C12C]"
                        : isDark
                        ? "bg-[#2A1B12] border-[#5A3A28] text-[#E8D8C3]"
                        : "bg-[#EFE7D8] border-[#CBBBA3] text-[#4A2E1E]"
                    )}
                  >
                    <PenTool size={18} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-xs font-extrabold font-game truncate",
                        isDark ? "text-[#FFFDF8]" : "text-[#2A2018]"
                      )}
                    >
                      {t.nav.wall}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] truncate",
                        isDark ? "text-[#CBBBA3]" : "text-[#5D4B3B]"
                      )}
                    >
                      {t.home.cards.wall.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={cn("shrink-0", isDark ? "text-[#B8A99A]" : "text-[#6B5D4F]")}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fixed Bottom Tab Bar (>= 44px touch targets, warm wood styling) */}
      <nav
        aria-label={isTr ? "Mobil Gezinme" : "Mobile Navigation"}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t-2 lg:hidden px-1.5 pt-1.5 transition-colors duration-200",
          isDark
            ? "bg-[#1B120C]/95 border-[#4A2F1F] shadow-[0_-6px_24px_rgba(0,0,0,0.65)]"
            : "bg-[#F6F1E7]/95 border-[#CBBBA3] shadow-[0_-4px_18px_rgba(42,30,18,0.12)]",
          className
        )}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around gap-1">
          {primaryItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectTab(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 min-w-[44px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer relative py-1 px-1",
                  isActive
                    ? isDark
                      ? "bg-[#3B2214]/90 border border-[#D98A2B]/45 text-[#FFEB75] font-extrabold shadow-sm"
                      : "bg-[#E8D7BC] border border-[#B87D2A]/70 text-[#3B2214] font-extrabold shadow-sm"
                    : isDark
                    ? "text-[#CBBBA3] hover:text-[#FFFDF8] border border-transparent font-bold"
                    : "text-[#6B5D4F] hover:text-[#2A2018] border border-transparent font-bold"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 w-8 h-1 rounded-full bg-[#E09A1F] shadow-sm" />
                )}
                <Icon size={18} className="shrink-0" />
                <span className="text-[10px] leading-none tracking-tight font-game truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Tools Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label={t.nav.moreTools}
            className={cn(
              "flex-1 min-w-[44px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer relative py-1 px-1",
              isMoreActive
                ? isDark
                  ? "bg-[#3B2214]/90 border border-[#D98A2B]/45 text-[#FFEB75] font-extrabold shadow-sm"
                  : "bg-[#E8D7BC] border border-[#B87D2A]/70 text-[#3B2214] font-extrabold shadow-sm"
                : isDark
                ? "text-[#CBBBA3] hover:text-[#FFFDF8] border border-transparent font-bold"
                : "text-[#6B5D4F] hover:text-[#2A2018] border border-transparent font-bold"
            )}
          >
            {isMoreActive && (
              <span className="absolute -top-1 w-8 h-1 rounded-full bg-[#E09A1F] shadow-sm" />
            )}
            <MoreHorizontal size={18} className="shrink-0" />
            <span className="text-[10px] leading-none tracking-tight font-game truncate max-w-full">
              {activeTab === "ore"
                ? t.nav.oreMobile
                : activeTab === "wall"
                ? t.nav.wallMobile
                : isTr
                ? "Daha"
                : "More"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
