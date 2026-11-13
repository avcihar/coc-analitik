"use client";

import React from "react";
import { Hammer, Trophy, Crown, Swords } from "lucide-react";
import { SectionPanel, IconFrame } from "@/components/game";
import { getBuilderBaseLeagueInfo } from "@/components/clan/leagueHelper";
import { useLanguage } from "@/lib/i18n";
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
 * Rendered when the Builder Base subtab is active.
 * Shows Builder Hall level, trophies, league, builder heroes, and builder troops.
 */
export default function BuilderBaseSection({
  player,
  className,
}: BuilderBaseSectionProps) {
  const { t, locale, fmtNum, fmtTemplate } = useLanguage();

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

  const hasBuilderData =
    (player.builderHallLevel ?? 0) > 0 ||
    (player.builderBaseTrophies ?? 0) > 0 ||
    uniqueBuilderHeroes.length > 0 ||
    builderTroops.length > 0;

  if (!hasBuilderData) {
    return (
      <SectionPanel className={cn("text-center py-8", className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-amber-100/90">
          <Hammer size={26} className="text-amber-400" aria-hidden="true" />
          <p className="text-sm font-semibold">{t.player.builderNotUnlocked}</p>
        </div>
      </SectionPanel>
    );
  }

  const builderLeagueInfo = getBuilderBaseLeagueInfo(
    {
      tag: player.tag,
      name: player.name,
      role: player.role || "member",
      trophies: player.trophies,
      builderBaseTrophies: player.builderBaseTrophies,
      builderBaseLeague: player.builderBaseLeague,
    },
    locale
  );

  const currentTrophies = player.builderBaseTrophies ?? 0;
  const bestTrophies = player.bestBuilderBaseTrophies ?? currentTrophies;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upper Builder Base Stats Block */}
      <SectionPanel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          {/* Builder Hall Level */}
          <div className="bg-[#2B1F16]/80 border border-amber-400/20 rounded-xl p-3 flex items-center gap-3 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-400/45 flex flex-col items-center justify-center text-white shadow-md shrink-0">
              <Hammer size={18} className="text-amber-300" aria-hidden="true" />
              <span className="game-text-stroke-sm text-lg font-black tabular-nums leading-none mt-0.5">
                {player.builderHallLevel ? fmtNum(player.builderHallLevel) : "?"}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                {t.player.builderHall}
              </div>
              <div className="game-text-stroke text-base sm:text-lg font-black text-white tabular-nums mt-0.5">
                {player.builderHallLevel
                  ? fmtTemplate(t.clan.levelBadge, { level: fmtNum(player.builderHallLevel) })
                  : t.common.noData}
              </div>
            </div>
          </div>

          {/* Builder Base League */}
          <div className="bg-[#2B1F16]/80 border border-amber-400/20 rounded-xl p-3 flex flex-col justify-center items-start md:items-center text-left md:text-center shadow-inner">
            <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              {t.player.builderLeague}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {builderLeagueInfo.iconUrl && (
                <img
                  src={builderLeagueInfo.iconUrl}
                  alt={builderLeagueInfo.name}
                  className="w-6 h-6 object-contain shrink-0"
                />
              )}
              <span className="game-text-stroke-sm text-sm sm:text-base font-bold text-amber-300">
                {builderLeagueInfo.name}
              </span>
            </div>
          </div>

          {/* Builder Base Trophies */}
          <div className="bg-[#2B1F16]/80 border border-amber-400/20 rounded-xl p-3 flex flex-col justify-center gap-2 shadow-inner">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-200 font-semibold">{t.player.builderTrophies}</span>
              <div className="flex items-center gap-1.5 font-black text-amber-300 tabular-nums shrink-0">
                <Trophy size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="game-text-stroke-sm text-sm text-white">
                  {fmtNum(currentTrophies)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs border-t border-white/15 pt-2">
              <span className="text-stone-200 font-semibold">{t.player.bestBuilderTrophies}</span>
              <div className="flex items-center gap-1.5 font-black text-amber-300 tabular-nums shrink-0">
                <Trophy size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="game-text-stroke-sm text-sm text-amber-200">
                  {fmtNum(bestTrophies)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* Builder Heroes */}
      {uniqueBuilderHeroes.length > 0 && (
        <SectionPanel
          title={t.player.battleHeroes}
          icon={<Crown size={18} className="text-amber-400" aria-hidden="true" />}
          rightBadge={
            <span className="text-xs font-bold text-amber-200 tabular-nums">
              {fmtTemplate(t.meta.recordsCount, { count: fmtNum(uniqueBuilderHeroes.length) })}
            </span>
          }
        >
          <div className="flex flex-wrap gap-3">
            {uniqueBuilderHeroes.map((bh) => (
              <div
                key={bh.name}
                className="bg-[#2B1F16]/80 rounded-xl p-2.5 border border-amber-400/20 flex items-center gap-3 shadow-sm"
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
                  <div className="text-xs font-bold text-white">
                    {bh.name}
                  </div>
                  <div className="text-xs text-amber-200/90 font-semibold tabular-nums mt-0.5">
                    {t.common.levelShort} {fmtNum(bh.level)} / {fmtNum(bh.maxLevel)}
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
          title={t.player.battleUnits}
          icon={<Swords size={18} className="text-amber-400" aria-hidden="true" />}
          rightBadge={
            <span className="text-xs font-bold text-amber-200 tabular-nums">
              {fmtTemplate(t.meta.recordsCount, { count: fmtNum(builderTroops.length) })}
            </span>
          }
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2">
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
