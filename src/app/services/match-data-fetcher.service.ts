import { Injectable } from '@angular/core';
import { LeaderboardService } from './leaderboard.service';
import { 
  LeaderboardPlayer, 
  MatchListItem, 
  ProcessedMatch, 
  MatchDataCache 
} from '../interfaces/leaderboard.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatchDataFetcherService {
  private readonly CACHE_KEY = 'matchData';
  private readonly TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly REQUEST_DELAY = 100; // 100ms delay between requests
  private readonly MAX_MATCHES = 1000; // Maximum total matches to store
  
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
   * Main method to fetch match data if needed
   */
  async fetchMatchDataIfNeeded(): Promise<void> {
    try {
      if (!this.shouldFetch()) {
        console.log('Match data fetch not needed - within 24h window');
        return;
      }

      console.log(`Starting match data fetch for top ${this.topPlayersCount} players`);
      await this.fetchAndStoreMatchData();
      console.log('Match data fetch completed successfully');
    } catch (error) {
      console.error('Error during match data fetch:', error);
    }
  }

  /**
   * Check if we should fetch data (24h window)
   */
  private shouldFetch(): boolean {
    const cachedData = this.getCachedData();
    if (!cachedData) return true;

    const lastFetchTime = new Date(cachedData.lastFetchDate).getTime();
    const now = Date.now();
    return (now - lastFetchTime) > this.TWENTY_FOUR_HOURS;
  }

  /**
   * Fetch top players and their match lists
   */
  private async fetchAndStoreMatchData(): Promise<void> {
    // Get top players from leaderboard
    const leaderboardRequest = this.leaderboardService.getDefaultLeaderboardRequest();
    leaderboardRequest.count = this.topPlayersCount;
    
    const leaderboardResponse = await firstValueFrom(
      this.leaderboardService.getLeaderboard(leaderboardRequest)
    );

    const topPlayers = leaderboardResponse.items;
    console.log(`Fetched ${topPlayers.length} top players`);

    // Fetch matches for each player with delay
    const allMatches: ProcessedMatch[] = [];
    
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      
      try {
        const playerMatches = await this.fetchPlayerMatches(player);
        allMatches.push(...playerMatches);
        
        console.log(`Processed player ${i + 1}/${topPlayers.length}: ${player.userName} (${playerMatches.length} wins)`);
        
        // Add delay between requests (except for the last one)
        if (i < topPlayers.length - 1) {
          await this.delay(this.REQUEST_DELAY);
        }
      } catch (error) {
        console.error(`Error fetching matches for player ${player.userName}:`, error);
        // Continue with next player even if one fails
      }
    }

    // Merge with existing data and limit to MAX_MATCHES
    const existingData = this.getCachedData();
    const existingMatches = existingData?.matches || [];
    
    // Combine and remove duplicates based on matchId
    const combinedMatches = this.mergeMatches(existingMatches, allMatches);
    
    // Limit to MAX_MATCHES (keep most recent)
    const finalMatches = combinedMatches
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, this.MAX_MATCHES);

    // Save to cache
    const cacheData: MatchDataCache = {
      matches: finalMatches,
      lastFetchDate: new Date().toISOString(),
      totalMatches: finalMatches.length
    };

    this.saveCachedData(cacheData);
    console.log(`Saved ${finalMatches.length} total matches to cache`);
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
  getCacheStats(): { totalMatches: number; lastFetchDate: string | null; needsFetch: boolean } {
    const cached = this.getCachedData();
    return {
      totalMatches: cached?.totalMatches || 0,
      lastFetchDate: cached?.lastFetchDate || null,
      needsFetch: this.shouldFetch()
    };
  }
}
