"use client";

import React from "react";
import { Hammer, Trophy, Crown, Swords } from "lucide-react";
import { SectionPanel, IconFrame } from "@/components/game";
import type { PlayerProfileViewData } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BuilderBaseSectionProps {
  player: PlayerProfileViewData;
  className?: string;
}

/**
 * BuilderBaseSection
 * Rendered when the "İnşaatçı Üssü" subtab is active.
 * Shows Builder Hall level, trophies, league, builder heroes, and builder troops.
 * Strictly uses real API data without fake fields.
 */
export default function BuilderBaseSection({
  player,
  className,
}: BuilderBaseSectionProps) {
  const isBuilderUnit = (u: { village?: string }) =>
    Boolean(u.village && u.village.toLowerCase() === "builderbase");

  const builderHeroes = (player.builderHeroes || []).concat(
    (player.heroes || []).filter(isBuilderUnit)
  );

  // Deduplicate heroes by name
  const uniqueBuilderHeroes = builderHeroes.filter(
    (h, idx, self) => idx === self.findIndex((o) => o.name === h.name)
  );

  const builderTroops = (player.troops || []).filter(isBuilderUnit);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upper Builder Base Stats Block */}
      <SectionPanel className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Builder Hall Level */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-500/40 flex flex-col items-center justify-center text-white shadow-md shrink-0">
              <Hammer size={18} className="text-amber-300" />
              <span className="game-text-stroke-sm text-lg font-black leading-none mt-0.5">
                {player.builderHallLevel ?? "?"}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-stone-200/90 uppercase tracking-wider">
                İnşaatçı Binası
              </div>
              <div className="game-text-stroke text-lg font-black text-white">
                Seviye {player.builderHallLevel ?? "Bilinmiyor"}
              </div>
            </div>
          </div>

          {/* Builder Base League */}
          <div className="text-center md:border-l md:border-r border-white/15 px-2">
            <div className="text-[11px] font-bold text-stone-200/90 uppercase tracking-wider">
              İnşaatçı Ligi
            </div>
            <div className="game-text-stroke-sm text-base font-bold text-amber-300 mt-0.5 truncate">
              {player.builderBaseLeague?.name || "Ligsiz"}
            </div>
          </div>

          {/* Builder Base Trophies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-200/90 font-medium">Mevcut Kupa:</span>
              <div className="flex items-center gap-1 font-black text-amber-300">
                <Trophy size={13} className="fill-amber-400 text-amber-400" />
                <span className="game-text-stroke-sm text-sm text-white">
                  {player.builderBaseTrophies ?? 0}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-white/10 pt-1.5">
              <span className="text-stone-200/90 font-medium">Ulaşılan en yüksek:</span>
              <div className="flex items-center gap-1 font-black text-amber-300">
                <Trophy size={13} className="fill-amber-400 text-amber-400" />
                <span className="game-text-stroke-sm text-sm text-white">
                  {player.bestBuilderBaseTrophies ?? player.builderBaseTrophies ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* Builder Heroes */}
      {uniqueBuilderHeroes.length > 0 && (
        <SectionPanel
          title="İnşaatçı Kahramanları"
          icon={<Crown size={18} className="text-amber-400" />}
          rightBadge={
            <span className="text-xs font-bold text-amber-300">
              {uniqueBuilderHeroes.length} Kahraman
            </span>
          }
        >
          <div className="flex flex-wrap gap-3">
            {uniqueBuilderHeroes.map((bh) => (
              <div
                key={bh.name}
                className="bg-black/25 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5 shadow-sm"
              >
                <IconFrame
                  name={bh.name}
                  village="builderBase"
                  level={bh.level}
                  maxLevel={bh.maxLevel}
                  size="unit"
                  tileType="hero"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {bh.name}
                  </div>
                  <div className="text-[10px] text-stone-300 font-semibold">
                    Seviye {bh.level} / {bh.maxLevel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      {/* Builder Troops */}
      {builderTroops.length > 0 && (
        <SectionPanel
          title="İnşaatçı Birlikleri"
          icon={<Swords size={18} className="text-amber-400" />}
          rightBadge={
            <span className="text-xs font-bold text-amber-300">
              {builderTroops.length} Birlik
            </span>
          }
        >
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-1.5 sm:gap-2">
            {builderTroops.map((bt) => (
              <IconFrame
                key={bt.name}
                name={bt.name}
                village="builderBase"
                level={bt.level}
                maxLevel={bt.maxLevel}
                size="unit"
                tileType="elixir"
              />
            ))}
          </div>
        </SectionPanel>
      )}
    </div>
  );
}
