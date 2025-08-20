export interface ModAction {
  Type?: string;
}

export interface Mod {
  Title: string;
  Author: string;
  Description: string;
  Path: string;
  WorkshopID: number;
  LastUpdate: string;
  InstallTime: string;
  Priority: number;
  Enabled: boolean;
  InstallCRC?: string;
}

export interface ModStatusFile {
  Actions: ModAction[];
  Mods: Mod[];
}

export interface ModDisplayItem extends Mod {
  id: string; // For tracking in UI
  isLocal: boolean; // Computed property
  lastUpdateDate?: Date; // Parsed timestamp
  installTimeDate?: Date; // Parsed timestamp
}
