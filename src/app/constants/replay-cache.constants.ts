export const REPLAY_CACHE_CONFIG = {
  CACHE_DIR: 'replay_cache',
  CACHE_INDEX_FILE: 'cache_index.json',
  MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB max cache size
  MAX_CACHE_ENTRIES: 1000,
  CLEANUP_THRESHOLD: 0.9, // Clean up when cache is 90% full
  CLEANUP_PERCENT: 0.3 // Remove 30% of oldest entries during cleanup
} as const;

export const COMPRESSION_SIGNATURES = {
  GZIP: [0x1f, 0x8b],
  ZIP: [0x50, 0x4b]
} as const;

export const ZIP_COMPRESSION_METHODS = {
  STORED: 0, // No compression
  DEFLATE: 8 // Deflate compression
} as const;