"use client";

import React, { useState } from "react";
import {
  Crown,
  Sparkles,
  Swords,
  Flame,
  Zap,
  Layers,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { SectionPanel, TownHallImage, IconFrame, GameButton } from "@/components/game";
import type { PlayerProfileViewData, UnitItem, ImportedEquipmentItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DARK_TROOP_NAMES = new Set([
  "Minion",
  "Hog Rider",
  "Valkyrie",
  "Golem",
  "Witch",
  "Lava Hound",
  "Bowler",
  "Ice Golem",
  "Headhunter",
  "Head Hunter",
  "Apprentice Warden",
  "Druid",
  "Furnace",
]);

const SIEGE_MACHINE_NAMES = new Set([
  "Wall Wrecker",
  "Battle Blimp",
  "Stone Slammer",
  "Siege Barracks",
  "Log Launcher",
  "Flame Flinger",
  "Battle Drill",
  "Troop Launcher",
  "Sky Wagon",
]);

const KNOWN_PET_NAMES = new Set([
  "L.A.S.S.I",
  "LASSI",
  "Electro Owl",
  "Mighty Yak",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Spirit Fox",
  "Angry Jelly",
  "Snoop",
  "Sneezy",
  "Walrus",
  "Greedy Raven",
]);

const KNOWN_SUPER_TROOPS = new Set([
  "Super Barbarian",
  "Super Archer",
  "Super Giant",
  "Sneaky Goblin",
  "Super Wall Breaker",
  "Rocket Balloon",
  "Super Wizard",
  "Super Dragon",
  "Inferno Dragon",
  "Super Minion",
  "Super Valkyrie",
  "Super Witch",
  "Ice Hound",
  "Super Bowler",
  "Super Miner",
  "Super Hog Rider",
  "Super Yeti",
  "Super P.E.K.K.A",
]);

export interface PlayerArmySectionProps {
  player: PlayerProfileViewData;
  onImportPlayerToOre?: (player: PlayerProfileViewData) => void;
  className?: string;
}

/**
 * PlayerArmySection
 * Displays Town Hall graphic, Heroes (with active equipment), Pets, Troops, Spells,
 * Siege Machines, Unlocked Equipment, and Super Troops.
 * Measured directly from referans/oyun-ici/profil-birlikler.png.
 */
export default function PlayerArmySection({
  player,
  onImportPlayerToOre,
  className,
}: PlayerArmySectionProps) {
  const [importedFlash, setImportedFlash] = useState(false);

  const handleTransferToOre = () => {
    if (!onImportPlayerToOre) return;
    onImportPlayerToOre(player);
    setImportedFlash(true);
    setTimeout(() => setImportedFlash(false), 2000);
  };

  const isBuilderBase = (u: { village?: string }) =>
    Boolean(u.village && u.village.toLowerCase() === "builderbase");

  // Filter Units
  const homeHeroes = (player.heroes || []).filter((h) => !isBuilderBase(h));

  // Extract Pets
  const petsList: UnitItem[] = [...(player.pets || [])];
  for (const tr of player.troops || []) {
    if (!isBuilderBase(tr) && KNOWN_PET_NAMES.has(tr.name)) {
      if (!petsList.some((p) => p.name === tr.name)) {
        petsList.push(tr);
      }
    }
  }

  // Super Troops
  const superTroopsList = (player.troops || []).filter(
    (t) =>
      !isBuilderBase(t) &&
      (Boolean(t.superTroopIsActive) ||
        t.name.startsWith("Super ") ||
        KNOWN_SUPER_TROOPS.has(t.name))
  );

  // Siege Machines
  const siegesList = (player.troops || []).filter(
    (t) =>
      !isBuilderBase(t) &&
      !superTroopsList.some((st) => st.name === t.name) &&
      SIEGE_MACHINE_NAMES.has(t.name)
  );

  // Dark Troops
  const darkTroopsList = (player.troops || []).filter(
    (t) =>
      !isBuilderBase(t) &&
      !superTroopsList.some((st) => st.name === t.name) &&
      !siegesList.some((sm) => sm.name === t.name) &&
      !KNOWN_PET_NAMES.has(t.name) &&
      DARK_TROOP_NAMES.has(t.name)
  );

  // Standard Elixir Troops
  const elixirTroopsList = (player.troops || []).filter(
    (t) =>
      !isBuilderBase(t) &&
      !superTroopsList.some((st) => st.name === t.name) &&
      !siegesList.some((sm) => sm.name === t.name) &&
      !darkTroopsList.some((dt) => dt.name === t.name) &&
      !KNOWN_PET_NAMES.has(t.name)
  );

  // Spells
  const spellsList = (player.spells || []).filter((s) => !isBuilderBase(s));

  // Unlocked Hero Equipment
  const heroEquipmentList: ImportedEquipmentItem[] = player.heroEquipment || [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* 2-Column Split Layout on Desktop, 1-Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (Town Hall Image, Ore Button, Heroes, Pets) - 5 Cols on LG */}
        <div className="lg:col-span-5 space-y-4">
          {/* Town Hall & Ore Transfer Card */}
          <SectionPanel className="flex flex-col items-center justify-center text-center p-4">
            <div className="relative py-2">
              <TownHallImage
                level={player.townHallLevel}
                weaponLevel={player.townHallWeaponLevel}
                size={140}
              />
            </div>

            <div className="mt-2 text-center">
              <div className="text-[11px] font-bold text-stone-200/90 uppercase tracking-wider">
                Belediye Binası
              </div>
              <div className="game-text-stroke text-xl font-black text-white">
                Seviye {player.townHallLevel}
                {player.townHallWeaponLevel && player.townHallWeaponLevel > 1
                  ? ` (Silah Lv.${player.townHallWeaponLevel})`
                  : ""}
              </div>
            </div>

            {/* Action: Transfer to Ore Calculator */}
            {onImportPlayerToOre && (
              <div className="pt-3 w-full max-w-[260px]">
                <GameButton
                  variant={importedFlash ? "green" : "blue"}
                  size="sm"
                  onClick={handleTransferToOre}
                  className="w-full text-xs font-bold"
                  icon={
                    importedFlash ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Sparkles size={15} />
                    )
                  }
                >
                  {importedFlash
                    ? "Aktarıldı!"
                    : "Ekipmanları Cevher Analizine Aktar"}
                </GameButton>
              </div>
            )}
          </SectionPanel>

          {/* Heroes Section (with active equipped equipment) */}
          {homeHeroes.length > 0 && (
            <SectionPanel
              title="Kahramanlar"
              icon={<Crown size={18} className="text-amber-400" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-300">
                  {homeHeroes.length} Kahraman
                </span>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {homeHeroes.map((hero) => {
                  const isMax =
                    hero.level !== undefined &&
                    hero.maxLevel !== undefined &&
                    hero.level >= hero.maxLevel &&
                    hero.maxLevel > 0;
                  const activeEquip = hero.equipment || [];

                  return (
                    <div
                      key={hero.name}
                      className="bg-black/25 rounded-xl p-2 border border-white/10 flex items-center gap-2.5 shadow-sm"
                    >
                      {/* Hero Tile */}
                      <IconFrame
                        name={hero.name}
                        level={hero.level}
                        maxLevel={hero.maxLevel}
                        isMax={isMax}
                        size="unit"
                        tileType="hero"
                      />

                      {/* Hero Info & Active Equipped Gears */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate leading-tight">
                          {hero.name}
                        </div>
                        <div className="text-[10px] text-stone-300 font-semibold mb-1">
                          {isMax ? "Maksimum Seviye" : `Seviye ${hero.level} / ${hero.maxLevel}`}
                        </div>

                        {/* Equipped Gears (up to 2 active items) */}
                        {activeEquip.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {activeEquip.map((eq, eqIdx) => (
                              <IconFrame
                                key={`${eq.name}-${eqIdx}`}
                                name={eq.name}
                                level={eq.level}
                                maxLevel={eq.maxLevel}
                                size="xs"
                                tileType="equipment"
                                rarity={
                                  eq.rarity === "Epic" || eq.maxLevel === 27
                                    ? "epic"
                                    : "common"
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-stone-400 italic">
                            Ekipman takılı değil
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionPanel>
          )}

          {/* Pets Section */}
          {petsList.length > 0 && (
            <SectionPanel
              title="Hayvanlar"
              icon={<Sparkles size={18} className="text-cyan-400" />}
              rightBadge={
                <span className="text-xs font-bold text-cyan-300">
                  {petsList.length} Hayvan
                </span>
              }
            >
              <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-1.5 sm:gap-2">
                {petsList.map((pet) => (
                  <IconFrame
                    key={pet.name}
                    name={pet.name}
                    level={pet.level}
                    maxLevel={pet.maxLevel}
                    size="unit"
                    tileType="pet"
                  />
                ))}
              </div>
            </SectionPanel>
          )}
        </div>

        {/* Right Column (Troops, Spells, Sieges, Equipment, Super Troops) - 7 Cols on LG */}
        <div className="lg:col-span-7 space-y-4">
          {/* Birlikler (İksir ve Kara İksir) */}
          {(elixirTroopsList.length > 0 || darkTroopsList.length > 0) && (
            <SectionPanel
              title="Birlikler"
              icon={<Swords size={18} className="text-sky-400" />}
              rightBadge={
                <span className="text-xs font-bold text-sky-200">
                  {elixirTroopsList.length + darkTroopsList.length} Birlik
                </span>
              }
            >
              <div className="space-y-3">
                {/* Elixir Troops */}
                {elixirTroopsList.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400" />
                      İksir Birlikleri
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                      {elixirTroopsList.map((tr) => (
                        <IconFrame
                          key={tr.name}
                          name={tr.name}
                          level={tr.level}
                          maxLevel={tr.maxLevel}
                          size="unit"
                          tileType="elixir"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Dark Elixir Troops */}
                {darkTroopsList.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Kara İksir Birlikleri
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                      {darkTroopsList.map((tr) => (
                        <IconFrame
                          key={tr.name}
                          name={tr.name}
                          level={tr.level}
                          maxLevel={tr.maxLevel}
                          size="unit"
                          tileType="dark-elixir"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionPanel>
          )}

          {/* Büyüler */}
          {spellsList.length > 0 && (
            <SectionPanel
              title="Büyüler"
              icon={<Zap size={18} className="text-amber-400" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-300">
                  {spellsList.length} Büyü
                </span>
              }
            >
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                {spellsList.map((sp) => (
                  <IconFrame
                    key={sp.name}
                    name={sp.name}
                    level={sp.level}
                    maxLevel={sp.maxLevel}
                    size="unit"
                    tileType="spell"
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Kuşatma Makineleri */}
          {siegesList.length > 0 && (
            <SectionPanel
              title="Kuşatma Makineleri"
              icon={<Layers size={18} className="text-emerald-400" />}
              rightBadge={
                <span className="text-xs font-bold text-emerald-300">
                  {siegesList.length} Makine
                </span>
              }
            >
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                {siegesList.map((sg) => (
                  <IconFrame
                    key={sg.name}
                    name={sg.name}
                    level={sg.level}
                    maxLevel={sg.maxLevel}
                    size="unit"
                    tileType="siege"
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Kahraman Ekipmanları (unlocked equipment list) */}
          {heroEquipmentList.length > 0 && (
            <SectionPanel
              title="Kahraman Ekipmanları"
              icon={<Shield size={18} className="text-purple-400" />}
              rightBadge={
                <span className="text-xs font-bold text-purple-300">
                  {heroEquipmentList.length} Ekipman
                </span>
              }
            >
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                {heroEquipmentList.map((eq, eqIdx) => (
                  <IconFrame
                    key={`${eq.name}-${eqIdx}`}
                    name={eq.name}
                    level={eq.level}
                    maxLevel={eq.maxLevel}
                    size="unit"
                    tileType="equipment"
                    rarity={
                      eq.rarity === "Epic" || eq.maxLevel === 27
                        ? "epic"
                        : "common"
                    }
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Süper Birlikler (active highlighted) */}
          {superTroopsList.length > 0 && (
            <SectionPanel
              title="Süper Birlikler"
              icon={<Flame size={18} className="text-rose-400" />}
              rightBadge={
                <div className="flex items-center gap-2">
                  {superTroopsList.some((st) => st.superTroopIsActive) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Aktif Birlik
                    </span>
                  )}
                  <span className="text-xs font-bold text-rose-300">
                    {superTroopsList.length} Süper
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
                {superTroopsList.map((st) => {
                  const isActive = Boolean(st.superTroopIsActive);
                  return (
                    <div key={st.name} className="relative">
                      <IconFrame
                        name={st.name}
                        level={st.level}
                        maxLevel={st.maxLevel}
                        size="unit"
                        tileType="super"
                        className={
                          isActive
                            ? "ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                            : undefined
                        }
                      />
                      {isActive && (
                        <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-emerald-500 text-[8px] font-black text-white rounded-full shadow-md leading-tight pointer-events-none z-10">
                          AKTİF
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionPanel>
          )}
        </div>
      </div>
    </div>
  );
}
