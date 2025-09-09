export interface LeaderboardPlayer {
  gameId: string;
  userId: string | null;
  rlUserId: number;
  userName: string;
  avatarUrl: string;
  playerNumber: number | null;
  elo: number;
  eloRating: number;
  eloHighest: number;
  rank: number;
  rankTotal: number;
  region: string;
  wins: number;
  winPercent: number;
  losses: number;
  winStreak: number;
  totalGames: number;
  rankLevel: string;
  rankIcon: string;
  leaderboardKey: string;
}

export interface LeaderboardResponse {
  id: string;
  count: number;
  gameId: string | null;
  leaderboardId: number;
  region: number;
  lastUpdated: string;
  items: LeaderboardPlayer[];
  isEvent: boolean;
  compressedItems: any | null;
}

export interface LeaderboardRequest {
  consoleMatchType: number;
  count: number;
  matchType: string;
  page: number;
  region: string;
  searchPlayer: string;
  sortColumn: string;
  sortDirection: string;
}

export interface MatchListItem {
  gameId: string | null;
  matchId: string;
  profileId: number;
  userName: string | null;
  avatarUrl: string | null;
  dateTime: string;
  matchLength: number;
  playerCount: number;
  victoryResultID: number;
  mapType: string;
  civilizationID: number;
  civilization: string;
  winLoss: string;
}

export interface MatchListResponse {
  matchList: MatchListItem[];
  totalMatches: number;
}

export interface MatchListRequest {
  gamertag: string;
  playerNumber: number;
  game: string;
  profileId: number;
  sortColumn: string;
  sortDirection: string;
  page: number;
  recordCount: number;
  matchType: string;
}

export interface ProcessedMatch {
  matchId: string;
  winningPlayer: string;
  winningPlayerAvatar: string;
  matchDate: string;
  civilization: string;
  mapType: string;
  profileId: number;
}

export interface MatchDataCache {
  matches: ProcessedMatch[];
  lastFetchDate: string;
  totalMatches: number;
}
