"use client";

import React from "react";
import { Shield, ArrowUp, ArrowDown } from "lucide-react";
import TownHallImage from "@/components/game/TownHallImage";
import { useLanguage } from "@/lib/i18n";
import type { ClanMember, ClanVillageTab } from "./types";
import { getMemberLeagueInfo } from "./leagueHelper";

export interface ResponsiveMemberListProps {
  members: ClanMember[];
  activeHighlightTag: string | null;
  highlightedRowRef: React.MutableRefObject<HTMLElement | null>;
  villageTab?: ClanVillageTab;
  onSelectMember: (tag: string) => void;
  formatMemberRole: (role?: string) => string;
  getRoleBadgeClasses: (role?: string) => string;
}

function cleanTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

export default function ResponsiveMemberList({
  members,
  activeHighlightTag,
  highlightedRowRef,
  villageTab,
  onSelectMember,
  formatMemberRole,
  getRoleBadgeClasses,
}: ResponsiveMemberListProps) {
  const { locale, t, fmtNum } = useLanguage();

  const trophyTooltipSuffix =
    villageTab === "builderBase" ? t.player.builderTrophies : t.search.pointsUnit;

  return (
    <div className="md:hidden space-y-2">
      {members.map((member, idx) => {
        const memberClean = cleanTag(member.tag);
        const isHighlighted = activeHighlightTag === memberClean;
        const { iconUrl: leagueIconUrl, name: leagueName } = getMemberLeagueInfo(
          member,
          villageTab,
          locale
        );
        const roleLabel = formatMemberRole(member.role);

        return (
          <button
            key={member.tag || idx}
            type="button"
            ref={
              isHighlighted
                ? (el) => {
                    highlightedRowRef.current = el;
                  }
                : undefined
            }
            onClick={() => onSelectMember(member.tag)}
            className={`clan-member-row w-full text-left min-h-[56px] p-3 transition-all ${
              isHighlighted ? "game-member-highlight" : ""
            }`}
            title={`${member.name} (${member.tag})`}
          >
            <div className="flex flex-col gap-2 min-w-0 w-full">
              {/* Top Row: Rank + League Emblem + Full-Width Name + Role Badge */}
              <div className="flex items-center gap-2 min-w-0 w-full">
                <div className="clan-rank-badge !min-w-[30px] !h-[30px] !text-xs tabular-nums">
                  {fmtNum(idx + 1)}
                </div>

                <div
                  className="w-6 h-6 flex items-center justify-center shrink-0"
                  title={leagueName}
                >
                  {leagueIconUrl ? (
                    <img
                      src={leagueIconUrl}
                      alt={leagueName}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 object-contain filter drop-shadow-sm"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] flex items-center justify-center text-[var(--ui-text-muted)]">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <span className="min-w-0 flex-1 font-extrabold text-sm text-[var(--ui-text-main)] truncate">
                  {member.name}
                </span>

                <span
                  className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold ${getRoleBadgeClasses(
                    member.role
                  )}`}
                >
                  {roleLabel}
                </span>
              </div>

              {/* Bottom Row: TH Badge + Donations Up/Down + Trophy Pill */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--game-wood-header-border)] w-full min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] shrink-0">
                    <TownHallImage
                      level={member.townHallLevel || 1}
                      size={22}
                      className="filter drop-shadow-sm"
                    />
                    <span className="text-[11px] font-extrabold text-[var(--ui-text-main)] tabular-nums">
                      {t.common.thShort} {fmtNum(member.townHallLevel || 1)}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums min-w-0">
                    <span
                      className="px-1.5 py-0.5 rounded-md bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] text-[var(--ui-text-green)] inline-flex items-center gap-0.5"
                      title={t.clan.donated}
                    >
                      <ArrowUp className="w-3 h-3 shrink-0" />
                      <span>{fmtNum(member.donations ?? 0)}</span>
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-md bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] text-[var(--ui-text-muted)] inline-flex items-center gap-0.5"
                      title={t.clan.received}
                    >
                      <ArrowDown className="w-3 h-3 text-[var(--ui-text-gold)] shrink-0" />
                      <span>{fmtNum(member.donationsReceived ?? 0)}</span>
                    </span>
                  </div>
                </div>

                <div
                  className="clan-trophy-pill !py-1 !px-2.5 !min-w-[74px] !text-xs tabular-nums shrink-0"
                  title={`${fmtNum(member.trophies ?? 0)} ${trophyTooltipSuffix}`}
                >
                  <span>{fmtNum(member.trophies ?? 0)}</span>
                  <img
                    src="/icons/ui/trophy.png"
                    alt=""
                    aria-hidden="true"
                    className="w-3.5 h-3.5 object-contain shrink-0 select-none"
                  />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
