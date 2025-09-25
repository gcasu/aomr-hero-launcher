import { Injectable } from '@angular/core';
import { TimelineSegment } from '../../shared/timeline/timeline.interfaces';
import { CachedReplay, CacheIndexEntry, CacheIndex, ReplayCacheStats } from '../../interfaces/replay-cache.interface';
import { REPLAY_CACHE_CONFIG } from '../../constants/replay-cache.constants';

@Injectable({
  providedIn: 'root'
})
export class ReplayCacheService {
  private readonly MAX_CACHE_ENTRIES = 100; // Maximum number of cached replays

  private cache: Map<string, CachedReplay> = new Map();
  private cacheDirectory: string = '';
  private isInitialized = false;

  constructor() {
    this.initializeCache();
    this.updateLocalStorageInfo();
  }

  /**
   * Get a cached replay by match ID and profile ID
   */
  getCachedReplay(matchId: string, profileId: number): CachedReplay | null {
    const key = this.getCacheKey(matchId, profileId);
    return this.cache.get(key) || null;
  }

  /**
   * Check if a replay is cached
   */
  isReplayCached(matchId: string, profileId: number): boolean {
    const key = this.getCacheKey(matchId, profileId);
    return this.cache.has(key);
  }

  /**
   * Check if a cached replay has an error (parsing failed)
   */
  hasReplayCacheError(matchId: string, profileId: number): boolean {
    const cached = this.getCachedReplay(matchId, profileId);
    return cached ? cached.hasError : false;
  }

  /**
   * Check if cached replay analysis was successful
   */
  isReplayCacheSuccessful(matchId: string, profileId: number): boolean {
    const cached = this.getCachedReplay(matchId, profileId);
    return cached ? !cached.hasError : false;
  }

  /**
   * Initialize cache directory and load index
   */
  private async initializeCache(): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn('Electron API not available, replay cache disabled');
        return;
      }

      const appPath = await window.electronAPI.getAppPath();
      this.cacheDirectory = window.electronAPI.pathJoin(appPath, REPLAY_CACHE_CONFIG.CACHE_DIR);
      
      // Ensure cache directory exists
      await window.electronAPI.ensureDirectory(this.cacheDirectory);
      
      // Load cache index
      await this.loadCacheIndex();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize replay cache:', error);
    }
  }

  /**
   * Cache a replay with all its data (successful analysis)
   */
  async cacheReplay(
    matchId: string,
    profileId: number,
    uncompressedReplayFile: File, // Always pass the uncompressed file
    parsedData: any,
    timelineData: TimelineSegment[],
    winnerPlayerName: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    const key = this.getCacheKey(matchId, profileId);
    const replayFileName = `${key}.mythrec`;
    
    // Calculate sizes
    const replayFileSize = uncompressedReplayFile.size;
    const parsedDataSize = new Blob([JSON.stringify(parsedData)]).size;
    const totalSize = replayFileSize + parsedDataSize;

    // Check if we need to make space
    await this.ensureCacheSpace(totalSize);

    try {
      // Save replay file to disk
      const replayFilePath = window.electronAPI.pathJoin(this.cacheDirectory, replayFileName);
      const arrayBuffer = await uncompressedReplayFile.arrayBuffer();
      await window.electronAPI.writeFileBuffer(replayFilePath, arrayBuffer);

      const cachedReplay: CachedReplay = {
        matchId,
        profileId,
        replayFileName,
        parsedData,
        timelineData,
        winnerPlayerName,
        cachedAt: new Date(),
        fileSize: replayFileSize,
        parsedSize: parsedDataSize,
        hasError: false
      };

      this.cache.set(key, cachedReplay);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to cache replay:', error);
      throw error;
    }
  }

  /**
   * Cache a replay that failed analysis (for download only)
   */
  async cacheFailedReplay(
    matchId: string,
    profileId: number,
    uncompressedReplayFile: File, // Always pass the uncompressed file
    errorMessage: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    const key = this.getCacheKey(matchId, profileId);
    const replayFileName = `${key}.mythrec`;
    
    // Calculate size (only replay file, no parsed data)
    const replayFileSize = uncompressedReplayFile.size;

    // Check if we need to make space
    await this.ensureCacheSpace(replayFileSize);

    try {
      // Save replay file to disk
      const replayFilePath = window.electronAPI.pathJoin(this.cacheDirectory, replayFileName);
      const arrayBuffer = await uncompressedReplayFile.arrayBuffer();
      await window.electronAPI.writeFileBuffer(replayFilePath, arrayBuffer);

      const cachedReplay: CachedReplay = {
        matchId,
        profileId,
        replayFileName,
        parsedData: null,
        timelineData: null,
        winnerPlayerName: null,
        cachedAt: new Date(),
        fileSize: replayFileSize,
        parsedSize: 0,
        hasError: true,
        errorMessage
      };

      this.cache.set(key, cachedReplay);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to cache failed replay:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ReplayCacheStats {
    const replays = Array.from(this.cache.values());
    const totalSize = replays.reduce((sum, replay) => sum + replay.fileSize + replay.parsedSize, 0);
    const dates = replays.map(r => r.cachedAt).sort();

    return {
      totalReplays: replays.length,
      totalSize,
      oldestCache: dates.length > 0 ? dates[0] : null,
      newestCache: dates.length > 0 ? dates[dates.length - 1] : null
    };
  }

  /**
   * Clear all cached replays
   */
  async clearCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    try {
      // Delete all replay files
      for (const [key, cached] of this.cache.entries()) {
        const filePath = window.electronAPI.pathJoin(this.cacheDirectory, cached.replayFileName);
        try {
          await window.electronAPI.deleteFile(filePath);
        } catch (error) {
          console.warn('Failed to delete cached file:', filePath, error);
        }
      }

      this.cache.clear();
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Remove a specific cached replay
   */
  async removeCachedReplay(matchId: string, profileId: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    const key = this.getCacheKey(matchId, profileId);
    const cached = this.cache.get(key);
    
    if (cached) {
      try {
        // Delete replay file
        const filePath = window.electronAPI.pathJoin(this.cacheDirectory, cached.replayFileName);
        await window.electronAPI.deleteFile(filePath);
      } catch (error) {
        console.warn('Failed to delete cached file:', error);
      }
    }

    this.cache.delete(key);
    await this.saveCacheIndex();
  }

  /**
   * Clean up old cache entries based on age or cache size limits
   */
  async cleanupCache(): Promise<void> {
    const replays = Array.from(this.cache.entries())
      .map(([key, replay]) => ({ key, replay }))
      .sort((a, b) => a.replay.cachedAt.getTime() - b.replay.cachedAt.getTime());

    // Remove entries if we exceed the maximum number
    while (replays.length > this.MAX_CACHE_ENTRIES) {
      const oldest = replays.shift();
      if (oldest) {
        this.cache.delete(oldest.key);
      }
    }

    // Remove entries if we exceed the maximum size
    let totalSize = this.getCacheStats().totalSize;
    let index = 0;
    while (totalSize > REPLAY_CACHE_CONFIG.MAX_CACHE_SIZE && index < replays.length) {
      const replay = replays[index];
      totalSize -= (replay.replay.fileSize + replay.replay.parsedSize);
      this.cache.delete(replay.key);
      index++;
    }

    await this.saveCacheIndex();
  }

  /**
   * Export cached replay file for download
   */
  async exportReplayFile(matchId: string, profileId: number): Promise<File | null> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    const cached = this.getCachedReplay(matchId, profileId);
    if (!cached) return null;

    try {
      // Read file from disk as binary data
      const filePath = window.electronAPI.pathJoin(this.cacheDirectory, cached.replayFileName);
      const arrayBuffer = await window.electronAPI.readFileBuffer(filePath);
      
      return new File([arrayBuffer], `match_${matchId}.mythrec`, {
        type: 'application/octet-stream'
      });
    } catch (error) {
      console.error('Failed to export replay file:', error);
      return null;
    }
  }

  /**
   * Export parsed JSON data for download
   */
  exportParsedJson(matchId: string, profileId: number): Blob | null {
    const cached = this.getCachedReplay(matchId, profileId);
    if (!cached) return null;

    const jsonData = JSON.stringify(cached.parsedData, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }

  /**
   * Format cache size for display
   */
  formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private getCacheKey(matchId: string, profileId: number): string {
    return `${matchId}_${profileId}`;
  }

  private async ensureCacheSpace(newEntrySize: number): Promise<void> {
    const stats = this.getCacheStats();
    const wouldExceedSize = (stats.totalSize + newEntrySize) > REPLAY_CACHE_CONFIG.MAX_CACHE_SIZE;
    const wouldExceedEntries = stats.totalReplays >= this.MAX_CACHE_ENTRIES;

    if (wouldExceedSize || wouldExceedEntries) {
      await this.cleanupCache();
    }
  }

  /**
   * Load cache index from file system
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = window.electronAPI.pathJoin(this.cacheDirectory, REPLAY_CACHE_CONFIG.CACHE_INDEX_FILE);
      const indexExists = await window.electronAPI.fileExists(indexPath);
      
      if (!indexExists) {
        return;
      }

      const indexContent = await window.electronAPI.readFile(indexPath);
      const cacheIndex: CacheIndex = JSON.parse(indexContent);

      // Load cache entries
      this.cache.clear();
      for (const [key, entry] of Object.entries(cacheIndex.entries)) {
        try {
          // Verify the replay file still exists
          const filePath = window.electronAPI.pathJoin(this.cacheDirectory, entry.replayFileName);
          const fileExists = await window.electronAPI.fileExists(filePath);
          
          if (fileExists) {
            const cachedReplay: CachedReplay = {
              matchId: entry.matchId,
              profileId: entry.profileId,
              replayFileName: entry.replayFileName,
              parsedData: entry.parsedData,
              timelineData: entry.timelineData,
              winnerPlayerName: entry.winnerPlayerName,
              cachedAt: new Date(entry.cachedAt),
              fileSize: entry.fileSize,
              parsedSize: entry.parsedSize,
              hasError: entry.hasError || false,
              errorMessage: entry.errorMessage
            };

            this.cache.set(key, cachedReplay);
          } else {
            console.warn('Cached file missing, removing from index:', entry.replayFileName);
          }
        } catch (entryError) {
          console.warn('Failed to load cache entry:', key, entryError);
        }
      }

      // Clean up any invalid or old entries
      await this.cleanupCache();
    } catch (error) {
      console.error('Failed to load replay cache index:', error);
      this.cache.clear();
    }
  }

  /**
   * Save cache index to file system
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      const indexPath = window.electronAPI.pathJoin(this.cacheDirectory, REPLAY_CACHE_CONFIG.CACHE_INDEX_FILE);
      
      const cacheIndex: CacheIndex = {
        entries: {},
        lastCleanup: new Date().toISOString()
      };

      // Serialize cache entries (without file data)
      for (const [key, cached] of this.cache.entries()) {
        cacheIndex.entries[key] = {
          matchId: cached.matchId,
          profileId: cached.profileId,
          replayFileName: cached.replayFileName,
          parsedData: cached.parsedData,
          timelineData: cached.timelineData,
          winnerPlayerName: cached.winnerPlayerName,
          cachedAt: cached.cachedAt.toISOString(),
          fileSize: cached.fileSize,
          parsedSize: cached.parsedSize,
          hasError: cached.hasError,
          errorMessage: cached.errorMessage
        };
      }

      await window.electronAPI.writeFile(indexPath, JSON.stringify(cacheIndex, null, 2));
      
      // Update localStorage info for settings integration
      this.updateLocalStorageInfo();
    } catch (error) {
      console.error('Failed to save replay cache index:', error);
    }
  }

  /**
   * Update localStorage with cache summary for settings page integration
   */
  private updateLocalStorageInfo(): void {
    try {
      const stats = this.getCacheStats();
      const cacheInfo = {
        totalReplays: stats.totalReplays,
        totalSize: stats.totalSize,
        lastUpdated: new Date().toISOString()
      };
      
      // Store just the summary info in localStorage for settings page
      localStorage.setItem('replay_cache', JSON.stringify(cacheInfo));
    } catch (error) {
      console.warn('Failed to update localStorage cache info:', error);
    }
  }
}