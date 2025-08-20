export interface TierItem {
  id: string;
  name: string;
  imagePath: string;
}

export interface TierRow {
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  items: TierItem[];
  color: string;
}

export interface TierList {
  name: string;
  path: string;
  items: TierItem[];
}

export interface TierConfiguration {
  tierListName: string;
  tiers: TierRow[];
  unassignedItems: TierItem[];
}
