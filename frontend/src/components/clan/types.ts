export type ClanRole = "leader" | "coLeader" | "admin" | "member";

export interface ClanBadgeUrls {
  small?: string;
  medium?: string;
  large?: string;
}

export interface ClanLabel {
  id: number;
  name: string;
  iconUrls?: {
    small?: string;
    medium?: string;
  };
}

export interface ClanLocation {
  id?: number;
  name?: string;
  isCountry?: boolean;
  countryCode?: string;
}

export interface ClanChatLanguage {
  id?: number;
  name?: string;
  languageCode?: string;
}

export interface ClanWarLeague {
  id?: number;
  name?: string;
}

export interface ClanCapitalLeague {
  id?: number;
  name?: string;
}

export interface ClanMemberLeague {
  id?: number;
  name?: string;
  iconUrls?: {
    small?: string;
    tiny?: string;
    medium?: string;
    large?: string;
  };
}

export interface ClanMember {
  tag: string;
  name: string;
  role: ClanRole | string;
  expLevel?: number;
  townHallLevel?: number;
  trophies: number;
  builderBaseTrophies?: number;
  clanRank?: number;
  previousClanRank?: number;
  donations?: number;
  donationsReceived?: number;
  league?: ClanMemberLeague;
  leagueTier?: ClanMemberLeague;
  builderBaseLeague?: ClanMemberLeague;
}

export interface ClanDetails {
  tag: string;
  name: string;
  type?: "open" | "inviteOnly" | "closed" | string;
  description?: string;
  clanLevel: number;
  clanPoints?: number;
  clanBuilderBasePoints?: number;
  clanCapitalPoints?: number;
  capitalLeague?: ClanCapitalLeague;
  requiredTrophies?: number;
  requiredTownhallLevel?: number;
  requiredBuilderBaseTrophies?: number;
  warFrequency?: string;
  warWinStreak?: number;
  warWins?: number;
  warTies?: number;
  warLosses?: number;
  isWarLogPublic?: boolean;
  warLeague?: ClanWarLeague;
  members: number;
  labels?: ClanLabel[];
  location?: ClanLocation;
  chatLanguage?: ClanChatLanguage;
  badgeUrls?: ClanBadgeUrls;
  memberList?: ClanMember[];
}

export type ClanSortField = "trophies" | "donations" | "donationsReceived" | "name";

export interface ClanSortOption {
  id: ClanSortField;
  label: string;
}

export type ClanVillageTab = "home" | "builderBase" | "capital";

export interface ClanDetailsViewProps {
  clan?: ClanDetails | null;
  clanTag?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  highlightPlayerTag?: string | null;
  onSelectPlayer?: (playerTag: string) => void;
  onScoutClanInCwl?: (clanTag: string) => void;
  onOpenWarLog?: (clanTag: string) => void;
  onRefresh?: () => void;
  className?: string;
}
