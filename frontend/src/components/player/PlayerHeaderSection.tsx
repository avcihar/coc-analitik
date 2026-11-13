"use client";

import React from "react";
import {
  Star,
  Trophy,
  Users,
  ExternalLink,
  Swords,
  Shield,
  HandHeart,
  Gift,
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
 * Upper header block of Player Profile:
 * - Left: XP level crest, player identity, Town Hall / weapon level badge, role, labels, Open in Game link
 * - Center: Clan badge & View Clan button (min 44px touch target)
 * - Right: Localized League crest & current trophies
 * - Bottom: Flattened 2-layer stats grid (`grid-cols-2 sm:grid-cols-3`, >=12px non-truncated labels, tabular-nums)
 */
export default function PlayerHeaderSection({
  player,
  onViewClan,
  className,
}: PlayerHeaderSectionProps) {
  const { t, locale, fmtNum, fmtTemplate } = useLanguage();
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

  const statTiles = [
    {
      key: "warStars",
      label: t.player.warStars,
      value: fmtNum(player.warStars ?? 0),
      icon: <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />,
      valueColor: "text-amber-300",
    },
    {
      key: "bestTrophies",
      label: t.player.bestTrophies,
      value: fmtNum(player.bestTrophies ?? player.trophies ?? 0),
      icon: <Trophy size={14} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />,
      valueColor: "text-amber-200",
    },
    {
      key: "donations",
      label: t.player.donations,
      value: fmtNum(player.donations ?? 0),
      icon: <HandHeart size={14} className="text-emerald-300 shrink-0" aria-hidden="true" />,
      valueColor: "text-white",
    },
    {
      key: "donationsReceived",
      label: t.player.donationsReceived,
      value: fmtNum(player.donationsReceived ?? 0),
      icon: <Gift size={14} className="text-amber-300 shrink-0" aria-hidden="true" />,
      valueColor: "text-white",
    },
    {
      key: "attackWins",
      label: t.player.attackWins,
      value: fmtNum(player.attackWins ?? 0),
      icon: <Swords size={14} className="text-emerald-300 shrink-0" aria-hidden="true" />,
      valueColor: "text-emerald-200",
    },
    {
      key: "defenseWins",
      label: t.player.defenseWins,
      value: fmtNum(player.defenseWins ?? 0),
      icon: <Shield size={14} className="text-amber-300 shrink-0" aria-hidden="true" />,
      valueColor: "text-amber-200",
    },
  ];

  return (
    <SectionPanel className={cn("space-y-4", className)}>
      {/* Upper 3-Column Layout (Desktop 3 columns, Mobile 1 column) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* 1. Left: Exp Crest, Identity, Role, Labels, Open-in-Game */}
        <div className="flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <ExpLevelBadge level={player.expLevel ?? 1} size="md" />

            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="game-text-stroke text-lg sm:text-xl md:text-2xl font-black text-white break-words leading-tight">
                {player.name}
              </h2>
              <div className="text-xs sm:text-sm font-semibold text-amber-100/85 tracking-wide tabular-nums">
                {player.tag}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {localizedRole && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#2B1F16] text-amber-200 text-xs font-bold border border-amber-400/25 shadow-sm">
                    {localizedRole}
                  </span>
                )}

                <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#2B1F16] text-amber-100 text-xs font-bold border border-amber-400/20 tabular-nums">
                  {t.common.thShort}
                  {fmtNum(player.townHallLevel)}
                  {player.townHallWeaponLevel && player.townHallWeaponLevel > 1
                    ? ` · ${fmtTemplate(t.player.weaponLevel, {
                        level: fmtNum(player.townHallWeaponLevel),
                      })}`
                    : ""}
                </span>
              </div>

              {/* Player Labels */}
              {player.labels && player.labels.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {player.labels.map((lbl, idx) => {
                    const iconUrl = lbl.iconUrls?.small || lbl.iconUrls?.medium;
                    return (
                      <div
                        key={lbl.id || idx}
                        className="w-8 h-8 rounded-lg bg-[#2B1F16] border border-amber-400/25 p-1 flex items-center justify-center shadow-sm"
                        title={lbl.name}
                      >
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={lbl.name || player.tag}
                            className="w-full h-full object-contain filter drop-shadow-sm"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-amber-200 font-bold">#</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {openInGameUrl && (
            <div>
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

        {/* 2. Center: Clan Badge & View Clan Action */}
        <div className="flex flex-col items-center justify-center text-center gap-2.5 border-t md:border-t-0 md:border-l md:border-r border-amber-300/15 pt-4 md:pt-0 md:px-4">
          {player.clan ? (
            <>
              <div className="game-text-stroke-sm text-sm sm:text-base font-bold text-white tracking-wide break-words max-w-full">
                {player.clan.name}
              </div>

              <ClanBadge
                url={
                  player.clan.badgeUrls?.large ||
                  player.clan.badgeUrls?.medium ||
                  player.clan.badgeUrls?.small
                }
                name={player.clan.name}
                size={58}
              />

              <div className="w-full max-w-[220px] pt-0.5">
                <GameButton
                  variant="green"
                  size="sm"
                  onClick={handleClanClick}
                  className="w-full min-h-[44px] text-xs font-bold"
                  icon={<Users size={15} />}
                >
                  {t.player.viewClan}
                </GameButton>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-amber-100/80 text-xs sm:text-sm font-semibold">
              {t.player.noClan}
            </div>
          )}
        </div>

        {/* 3. Right: Current League & Current Trophies */}
        <div className="flex flex-col justify-center gap-3 border-t md:border-t-0 border-amber-300/15 pt-4 md:pt-0">
          <div className="bg-[#2B1F16]/85 border border-amber-400/20 rounded-xl p-3.5 flex items-center gap-3.5 shadow-inner">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              {leagueIconUrl ? (
                <img
                  src={leagueIconUrl}
                  alt={localizedLeagueName}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#1D140E] border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Trophy size={20} aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                {t.player.currentLeague}
              </div>
              <div className="game-text-stroke-sm text-sm sm:text-base font-bold text-white leading-snug">
                {localizedLeagueName}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 pt-0.5 tabular-nums">
                <Trophy size={14} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                <span className="game-text-stroke-sm text-base text-white">
                  {fmtNum(player.trophies ?? 0)}
                </span>
                <span className="text-xs font-semibold text-amber-100/85">
                  {t.search.pointsUnit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flattened 2-Layer Stat Tiles Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {statTiles.map((tile) => (
          <div
            key={tile.key}
            className="bg-[#2B1F16]/85 border border-amber-400/20 rounded-xl px-3 py-2.5 flex flex-col justify-between gap-1 shadow-inner"
          >
            <span className="text-xs font-semibold text-amber-100/90 leading-snug">
              {tile.label}
            </span>
            <div className="flex items-center gap-1.5">
              {tile.icon}
              <span
                className={cn(
                  "text-sm sm:text-base font-black tabular-nums leading-none",
                  tile.valueColor
                )}
              >
                {tile.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}
