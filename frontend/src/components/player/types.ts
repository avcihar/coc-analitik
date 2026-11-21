import type { DecodedArmyShare } from "@/lib/armyLink";

export interface ImportedEquipmentItem {
  name: string;
  level: number;
  maxLevel: number;
  rarity: "Common" | "Epic" | string;
  hero?: string;
  village?: string;
}

export interface ImportedHeroItem {
  name: string;
  level: number;
  maxLevel: number;
  thMaxLevel?: number;
  village?: string;
  equipment?: ImportedEquipmentItem[];
}

export interface UnitItem {
  name: string;
  level: number;
  maxLevel: number;
  thMaxLevel?: number;
  village?: string;
  superTroopIsActive?: boolean;
}

export interface ImportedPlayerForOre {
  tag: string;
  name: string;
  townHallLevel: number;
  leagueTierId?: number;
  leagueName: string;
  trophies: number;
  heroes: {
    name: string;
    level: number;
    maxLevel: number;
    equipment: ImportedEquipmentItem[];
    village?: string;
  }[];
  heroEquipment: ImportedEquipmentItem[];
}

export interface PlayerLabel {
  id?: number;
  name?: string;
  iconUrls?: {
    small?: string;
    medium?: string;
  };
}

export interface PlayerClanInfo {
  tag: string;
  name: string;
  clanLevel?: number;
  badgeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

export interface PlayerLeagueInfo {
  id?: number;
  name?: string;
  iconUrls?: {
    small?: string;
    tiny?: string;
    medium?: string;
  };
}

export interface SeasonStats {
  id?: string;
  rank?: number;
  trophies?: number;
}

export interface LegendStatistics {
  legendTrophies: number;
  previousSeason?: SeasonStats;
  bestSeason?: SeasonStats;
  currentSeason?: SeasonStats;
  bestVersusSeason?: SeasonStats;
}

export interface PlayerProfileViewData extends ImportedPlayerForOre {
  townHallWeaponLevel?: number;
  expLevel?: number;
  bestTrophies: number;
  warStars: number;
  attackWins?: number;
  defenseWins?: number;
  donations?: number;
  donationsReceived?: number;
  role?: string;
  warPreference?: string;
  clanCapitalContributions?: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;
  builderBaseLeague?: {
    id?: number;
    name?: string;
  };
  clan?: PlayerClanInfo;
  league?: PlayerLeagueInfo;
  leagueTier?: PlayerLeagueInfo;
  originalLeagueName?: string;
  currentLeagueGroupTag?: string;
  currentLeagueSeasonId?: string | number;
  previousLeagueGroupTag?: string;
  previousLeagueSeasonId?: string | number;
  labels?: PlayerLabel[];
  legendStatistics?: LegendStatistics;
  pets: UnitItem[];
  troops: UnitItem[];
  spells: UnitItem[];
  builderHeroes?: UnitItem[];
}

export interface BattleLogEntry {
  battleType?: string;
  attack?: boolean;
  armyShareCode?: string;
  opponentPlayerTag?: string;
  opponentTag?: string;
  opponentName?: string;
  opponentTownHallLevel?: number;
  stars?: number;
  destructionPercentage?: number;
  trophyChange?: number;
  armyLink?: string;
  decodedArmy?: DecodedArmyShare;
}

export interface LeagueGroupMember {
  playerTag: string;
  playerName: string;
  clanTag?: string;
  clanName?: string;
  leagueTrophies: number;
  attackWinCount: number;
  attackLoseCount: number;
  defenseWinCount: number;
  defenseLoseCount: number;
  rank: number;
  attackTotal: number;
  attackWinRate: number;
  defenseTotal: number;
  defenseWinRate: number;
  isCurrentPlayer: boolean;
}

export interface LeagueGroupLogEntry {
  stars?: number;
  destructionPercentage?: number;
  attackerTag?: string;
  attackerName?: string;
  defenderTag?: string;
  defenderName?: string;
  trophies?: number;
  trophyChange?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface LeagueGroupData {
  available: boolean;
  reason?: string;
  playerTag: string;
  groupTag?: string;
  seasonId?: string | number;
  isPreviousSeason?: boolean;
  hasCurrent: boolean;
  hasPrevious: boolean;
  leagueTier?: PlayerLeagueInfo;
  totalMembers?: number;
  members: LeagueGroupMember[];
  attackLogs: LeagueGroupLogEntry[];
  defenseLogs: LeagueGroupLogEntry[];
}
