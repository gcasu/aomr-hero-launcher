import { Injectable } from '@angular/core';
import { LeaderboardService } from './leaderboard.service';
import { 
  LeaderboardPlayer, 
  MatchListItem, 
  ProcessedMatch, 
  MatchDataCache,
  LeaderboardSnapshot,
  LeaderboardPlayerSnapshot
} from '../interfaces/leaderboard.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatchDataFetcherService {
  private readonly CACHE_KEY = 'matchData';
  private readonly CACHE_TIMEOUT = 30 * 60 * 1000; // 30 minutes cache timeout
  private readonly REQUEST_DELAY = 100; // 100ms delay between requests
  private readonly MAX_MATCHES = 1000; // Maximum total matches to store
  private readonly MAX_DAYS_OLD = 30; // Maximum age of matches in days
  
  // Configurable for dev/test - can be set via environment or config
  private topPlayersCount = 100; // Default to 100, can be reduced for testing

  constructor(private leaderboardService: LeaderboardService) {}

  /**
   * Sets the number of top players to fetch (for dev/test purposes)
   */
  setTopPlayersCount(count: number): void {
    this.topPlayersCount = count;
  }

  /**
   * Main method to fetch match data with smart caching
   */
  async fetchMatchDataIfNeeded(): Promise<void> {
    try {
      const cachedData = this.getCachedData();
      
      // Check if we're within the cache window
      if (this.isWithinCacheWindow(cachedData)) {
        console.log('Match data fetch not needed - within 30 minute cache window');
        return;
      }

      console.log(`Starting smart match data fetch for top ${this.topPlayersCount} players`);
      
      // Get current leaderboard
      const currentLeaderboard = await this.fetchCurrentLeaderboard();
      
      if (!cachedData?.leaderboardSnapshot) {
        // First time - fetch all players
        console.log('No cached leaderboard found - fetching all players');
        await this.fetchAllPlayerMatches(currentLeaderboard, cachedData);
      } else {
        // Compare leaderboards and fetch only changed players
        console.log('Comparing leaderboards for differential update');
        await this.fetchChangedPlayerMatches(currentLeaderboard, cachedData);
      }

      console.log('Smart match data fetch completed successfully');
    } catch (error) {
      console.error('Error during match data fetch:', error);
    }
  }

  /**
   * Check if we're within the 15-minute cache window
   */
  private isWithinCacheWindow(cachedData: MatchDataCache | null): boolean {
    if (!cachedData?.lastLeaderboardCheck) return false;

    const lastCheckTime = new Date(cachedData.lastLeaderboardCheck).getTime();
    const now = Date.now();
    return (now - lastCheckTime) < this.CACHE_TIMEOUT;
  }

  /**
   * Fetch current leaderboard data
   */
  private async fetchCurrentLeaderboard(): Promise<LeaderboardPlayer[]> {
    const leaderboardRequest = this.leaderboardService.getDefaultLeaderboardRequest();
    leaderboardRequest.count = this.topPlayersCount;
    
    const leaderboardResponse = await firstValueFrom(
      this.leaderboardService.getLeaderboard(leaderboardRequest)
    );

    return leaderboardResponse.items;
  }

  /**
   * Fetch matches for all players (first time or full refresh)
   */
  private async fetchAllPlayerMatches(players: LeaderboardPlayer[], cachedData: MatchDataCache | null): Promise<void> {
    console.log(`Fetching matches for all ${players.length} players`);
    
    const allMatches: ProcessedMatch[] = [];
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      try {
        const playerMatches = await this.fetchPlayerMatches(player);
        allMatches.push(...playerMatches);
        
        console.log(`Processed player ${i + 1}/${players.length}: ${player.userName} (${playerMatches.length} wins)`);
        
        // Add delay between requests (except for the last one)
        if (i < players.length - 1) {
          await this.delay(this.REQUEST_DELAY);
        }
      } catch (error) {
        console.error(`Error fetching matches for player ${player.userName}:`, error);
        // Continue with next player even if one fails
      }
    }

    // Merge with existing data and save
    await this.saveMatchData(allMatches, players, cachedData);
  }

  /**
   * Fetch matches only for players whose ELO has changed
   */
  private async fetchChangedPlayerMatches(currentPlayers: LeaderboardPlayer[], cachedData: MatchDataCache): Promise<void> {
    const changedPlayers = this.findChangedPlayers(currentPlayers, cachedData.leaderboardSnapshot!);
    
    if (changedPlayers.length === 0) {
      console.log('No players with ELO changes found - updating leaderboard snapshot only');
      await this.updateLeaderboardSnapshot(currentPlayers, cachedData);
      return;
    }

    console.log(`Fetching matches for ${changedPlayers.length} players with ELO changes`);
    
    const newMatches: ProcessedMatch[] = [];
    
    for (let i = 0; i < changedPlayers.length; i++) {
      const player = changedPlayers[i];
      
      try {
        const playerMatches = await this.fetchPlayerMatches(player);
        newMatches.push(...playerMatches);
        
        console.log(`Processed changed player ${i + 1}/${changedPlayers.length}: ${player.userName} (${playerMatches.length} wins)`);
        
        // Add delay between requests (except for the last one)
        if (i < changedPlayers.length - 1) {
          await this.delay(this.REQUEST_DELAY);
        }
      } catch (error) {
        console.error(`Error fetching matches for player ${player.userName}:`, error);
        // Continue with next player even if one fails
      }
    }

    // Merge with existing data and save
    await this.saveMatchData(newMatches, currentPlayers, cachedData);
  }

  /**
   * Find players whose ELO has changed
   */
  private findChangedPlayers(currentPlayers: LeaderboardPlayer[], previousSnapshot: LeaderboardSnapshot): LeaderboardPlayer[] {
    const previousPlayersMap = new Map<number, LeaderboardPlayerSnapshot>();
    previousSnapshot.players.forEach(player => {
      previousPlayersMap.set(player.rlUserId, player);
    });

    const changedPlayers: LeaderboardPlayer[] = [];

    for (const currentPlayer of currentPlayers) {
      const previousPlayer = previousPlayersMap.get(currentPlayer.rlUserId);
      
      if (!previousPlayer || previousPlayer.elo !== currentPlayer.elo) {
        changedPlayers.push(currentPlayer);
        
        if (previousPlayer) {
          console.log(`ELO change detected for ${currentPlayer.userName}: ${previousPlayer.elo} → ${currentPlayer.elo}`);
        } else {
          console.log(`New player detected: ${currentPlayer.userName} (${currentPlayer.elo} ELO)`);
        }
      }
    }

    return changedPlayers;
  }

  /**
   * Update only the leaderboard snapshot without fetching matches
   */
  private async updateLeaderboardSnapshot(currentPlayers: LeaderboardPlayer[], cachedData: MatchDataCache): Promise<void> {
    const updatedCache: MatchDataCache = {
      ...cachedData,
      leaderboardSnapshot: this.createLeaderboardSnapshot(currentPlayers),
      lastLeaderboardCheck: new Date().toISOString()
    };

    this.saveCachedData(updatedCache);
    console.log('Updated leaderboard snapshot without fetching new matches');
  }

  /**
   * Save match data with updated leaderboard snapshot
   */
  private async saveMatchData(newMatches: ProcessedMatch[], currentPlayers: LeaderboardPlayer[], cachedData: MatchDataCache | null): Promise<void> {
    // Merge with existing matches
    const existingMatches = cachedData?.matches || [];
    const combinedMatches = this.mergeMatches(existingMatches, newMatches);
    
    // Filter out games older than MAX_DAYS_OLD days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_DAYS_OLD);
    
    const recentMatches = combinedMatches
      .filter(match => new Date(match.matchDate).getTime() >= cutoffDate.getTime());
    
    // Limit to MAX_MATCHES (keep most recent)
    const finalMatches = recentMatches
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, this.MAX_MATCHES);

    // Create updated cache
    const updatedCache: MatchDataCache = {
      matches: finalMatches,
      lastFetchDate: new Date().toISOString(),
      totalMatches: finalMatches.length,
      leaderboardSnapshot: this.createLeaderboardSnapshot(currentPlayers),
      lastLeaderboardCheck: new Date().toISOString()
    };

    this.saveCachedData(updatedCache);
    console.log(`Saved ${finalMatches.length} total matches to cache (filtered by ${this.MAX_DAYS_OLD}-day window and ${this.MAX_MATCHES} limit) with updated leaderboard snapshot`);
  }

  /**
   * Create a leaderboard snapshot
   */
  private createLeaderboardSnapshot(players: LeaderboardPlayer[]): LeaderboardSnapshot {
    return {
      players: players.map(player => ({
        rlUserId: player.rlUserId,
        userName: player.userName,
        elo: player.elo,
        rank: player.rank
      })),
      fetchDate: new Date().toISOString()
    };
  }

  /**
   * Fetch top players and their match lists (legacy method - kept for compatibility)
   */
  private async fetchAndStoreMatchData(): Promise<void> {
    // This method is now handled by the smart caching logic
    await this.fetchMatchDataIfNeeded();
  }

  /**
   * Fetch matches for a single player
   */
  private async fetchPlayerMatches(player: LeaderboardPlayer): Promise<ProcessedMatch[]> {
    const matchRequest = this.leaderboardService.getDefaultMatchListRequest(
      player.userName,
      player.rlUserId
    );

    const matchResponse = await firstValueFrom(
      this.leaderboardService.getMatchList(matchRequest)
    );

    // Filter only wins and process
    const winMatches = matchResponse.matchList.filter(match => match.winLoss === 'Win');
    
    return winMatches.map(match => this.processMatch(match, player));
  }

  /**
   * Process a single match item
   */
  private processMatch(match: MatchListItem, player: LeaderboardPlayer): ProcessedMatch {
    return {
      matchId: match.matchId,
      winningPlayer: player.userName,
      winningPlayerAvatar: player.avatarUrl,
      matchDate: match.dateTime,
      civilization: match.civilization,
      mapType: match.mapType,
      profileId: player.rlUserId
    };
  }

  /**
   * Merge new matches with existing ones, removing duplicates
   */
  private mergeMatches(existing: ProcessedMatch[], newMatches: ProcessedMatch[]): ProcessedMatch[] {
    const existingMatchIds = new Set(existing.map(match => match.matchId));
    const uniqueNewMatches = newMatches.filter(match => !existingMatchIds.has(match.matchId));
    
    return [...existing, ...uniqueNewMatches];
  }

  /**
   * Get cached match data
   */
  getCachedData(): MatchDataCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading cached match data:', error);
      return null;
    }
  }

  /**
   * Save match data to cache
   */
  private saveCachedData(data: MatchDataCache): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving match data to cache:', error);
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Utility method for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): { totalMatches: number; lastFetchDate: string | null; needsFetch: boolean; lastLeaderboardCheck: string | null } {
    const cached = this.getCachedData();
    return {
      totalMatches: cached?.totalMatches || 0,
      lastFetchDate: cached?.lastFetchDate || null,
      lastLeaderboardCheck: cached?.lastLeaderboardCheck || null,
      needsFetch: !this.isWithinCacheWindow(cached)
    };
  }
}
