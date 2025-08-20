export interface LaunchResult {
  success: boolean;
  error?: string;
}

export interface YouTubeFeedResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface ElectronAPI {
  openGameExeDialog: () => Promise<string | null>;
  openModsJsonDialog: () => Promise<string | null>;
  launchGame: (exePath: string) => Promise<LaunchResult>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  ensureDirectory: (dirPath: string) => Promise<boolean>;
  readDirectory: (path: string) => Promise<string[]>;
  getAppPath: () => Promise<string>;
  pathJoin: (...paths: string[]) => string;
  pathBasename: (path: string, ext?: string) => string;
  restartApp: () => Promise<void>;
  reloadWindow: () => Promise<void>;
  fetchYouTubeFeed: (channelId: string) => Promise<YouTubeFeedResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
