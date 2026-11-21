"use client";

import React from "react";
import { Shield, ArrowUp, ArrowDown } from "lucide-react";
import TownHallImage from "@/components/game/TownHallImage";
import { useLanguage } from "@/lib/i18n";
import type { ClanMember, ClanVillageTab } from "./types";
import { getMemberLeagueInfo } from "./leagueHelper";

export interface WoodDataTableProps {
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

export default function WoodDataTable({
  members,
  activeHighlightTag,
  highlightedRowRef,
  villageTab,
  onSelectMember,
  formatMemberRole,
  getRoleBadgeClasses,
}: WoodDataTableProps) {
  const { locale, isTr, t, fmtNum } = useLanguage();

  const trophyTooltipSuffix =
    villageTab === "builderBase" ? t.player.builderTrophies : t.search.pointsUnit;

  return (
    <div className="hidden md:block ui-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="ui-panel-header text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)]">
              <th scope="col" className="py-3 pl-4 pr-2 w-14 text-center">
                #
              </th>
              <th scope="col" className="py-3 px-2 w-14 text-center">
                {isTr ? "Lig" : "League"}
              </th>
              <th scope="col" className="py-3 px-2 w-24 text-center">
                {t.common.thShort}
              </th>
              <th scope="col" className="py-3 px-3 min-w-[180px]">
                {isTr ? "Oyuncu" : "Player"}
              </th>
              <th scope="col" className="py-3 px-3 w-36">
                {isTr ? "Rol" : "Role"}
              </th>
              <th scope="col" className="py-3 px-3 w-28 text-right">
                {t.clan.donated}
              </th>
              <th scope="col" className="py-3 px-3 w-28 text-right">
                {t.clan.received}
              </th>
              <th scope="col" className="py-3 pl-3 pr-4 w-32 text-right">
                {isTr ? "Kupa" : "Trophies"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--game-wood-header-border)]">
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
                <tr
                  key={member.tag || idx}
                  ref={
                    isHighlighted
                      ? (el) => {
                          highlightedRowRef.current = el;
                        }
                      : undefined
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={`${member.name} (${member.tag})`}
                  title={`${member.name} (${member.tag})`}
                  onClick={() => onSelectMember(member.tag)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMember(member.tag);
                    }
                  }}
                  className={`min-h-[56px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)] ${
                    isHighlighted
                      ? "game-member-highlight"
                      : "bg-[var(--game-slot-bg-dark)] hover:bg-[var(--game-slot-bg-light)]"
                  }`}
                >
                  {/* # Rank */}
                  <td className="py-2.5 pl-4 pr-2 text-center">
                    <div className="clan-rank-badge mx-auto !min-w-[32px] !h-[32px] !text-xs tabular-nums">
                      {fmtNum(idx + 1)}
                    </div>
                  </td>

                  {/* Lig */}
                  <td className="py-2.5 px-2">
                    <div
                      className="w-8 h-8 mx-auto flex items-center justify-center"
                      title={leagueName}
                    >
                      {leagueIconUrl ? (
                        <img
                          src={leagueIconUrl}
                          alt={leagueName}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 object-contain filter drop-shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] flex items-center justify-center text-[var(--ui-text-muted)]">
                          <Shield className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* BB */}
                  <td className="py-2.5 px-2">
                    <div className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] mx-auto">
                      <TownHallImage
                        level={member.townHallLevel || 1}
                        size={28}
                        className="filter drop-shadow-sm shrink-0"
                      />
                      <span className="text-xs font-extrabold text-[var(--ui-text-main)] tabular-nums">
                        {fmtNum(member.townHallLevel || 1)}
                      </span>
                    </div>
                  </td>

                  {/* Oyuncu */}
                  <td className="py-2.5 px-3 max-w-[240px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-sm lg:text-base text-[var(--ui-text-main)] truncate">
                        {member.name}
                      </span>
                      {Boolean(member.expLevel) && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--ui-pill-bg)] border border-[var(--ui-pill-border)] text-[var(--ui-text-gold)] shrink-0 tabular-nums">
                          {t.common.levelShort}
                          {fmtNum(member.expLevel)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${getRoleBadgeClasses(
                        member.role
                      )}`}
                    >
                      {roleLabel}
                    </span>
                  </td>

                  {/* Bağışlanan */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-extrabold text-[var(--ui-text-green)] tabular-nums">
                      <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                      <span>{fmtNum(member.donations ?? 0)}</span>
                    </span>
                  </td>

                  {/* Alınan */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-extrabold text-[var(--ui-text-muted)] tabular-nums">
                      <ArrowDown className="w-3.5 h-3.5 shrink-0 text-[var(--ui-text-gold)]" />
                      <span>{fmtNum(member.donationsReceived ?? 0)}</span>
                    </span>
                  </td>

                  {/* Kupa */}
                  <td className="py-2.5 pl-3 pr-4 text-right">
                    <div
                      className="clan-trophy-pill !py-1.5 !px-3 !min-w-[86px] !text-sm tabular-nums ml-auto"
                      title={`${fmtNum(member.trophies ?? 0)} ${trophyTooltipSuffix}`}
                    >
                      <span>{fmtNum(member.trophies ?? 0)}</span>
                      <img
                        src="/icons/ui/trophy.png"
                        alt=""
                        aria-hidden="true"
                        className="w-4 h-4 object-contain shrink-0 select-none"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
