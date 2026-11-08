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

  // Is active tab one of the "more" items?
  const isMoreActive = activeTab === "ore" || activeTab === "wall";

  const primaryItems: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: "home", label: "Ana Sayfa", icon: LayoutGrid },
    { key: "search", label: "Oyuncu", icon: Search },
    { key: "meta", label: "Meta", icon: Award },
    { key: "cwl", label: "CWL", icon: Swords },
  ];

  const handleSelectTab = (tab: TabKey) => {
    onTabChange(tab);
    setMoreOpen(false);
  };

  return (
    <>
      {/* 1. "Daha..." Bottom Sheet & Backdrop */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Menu */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Diğer Araçlar"
            className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t-2 border-stone-700 rounded-t-2xl shadow-2xl p-4 space-y-3 z-50 animate-fadeIn"
            style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-stone-100 font-game">
                  Diğer Araçlar
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  CoC
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2 pt-1">
              {/* Cevher Analizi */}
              <button
                type="button"
                onClick={() => handleSelectTab("ore")}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left",
                  activeTab === "ore"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm"
                    : "bg-stone-950/60 border-stone-800 text-stone-200 hover:bg-stone-800/60 hover:border-stone-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "ore"
                        ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                        : "bg-stone-800 border-stone-700 text-stone-300"
                    )}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-100 font-game">
                      Cevher Analizi
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Ekipman Fulleme & Hesaplayıcı
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-500 shrink-0" />
              </button>

              {/* Duvar Yazısı */}
              <button
                type="button"
                onClick={() => handleSelectTab("wall")}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left",
                  activeTab === "wall"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm"
                    : "bg-stone-950/60 border-stone-800 text-stone-200 hover:bg-stone-800/60 hover:border-stone-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      activeTab === "wall"
                        ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                        : "bg-stone-800 border-stone-700 text-stone-300"
                    )}
                  >
                    <PenTool size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-100 font-game">
                      Duvar Yazısı
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Köy Duvarlarıyla Yazı & Pano Tasarımı
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-500 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fixed Bottom Tab Bar (Thumb-friendly 390px responsive) */}
      <nav
        aria-label="Mobil Gezinme"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] lg:hidden px-1 pt-1.5",
          className
        )}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around">
          {primaryItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectTab(item.key)}
                className={cn(
                  "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer relative py-1",
                  isActive
                    ? "text-amber-400 font-extrabold"
                    : "text-stone-400 hover:text-stone-200 font-bold"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 w-8 h-1 rounded-full bg-amber-400 shadow-sm" />
                )}
                <Icon size={19} className="shrink-0" />
                <span className="text-[10px] leading-none tracking-tight font-game">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* "Daha..." Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={cn(
              "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer relative py-1",
              isMoreActive
                ? "text-amber-400 font-extrabold"
                : "text-stone-400 hover:text-stone-200 font-bold"
            )}
          >
            {isMoreActive && (
              <span className="absolute -top-1 w-8 h-1 rounded-full bg-amber-400 shadow-sm" />
            )}
            <MoreHorizontal size={19} className="shrink-0" />
            <span className="text-[10px] leading-none tracking-tight font-game">
              {activeTab === "ore"
                ? "Cevher"
                : activeTab === "wall"
                ? "Duvar"
                : "Daha..."}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
