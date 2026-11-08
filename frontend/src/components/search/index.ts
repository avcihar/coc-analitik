export { default as PlayerSearchView } from "./PlayerSearchView";
export type { PlayerSearchViewProps } from "./PlayerSearchView";

export { default as ClanSearchView } from "./ClanSearchView";
export type { ClanSearchViewProps, ClanSearchItemData } from "./ClanSearchView";

export { default as SearchHubView } from "./SearchHubView";
export type { SearchHubViewProps, SearchTabType } from "./SearchHubView";

export {
  normalizeTag,
  formatDisplayTag,
  isValidTag,
  looksLikeTag,
  getRecentPlayerSearches,
  saveRecentPlayerSearch,
  removeRecentPlayerSearch,
  clearRecentPlayerSearches,
  getRecentClanSearches,
  saveRecentClanSearch,
  removeRecentClanSearch,
  clearRecentClanSearches,
  type RecentPlayerSearchItem,
  type RecentClanSearchItem,
} from "./searchUtils";
