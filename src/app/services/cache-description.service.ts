import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheDescriptionService {

  private readonly descriptions: { [key: string]: string } = {
    'gameExePath': 'Game executable file path',
    'localModsPath': 'Local mods directory path',
    'selectedMajorGod': 'Selected major god in build orders',
    'dataGuideBookmarks': 'Data guide bookmarked entries',
    'dataGuideNotes': 'Data guide user notes and annotations',
    'matchData': 'Top players match history data',
    'replay_cache': 'Cached replay files and parsed data for build orders analysis'
  };

  private readonly configKeys = [
    'gameExePath', 
    'localModsPath', 
    'selectedMajorGod'
  ];

  private readonly dataKeys = [
    'dataGuideBookmarks', 
    'dataGuideNotes',
    'matchData',
    'replay_cache'
  ];

  getCacheItemDescription(key: string): string {
    // Handle dynamic tier list keys
    if (key.startsWith('tierlist_')) {
      const tierListName = key.replace('tierlist_', '');
      return `Tier list configuration for ${tierListName}`;
    }
    // Handle DoD build orders cache keys
    if (key.startsWith('dodBuildOrders_')) {
      const godName = key.replace('dodBuildOrders_', '');
      return `DoD Clan build orders for ${godName}`;
    }
    return this.descriptions[key] || 'Application data';
  }

  getCacheItemType(key: string): 'config' | 'data' | 'other' {
    // Handle dynamic tier list keys
    if (key.startsWith('tierlist_')) return 'data';
    // Handle DoD build orders cache keys
    if (key.startsWith('dodBuildOrders_')) return 'data';
    
    if (this.configKeys.includes(key)) return 'config';
    if (this.dataKeys.includes(key)) return 'data';
    return 'other';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
