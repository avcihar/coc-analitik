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
  const { isTr, t } = useLanguage();

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
            className="fixed bottom-0 left-0 right-0 ui-panel !rounded-b-none rounded-t-2xl shadow-2xl p-4 space-y-3 z-50"
            style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--ui-panel-border)]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold font-game text-[var(--ui-text-main)]">
                  {t.nav.moreTools}
                </span>
                <span className="ui-pill text-[10px] font-black px-1.5 py-0.5 text-[var(--ui-text-gold)] border-[var(--ui-text-gold)]/45 tabular-nums">
                  {t.nav.thBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] hover:bg-[var(--game-dark-box-mid)] transition-colors cursor-pointer"
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
                    ? "ui-info border-[var(--ui-text-gold)]/70 text-[var(--ui-text-gold)] shadow-sm"
                    : "ui-well hover:brightness-110 text-[var(--ui-text-main)]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "ore"
                        ? "bg-[var(--ui-text-gold)]/15 border-[var(--ui-text-gold)]/55 text-[var(--ui-text-gold)]"
                        : "bg-[var(--game-dark-box-mid)] border-[var(--ui-panel-border)] text-[var(--ui-text-muted)]"
                    )}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold font-game truncate text-[var(--ui-text-main)]">
                      {t.nav.ore}
                    </div>
                    <div className="text-[11px] truncate text-[var(--ui-text-muted)]">
                      {t.home.cards.ore.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--ui-text-muted)]"
                />
              </button>

              {/* Wall Planner */}
              <button
                type="button"
                onClick={() => handleSelectTab("wall")}
                className={cn(
                  "w-full min-h-[56px] flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left",
                  activeTab === "wall"
                    ? "ui-info border-[var(--ui-text-gold)]/70 text-[var(--ui-text-gold)] shadow-sm"
                    : "ui-well hover:brightness-110 text-[var(--ui-text-main)]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "wall"
                        ? "bg-[var(--ui-text-gold)]/15 border-[var(--ui-text-gold)]/55 text-[var(--ui-text-gold)]"
                        : "bg-[var(--game-dark-box-mid)] border-[var(--ui-panel-border)] text-[var(--ui-text-muted)]"
                    )}
                  >
                    <PenTool size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold font-game truncate text-[var(--ui-text-main)]">
                      {t.nav.wall}
                    </div>
                    <div className="text-[11px] truncate text-[var(--ui-text-muted)]">
                      {t.home.cards.wall.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--ui-text-muted)]"
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
          "fixed bottom-0 left-0 right-0 z-40 border-t-2 lg:hidden px-1.5 pt-1.5 transition-colors duration-200 ui-nav shadow-[0_-6px_24px_rgba(0,0,0,0.65)]",
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
                    ? "bg-[var(--game-wood-dark)] border border-[var(--ui-text-gold)]/45 text-[var(--ui-text-gold)] font-extrabold shadow-sm"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] border border-transparent font-bold"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 w-8 h-1 rounded-full bg-[var(--ui-text-gold)] shadow-sm" />
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
                ? "bg-[var(--game-wood-dark)] border border-[var(--ui-text-gold)]/45 text-[var(--ui-text-gold)] font-extrabold shadow-sm"
                : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] border border-transparent font-bold"
            )}
          >
            {isMoreActive && (
              <span className="absolute -top-1 w-8 h-1 rounded-full bg-[var(--ui-text-gold)] shadow-sm" />
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
