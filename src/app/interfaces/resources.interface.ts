export type ResourceType = 'web' | 'local';
export type ResourceBadge = 'web' | 'zip' | 'pdf' | 'discord' | 'github' | 'youtube';

export interface ResourceCard {
  id: string;
  title: string;
  description: string;
  source: string;
  type: ResourceType;
  badge: ResourceBadge;
  bgImage?: string;
  author?: string;
}

export interface ResourcesConfig {
  resources: ResourceCard[];
}

export interface BadgeConfig {
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark';
}
