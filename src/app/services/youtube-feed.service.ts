import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap, timeout } from 'rxjs';

export interface YouTubeFeedConfig {
  channels: {
    channelId: string;
    channelTitle: string;
  }[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Date;
  videoUrl: string;
  channelTitle: string;
}

export interface YouTubeChannel {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: YouTubeVideo[];
}

@Injectable({
  providedIn: 'root'
})
export class YouTubeFeedService {
  private http = inject(HttpClient);
  private readonly CONFIG_URL = 'assets/config/youtube-feeds.json';
  
  // Cache properties
  private cachedChannels: YouTubeChannel[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

  getAllChannelFeeds(): Observable<YouTubeChannel[]> {
    // Check if cache is valid
    if (this.isCacheValid()) {
      return of(this.cachedChannels!);
    }

    return this.http.get<YouTubeFeedConfig>(this.CONFIG_URL).pipe(
      timeout(3000),
      switchMap(config => {
        if (!config.channels || config.channels.length === 0) {
          return of([]);
        }

        // Use Electron API if available, otherwise fall back to simple approach
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchYouTubeFeed === 'function') {
          return this.fetchChannelFeedsWithElectron(config.channels);
        } else {
          return this.createEmptyChannels(config.channels);
        }
      }),
      catchError(error => {
        console.error('Failed to load YouTube feed config:', error);
        return of([]);
      })
    );
  }

  private fetchChannelFeedsWithElectron(channels: { channelId: string; channelTitle: string; }[]): Observable<YouTubeChannel[]> {
    const requests = channels.map(channel => 
      this.getChannelFeedWithElectron(channel.channelId, channel.channelTitle).pipe(
        catchError(error => {
          console.error(`Failed to load feed for ${channel.channelTitle}:`, error);
          return of({
            channelId: channel.channelId,
            channelTitle: channel.channelTitle,
            channelUrl: `https://www.youtube.com/channel/${channel.channelId}`,
            videos: []
          });
        })
      )
    );

    return forkJoin(requests).pipe(
      timeout(30000), // 30 seconds total timeout
      map(channelResults => {
        // Cache results
        this.cachedChannels = channelResults;
        this.cacheTimestamp = Date.now();
        return channelResults;
      })
    );
  }

  private getChannelFeedWithElectron(channelId: string, channelTitle: string): Observable<YouTubeChannel> {
    return new Observable(observer => {
      window.electronAPI.fetchYouTubeFeed(channelId)
        .then(result => {
          if (result.success && result.data) {
            try {
              const channel = this.parseYouTubeFeed(result.data, channelId, channelTitle);
              observer.next(channel);
              observer.complete();
            } catch (parseError) {
              console.error(`Failed to parse feed for ${channelTitle}:`, parseError);
              observer.next({
                channelId,
                channelTitle,
                channelUrl: `https://www.youtube.com/channel/${channelId}`,
                videos: []
              });
              observer.complete();
            }
          } else {
            console.error(`Failed to fetch feed for ${channelTitle}:`, result.error);
            observer.next({
              channelId,
              channelTitle,
              channelUrl: `https://www.youtube.com/channel/${channelId}`,
              videos: []
            });
            observer.complete();
          }
        })
        .catch(error => {
          console.error(`Error fetching feed for ${channelTitle}:`, error);
          observer.next({
            channelId,
            channelTitle,
            channelUrl: `https://www.youtube.com/channel/${channelId}`,
            videos: []
          });
          observer.complete();
        });
    });
  }

  private createEmptyChannels(channels: { channelId: string; channelTitle: string; }[]): Observable<YouTubeChannel[]> {
    console.warn('No Electron API available, returning empty channels');
    return of(channels.map(channel => ({
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      channelUrl: `https://www.youtube.com/channel/${channel.channelId}`,
      videos: []
    })));
  }

  private isCacheValid(): boolean {
    if (!this.cachedChannels || !this.cacheTimestamp) {
      return false;
    }
    
    const now = Date.now();
    const cacheAge = now - this.cacheTimestamp;
    const isValid = cacheAge < this.CACHE_DURATION;
    
    if (!isValid) {
      this.clearCache();
    }
    
    return isValid;
  }

  public clearCache(): void {
    this.cachedChannels = null;
    this.cacheTimestamp = null;
  }

  public getCacheInfo(): { isValid: boolean; age?: number; channelCount?: number } {
    if (!this.cacheTimestamp || !this.cachedChannels) {
      return { isValid: false };
    }
    
    const age = Date.now() - this.cacheTimestamp;
    const isValid = this.isCacheValid();
    
    return {
      isValid,
      age: Math.round(age / 1000), // age in seconds
      channelCount: this.cachedChannels.length
    };
  }

  public getServiceHealth(): { 
    cacheValid: boolean; 
    lastSuccessfulLoad?: Date; 
    channelsWithVideos: number;
    totalChannels: number;
  } {
    const cacheInfo = this.getCacheInfo();
    let channelsWithVideos = 0;
    let totalChannels = 0;
    
    if (this.cachedChannels) {
      totalChannels = this.cachedChannels.length;
      channelsWithVideos = this.cachedChannels.filter(ch => ch.videos.length > 0).length;
    }
    
    return {
      cacheValid: cacheInfo.isValid,
      lastSuccessfulLoad: this.cacheTimestamp ? new Date(this.cacheTimestamp) : undefined,
      channelsWithVideos,
      totalChannels
    };
  }

  private parseYouTubeFeed(xmlString: string, channelId: string, channelTitle: string): YouTubeChannel {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Failed to parse XML');
    }

    const entries = xmlDoc.querySelectorAll('entry');
    const videos: YouTubeVideo[] = [];

    entries.forEach(entry => {
      const videoId = this.getElementText(entry, 'yt\\:videoId') || 
                     this.getElementText(entry, 'videoId');
      const title = this.getElementText(entry, 'title');
      const description = this.getElementText(entry, 'media\\:description') || 
                         this.getElementText(entry, 'description');
      const publishedText = this.getElementText(entry, 'published');
      const thumbnailElement = entry.querySelector('media\\:thumbnail, thumbnail');
      
      if (videoId && title) {
        videos.push({
          id: videoId,
          title: title,
          description: description || '',
          thumbnailUrl: thumbnailElement?.getAttribute('url') || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          publishedAt: publishedText ? new Date(publishedText) : new Date(),
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          channelTitle: channelTitle
        });
      }
    });

    return {
      channelId,
      channelTitle,
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      videos: videos.slice(0, 10) // Limit to 10 most recent videos per channel
    };
  }

  private getElementText(parent: Element, selector: string): string | null {
    const element = parent.querySelector(selector);
    return element ? element.textContent?.trim() || null : null;
  }
}
