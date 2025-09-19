export interface UserConfigItem {
  key: string;
  enabled: boolean;
  description: string;
}

export interface CacheItem {
  key: string;
  selected: boolean;
  description: string;
  size: string;
  type: 'config' | 'data' | 'other';
}
