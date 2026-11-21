"use client";

import React, { useState, useRef, useEffect } from "react";
import { Swords, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ClanBadge from "@/components/game/ClanBadge";
import GameButton from "@/components/game/GameButton";
import { useLanguage } from "@/lib/i18n";
import type { ClanDetails } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ClanHeaderCardProps {
  clan: ClanDetails;
  onScoutClanInCwl?: (clanTag: string) => void;
  onOpenWarLog?: (clanTag: string) => void;
  className?: string;
}

export default function ClanHeaderCard({
  clan,
  onScoutClanInCwl,
  onOpenWarLog,
  className,
}: ClanHeaderCardProps) {
  const { isTr, t, fmtNum, fmtTemplate } = useLanguage();
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDescClamped, setIsDescClamped] = useState(false);
  const descRef = useRef<HTMLParagraphElement | null>(null);

  const cleanTag = clan.tag?.replace(/^#/, "") || "";
  const descriptionText = clan.description?.trim() || "";

  useEffect(() => {
    setIsDescExpanded(false);
  }, [clan.tag, clan.description]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const measureOverflow = () => {
      if (!isDescExpanded) {
        setIsDescClamped(el.scrollHeight > el.clientHeight + 2);
      }
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [descriptionText, isDescExpanded]);

  const formatClanType = (type?: string): string => {
    if (!type) return isTr ? "Belirtilmemiş" : "Unspecified";
    const lower = type.toLowerCase();
    if (lower === "open") return t.clan.open;
    if (lower === "inviteonly" || lower === "invite_only") return t.clan.inviteOnly;
    if (lower === "closed") return t.clan.closed;
    return type;
  };

  const formatWarFrequency = (freq?: string): string => {
    if (!freq) return isTr ? "Bilinmiyor" : "Unknown";
    const lower = freq.toLowerCase();
    if (lower === "always") return t.search.warFreqLabels.always;
    if (lower === "morethanonceperweek") return t.search.warFreqLabels.moreThanOncePerWeek;
    if (lower === "onceperweek") return t.search.warFreqLabels.oncePerWeek;
    if (lower === "lessthanonceperweek") return t.search.warFreqLabels.lessThanOncePerWeek;
    if (lower === "never") return t.search.warFreqLabels.never;
    if (lower === "unknown") return isTr ? "Bilinmiyor" : "Unknown";
    return freq;
  };

  const handleCwlScout = () => {
    if (onScoutClanInCwl) {
      onScoutClanInCwl(clan.tag);
    } else {
      window.location.hash = `#/cwl?tag=${encodeURIComponent(cleanTag)}`;
    }
  };

  const handleWarLog = () => {
    if (onOpenWarLog) {
      onOpenWarLog(clan.tag);
    }
  };

  const showDescToggle = isDescClamped || isDescExpanded;

  return (
    <div className={cn("clan-header-panel p-4 sm:p-6 mb-4 sm:mb-6", className)}>
      {/* Decorative Grid and Corner Ribbon */}
      <div className="clan-header-map-grid" aria-hidden="true" />
      <div
        className="clan-header-ribbon"
        title={isTr ? "Klan Profili" : "Clan Profile"}
        aria-hidden="true"
      />

      {/* Main 2-Column Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Left Column: Badge, Name, Tag, Expandable Description, Labels */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
          <div className="flex flex-col items-center shrink-0">
            <ClanBadge
              url={clan.badgeUrls?.large || clan.badgeUrls?.medium || clan.badgeUrls?.small}
              name={clan.name}
              size={88}
              className="drop-shadow-lg"
            />
            {Boolean(clan.clanLevel) && (
              <span className="mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-[var(--ui-pill-bg)] border border-[var(--ui-pill-border)] text-[var(--ui-text-gold)] select-none tabular-nums">
                {fmtTemplate(t.clan.levelBadge, { level: fmtNum(clan.clanLevel) })}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
              <h2 className="game-title-stroke text-xl sm:text-2xl md:text-3xl font-black tracking-wide break-words">
                {clan.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-sans font-bold tabular-nums tracking-wide bg-[var(--ui-pill-bg)] text-[var(--ui-text-gold)] border border-[var(--ui-pill-border)] select-all">
                {clan.tag}
              </span>
            </div>

            {/* Expandable Description (Touch-friendly toggle instead of hover-only) */}
            {descriptionText && (
              <div>
                <p
                  ref={descRef}
                  className={cn(
                    "text-[13px] sm:text-sm text-[var(--ui-text-main)] font-medium leading-relaxed whitespace-pre-line select-text",
                    !isDescExpanded && "line-clamp-4"
                  )}
                >
                  {descriptionText}
                </p>

                {showDescToggle && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded((prev) => !prev)}
                    aria-expanded={isDescExpanded}
                    className="min-h-[44px] inline-flex items-center gap-1 px-2.5 py-2 -ml-2.5 mt-0.5 rounded-lg text-xs sm:text-[13px] font-bold text-[var(--ui-text-gold)] hover:bg-black/20 transition-colors cursor-pointer"
                  >
                    <span>{isDescExpanded ? t.common.showLess : t.common.showMore}</span>
                    {isDescExpanded ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Clan Labels */}
            {clan.labels && clan.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clan.labels.map((lbl) => (
                  <div key={lbl.id || lbl.name} className="clan-label-pill" title={lbl.name}>
                    {lbl.iconUrls?.small && (
                      <img
                        src={lbl.iconUrls.small}
                        alt={lbl.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                    )}
                    <span className="truncate max-w-[140px]">{lbl.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Contrast Warm Espresso Key-Value Card */}
        <div className="lg:col-span-5 ui-info p-3.5 sm:p-4 shadow-inner">
          <div className="space-y-0.5">
            {clan.warLeague?.name && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.warLeague}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-gold)] font-bold tabular-nums">
                  {clan.warLeague.name.toLowerCase() !== "unranked"
                    ? clan.warLeague.name
                    : t.common.unranked}
                </span>
              </div>
            )}

            {clan.location?.name && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.location}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-main)]">
                  {clan.location.name}
                </span>
              </div>
            )}

            {clan.chatLanguage?.name && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.chatLanguage}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-main)]">
                  {clan.chatLanguage.name}
                </span>
              </div>
            )}

            {clan.type && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.clanType}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-main)]">
                  {formatClanType(clan.type)}
                </span>
              </div>
            )}

            {clan.warFrequency && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.warFrequency}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-main)]">
                  {formatWarFrequency(clan.warFrequency)}
                </span>
              </div>
            )}

            {clan.requiredTrophies !== undefined && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.requiredTrophies}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-gold)] tabular-nums">
                  {clan.requiredTrophies > 0
                    ? `${fmtNum(clan.requiredTrophies)} ${t.search.pointsUnit}`
                    : t.clan.trophyFree}
                </span>
              </div>
            )}

            {clan.requiredTownhallLevel !== undefined && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {t.clan.requiredTh}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-blue)] tabular-nums">
                  {t.common.thShort} {fmtNum(clan.requiredTownhallLevel)}
                </span>
              </div>
            )}

            {clan.members !== undefined && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                  {isTr ? "Mevcut Doluluk" : "Members"}
                </span>
                <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-green)] tabular-nums">
                  {fmtNum(clan.members)} / 50
                </span>
              </div>
            )}

            {clan.requiredBuilderBaseTrophies !== undefined &&
              clan.requiredBuilderBaseTrophies > 0 && (
                <div className="clan-keyval-row">
                  <span className="clan-keyval-key text-xs sm:text-[13px] text-[var(--ui-text-muted)]">
                    {isTr ? "Gereken İnşaatçı Üssü" : "Required Builder Base"}
                  </span>
                  <span className="clan-keyval-val text-[13px] sm:text-sm text-[var(--ui-text-gold)] tabular-nums">
                    {fmtNum(clan.requiredBuilderBaseTrophies)} {t.search.pointsUnit}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="relative z-10 flex flex-wrap items-center gap-3 pt-4 sm:pt-5 border-t border-white/15 mt-4 sm:mt-5">
        <GameButton
          variant="green"
          size="md"
          icon={<Swords className="w-5 h-5 mr-1.5" />}
          onClick={handleCwlScout}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {t.clan.scoutCwlBtn}
        </GameButton>

        {Boolean(clan.isWarLogPublic) && (
          <GameButton
            variant="blue"
            size="md"
            icon={<FileText className="w-5 h-5 mr-1.5" />}
            onClick={handleWarLog}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {t.clan.warLogBtn}
          </GameButton>
        )}
      </div>
    </div>
  );
}
