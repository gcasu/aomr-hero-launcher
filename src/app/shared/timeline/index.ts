/**
 * Timeline Component Library
 * 
 * Provides a comprehensive timeline system for displaying chronological events
 * with service-based architecture for data processing and manipulation.
 */

// Main component
export { TimelineComponent } from './timeline.component';

// Interfaces and types
export {
  TimelineEvent,
  TimelineSegment,
  TimelineConfig,
  TimelineEventType,
  TimelinePlayerInfo
} from './timeline.interfaces';

// Service for data processing
export { TimelineService } from './timeline.service';

// Utility models and functions
export { TimelineModels } from './timeline.models';