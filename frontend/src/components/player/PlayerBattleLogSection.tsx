"use client";

import React, { useState } from "react";
import {
  Swords,
  Shield,
  Star,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { SectionPanel, IconFrame, GameButton } from "@/components/game";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
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
 * Displays ranked battle log (attacks and defenses) with stars, destruction %,
 * decoded army composition (troops, spells, sieges, equipment), and "Orduyu Kopyala" functionality.
 */
export default function PlayerBattleLogSection({
  battleLog,
  loading = false,
  className,
}: PlayerBattleLogSectionProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(
    battleLog.length > 0 ? 0 : null
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyLink = async (e: React.MouseEvent, code: string, idx: number) => {
    e.stopPropagation();
    const link = buildCopyArmyLink(code);
    if (!link) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback: window open
      window.open(link, "_blank");
    }
  };

  return (
    <SectionPanel
      title="Savaş Geçmişi"
      icon={<Swords size={18} className="text-amber-400" />}
      rightBadge={
        <span className="text-xs font-bold text-amber-300">
          {battleLog.length} Kayıt (Ranked)
        </span>
      }
      className={className}
    >
      {loading ? (
        <div className="py-6 text-center text-xs font-medium text-stone-300">
          Savaş geçmişi yükleniyor...
        </div>
      ) : battleLog.length === 0 ? (
        <div className="py-6 text-center text-xs font-medium text-stone-300">
          Bu oyuncu için son ranked savaş kaydı bulunamadı.
        </div>
      ) : (
        <div className="space-y-3">
          {battleLog.map((b, idx) => {
            const isAttack = Boolean(b.attack);
            const rawCode = (b.armyShareCode || "").trim();
            const decoded: DecodedArmyShare | null = rawCode
              ? b.decodedArmy || parseArmyShareCode(rawCode)
              : null;
            const isExpanded = expandedIdx === idx;
            const isCopied = copiedIdx === idx;

            return (
              <div
                key={idx}
                className="bg-black/30 border border-white/10 rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-black/40 transition-colors select-none"
                >
                  {/* Left: Badge, Opponent, Stars & Destruction */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                        isAttack
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                      )}
                    >
                      {isAttack ? "Saldırı" : "Savunma"}
                    </span>

                    <span className="game-text-stroke-sm text-xs sm:text-sm font-bold text-white">
                      {b.opponentName || b.opponentTag || "Bilinmeyen Rakip"}
                    </span>

                    {b.opponentTownHallLevel && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/40 border border-white/15 text-amber-300">
                        TH{b.opponentTownHallLevel}
                      </span>
                    )}

                    {/* Stars */}
                    <div className="flex items-center gap-1 pl-1">
                      {[1, 2, 3].map((starNum) => (
                        <Star
                          key={starNum}
                          size={14}
                          className={cn(
                            starNum <= (b.stars ?? 0)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-black/30 text-stone-500"
                          )}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-300 ml-1">
                        %{b.destructionPercentage ?? 0}
                      </span>
                    </div>

                    {/* Trophy Change */}
                    {b.trophyChange !== undefined && (
                      <span
                        className={cn(
                          "text-xs font-bold font-mono px-1.5 py-0.2 rounded",
                          b.trophyChange > 0
                            ? "text-emerald-300 bg-emerald-500/10"
                            : b.trophyChange < 0
                            ? "text-rose-300 bg-rose-500/10"
                            : "text-stone-300"
                        )}
                      >
                        {b.trophyChange > 0 ? `+${b.trophyChange}` : b.trophyChange}
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {rawCode && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, rawCode, idx)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm active:scale-95",
                          isCopied
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "bg-blue-600 hover:bg-blue-700 border-blue-400 text-white"
                        )}
                        title="Orduyu Panoya Kopyala"
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} />
                            <span>Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Orduyu Kopyala</span>
                          </>
                        )}
                      </button>
                    )}

                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-stone-300 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Accordion: Decoded Army Composition */}
                {isExpanded && decoded && (
                  <div className="p-3.5 pt-0 border-t border-white/10 space-y-3 mt-1">
                    {decoded.armyName && (
                      <div className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                        {decoded.armyName}
                      </div>
                    )}

                    {/* Decoded Troops */}
                    {decoded.troops && decoded.troops.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                          Birlikler
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
                    {decoded.spells && decoded.spells.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                          Büyüler
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
                    {decoded.heroes && decoded.heroes.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                          Kahramanlar & Ekipmanlar
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {decoded.heroes.map((h, hIdx) => (
                            <div
                              key={hIdx}
                              className="bg-black/35 rounded-lg p-1.5 border border-white/10 flex items-center gap-1.5"
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
