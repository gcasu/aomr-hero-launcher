import { TimelineSegment } from '../shared/timeline/timeline.interfaces';

export interface CachedReplay {
  matchId: string;
  profileId: number;
  replayFileName: string;
  parsedData: any | null;
  timelineData: TimelineSegment[] | null;
  winnerPlayerName: string | null;
  cachedAt: Date;
  fileSize: number;
  parsedSize: number;
  hasError: boolean;
  errorMessage?: string;
}

export interface CacheIndexEntry {
  matchId: string;
  profileId: number;
  replayFileName: string;
  parsedData: any | null;
  timelineData: TimelineSegment[] | null;
  winnerPlayerName: string | null;
  cachedAt: string;
  fileSize: number;
  parsedSize: number;
  hasError: boolean;
  errorMessage?: string;
}

export interface CacheIndex {
  entries: { [key: string]: CacheIndexEntry };
  lastCleanup: string;
}

export interface ReplayCacheStats {
  totalReplays: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}