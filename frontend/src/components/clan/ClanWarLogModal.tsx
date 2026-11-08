"use client";

import React, { useEffect } from "react";
import { X, Trophy, Swords, Flame, Award, ShieldAlert, CheckCircle2 } from "lucide-react";
import GameButton from "@/components/game/GameButton";
import type { ClanDetails } from "./types";

export interface ClanWarLogModalProps {
  clan: ClanDetails;
  isOpen: boolean;
  onClose: () => void;
}

function formatWarFrequency(freq?: string): string {
  if (!freq) return "Bilinmiyor";
  const lower = freq.toLowerCase();
  if (lower === "always") return "Her Zaman";
  if (lower === "morethanonceperweek") return "Haftada Birden Fazla";
  if (lower === "onceperweek") return "Haftada Bir Kez";
  if (lower === "lessthanonceperweek") return "Nadiren";
  if (lower === "never") return "Asla";
  return freq;
}

export default function ClanWarLogModal({
  clan,
  isOpen,
  onClose,
}: ClanWarLogModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const wins = clan.warWins ?? 0;
  const losses = clan.warLosses ?? 0;
  const ties = clan.warTies ?? 0;
  const totalWars = wins + losses + ties;
  const winRate = totalWars > 0 ? ((wins / totalWars) * 100).toFixed(1) : "0.0";

  return (
    <div
      className="clan-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="warlog-modal-title"
    >
      <div
        className="clan-modal-content p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Başlık ve Kapat Butonu */}
        <div className="flex items-center justify-between border-b border-gray-300 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Swords className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 id="warlog-modal-title" className="game-text-stroke text-lg sm:text-xl font-black text-gray-900">
                Savaş Günlüğü ve İstatistikleri
              </h3>
              <p className="text-xs text-gray-600 font-bold">{clan.name} ({clan.tag})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-black transition-colors shadow-sm cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Özet Kartları Izgarası */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {/* Galibiyet */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block">
              Savaş Zaferleri
            </span>
            <span className="game-text-stroke text-xl sm:text-2xl font-black text-emerald-600 block mt-0.5">
              {wins}
            </span>
          </div>

          {/* Mağlubiyet */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block">
              Mağlubiyetler
            </span>
            <span className="game-text-stroke text-xl sm:text-2xl font-black text-rose-600 block mt-0.5">
              {losses}
            </span>
          </div>

          {/* Seri */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Galibiyet Serisi
            </span>
            <span className="game-text-stroke text-xl sm:text-2xl font-black text-amber-500 block mt-0.5">
              {clan.warWinStreak ?? 0}
            </span>
          </div>

          {/* Kazanma Oranı */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block">
              Kazanma Oranı
            </span>
            <span className="game-text-stroke text-lg sm:text-xl font-black text-blue-600 block mt-0.5">
              %{winRate}
            </span>
          </div>

          {/* Beraberlik */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block">
              Beraberlikler
            </span>
            <span className="game-text-stroke text-lg sm:text-xl font-black text-gray-600 block mt-0.5">
              {ties}
            </span>
          </div>

          {/* Toplam Savaş */}
          <div className="rounded-xl bg-white/70 border border-gray-300 p-3 text-center shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block">
              Toplam Savaş
            </span>
            <span className="game-text-stroke text-lg sm:text-xl font-black text-gray-800 block mt-0.5">
              {totalWars}
            </span>
          </div>
        </div>

        {/* Detay Bilgileri Listesi */}
        <div className="rounded-xl bg-black/10 border border-gray-300/60 p-3.5 space-y-2 mb-5 text-xs text-gray-800">
          <div className="flex items-center justify-between py-1 border-b border-gray-300/40">
            <span className="font-semibold text-gray-600">Savaş Ligi:</span>
            <span className="font-black text-amber-700">{clan.warLeague?.name || "Bilinmiyor"}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-gray-300/40">
            <span className="font-semibold text-gray-600">Savaş Sıklığı:</span>
            <span className="font-bold">{formatWarFrequency(clan.warFrequency)}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-semibold text-gray-600">Günlük Durumu:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Herkese Açık
            </span>
          </div>
        </div>

        {/* Kapat Butonu */}
        <div className="flex justify-end">
          <GameButton variant="green" size="md" onClick={onClose}>
            Tamam
          </GameButton>
        </div>
      </div>
    </div>
  );
}
