"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { useLanguage } from "@/lib/i18n";
import type { PlayerProfileViewData, UnitItem, ImportedEquipmentItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeUnitKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CANONICAL_NAME_MAP: Record<string, string> = {
  ruinwitch: "Ruin Witch",
  trooplauncher: "Troop Launcher",
  headhunter: "Headhunter",
  lassi: "L.A.S.S.I",
  superpekka: "Super P.E.K.K.A",
};

function getCanonicalUnitName(rawName: string): string {
  const key = normalizeUnitKey(rawName);
  return CANONICAL_NAME_MAP[key] || rawName.trim();
}

const DARK_TROOP_KEYS = new Set([
  "minion",
  "hogrider",
  "valkyrie",
  "golem",
  "witch",
  "lavahound",
  "bowler",
  "icegolem",
  "headhunter",
  "apprenticewarden",
  "druid",
  "furnace",
  "ruinwitch",
]);

const SIEGE_MACHINE_KEYS = new Set([
  "wallwrecker",
  "battleblimp",
  "stoneslammer",
  "siegebarracks",
  "loglauncher",
  "flameflinger",
  "battledrill",
  "trooplauncher",
  "skywagon",
]);

const KNOWN_PET_KEYS = new Set([
  "lassi",
  "electroowl",
  "mightyyak",
  "unicorn",
  "frosty",
  "diggy",
  "poisonlizard",
  "phoenix",
  "spiritfox",
  "angryjelly",
  "snoop",
  "sneezy",
  "walrus",
  "greedyraven",
]);

const KNOWN_SUPER_TROOP_KEYS = new Set([
  "superbarbarian",
  "superarcher",
  "supergiant",
  "sneakygoblin",
  "superwallbreaker",
  "rocketballoon",
  "superwizard",
  "superdragon",
  "infernodragon",
  "superminion",
  "supervalkyrie",
  "superwitch",
  "icehound",
  "superbowler",
  "superminer",
  "superhogrider",
  "superyeti",
  "superpekka",
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
 */
export default function PlayerArmySection({
  player,
  onImportPlayerToOre,
  className,
}: PlayerArmySectionProps) {
  const { t, fmtNum, fmtTemplate } = useLanguage();
  const [importedFlash, setImportedFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleTransferToOre = () => {
    if (!onImportPlayerToOre) return;
    onImportPlayerToOre(player);
    setImportedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setImportedFlash(false), 2000);
  };

  const isBuilderBase = (u: { village?: string }) =>
    Boolean(u.village && u.village.toLowerCase() === "builderbase");

  // Filter Units
  const homeHeroes = (player.heroes || []).filter((h) => !isBuilderBase(h));

  // Extract Pets
  const petsList: UnitItem[] = [...(player.pets || [])].map((p) => ({
    ...p,
    name: getCanonicalUnitName(p.name),
  }));
  for (const tr of player.troops || []) {
    const key = normalizeUnitKey(tr.name);
    if (!isBuilderBase(tr) && KNOWN_PET_KEYS.has(key)) {
      const canonical = getCanonicalUnitName(tr.name);
      if (!petsList.some((p) => normalizeUnitKey(p.name) === key)) {
        petsList.push({ ...tr, name: canonical });
      }
    }
  }

  const homeTroops = (player.troops || [])
    .filter((tr) => !isBuilderBase(tr))
    .map((tr) => ({ ...tr, name: getCanonicalUnitName(tr.name) }));

  // Super Troops
  const superTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      Boolean(tr.superTroopIsActive) ||
      tr.name.toLowerCase().startsWith("super ") ||
      KNOWN_SUPER_TROOP_KEYS.has(key)
    );
  });
  const superKeySet = new Set(superTroopsList.map((st) => normalizeUnitKey(st.name)));
  const activeSuperCount = superTroopsList.filter((st) => Boolean(st.superTroopIsActive)).length;

  // Siege Machines
  const siegesList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return !superKeySet.has(key) && SIEGE_MACHINE_KEYS.has(key);
  });
  const siegeKeySet = new Set(siegesList.map((sm) => normalizeUnitKey(sm.name)));

  // Dark Troops
  const darkTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      !superKeySet.has(key) &&
      !siegeKeySet.has(key) &&
      !KNOWN_PET_KEYS.has(key) &&
      DARK_TROOP_KEYS.has(key)
    );
  });
  const darkKeySet = new Set(darkTroopsList.map((dt) => normalizeUnitKey(dt.name)));

  // Standard Elixir Troops
  const elixirTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      !superKeySet.has(key) &&
      !siegeKeySet.has(key) &&
      !darkKeySet.has(key) &&
      !KNOWN_PET_KEYS.has(key)
    );
  });

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

            <div className="mt-2 text-center space-y-0.5">
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                {t.common.townHall}
              </div>
              <div className="game-text-stroke text-xl font-black text-white tabular-nums">
                {fmtTemplate(t.clan.levelBadge, { level: fmtNum(player.townHallLevel) })}
              </div>
              {player.townHallWeaponLevel !== undefined && player.townHallWeaponLevel > 1 && (
                <div className="text-xs font-bold text-amber-300 tabular-nums">
                  {fmtTemplate(t.player.weaponLevel, {
                    level: fmtNum(player.townHallWeaponLevel),
                  })}
                </div>
              )}
            </div>

            {/* Action: Transfer to Ore Calculator */}
            {onImportPlayerToOre && (
              <div className="pt-3 w-full max-w-[280px]">
                <GameButton
                  variant={importedFlash ? "green" : "gold"}
                  size="sm"
                  onClick={handleTransferToOre}
                  className="w-full min-h-[44px] text-xs font-bold"
                  icon={
                    importedFlash ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )
                  }
                >
                  {t.player.sendToOre}
                </GameButton>
              </div>
            )}
          </SectionPanel>

          {/* Heroes Section (with active equipped equipment) */}
          {homeHeroes.length > 0 && (
            <SectionPanel
              title={t.player.battleHeroes}
              icon={<Crown size={18} className="text-amber-400" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, { count: fmtNum(homeHeroes.length) })}
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
                      className="bg-[#2B1F16]/80 rounded-xl p-2.5 border border-amber-400/20 flex items-center gap-2.5 shadow-sm"
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
                        <div className="text-xs text-amber-200/90 font-semibold tabular-nums mb-1.5">
                          {isMax
                            ? `${t.common.max} · ${fmtNum(hero.level)}/${fmtNum(hero.maxLevel)}`
                            : `${t.common.levelShort} ${fmtNum(hero.level)} / ${fmtNum(hero.maxLevel)}`}
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
                          <div className="text-xs text-stone-300">{t.common.noData}</div>
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
              title={t.player.pets}
              icon={<Sparkles size={18} className="text-amber-300" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, { count: fmtNum(petsList.length) })}
                </span>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-2">
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
          {/* Troops (Elixir & Dark Elixir) */}
          {(elixirTroopsList.length > 0 || darkTroopsList.length > 0) && (
            <SectionPanel
              title={t.player.armyTroopsTitle}
              icon={<Swords size={18} className="text-amber-400" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, {
                    count: fmtNum(elixirTroopsList.length + darkTroopsList.length),
                  })}
                </span>
              }
            >
              <div className="space-y-4">
                {/* Elixir Troops */}
                {elixirTroopsList.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-amber-100 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-rose-200/60" aria-hidden="true" />
                      <span>{t.player.elixirTroops}</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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
                  <div className="pt-3 border-t border-white/15">
                    <div className="text-xs font-bold text-amber-100 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-700 border border-amber-400/70" aria-hidden="true" />
                      <span>{t.player.darkTroops}</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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

          {/* Spells */}
          {spellsList.length > 0 && (
            <SectionPanel
              title={t.player.spells}
              icon={<Zap size={18} className="text-amber-400" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, { count: fmtNum(spellsList.length) })}
                </span>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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

          {/* Siege Machines */}
          {siegesList.length > 0 && (
            <SectionPanel
              title={t.player.siegeMachines}
              icon={<Layers size={18} className="text-emerald-400" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, { count: fmtNum(siegesList.length) })}
                </span>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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

          {/* Unlocked Hero Equipment */}
          {heroEquipmentList.length > 0 && (
            <SectionPanel
              title={t.player.heroesAndEquipment}
              icon={<Shield size={18} className="text-amber-400" aria-hidden="true" />}
              rightBadge={
                <span className="text-xs font-bold text-amber-200 tabular-nums">
                  {fmtTemplate(t.meta.recordsCount, { count: fmtNum(heroEquipmentList.length) })}
                </span>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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

          {/* Super Troops (active highlighted with crisp warm amber-gold badge) */}
          {superTroopsList.length > 0 && (
            <SectionPanel
              title={t.player.superTroops}
              icon={<Flame size={18} className="text-amber-400" aria-hidden="true" />}
              rightBadge={
                <div className="flex items-center gap-2">
                  {activeSuperCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/45 tabular-nums">
                      {t.player.activeBadge} ({fmtNum(activeSuperCount)})
                    </span>
                  )}
                  <span className="text-xs font-bold text-amber-200 tabular-nums">
                    {fmtTemplate(t.meta.recordsCount, { count: fmtNum(superTroopsList.length) })}
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {superTroopsList.map((st) => {
                  const isActive = Boolean(st.superTroopIsActive);
                  return (
                    <div key={st.name} className="flex flex-col items-center gap-1">
                      <IconFrame
                        name={st.name}
                        level={st.level}
                        maxLevel={st.maxLevel}
                        size="unit"
                        tileType="super"
                        className={
                          isActive
                            ? "ring-2 ring-amber-400/85 rounded-lg"
                            : undefined
                        }
                      />
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/25 text-amber-200 border border-amber-400/45 leading-none">
                          {t.player.activeBadge}
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
