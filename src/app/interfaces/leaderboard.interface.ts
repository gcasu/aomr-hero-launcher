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
