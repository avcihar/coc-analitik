"use client";

import React from "react";
import { Swords, FileText, Globe2, Shield, MapPin, MessageSquare, Award } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ClanBadge from "@/components/game/ClanBadge";
import GameButton from "@/components/game/GameButton";
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

function formatClanType(type?: string): string {
  if (!type) return "Belirtilmemiş";
  const lower = type.toLowerCase();
  if (lower === "open") return "Herkese açık";
  if (lower === "inviteonly" || lower === "invite_only") return "Yalnızca davetle";
  if (lower === "closed") return "Kapalı";
  return type;
}

export default function ClanHeaderCard({
  clan,
  onScoutClanInCwl,
  onOpenWarLog,
  className,
}: ClanHeaderCardProps) {
  const cleanTag = clan.tag?.replace(/^#/, "") || "";

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

  return (
    <div className={cn("clan-header-panel p-4 sm:p-6 mb-4 sm:mb-6", className)}>
      {/* Decorative Grid and Corner Ribbon */}
      <div className="clan-header-map-grid" aria-hidden="true" />
      <div className="clan-header-ribbon" title="Klanım" aria-hidden="true" />

      {/* Main 2-Column or Mobile Stack */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Sol Kolon: Rozet, İsim, Etiket, Açıklama, Etiketler */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
          {/* Klan Logosu */}
          <div className="flex flex-col items-center shrink-0">
            <ClanBadge
              url={clan.badgeUrls?.large || clan.badgeUrls?.medium || clan.badgeUrls?.small}
              name={clan.name}
              size={88}
              className="drop-shadow-lg"
            />
            {clan.clanLevel && (
              <span className="mt-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-black/40 border border-white/20 text-amber-300 select-none">
                Seviye {clan.clanLevel}
              </span>
            )}
          </div>

          {/* Başlık, Etiket ve Metin */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="game-title-stroke text-xl sm:text-2xl md:text-3xl font-black tracking-wide break-words">
                {clan.name}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-black/35 text-amber-300 border border-amber-300/30 select-all">
                {clan.tag}
              </span>
            </div>

            {/* Açıklama Metni */}
            <p className="text-xs sm:text-sm text-gray-100 font-medium leading-relaxed whitespace-pre-line select-text line-clamp-4 hover:line-clamp-none transition-all">
              {clan.description || "Klan açıklaması bulunmuyor."}
            </p>

            {/* Klan Etiket Rozetleri (labels) */}
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
                    <span className="truncate max-w-[120px]">{lbl.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Kolon: Anahtar:Değer Tablosu */}
        <div className="lg:col-span-5 bg-black/25 rounded-xl p-3.5 sm:p-4 border border-white/10 backdrop-blur-xs">
          <div className="space-y-0.5">
            {/* Klan Savaşı Ligi */}
            <div className="clan-keyval-row">
              <span className="clan-keyval-key">Klan Savaşı Ligi</span>
              <span className="clan-keyval-val text-amber-300 font-bold">
                {clan.warLeague?.name || "Lige Katılmamış"}
              </span>
            </div>

            {/* Klan Konumu */}
            <div className="clan-keyval-row">
              <span className="clan-keyval-key">Klan Konumu</span>
              <span className="clan-keyval-val">
                {clan.location?.name || "Uluslararası"}
              </span>
            </div>

            {/* Sohbet Dili (varsa) */}
            {clan.chatLanguage?.name && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key">Sohbet Dili</span>
                <span className="clan-keyval-val">
                  {clan.chatLanguage.name}
                </span>
              </div>
            )}

            {/* Katılım Türü */}
            <div className="clan-keyval-row">
              <span className="clan-keyval-key">Tür</span>
              <span className="clan-keyval-val">
                {formatClanType(clan.type)}
              </span>
            </div>

            {/* Gereken Kupa */}
            <div className="clan-keyval-row">
              <span className="clan-keyval-key">Gereken Kupa</span>
              <span className="clan-keyval-val text-amber-300">
                {clan.requiredTrophies !== undefined && clan.requiredTrophies > 0
                  ? `${clan.requiredTrophies.toLocaleString()} Kupa`
                  : "Kupasız"}
              </span>
            </div>

            {/* Gereken Belediye Binası Seviyesi */}
            <div className="clan-keyval-row">
              <span className="clan-keyval-key">Gereken Belediye Binası</span>
              <span className="clan-keyval-val text-sky-300">
                {clan.requiredTownhallLevel ? `BB ${clan.requiredTownhallLevel}` : "1"}
              </span>
            </div>

            {/* Gereken İnşaatçı Üssü Kupası (varsa) */}
            {clan.requiredBuilderBaseTrophies !== undefined && clan.requiredBuilderBaseTrophies > 0 && (
              <div className="clan-keyval-row">
                <span className="clan-keyval-key">Gereken İnşaatçı Üssü</span>
                <span className="clan-keyval-val text-amber-200">
                  {clan.requiredBuilderBaseTrophies.toLocaleString()} Kupa
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alt Eylem Düğmeleri: Yalnızca gerçek ve işlevsel butonlar */}
      <div className="relative z-10 flex flex-wrap items-center gap-3 pt-4 sm:pt-5 border-t border-white/15 mt-4 sm:mt-5">
        {/* CWL Rakip Analizi Düğmesi */}
        <GameButton
          variant="green"
          size="md"
          icon={<Swords className="w-5 h-5 mr-1.5" />}
          onClick={handleCwlScout}
          className="w-full sm:w-auto"
        >
          CWL Rakip Analizi
        </GameButton>

        {/* Savaş Günlüğü: Yalnızca isWarLogPublic açık ise gösterilir */}
        {Boolean(clan.isWarLogPublic) && (
          <GameButton
            variant="blue"
            size="md"
            icon={<FileText className="w-5 h-5 mr-1.5" />}
            onClick={handleWarLog}
            className="w-full sm:w-auto"
          >
            Savaş Günlüğü
          </GameButton>
        )}
      </div>
    </div>
  );
}
