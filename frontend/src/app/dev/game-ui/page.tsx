"use client";

import React, { useState } from "react";
import {
  GameButton,
  GamePanel,
  GameTabBar,
  GameTab,
  LevelBadge,
  IconFrame,
  StatPill,
} from "@/components/game";
import {
  Swords,
  Shield,
  Sparkles,
  Award,
  Trash2,
  Copy,
  ExternalLink,
  Crown,
  Flame,
  Check,
} from "lucide-react";

export default function GameUIShowcasePage() {
  const [activeTab, setActiveTab] = useState<string>("setler");
  const [btnCount, setBtnCount] = useState<number>(0);

  return (
    <div className="game-theme min-h-screen bg-[#1F140D] text-white p-4 sm:p-8 space-y-10">
      {/* Page Title */}
      <div className="max-w-6xl mx-auto space-y-2 border-b border-amber-900/40 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
          DEV SHOWCASE • /dev/game-ui
        </div>
        <h1 className="game-text-stroke text-3xl sm:text-4xl font-extrabold tracking-wide">
          Clash of Clans UI Tasarım Sistemi
        </h1>
        <p className="text-amber-200/70 text-sm max-w-2xl font-medium">
          Oyun içi ekran görüntülerinden piksel hassasiyetinde ölçülmüş renkler, 3D basık buton fiziği,
          ahşap ve mavi-gri paneller, ikon çerçeveleri ve tipografi sistemi.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* 1. BUTTONS SHOWCASE */}
        <section className="space-y-4">
          <h2 className="game-text-stroke-gold text-xl font-bold flex items-center gap-2">
            <Swords size={20} />
            <span>1. GameButton (3D Taktik Butonlar)</span>
          </h2>

          <GamePanel variant="wood" title="Buton Renkleri ve Boyutları">
            <div className="space-y-6">
              {/* Variant Rows */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-200/80 block uppercase tracking-wider">
                  Varyantlar (Green, Blue, Red, Gold, Disabled)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <GameButton variant="green" onClick={() => setBtnCount((c) => c + 1)}>
                    Kullan ({btnCount})
                  </GameButton>
                  <GameButton variant="blue" icon={<Copy size={16} />}>
                    Kodu Kopyala
                  </GameButton>
                  <GameButton variant="gold" icon={<Sparkles size={16} />}>
                    Düzenle
                  </GameButton>
                  <GameButton variant="red" icon={<Trash2 size={16} />}>
                    Sil / Ayrıl
                  </GameButton>
                  <GameButton variant="green" disabled>
                    Devre Dışı
                  </GameButton>
                </div>
              </div>

              {/* Size Rows */}
              <div className="space-y-3 pt-4 border-t border-amber-950/40">
                <span className="text-xs font-bold text-amber-200/80 block uppercase tracking-wider">
                  Boyutlar (Small, Medium, Large)
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <GameButton size="sm" variant="green">
                    Küçük (sm)
                  </GameButton>
                  <GameButton size="md" variant="green">
                    Standart (md)
                  </GameButton>
                  <GameButton size="lg" variant="green" icon={<ExternalLink size={20} />}>
                    Büyük Ordu Kopyala (lg)
                  </GameButton>
                </div>
              </div>
            </div>
          </GamePanel>
        </section>

        {/* 2. TABS SHOWCASE */}
        <section className="space-y-4">
          <h2 className="game-text-stroke-gold text-xl font-bold flex items-center gap-2">
            <Shield size={20} />
            <span>2. GameTab & GameTabBar (Ahşap & Krem Sekmeler)</span>
          </h2>

          <div>
            <GameTabBar>
              <GameTab
                active={activeTab === "ordum"}
                onClick={() => setActiveTab("ordum")}
              >
                Ordum
              </GameTab>
              <GameTab
                active={activeTab === "setler"}
                onClick={() => setActiveTab("setler")}
              >
                Kaydedilen Setler
              </GameTab>
              <GameTab
                active={activeTab === "tarifler"}
                onClick={() => setActiveTab("tarifler")}
              >
                Ordu Tarifleri
              </GameTab>
            </GameTabBar>

            <GamePanel variant="wood" className="rounded-tl-none -mt-[3.5px]">
              <p className="text-amber-100 text-sm">
                Aktif sekme krem tonlarında (<code>#C69B73</code>), pasif sekmeler koyu ahşap (<code>#644436</code>)
                dokulu olarak render edilir. Sekmeler tıklandığında derinlik ve gölge hissi otomatik güncellenir.
              </p>
            </GamePanel>
          </div>
        </section>

        {/* 3. PANELS SHOWCASE */}
        <section className="space-y-4">
          <h2 className="game-text-stroke-gold text-xl font-bold flex items-center gap-2">
            <Award size={20} />
            <span>3. GamePanel (4 Panel Varyantı)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GamePanel variant="wood" title="Wood Panel (Ordum / Kart)">
              <div className="space-y-2 text-xs text-amber-100">
                <p>Ana ordu kartları ve ahşap zeminler için kullanılır.</p>
                <div className="game-slot-well text-amber-200/90 text-xs">
                  İç İçe Yuva (game-slot-well): Birliklerin yerleştiği basık gölgeli zemin.
                </div>
              </div>
            </GamePanel>

            <GamePanel variant="blue" title="Blue Panel (Profil / Klan)">
              <div className="space-y-2 text-xs text-blue-100">
                <p>Oyuncu profili, klan arayüzü ve genel bilgi pencereleri için mavi-gri zemin.</p>
                <div className="game-panel-dark p-2 rounded text-xs text-slate-200">
                  Dark Box: İstatistik ve lig bilgileri için koyu kutu.
                </div>
              </div>
            </GamePanel>

            <GamePanel variant="dark" title="Dark Panel (Koyu Zemin)">
              <p className="text-xs text-slate-300">
                Klan Kalesi birlikleri, kuşatma makineleri veya kara zemin gerektiren paneller.
              </p>
            </GamePanel>

            <GamePanel variant="cream" title="Cream Panel (Parşömen)">
              <p className="text-xs text-amber-950 font-bold">
                Krem rengi parşömen / bildirim kartları için açık renkli zemin.
              </p>
            </GamePanel>
          </div>
        </section>

        {/* 4. ICONFRAME & LEVEL BADGE */}
        <section className="space-y-4">
          <h2 className="game-text-stroke-gold text-xl font-bold flex items-center gap-2">
            <Crown size={20} />
            <span>4. IconFrame & LevelBadge (Birlik Çerçeveleri)</span>
          </h2>

          <GamePanel variant="wood" title="Birlikler, Ekipmanlar, Petler ve Sayı Rozetleri">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <IconFrame name="barbarian" count={14} level={12} size="md" />
                <IconFrame name="archer" count={2} level={14} isMax size="md" />
                <IconFrame name="healer" count={5} level={11} size="md" />
                <IconFrame name="electro-titan" count={2} level={4} size="md" />
                <IconFrame name="rage-spell" count={2} level={7} isMax size="md" />
                <IconFrame name="freeze-spell" count={5} level={8} size="md" />
                <IconFrame name="log-launcher" count={1} level={5} size="md" />
                <IconFrame name="action-figure" level={27} rarity="epic" size="md" />
                <IconFrame name="spiky-ball" level={27} isMax rarity="epic" size="md" />
                <IconFrame name="spirit-fox" level={10} isMax rarity="legendary" size="md" />
              </div>

              {/* Different Frame Sizes */}
              <div className="pt-4 border-t border-amber-950/40 space-y-2">
                <span className="text-xs font-bold text-amber-200/80 block uppercase tracking-wider">
                  Boyut Skalası (xs: 32px, sm: 40px, md: 48px, lg: 58px)
                </span>
                <div className="flex items-end gap-3">
                  <IconFrame name="barbarian" count={4} level={12} size="xs" />
                  <IconFrame name="barbarian" count={4} level={12} size="sm" />
                  <IconFrame name="barbarian" count={4} level={12} size="md" />
                  <IconFrame name="barbarian" count={4} level={12} size="lg" />
                </div>
              </div>
            </div>
          </GamePanel>
        </section>

        {/* 5. STAT PILLS */}
        <section className="space-y-4">
          <h2 className="game-text-stroke-gold text-xl font-bold flex items-center gap-2">
            <Flame size={20} />
            <span>5. StatPill (Kapasite & Oran Göstergeleri)</span>
          </h2>

          <GamePanel variant="wood" title="Kapasite Rozetleri (saved_armies ekranındaki gibi)">
            <div className="flex flex-wrap items-center gap-3">
              <StatPill label="Birlik" value="352/352" variant="blue" />
              <StatPill label="Büyü" value="11/11" variant="purple" />
              <StatPill label="Kuşatma" value="3/3" variant="amber" />
              <StatPill label="Klan Kalesi" value="61/61" variant="green" />
              <StatPill label="Kullanım" value="%34.2" variant="amber" />
              <StatPill label="3 Yıldız" value="%88.5" variant="green" />
            </div>
          </GamePanel>
        </section>
      </div>
    </div>
  );
}

