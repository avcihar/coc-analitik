"use client";

import React from "react";
import { Hammer, Crown, Swords } from "lucide-react";
import { SectionPanel, IconFrame, BuilderHallImage } from "@/components/game";
import { getBuilderBaseLeagueInfo } from "@/components/clan/leagueHelper";
import { useLanguage } from "@/lib/i18n";
import type { PlayerProfileViewData } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function BuilderUnitTile({
  name,
  level,
  maxLevel,
  tileType,
  levelLabel,
}: {
  name: string;
  level?: number;
  maxLevel?: number;
  tileType: "hero" | "elixir";
  levelLabel?: string;
}) {
  const isMax =
    level !== undefined &&
    maxLevel !== undefined &&
    maxLevel > 0 &&
    level >= maxLevel;

  return (
    <div
      title={`${name}${level !== undefined ? ` (${level}${maxLevel ? `/${maxLevel}` : ""})` : ""}`}
      className={cn(
        "ui-info p-1.5 sm:p-2 flex flex-col items-center justify-start gap-1 text-center shadow-inner min-w-0",
        isMax && "border-[var(--ui-text-gold)]/40"
      )}
    >
      <IconFrame
        name={name}
        village="builderBase"
        level={level}
        maxLevel={maxLevel}
        isMax={isMax}
        size="unit"
        tileType={tileType}
      />
      <span className="text-[11px] font-semibold leading-tight truncate w-full text-[var(--ui-text-main)]">
        {name}
      </span>
      {levelLabel && (
        <span className="text-[10px] font-semibold tabular-nums leading-none text-[var(--ui-text-muted)]">
          {levelLabel}
        </span>
      )}
    </div>
  );
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
  const { t, locale, isTr, fmtNum, fmtTemplate } = useLanguage();

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

  const bhLevel = player.builderHallLevel ?? 0;
  const currentTrophies = player.builderBaseTrophies ?? 0;
  const bestTrophies = player.bestBuilderBaseTrophies ?? currentTrophies;

  const hasBuilderData =
    bhLevel > 0 ||
    currentTrophies > 0 ||
    uniqueBuilderHeroes.length > 0 ||
    builderTroops.length > 0;

  if (!hasBuilderData) {
    return (
      <SectionPanel className={cn("text-center py-8", className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-[var(--ui-text-muted)]">
          <Hammer size={26} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
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
      trophies: currentTrophies,
      builderBaseTrophies: player.builderBaseTrophies,
      builderBaseLeague: player.builderBaseLeague,
    },
    locale
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upper Builder Base Stats Block */}
      <SectionPanel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          {/* Left Card: Builder Hall Level */}
          <div className="ui-info p-3 sm:p-3.5 flex items-center gap-3.5 shadow-inner min-w-0">
            <div className="ui-well p-2 shrink-0 flex items-center justify-center">
              <BuilderHallImage level={bhLevel || 1} size={76} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider truncate">
                {t.player.builderHall}
              </div>
              <div className="font-game game-text-stroke text-lg sm:text-xl font-black text-[var(--ui-text-main)] tabular-nums leading-tight">
                {bhLevel > 0
                  ? isTr
                    ? `İB ${fmtNum(bhLevel)}`
                    : `BH ${fmtNum(bhLevel)}`
                  : t.common.noData}
              </div>
              {bhLevel > 0 && (
                <div className="inline-block px-2 py-0.5 rounded bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-xs font-bold text-[var(--ui-text-gold)] tabular-nums">
                  {fmtTemplate(t.clan.levelBadge, { level: fmtNum(bhLevel) })}
                </div>
              )}
            </div>
          </div>

          {/* Middle Card: Builder Base League */}
          <div className="ui-info p-3 sm:p-3.5 flex items-center gap-3.5 shadow-inner min-w-0">
            <div className="ui-well p-2 shrink-0 flex items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px]">
              {builderLeagueInfo.iconUrl ? (
                <img
                  src={builderLeagueInfo.iconUrl}
                  alt={builderLeagueInfo.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-md select-none"
                />
              ) : (
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-8 object-contain opacity-70 select-none"
                />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider truncate">
                {t.player.builderLeague}
              </div>
              <div className="game-text-stroke-sm text-base sm:text-lg font-black text-[var(--ui-text-gold)] truncate leading-tight">
                {builderLeagueInfo.name}
              </div>
              <div className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-extrabold text-[var(--ui-text-main)] tabular-nums">
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5 object-contain shrink-0 select-none"
                />
                <span>{fmtNum(currentTrophies)}</span>
              </div>
            </div>
          </div>

          {/* Right Card: Builder Base Trophies */}
          <div className="ui-info p-3 sm:p-3.5 flex flex-col justify-center gap-2.5 shadow-inner min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--ui-text-muted)] truncate">
                {t.player.builderTrophies}
              </span>
              <div className="flex items-center gap-1.5 font-black tabular-nums shrink-0">
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-4 h-4 object-contain shrink-0 select-none"
                />
                <span className="game-text-stroke-sm text-base text-[var(--ui-text-main)]">
                  {fmtNum(currentTrophies)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-panel-border)] pt-2.5">
              <span className="text-xs font-semibold text-[var(--ui-text-muted)] truncate">
                {t.player.bestBuilderTrophies}
              </span>
              <div className="flex items-center gap-1.5 font-black tabular-nums shrink-0">
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-4 h-4 object-contain shrink-0 select-none"
                />
                <span className="game-text-stroke-sm text-base text-[var(--ui-text-gold)]">
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
          icon={<Crown size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          rightBadge={
            <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
              {fmtTemplate(t.meta.recordsCount, { count: fmtNum(uniqueBuilderHeroes.length) })}
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {uniqueBuilderHeroes.map((bh) => (
              <BuilderUnitTile
                key={bh.name}
                name={bh.name}
                level={bh.level}
                maxLevel={bh.maxLevel}
                tileType="hero"
                levelLabel={`${t.common.levelShort} ${fmtNum(bh.level)} / ${fmtNum(bh.maxLevel)}`}
              />
            ))}
          </div>
        </SectionPanel>
      )}

      {/* Builder Troops */}
      {builderTroops.length > 0 && (
        <SectionPanel
          title={t.player.battleUnits}
          icon={<Swords size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          rightBadge={
            <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
              {fmtTemplate(t.meta.recordsCount, { count: fmtNum(builderTroops.length) })}
            </span>
          }
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {builderTroops.map((bt) => (
              <BuilderUnitTile
                key={bt.name}
                name={bt.name}
                level={bt.level}
                maxLevel={bt.maxLevel}
                tileType="elixir"
              />
            ))}
          </div>
        </SectionPanel>
      )}
    </div>
  );
}
