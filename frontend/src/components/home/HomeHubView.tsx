"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Users,
  Award,
  Crown,
  Sparkles,
  Swords,
  Layers,
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  Flame,
  Activity,
  PenTool,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { safeFetchJson } from "@/lib/apiClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface HomeHubViewProps {
  onNavigate: (tab: "search" | "ore" | "cwl" | "meta" | "wall", subAction?: string) => void;
  onSearchQuery?: (mode: "player" | "clanTag" | "clanName", query: string) => void;
}

export default function HomeHubView({ onNavigate, onSearchQuery }: HomeHubViewProps) {
  const [metaInfo, setMetaInfo] = useState<{
    sampleSize: number;
    totalRankedAttacks: number;
    lastUpdated: string | null;
  } | null>(null);

  const [quickSearchInput, setQuickSearchInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJson<any>("/api/v1/meta/top-analysis?sample_size=200&town_hall=18");
        if (!cancelled && data) {
          setMetaInfo({
            sampleSize: data.sampleSize || 200,
            totalRankedAttacks: data.totalRankedAttacksAnalyzed || data.totalBattlesAnalyzed || 0,
            lastUpdated: data.dataFetchedAt
              ? new Date(data.dataFetchedAt).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
          });
        }
      } catch {
        // Offline / fallback to initial state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickSearchInput.trim();
    if (!query) {
      onNavigate("search");
      return;
    }
    const mode = query.startsWith("#") ? (query.length <= 6 ? "clanTag" : "player") : "clanName";
    if (onSearchQuery) {
      onSearchQuery(mode, query);
    }
    onNavigate("search");
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-sans">
      {/* Hero Welcome & Live Status Strip */}
      <div className="bg-app-card border border-app-border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold">
              <Activity size={14} className="text-blue-400 animate-pulse" />
              <span>Canlı Resmi CoC API Verisi</span>
            </div>

            {/* Status Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-app-muted">
              <span className="px-3 py-1 rounded-lg bg-app-cardSubtle border border-app-border flex items-center gap-1.5">
                <Users size={13} className="text-blue-400" />
                Örneklem: <strong className="text-app-text font-bold">{metaInfo?.sampleSize ?? 200} Oyuncu</strong>
              </span>
              {metaInfo?.totalRankedAttacks ? (
                <span className="px-3 py-1 rounded-lg bg-app-cardSubtle border border-app-border flex items-center gap-1.5">
                  <Swords size={13} className="text-emerald-400" />
                  <strong className="text-app-text font-bold">{metaInfo.totalRankedAttacks.toLocaleString("tr-TR")}</strong> Ranked Saldırı
                </span>
              ) : null}
              {metaInfo?.lastUpdated ? (
                <span className="px-3 py-1 rounded-lg bg-app-cardSubtle border border-app-border flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-400" />
                  Son Güncelleme: <strong className="text-app-text font-bold">{metaInfo.lastUpdated}</strong>
                </span>
              ) : null}
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-extrabold text-app-text tracking-tight">
              Clash of Clans Analitik & Strateji Merkezi
            </h1>
            <p className="text-sm text-app-muted mt-2 leading-relaxed">
              Resmi API üzerinden ilk 200 Efsane Ligi oyuncusunun canlı verilerini, TH18 meta ordularını, CWL rakip keşfini ve cevher fulleme simülasyonunu anında inceleyin.
            </p>
          </div>

          {/* Quick Search Box */}
          <form onSubmit={handleQuickSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                placeholder="Oyuncu / Klan etiketi girin (Örn: #9JG8UVL0 veya #2PP)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-app-cardSubtle border border-app-border text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95"
            >
              <Search size={14} /> Sorgula
            </button>
          </form>
        </div>
      </div>

      {/* ClashSpot Categorized Dashboard Grid */}
      <div className="space-y-6">
        {/* Section 1: Arama */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
            <Search size={14} className="text-blue-500" /> Arama & Profil
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => onNavigate("search", "player")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                <Users size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-app-text group-hover:text-blue-400 transition-colors">
                    Oyuncu Arama
                  </h3>
                  <ArrowRight size={16} className="text-app-muted group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  Gerçek oyuncu profili, TH seviyesi, 6 kahraman, aktif donanımlar ve son ranked battle log savaşları.
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigate("search", "clan")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <Shield size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-app-text group-hover:text-indigo-400 transition-colors">
                    Klan Arama
                  </h3>
                  <ArrowRight size={16} className="text-app-muted group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  Etiket veya klan adıyla canlı klan sorgulama, CWL ligi, üye kadrosu ve savaş geçmişi analizi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: İstatistik / Meta */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
            <Award size={14} className="text-purple-500" /> İstatistik & Meta (TH18)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate("meta", "armies")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-purple-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                  <Flame size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-purple-400 transition-colors">
                  Meta Ordular
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  Top 200 Efsane Ligi battle log kayıtlarından gruplanan en yüksek 3 yıldız oranlı 5 meta ordu ve tek tık kopyalama linkleri.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-purple-400">
                <span>Orduları İncele</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate("meta", "heroes")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                  <Crown size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-amber-400 transition-colors">
                  Kahraman & Ekipmanlar
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  Minion Prince ve Dragon Duke dahil 6 kahramanın pick rate kullanım yüzdeleri ve en popüler ekipman ikilileri.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Ekipman Oranları</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate("meta", "pets")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-cyan-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-cyan-400 transition-colors">
                  Evcil Hayvanlar & Birlikler
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  Kahraman başına eşleşen evcil hayvan (pet) yüzdeleri, aktif süper birlikler ve en çok tercih edilen kuşatma makineleri.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>Evcil Hayvan İstatistikleri</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Araçlar */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted flex items-center gap-2">
            <Layers size={14} className="text-emerald-500" /> Analiz & Köy Araçları
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate("ore")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-emerald-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                  <TrendingUp size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-emerald-400 transition-colors">
                  Cevher Analizi
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  37 resmi lig kademesi, savaş ve baskın gelirleriyle demircinizi fulleme gününü ve darboğaz cevherini kesin hesaplayın.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Demirciyi Hesapla</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate("cwl")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                  <Swords size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-amber-400 transition-colors">
                  CWL Keşif Kartı
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  CWL rakibinizin 15/30 kişilik kadrosunu, ranked battle log saldırılarını, tahmin edilen ordularını ve yedek taktiklerini keşfedin.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Rakibi Keşfet</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate("wall")}
              className="group bg-app-card hover:bg-app-cardSubtle border border-app-border hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                  <PenTool size={22} />
                </div>
                <h3 className="text-base font-bold text-app-text group-hover:text-blue-400 transition-colors">
                  Duvar Yazısı
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-relaxed">
                  44x44 ana köy ızgarasında duvarlarla metin yaz; 2D/3D izometrik önizle, bütçe kısıtlı ve satır satır koordinat planı indir.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-bold text-blue-400">
                <span>Duvar Yazısı Yaz</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

