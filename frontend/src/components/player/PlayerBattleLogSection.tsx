"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Swords,
  Shield,
  Star,
  ChevronDown,
  ExternalLink,
  History,
} from "lucide-react";
import { IconFrame, GameButton } from "@/components/game";
import AccordionSection from "./AccordionSection";
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
  defaultOpenMobile?: boolean;
  className?: string;
}

/**
 * PlayerBattleLogSection
 * Displays recent ranked battle log (attacks and defenses) with stars, destruction %,
 * decoded army composition (troops, spells, heroes/pets/equipment), and "Copy Army" action.
 * Collapsible accordion on mobile (< lg), always open on desktop (>= lg).
 */
export default function PlayerBattleLogSection({
  battleLog,
  loading = false,
  defaultOpenMobile = false,
  className,
}: PlayerBattleLogSectionProps) {
  const { t, locale, isTr, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const baseId = useId().replace(/:/g, "");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(
    battleLog.length > 0 ? 0 : null
  );

  // Ensure the 1st battle expands automatically once battleLog loads asynchronously
  useEffect(() => {
    setExpandedIdx(battleLog.length > 0 ? 0 : null);
  }, [battleLog]);

  const titleText = isTr ? "Ranked Savaş Geçmişi" : t.player.battleLogTitle;

  return (
    <AccordionSection
      title={titleText}
      icon={<History size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
      defaultOpenMobile={defaultOpenMobile}
      rightBadge={
        <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
          {fmtTemplate(t.meta.recordsCount, { count: fmtNum(battleLog.length) })}
        </span>
      }
      className={className}
    >
      {loading ? (
        <div className="py-6 text-center text-sm font-medium text-[var(--ui-text-muted)]">
          {t.common.loading}
        </div>
      ) : battleLog.length === 0 ? (
        <div className="py-6 text-center text-sm font-medium text-[var(--ui-text-muted)]">
          {t.player.battleLogEmpty}
        </div>
      ) : (
        <div className="space-y-2.5">
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
                className="bg-[var(--game-dark-box-mid)] border border-[var(--ui-info-border)] rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header Row: Semantic Toggle Button + Sibling Copy Army Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:pr-2.5">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex-1 min-h-[48px] px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-[var(--game-wood-mid)]/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)] focus-visible:ring-inset min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {/* Attack / Defense + Outcome Badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide shrink-0 border",
                          isVictory
                            ? "bg-emerald-950/70 text-[var(--ui-text-green)] border-[var(--ui-text-green)]/40"
                            : "bg-rose-950/70 text-[var(--ui-text-red)] border-[var(--ui-text-red)]/40"
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
                      <span className="game-text-stroke-sm text-xs sm:text-sm font-bold text-[var(--ui-text-main)] truncate max-w-[150px] sm:max-w-[190px]">
                        {b.opponentName || b.opponentTag || t.common.noData}
                      </span>

                      {/* Opponent TH */}
                      {b.opponentTownHallLevel !== undefined && b.opponentTownHallLevel > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-[var(--ui-text-gold)] tabular-nums shrink-0">
                          {t.common.thShort}
                          {fmtNum(b.opponentTownHallLevel)}
                        </span>
                      )}

                      {/* Stars & Destruction % */}
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        aria-label={`${fmtNum(stars)}/3`}
                      >
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            size={13}
                            aria-hidden="true"
                            className={cn(
                              starNum <= stars
                                ? "fill-[var(--ui-text-gold)] text-[var(--ui-text-gold)]"
                                : "fill-[var(--game-dark-box-dark)] text-[var(--ui-text-muted)]/40"
                            )}
                          />
                        ))}
                        <span className="text-xs font-black text-[var(--ui-text-gold)] ml-1 tabular-nums">
                          {destructionFormatted}
                        </span>
                      </div>

                      {/* Trophy Change */}
                      {b.trophyChange !== undefined && b.trophyChange !== null && (
                        <span
                          className={cn(
                            "text-xs font-extrabold tabular-nums px-1.5 py-0.5 rounded shrink-0",
                            b.trophyChange > 0
                              ? "text-[var(--ui-text-green)] bg-emerald-950/50 border border-[var(--ui-text-green)]/25"
                              : b.trophyChange < 0
                              ? "text-[var(--ui-text-red)] bg-rose-950/50 border border-[var(--ui-text-red)]/25"
                              : "text-[var(--ui-text-muted)] bg-[var(--game-dark-box-dark)]"
                          )}
                        >
                          {b.trophyChange > 0
                            ? `+${fmtNum(b.trophyChange)}`
                            : fmtNum(b.trophyChange)}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={cn(
                        "text-[var(--ui-text-muted)] shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {copyArmyUrl && (
                    <div className="px-3 pb-2.5 sm:px-0 sm:pb-0 flex justify-end shrink-0">
                      <GameButton
                        variant="green"
                        size="sm"
                        href={copyArmyUrl}
                        target="_blank"
                        icon={<ExternalLink size={13} />}
                        className="min-h-[44px] px-3 text-xs font-bold w-full sm:w-auto"
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
                    className="p-3 border-t border-[var(--ui-info-border)] bg-[var(--game-dark-box-dark)]/75 space-y-2.5"
                  >
                    {decoded?.armyName && (
                      <div className="text-xs font-bold text-[var(--ui-text-gold)] uppercase tracking-wide">
                        {decoded.armyName}
                      </div>
                    )}

                    {!hasArmyDetails ? (
                      <p className="text-xs font-medium text-[var(--ui-text-muted)] py-1">
                        {t.player.battleNoArmy}
                      </p>
                    ) : (
                      <>
                        {/* Decoded Troops */}
                        {decoded?.troops && decoded.troops.length > 0 && (
                          <div>
                            <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5">
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
                            <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5">
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
                            <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1.5">
                              {t.player.battleHeroes}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {decoded.heroes.map((h, hIdx) => (
                                <div
                                  key={hIdx}
                                  className="bg-[var(--game-dark-box-mid)] rounded-lg p-1.5 border border-[var(--ui-info-border)] flex items-center gap-1.5"
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
    </AccordionSection>
  );
}
