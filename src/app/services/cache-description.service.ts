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
    'dataGuideNotes': 'Data guide user notes and annotations'
  };

  private readonly configKeys = [
    'gameExePath', 
    'localModsPath', 
    'selectedMajorGod'
  ];

  private readonly dataKeys = [
    'dataGuideBookmarks', 
    'dataGuideNotes'
  ];

  getCacheItemDescription(key: string): string {
    // Handle dynamic tier list keys
    if (key.startsWith('tierlist_')) {
      const tierListName = key.replace('tierlist_', '');
      return `Tier list configuration for ${tierListName}`;
    }
    return this.descriptions[key] || 'Application data';
  }

  getCacheItemType(key: string): 'config' | 'data' | 'other' {
    // Handle dynamic tier list keys
    if (key.startsWith('tierlist_')) return 'data';
    
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
