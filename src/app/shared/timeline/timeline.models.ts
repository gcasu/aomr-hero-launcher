import { TimelineEvent, TimelineSegment, TimelineEventType, TimelineConfig } from './timeline.interfaces';

/**
 * Utility functions for timeline data manipulation and formatting
 */
export class TimelineModels {
  
  /**
   * Default timeline configuration
   */
  static readonly DEFAULT_CONFIG: TimelineConfig = {
    segmentDuration: 30,
    maxSegments: 20,
    showEmptySegments: false,
    compact: false,
    primaryColor: 'text-primary'
  };

  /**
   * Event type to icon mapping
   */
  static readonly EVENT_ICONS: Record<TimelineEventType, string> = {
    [TimelineEventType.TRAIN]: 'fas fa-users',
    [TimelineEventType.BUILD]: 'fas fa-hammer',
    [TimelineEventType.RESEARCH]: 'fas fa-flask',
    [TimelineEventType.GOD_POWER]: 'fas fa-bolt',
    [TimelineEventType.TRIBUTE]: 'fas fa-coins',
    [TimelineEventType.TRADE]: 'fas fa-exchange-alt',
    [TimelineEventType.MILITARY]: 'fas fa-shield-alt',
    [TimelineEventType.ECONOMIC]: 'fas fa-chart-line',
    [TimelineEventType.ADVANCEMENT]: 'fas fa-arrow-up',
    [TimelineEventType.OTHER]: 'fas fa-dot-circle'
  };

  /**
   * Format time in seconds to MM:SS format
   */
  static formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format time range for display
   */
  static formatTimeRange(startTime: number, endTime: number): string {
    return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
  }

  /**
   * Create a new timeline segment
   */
  static createSegment(startTime: number, endTime: number, events: TimelineEvent[] = []): TimelineSegment {
    return {
      startTime,
      endTime,
      events: [...events],
      label: this.formatTimeRange(startTime, endTime)
    };
  }

  /**
   * Create a new timeline event
   */
  static createEvent(
    description: string,
    type: TimelineEventType = TimelineEventType.OTHER,
    iconOverride?: string,
    colorOverride?: string,
    metadata?: any
  ): TimelineEvent {
    return {
      description,
      type,
      icon: iconOverride || this.EVENT_ICONS[type],
      iconColor: colorOverride,
      metadata
    };
  }

  /**
   * Generate empty segments for a given duration
   */
  static generateEmptySegments(
    totalDuration: number,
    segmentDuration: number = this.DEFAULT_CONFIG.segmentDuration,
    maxSegments: number = this.DEFAULT_CONFIG.maxSegments
  ): TimelineSegment[] {
    const segments: TimelineSegment[] = [];
    const numSegments = Math.min(Math.ceil(totalDuration / segmentDuration), maxSegments);

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min(startTime + segmentDuration, totalDuration);
      segments.push(this.createSegment(startTime, endTime));
    }

    return segments;
  }

  /**
   * Add an event to the appropriate segment
   */
  static addEventToSegments(
    segments: TimelineSegment[],
    event: TimelineEvent,
    eventTime: number,
    segmentDuration: number = this.DEFAULT_CONFIG.segmentDuration
  ): TimelineSegment[] {
    const segmentIndex = Math.floor(eventTime / segmentDuration);
    
    if (segmentIndex >= 0 && segmentIndex < segments.length) {
      segments[segmentIndex].events.push(event);
    }

    return segments;
  }

  /**
   * Check if a segment has any events
   */
  static hasEvents(segment: TimelineSegment): boolean {
    return segment.events && segment.events.length > 0;
  }

  /**
   * Get event count for a segment
   */
  static getEventCount(segment: TimelineSegment): number {
    return segment.events ? segment.events.length : 0;
  }

  /**
   * Filter segments based on configuration
   */
  static filterSegments(segments: TimelineSegment[], config: TimelineConfig): TimelineSegment[] {
    let filtered = segments;

    // Filter empty segments if not showing them
    if (!config.showEmptySegments) {
      filtered = filtered.filter(segment => this.hasEvents(segment));
    }

    // Limit to max segments
    if (config.maxSegments > 0) {
      filtered = filtered.slice(0, config.maxSegments);
    }

    return filtered;
  }

  /**
   * Merge configuration with defaults
   */
  static mergeConfig(config: Partial<TimelineConfig>): TimelineConfig {
    return { ...this.DEFAULT_CONFIG, ...config };
  }
}