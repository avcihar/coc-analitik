"use client";

import React from "react";
import { Star, Trophy, Users } from "lucide-react";
import { SectionPanel, ClanBadge, GameButton } from "@/components/game";
import ExpLevelBadge from "./ExpLevelBadge";
import type { PlayerProfileViewData } from "./types";
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

function translateRole(role?: string): string {
  if (!role) return "";
  switch (role.toLowerCase()) {
    case "leader":
      return "Lider";
    case "coleader":
      return "Yardımcı Lider";
    case "admin":
      return "Büyük";
    case "member":
      return "Üye";
    default:
      return role;
  }
}

/**
 * PlayerHeaderSection
 * Upper section block of Player Profile (Asıl Köy).
 * Measured directly from referans/oyun-ici/profil.png.
 * 
 * - Sol: Exp badge, Name, Tag, Turkish Clan Role, Player Labels
 * - Orta: Clan Name, Clan Badge, War Stars, "Klanı Görüntüle" green GameButton
 * - Sağ: Current League (Name, Icon, Trophies) & Best Trophies (Strictly real API fields, NO fake rank)
 * - Alt Şerit: Inset container with Donations, Donations Received, Attack Wins, Defense Wins
 */
export default function PlayerHeaderSection({
  player,
  onViewClan,
  className,
}: PlayerHeaderSectionProps) {
  const roleTr = translateRole(player.role);
  const cleanClanTag = player.clan?.tag ? player.clan.tag.replace(/^#/, "") : "";

  const handleClanClick = () => {
    if (!player.clan) return;
    if (onViewClan) {
      onViewClan(player.clan.tag);
    } else {
      window.location.hash = `#/klan/${cleanClanTag}`;
    }
  };

  return (
    <SectionPanel className={cn("space-y-4", className)}>
      {/* Upper 3-Column Layout (Desktop 3 columns, Mobile 1 column) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* 1. Sol: Exp badge, Name, Tag, Role, Labels */}
        <div className="flex items-start gap-3.5">
          <ExpLevelBadge level={player.expLevel ?? 1} size="md" />

          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="game-text-stroke text-lg sm:text-xl md:text-2xl font-black text-white truncate leading-tight">
              {player.name}
            </h2>
            <div className="text-xs sm:text-sm font-semibold text-stone-200/90 tracking-wide">
              {player.tag}
            </div>

            {roleTr && (
              <div className="inline-block px-2 py-0.5 rounded bg-black/35 text-amber-300 text-xs font-bold border border-white/10 shadow-sm">
                {roleTr}
              </div>
            )}

            {/* Player Labels */}
            {player.labels && player.labels.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {player.labels.map((lbl, idx) => {
                  const iconUrl = lbl.iconUrls?.small || lbl.iconUrls?.medium;
                  return (
                    <div
                      key={lbl.id || idx}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/40 border border-white/20 p-0.5 flex items-center justify-center shadow-sm"
                      title={lbl.name}
                    >
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={lbl.name || "Etiket"}
                          className="w-full h-full object-contain filter drop-shadow-sm"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] text-stone-300 font-bold">#</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. Orta: Klan Adı, Rozet, Savaş Yıldızları, "Klanı Görüntüle" */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 border-t md:border-t-0 md:border-l md:border-r border-white/15 pt-3 md:pt-0 px-2">
          {player.clan ? (
            <>
              <div className="game-text-stroke-sm text-sm sm:text-base font-bold text-white tracking-wide truncate max-w-full">
                {player.clan.name}
              </div>

              <div className="my-0.5">
                <ClanBadge
                  url={
                    player.clan.badgeUrls?.large ||
                    player.clan.badgeUrls?.medium ||
                    player.clan.badgeUrls?.small
                  }
                  name={player.clan.name}
                  size={58}
                />
              </div>

              {/* Kazanılan Savaş Yıldızları */}
              <div className="flex items-center gap-1.5 text-xs text-stone-200 font-medium">
                <span className="opacity-90">Kazanılan Savaş Yıldızları:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 font-black text-amber-300 text-xs border border-white/10 shadow-inner">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {player.warStars ?? 0}
                </span>
              </div>

              {/* Klanı Görüntüle GameButton */}
              <div className="pt-1 w-full max-w-[200px]">
                <GameButton
                  variant="green"
                  size="sm"
                  onClick={handleClanClick}
                  className="w-full text-xs font-bold"
                  icon={<Users size={14} />}
                >
                  Klanı Görüntüle
                </GameButton>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-stone-300 text-xs font-semibold">
              <span className="opacity-80">Herhangi bir klana üye değil</span>
            </div>
          )}
        </div>

        {/* 3. Sağ: Geçerli Lig & Ulaşılan En Yüksek */}
        <div className="flex flex-col justify-between space-y-3 border-t md:border-t-0 border-white/15 pt-3 md:pt-0">
          {/* Geçerli Lig */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              {player.league?.iconUrls?.medium || player.league?.iconUrls?.small ? (
                <img
                  src={player.league.iconUrls.medium || player.league.iconUrls.small}
                  alt={player.league.name || "Lig"}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/20 flex items-center justify-center text-amber-400">
                  <Trophy size={20} />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-200/90 uppercase tracking-wider">
                Geçerli Lig
              </div>
              <div className="game-text-stroke-sm text-sm font-bold text-white truncate">
                {player.league?.name || player.leagueName || "Ligsiz"}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 mt-0.5">
                <Trophy size={13} className="fill-amber-400 text-amber-400" />
                <span className="game-text-stroke-sm text-sm text-white">
                  {player.trophies ?? 0}
                </span>
                <span className="text-[10px] font-normal text-stone-200/80">Kupa</span>
              </div>
            </div>
          </div>

          {/* Ulaşılan En Yüksek */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-200/90">
              Ulaşılan en yüksek:
            </span>
            <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
              <Trophy size={13} className="fill-amber-400 text-amber-400" />
              <span className="game-text-stroke-sm text-sm text-white">
                {player.bestTrophies ?? player.trophies ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Şerit: Inset container with 4 stats */}
      <div className="bg-[var(--game-section-blue-inset)] border border-[var(--game-section-blue-border)] rounded-xl p-2.5 sm:p-3 shadow-inner">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
            <span className="text-stone-300 truncate mr-1">Bağışlanan:</span>
            <span className="font-bold text-white font-mono text-xs shrink-0">
              {player.donations ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
            <span className="text-stone-300 truncate mr-1">Alınan:</span>
            <span className="font-bold text-white font-mono text-xs shrink-0">
              {player.donationsReceived ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
            <span className="text-stone-300 truncate mr-1">Kazanılan Saldırı:</span>
            <span className="font-bold text-emerald-300 font-mono text-xs shrink-0">
              {player.attackWins ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
            <span className="text-stone-300 truncate mr-1">Kazanılan Savunma:</span>
            <span className="font-bold text-sky-300 font-mono text-xs shrink-0">
              {player.defenseWins ?? 0}
            </span>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
