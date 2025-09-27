import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface DodBuildOrder {
  godName: string;
  fileName: string;
  fileUrl: string;
  cached: boolean;
  cacheKey: string;
  size?: number;
  lastFetched?: Date;
  data?: ArrayBuffer;
  error?: string;
}

export interface DodBuildOrdersCache {
  [godName: string]: {
    data: ArrayBuffer;
    lastFetched: Date;
    size: number;
    fileName: string;
    fileUrl: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DodBuildOrdersService {
  private readonly DOD_BASE_URL = 'https://thedodclan.com/assets/BOs';
  private readonly CACHE_KEY_PREFIX = 'dodBuildOrders';
  private readonly CACHE_TIMEOUT = 120 * 60 * 60 * 1000; // 120 hours cache timeout

  constructor(private http: HttpClient) {}

  /**
   * Get all cached build order god names
   * Returns gods that currently have cached build orders
   */
  getCachedGodNames(): string[] {
    const cachedGods: string[] = [];
    
    // Scan localStorage for DoD build order cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.CACHE_KEY_PREFIX + '_')) {
        const godName = key.replace(this.CACHE_KEY_PREFIX + '_', '');
        cachedGods.push(godName);
      }
    }
    
    return cachedGods;
  }

  /**
   * Get build order for a specific god
   */
  getBuildOrder(godName: string): Observable<DodBuildOrder> {
    const normalizedGodName = this.normalizeGodName(godName);
    
    if (!this.isGodAvailable(normalizedGodName)) {
      return throwError(() => new Error(`Build orders not available for god: ${godName}`));
    }

    const cacheKey = this.getCacheKey(normalizedGodName);
    const cached = this.getCachedBuildOrder(cacheKey);
    
    if (cached && this.isCacheValid(cached.lastFetched)) {
      return of({
        godName: normalizedGodName,
        fileName: cached.fileName,
        fileUrl: cached.fileUrl,
        cached: true,
        cacheKey,
        size: cached.size,
        lastFetched: cached.lastFetched,
        data: cached.data
      });
    }

    // Fetch from DoD clan website
    return this.fetchBuildOrderFromWeb(normalizedGodName);
  }

  /**
   * Get all cached build orders
   */
  getAllCachedBuildOrders(): DodBuildOrder[] {
    const cached: DodBuildOrder[] = [];
    const cachedGodNames = this.getCachedGodNames();
    
    cachedGodNames.forEach(godName => {
      const cacheKey = this.getCacheKey(godName);
      const cachedData = this.getCachedBuildOrder(cacheKey);
      
      if (cachedData) {
        cached.push({
          godName,
          fileName: cachedData.fileName,
          fileUrl: cachedData.fileUrl,
          cached: true,
          cacheKey,
          size: cachedData.size,
          lastFetched: cachedData.lastFetched,
          data: cachedData.data
        });
      }
    });
    
    return cached;
  }

  /**
   * Clear all cached build orders
   */
  clearAllCache(): void {
    const cachedGodNames = this.getCachedGodNames();
    cachedGodNames.forEach(godName => {
      const cacheKey = this.getCacheKey(godName);
      localStorage.removeItem(cacheKey);
    });
  }

  /**
   * Clear cache for specific god
   */
  clearGodCache(godName: string): void {
    const normalizedGodName = this.normalizeGodName(godName);
    const cacheKey = this.getCacheKey(normalizedGodName);
    localStorage.removeItem(cacheKey);
  }

  /**
   * Get cache size in bytes for all build orders
   */
  getCacheSize(): number {
    let totalSize = 0;
    const cachedGodNames = this.getCachedGodNames();
    
    cachedGodNames.forEach(godName => {
      const cacheKey = this.getCacheKey(godName);
      const cached = this.getCachedBuildOrder(cacheKey);
      if (cached) {
        totalSize += cached.size;
      }
    });
    
    return totalSize;
  }

  /**
   * Get cache info for settings display
   */
  getCacheInfo(): { count: number; size: number; lastUpdated?: Date } {
    const cached = this.getAllCachedBuildOrders();
    let totalSize = 0;
    let lastUpdated: Date | undefined;
    
    cached.forEach(item => {
      totalSize += item.size || 0;
      if (item.lastFetched && (!lastUpdated || item.lastFetched > lastUpdated)) {
        lastUpdated = item.lastFetched;
      }
    });
    
    return {
      count: cached.length,
      size: totalSize,
      lastUpdated
    };
  }

  /**
   * Check if build orders are available for a god
   * This now simply allows any god name - availability will be determined by the actual HTTP request
   */
  isGodAvailable(godName: string): boolean {
    return Boolean(godName && godName.trim().length > 0);
  }

  /**
   * Fetch build order from DoD clan website
   */
  private fetchBuildOrderFromWeb(godName: string): Observable<DodBuildOrder> {
    const fileName = `${godName}.xlsx`;
    const fileUrl = `${this.DOD_BASE_URL}/${fileName}`;
    const cacheKey = this.getCacheKey(godName);
    
    return this.http.get(fileUrl, { responseType: 'arraybuffer' }).pipe(
      map((data: ArrayBuffer) => {
        const buildOrder: DodBuildOrder = {
          godName,
          fileName,
          fileUrl,
          cached: false,
          cacheKey,
          size: data.byteLength,
          lastFetched: new Date(),
          data
        };
        
        // Cache the data
        this.cacheBuildOrder(cacheKey, {
          data,
          lastFetched: buildOrder.lastFetched!,
          size: data.byteLength,
          fileName,
          fileUrl
        });
        
        return buildOrder;
      }),
      catchError((error) => {
        console.error(`Failed to fetch build order for ${godName}:`, error);
        return throwError(() => ({
          godName,
          fileName,
          fileUrl,
          cached: false,
          cacheKey,
          error: `Failed to fetch build order: ${error.message || 'Unknown error'}`
        }));
      })
    );
  }

  /**
   * Get cached build order data
   */
  private getCachedBuildOrder(cacheKey: string): DodBuildOrdersCache[string] | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      
      // Convert base64 back to ArrayBuffer
      if (parsed.data && typeof parsed.data === 'string') {
        const binaryString = atob(parsed.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        parsed.data = bytes.buffer;
      }
      
      // Convert date string back to Date object
      if (parsed.lastFetched) {
        parsed.lastFetched = new Date(parsed.lastFetched);
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading cached build order:', error);
      return null;
    }
  }

  /**
   * Cache build order data
   */
  private cacheBuildOrder(cacheKey: string, data: DodBuildOrdersCache[string]): void {
    try {
      // Convert ArrayBuffer to base64 for JSON storage
      const bytes = new Uint8Array(data.data);
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);
      
      const cacheData = {
        ...data,
        data: base64Data
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching build order:', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(lastFetched: Date): boolean {
    const now = new Date();
    return (now.getTime() - lastFetched.getTime()) < this.CACHE_TIMEOUT;
  }

  /**
   * Generate cache key for a god
   */
  private getCacheKey(godName: string): string {
    return `${this.CACHE_KEY_PREFIX}_${this.normalizeGodName(godName)}`;
  }

  /**
   * Normalize god name for consistent usage
   */
  private normalizeGodName(godName: string): string {
    return godName.charAt(0).toUpperCase() + godName.slice(1).toLowerCase();
  }
}