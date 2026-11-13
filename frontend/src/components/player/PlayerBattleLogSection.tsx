"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Swords,
  Shield,
  Star,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { SectionPanel, IconFrame, GameButton } from "@/components/game";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
import { useLanguage } from "@/lib/i18n";
import type { BattleLogEntry } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PlayerBattleLogSectionProps {
  battleLog: BattleLogEntry[];
  loading?: boolean;
  className?: string;
}

/**
 * PlayerBattleLogSection
 * Displays recent battle log (attacks and defenses) with stars, destruction %,
 * decoded army composition (troops, spells, heroes/pets/equipment), and "Copy Army" action.
 */
export default function PlayerBattleLogSection({
  battleLog,
  loading = false,
  className,
}: PlayerBattleLogSectionProps) {
  const { t, locale, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const baseId = useId().replace(/:/g, "");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(
    battleLog.length > 0 ? 0 : null
  );

  // Ensure the 1st battle expands automatically once battleLog loads asynchronously
  useEffect(() => {
    setExpandedIdx(battleLog.length > 0 ? 0 : null);
  }, [battleLog]);

  return (
    <SectionPanel
      title={t.player.battleLogTitle}
      icon={<Swords size={18} className="text-amber-400" aria-hidden="true" />}
      rightBadge={
        <span className="text-xs font-bold text-amber-200 tabular-nums">
          {fmtTemplate(t.meta.recordsCount, { count: fmtNum(battleLog.length) })}
        </span>
      }
      className={className}
    >
      {loading ? (
        <div className="py-6 text-center text-sm font-medium text-amber-100/85">
          {t.common.loading}
        </div>
      ) : battleLog.length === 0 ? (
        <div className="py-6 text-center text-sm font-medium text-amber-100/85">
          {t.player.battleLogEmpty}
        </div>
      ) : (
        <div className="space-y-3">
          {battleLog.map((b, idx) => {
            const isAttack = Boolean(b.attack);
            const stars = b.stars ?? 0;
            const isVictory = isAttack ? stars > 0 : stars === 0;
            const destruction = b.destructionPercentage ?? 0;
            const destructionFormatted = Number.isInteger(destruction)
              ? fmtPct(destruction, 0)
              : fmtPct(destruction, 1);

            const rawCode = (b.armyShareCode || "").trim();
            const copyArmyUrl = rawCode ? buildCopyArmyLink(rawCode) : "";
            const decoded: DecodedArmyShare | null = rawCode
              ? parseArmyShareCode(rawCode, locale)
              : b.decodedArmy || null;

            const hasArmyDetails = Boolean(
              decoded &&
                ((decoded.troops && decoded.troops.length > 0) ||
                  (decoded.spells && decoded.spells.length > 0) ||
                  (decoded.heroes && decoded.heroes.length > 0))
            );

            const isExpanded = expandedIdx === idx;
            const panelId = `${baseId}-battle-panel-${idx}`;

            return (
              <div
                key={idx}
                className="bg-[#2B1F16]/85 border border-amber-400/20 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header Row: Semantic Toggle Button + Sibling Copy Army Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:pr-3">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex-1 min-h-[52px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#3E2B1E]/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-inset"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      {/* Attack / Defense + Outcome Badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide shrink-0",
                          isVictory
                            ? "bg-emerald-900/65 text-emerald-200 border border-emerald-400/45"
                            : "bg-rose-950/75 text-rose-200 border border-rose-400/45"
                        )}
                      >
                        {isAttack ? (
                          <Swords size={12} aria-hidden="true" />
                        ) : (
                          <Shield size={12} aria-hidden="true" />
                        )}
                        <span>{isVictory ? t.player.battleVictory : t.player.battleDefeat}</span>
                      </span>

                      {/* Opponent Name / Tag */}
                      <span className="game-text-stroke-sm text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[240px]">
                        {b.opponentName || b.opponentTag || t.common.noData}
                      </span>

                      {/* Opponent TH */}
                      {b.opponentTownHallLevel !== undefined && b.opponentTownHallLevel > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#1D140E] border border-amber-400/25 text-amber-200 tabular-nums shrink-0">
                          {t.common.thShort}
                          {fmtNum(b.opponentTownHallLevel)}
                        </span>
                      )}

                      {/* Stars & Destruction % */}
                      <div
                        className="flex items-center gap-1 pl-0.5 shrink-0"
                        aria-label={`${fmtNum(stars)}/3`}
                      >
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            size={14}
                            aria-hidden="true"
                            className={cn(
                              starNum <= stars
                                ? "fill-amber-400 text-amber-400"
                                : "fill-black/40 text-stone-500"
                            )}
                          />
                        ))}
                        <span className="text-xs font-black text-amber-200 ml-1 tabular-nums">
                          {destructionFormatted}
                        </span>
                      </div>

                      {/* Trophy Change */}
                      {b.trophyChange !== undefined && b.trophyChange !== null && (
                        <span
                          className={cn(
                            "text-xs font-extrabold tabular-nums px-2 py-0.5 rounded shrink-0",
                            b.trophyChange > 0
                              ? "text-emerald-200 bg-emerald-900/45 border border-emerald-400/25"
                              : b.trophyChange < 0
                              ? "text-rose-200 bg-rose-950/60 border border-rose-400/25"
                              : "text-stone-200 bg-black/30"
                          )}
                        >
                          {b.trophyChange > 0
                            ? `+${fmtNum(b.trophyChange)}`
                            : fmtNum(b.trophyChange)}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={cn(
                        "text-amber-200 shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {copyArmyUrl && (
                    <div className="px-3.5 pb-2.5 sm:px-0 sm:pb-0 flex justify-end shrink-0">
                      <GameButton
                        variant="green"
                        size="sm"
                        href={copyArmyUrl}
                        target="_blank"
                        icon={<ExternalLink size={14} />}
                        className="min-h-[44px] px-3.5"
                      >
                        {t.player.copyArmy}
                      </GameButton>
                    </div>
                  )}
                </div>

                {/* Expanded Accordion: Decoded Army Composition */}
                {isExpanded && (
                  <div
                    id={panelId}
                    className="p-3.5 border-t border-amber-400/15 bg-[#1F150E]/65 space-y-3"
                  >
                    {decoded?.armyName && (
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        {decoded.armyName}
                      </div>
                    )}

                    {!hasArmyDetails ? (
                      <p className="text-xs font-medium text-stone-200 py-1">
                        {t.player.battleNoArmy}
                      </p>
                    ) : (
                      <>
                        {/* Decoded Troops */}
                        {decoded?.troops && decoded.troops.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                              {t.player.battleUnits}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {decoded.troops.map((u, uIdx) => (
                                <IconFrame
                                  key={uIdx}
                                  name={u.name}
                                  count={u.count}
                                  size="sm"
                                  showTooltip
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decoded Spells */}
                        {decoded?.spells && decoded.spells.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                              {t.player.battleSpells}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {decoded.spells.map((s, sIdx) => (
                                <IconFrame
                                  key={sIdx}
                                  name={s.name}
                                  count={s.count}
                                  size="sm"
                                  tileType="spell"
                                  showTooltip
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decoded Heroes / Equipment */}
                        {decoded?.heroes && decoded.heroes.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                              {t.player.battleHeroes}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {decoded.heroes.map((h, hIdx) => (
                                <div
                                  key={hIdx}
                                  className="bg-[#2B1F16]/90 rounded-lg p-1.5 border border-amber-400/20 flex items-center gap-1.5"
                                >
                                  <IconFrame
                                    name={h.name}
                                    size="xs"
                                    tileType="hero"
                                    showTooltip
                                  />
                                  {h.pet && (
                                    <IconFrame
                                      name={h.pet.name}
                                      size="xs"
                                      tileType="pet"
                                      showTooltip
                                    />
                                  )}
                                  {h.equipment &&
                                    h.equipment.map((eq, eqIdx) => (
                                      <IconFrame
                                        key={eqIdx}
                                        name={eq.name}
                                        size="xs"
                                        tileType="equipment"
                                        showTooltip
                                      />
                                    ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionPanel>
  );
}
