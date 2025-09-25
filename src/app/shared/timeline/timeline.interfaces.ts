/**
 * Timeline component interfaces for consistent data structure across the application
 */

/**
 * Represents a single event in the timeline
 */
export interface TimelineEvent {
  /** Description text for the event */
  description: string;
  /** FontAwesome icon class for the event (optional) */
  icon?: string;
  /** Color class or hex color for the icon (optional) */
  iconColor?: string;
  /** Event type for categorization (optional) */
  type?: TimelineEventType;
  /** Additional metadata for the event (optional) */
  metadata?: any;
}

/**
 * Represents a time segment containing multiple events
 */
export interface TimelineSegment {
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Array of events that occurred in this segment */
  events: TimelineEvent[];
  /** Optional label for the segment */
  label?: string;
}

/**
 * Timeline configuration options
 */
export interface TimelineConfig {
  /** Duration of each segment in seconds */
  segmentDuration: number;
  /** Maximum number of segments to display */
  maxSegments: number;
  /** Whether to show segments with no events */
  showEmptySegments: boolean;
  /** Whether to use compact display mode */
  compact: boolean;
  /** Default primary color for events */
  primaryColor: string;
  /** Player-specific color (hex format) */
  playerColor?: string;
}

/**
 * Event types for categorization and icon assignment
 */
export enum TimelineEventType {
  TRAIN = 'train',
  BUILD = 'build', 
  RESEARCH = 'research',
  GOD_POWER = 'godPower',
  TRIBUTE = 'tribute',
  TRADE = 'trade',
  MILITARY = 'military',
  ECONOMIC = 'economic',
  ADVANCEMENT = 'advancement',
  OTHER = 'other'
}

/**
 * Player information for timeline display
 */
export interface TimelinePlayerInfo {
  /** Player number/identifier */
  playerNumber: number;
  /** Player display name */
  name: string;
  /** Player color in hex format */
  color: string;
  /** Civilization name */
  civilization?: string;
  /** Major god name */
  majorGod?: string;
}