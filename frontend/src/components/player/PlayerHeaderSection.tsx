"use client";

import React from "react";
import {
  Star,
  Users,
  ExternalLink,
} from "lucide-react";
import { SectionPanel, ClanBadge, GameButton } from "@/components/game";
import { getLocalizedLeagueName } from "@/components/clan/leagueHelper";
import { getLeagueTierById } from "@/lib/gemIncomeConfig";
import { useLanguage } from "@/lib/i18n";
import ExpLevelBadge from "./ExpLevelBadge";
import type { PlayerProfileViewData, PlayerLeagueInfo } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PlayerHeaderSectionProps {
  player: PlayerProfileViewData;
  onViewClan?: (clanTag: string) => void;
  className?: string;
}

type PlayerWithOptionalTier = PlayerProfileViewData & {
  leagueTier?: PlayerLeagueInfo & {
    iconUrls?: { small?: string; medium?: string; large?: string };
  };
};

interface PlayerRolesMap {
  leader: string;
  coLeader: string;
  admin: string;
  member: string;
}

function localizeRole(role: string | undefined, roles: PlayerRolesMap): string {
  if (!role) return "";
  switch (role.trim().toLowerCase()) {
    case "leader":
      return roles.leader;
    case "coleader":
    case "co-leader":
      return roles.coLeader;
    case "admin":
    case "elder":
      return roles.admin;
    case "member":
      return roles.member;
    default:
      return role;
  }
}

/**
 * PlayerHeaderSection
 * Desktop (1440px): Horizontal 3-area profile header (Identity + Labels + Open in Game | Clan + War Stars + View Clan | League + Trophies & Best Trophies).
 * Mobile (390px): Stacked Identity -> Clan row -> 3-stat mini row (War Stars | Current League | Best Trophies).
 */
export default function PlayerHeaderSection({
  player,
  onViewClan,
  className,
}: PlayerHeaderSectionProps) {
  const { t, locale, isTr, fmtNum } = useLanguage();
  const extendedPlayer = player as PlayerWithOptionalTier;

  const localizedRole = localizeRole(player.role, t.player.roles);
  const cleanPlayerTag = player.tag ? player.tag.replace(/^#/, "") : "";
  const cleanClanTag = player.clan?.tag ? player.clan.tag.replace(/^#/, "") : "";

  const openInGameUrl = cleanPlayerTag
    ? `https://link.clashofclans.com/${locale === "tr" ? "tr" : "en"}/?action=OpenPlayerProfile&tag=${encodeURIComponent(cleanPlayerTag)}`
    : "";

  const resolvedTierId =
    extendedPlayer.leagueTier?.id ?? player.leagueTierId ?? player.league?.id;
  const resolvedRawLeagueName =
    extendedPlayer.leagueTier?.name ||
    player.originalLeagueName ||
    player.league?.name ||
    player.leagueName;
  const localizedLeagueName = getLocalizedLeagueName(
    resolvedTierId,
    resolvedRawLeagueName,
    locale
  );

  const modernTier =
    resolvedTierId !== undefined ? getLeagueTierById(resolvedTierId) : undefined;
  const leagueIconUrl =
    extendedPlayer.leagueTier?.iconUrls?.medium ||
    extendedPlayer.leagueTier?.iconUrls?.small ||
    player.league?.iconUrls?.medium ||
    player.league?.iconUrls?.small ||
    modernTier?.iconSmall;

  const handleClanClick = () => {
    if (!player.clan) return;
    if (onViewClan) {
      onViewClan(player.clan.tag);
    } else {
      window.location.hash = `#/klan/${cleanClanTag}`;
    }
  };

  const warStarsValue = fmtNum(player.warStars ?? 0);
  const currentTrophiesValue = fmtNum(player.trophies ?? 0);
  const bestTrophiesValue = fmtNum(player.bestTrophies ?? player.trophies ?? 0);

  return (
    <SectionPanel className={cn("space-y-3 lg:space-y-0", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 items-center">
        {/* 1. Left: Exp Crest, Name, Tag, Role, Labels, Open in Game */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <ExpLevelBadge level={player.expLevel ?? 1} size="md" />

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-game game-text-stroke text-lg sm:text-xl font-black text-[var(--ui-text-main)] break-words leading-tight min-w-0">
                  {player.name}
                </h2>
                {localizedRole && (
                  <span className="ui-pill px-2.5 py-0.5 text-xs font-bold text-[var(--ui-text-muted)] shrink-0">
                    {localizedRole}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm font-semibold text-[var(--ui-text-gold)] tracking-wide tabular-nums">
                {player.tag}
              </div>

              {/* Player Labels */}
              {player.labels && player.labels.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  {player.labels.map((lbl, idx) => {
                    const iconUrl = lbl.iconUrls?.small || lbl.iconUrls?.medium;
                    return (
                      <div
                        key={lbl.id || idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] text-[var(--ui-text-main)] shadow-sm min-w-0"
                        title={lbl.name}
                      >
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={lbl.name || player.tag}
                            className="w-4 h-4 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-[var(--ui-text-gold)] font-bold shrink-0">#</span>
                        )}
                        {lbl.name && (
                          <span className="text-[11px] font-semibold text-[var(--ui-text-main)] truncate max-w-[110px]">
                            {lbl.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {openInGameUrl && (
            <div className="pt-0.5">
              <GameButton
                variant="gold"
                size="sm"
                href={openInGameUrl}
                target="_blank"
                icon={<ExternalLink size={14} />}
                className="w-full sm:w-auto min-h-[44px] px-3.5 text-xs font-bold"
              >
                {t.common.openInGame}
              </GameButton>
            </div>
          )}
        </div>

        {/* 2. Center: Clan Badge, Clan Name, War Stars (Desktop), View Clan */}
        <div className="lg:col-span-4 min-w-0">
          {player.clan ? (
            <div className="ui-info p-2.5 sm:p-3 flex items-center justify-between gap-2.5 shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <ClanBadge
                    url={
                      player.clan.badgeUrls?.large ||
                      player.clan.badgeUrls?.medium ||
                      player.clan.badgeUrls?.small
                    }
                    name={player.clan.name}
                    size={46}
                  />
                  {player.clan.clanLevel !== undefined && (
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded bg-[var(--game-badge-bg)] border border-[var(--game-badge-border)] text-[10px] font-black text-[var(--ui-text-gold)] tabular-nums leading-none">
                      {fmtNum(player.clan.clanLevel)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="lg:hidden text-[11px] font-semibold text-[var(--ui-text-muted)]">
                    {isTr ? "Mevcut Klan" : "Current Clan"}
                  </div>
                  <div className="game-text-stroke-sm text-sm font-bold text-[var(--ui-text-main)] truncate">
                    {player.clan.name}
                  </div>
                  <div className="hidden lg:flex items-center gap-1 text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums">
                    <Star
                      size={12}
                      className="fill-[var(--ui-text-gold)] text-[var(--ui-text-gold)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{t.player.warStars}:</span>
                    <span className="font-black text-[var(--ui-text-gold)]">{warStarsValue}</span>
                  </div>
                </div>
              </div>

              <GameButton
                variant="green"
                size="sm"
                onClick={handleClanClick}
                className="min-h-[44px] px-3 text-xs font-bold shrink-0"
                icon={<Users size={14} />}
              >
                {t.player.viewClan}
              </GameButton>
            </div>
          ) : (
            <div className="ui-info p-3 text-center text-[var(--ui-text-muted)] text-xs sm:text-sm font-semibold">
              {t.player.noClan}
            </div>
          )}
        </div>

        {/* 3. Right (Desktop): Current League + Trophies & Best Trophies */}
        <div className="hidden lg:grid lg:col-span-3 grid-cols-2 gap-2.5 min-w-0">
          <div className="ui-info p-2.5 flex items-center gap-2 min-w-0 shadow-inner">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              {leagueIconUrl ? (
                <img
                  src={leagueIconUrl}
                  alt={localizedLeagueName}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 object-contain shrink-0 select-none"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider truncate">
                {t.player.currentLeague}
              </div>
              <div className="game-text-stroke-sm text-base font-black text-[var(--ui-text-main)] tabular-nums leading-tight">
                {currentTrophiesValue}
              </div>
              <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {localizedLeagueName}
              </div>
            </div>
          </div>

          <div className="ui-info p-2.5 flex items-center gap-2 min-w-0 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] flex items-center justify-center shrink-0">
              <img
                src="/icons/ui/trophy.png"
                alt=""
                aria-hidden="true"
                className="w-4 h-4 object-contain shrink-0 select-none"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider leading-tight">
                {t.player.bestTrophies}
              </div>
              <div className="game-text-stroke-sm text-base font-black text-[var(--ui-text-gold)] tabular-nums leading-tight mt-0.5">
                {bestTrophiesValue}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile (< lg) 3-Stat Row inside Header: War Stars | Current League | Best Trophies */}
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        <div className="ui-info p-2.5 text-center flex flex-col items-center justify-center gap-1 shadow-inner min-w-0">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] leading-tight">
            {t.player.warStars}
          </span>
          <div className="flex items-center gap-1 tabular-nums">
            <Star
              size={13}
              className="fill-[var(--ui-text-gold)] text-[var(--ui-text-gold)] shrink-0"
              aria-hidden="true"
            />
            <span className="text-sm font-black text-[var(--ui-text-gold)]">
              {warStarsValue}
            </span>
          </div>
        </div>

        <div className="ui-info p-2.5 text-center flex flex-col items-center justify-center gap-1 shadow-inner min-w-0">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] leading-tight truncate max-w-full">
            {t.player.currentLeague}
          </span>
          <div className="flex items-center gap-1 tabular-nums">
            {leagueIconUrl ? (
              <img
                src={leagueIconUrl}
                alt={localizedLeagueName}
                className="w-4 h-4 object-contain shrink-0"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ) : (
              <img
                src="/icons/ui/trophy.png"
                alt=""
                aria-hidden="true"
                className="w-3.5 h-3.5 object-contain shrink-0 select-none"
              />
            )}
            <span className="text-sm font-black text-[var(--ui-text-main)]">
              {currentTrophiesValue}
            </span>
          </div>
        </div>

        <div className="ui-info p-2.5 text-center flex flex-col items-center justify-center gap-1 shadow-inner min-w-0">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] leading-tight">
            {t.player.bestTrophies}
          </span>
          <div className="flex items-center gap-1 tabular-nums">
            <img
              src="/icons/ui/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 select-none"
            />
            <span className="text-sm font-black text-[var(--ui-text-gold)]">
              {bestTrophiesValue}
            </span>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
