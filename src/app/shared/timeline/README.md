# Timeline Component

A reusable timeline component for displaying chronological game events with comprehensive service architecture.

## Architecture Overview

The timeline system consists of:
- **Interfaces** (`timeline.interfaces.ts`) - Type definitions and contracts
- **Models** (`timeline.models.ts`) - Utility functions and data manipulation
- **Service** (`timeline.service.ts`) - Business logic and data processing
- **Component** (`timeline.component.ts`) - UI presentation layer

## Quick Start

### Basic Usage

```typescript
import { TimelineComponent } from '../../shared/timeline/timeline.component';
import { TimelineService } from '../../shared/timeline/timeline.service';
import { TimelineSegment, TimelineConfig } from '../../shared/timeline/timeline.interfaces';

// In your component
export class MyComponent {
  constructor(private timelineService: TimelineService) {}

  getTimelineData(gameCommands: any[], playerNumber: number): TimelineSegment[] {
    return this.timelineService.createTimelineFromReplayData(
      gameCommands,
      playerNumber,
      { maxSegments: 20, segmentDuration: 30 }
    );
  }
}
```

```html
<app-timeline
  [playerName]="'Player 1'"
  [segments]="getTimelineData(commands, 1)"
  [playerColor]="'#FF0000'"
  [compact]="false">
</app-timeline>
```

### Advanced Usage with Configuration

```typescript
// Create a timeline configuration
const config: TimelineConfig = {
  segmentDuration: 30,
  maxSegments: 20,
  showEmptySegments: false,
  compact: false,
  primaryColor: 'text-primary',
  playerColor: '#FF0000'
};

// Use configuration object
<app-timeline
  [playerName]="'Player 1'"
  [segments]="timelineSegments"
  [config]="config">
</app-timeline>
```

## Component Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `playerName` | `string` | `''` | Display name for the player |
| `segments` | `TimelineSegment[]` | `[]` | Array of timeline segments to display |
| `config` | `Partial<TimelineConfig>` | `{}` | Timeline configuration object |
| `maxSegments` | `number` | `20` | Legacy: Maximum number of segments (use config) |
| `segmentDuration` | `number` | `30` | Legacy: Duration in seconds (use config) |
| `primaryColor` | `string` | `'text-primary'` | Legacy: Primary color (use config) |
| `playerColor` | `string` | `''` | Legacy: Player hex color (use config) |
| `showEmptySegments` | `boolean` | `false` | Legacy: Show empty segments (use config) |
| `compact` | `boolean` | `false` | Legacy: Compact mode (use config) |

## Service Methods

### TimelineService

```typescript
// Create timeline from replay data
createTimelineFromReplayData(
  gameCommands: any[],
  playerNumber: number,
  config?: Partial<TimelineConfig>
): TimelineSegment[]

// Create player information
createPlayerInfo(playerData: any, playerColors: string[]): TimelinePlayerInfo

// Get event styling
getEventIcon(event: TimelineEvent): string
getEventColor(event: TimelineEvent, playerColor?: string, primaryColor?: string): string
```

## Data Interfaces

### TimelineEvent
```typescript
interface TimelineEvent {
  description: string;     // Event description text
  icon?: string;          // FontAwesome icon class
  iconColor?: string;     // Color class or hex color
  type?: TimelineEventType; // Event categorization
  metadata?: any;         // Additional event data
}
```

### TimelineSegment
```typescript
interface TimelineSegment {
  startTime: number;        // Segment start time in seconds
  endTime: number;         // Segment end time in seconds
  events: TimelineEvent[]; // Array of events in this segment
  label?: string;          // Optional custom label
}
```

### TimelineConfig
```typescript
interface TimelineConfig {
  segmentDuration: number;    // Duration of each segment in seconds (default: 30)
  maxSegments: number;        // Maximum number of segments (default: 20)
  showEmptySegments: boolean; // Show segments with no events (default: false)
  compact: boolean;           // Use compact display mode (default: false)
  primaryColor: string;       // Default primary color (default: 'text-primary')
  playerColor?: string;       // Player-specific hex color (optional)
}
```

### TimelineEventType
```typescript
enum TimelineEventType {
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
```

### TimelinePlayerInfo
```typescript
interface TimelinePlayerInfo {
  playerNumber: number;  // Player number/identifier
  name: string;         // Player display name
  color: string;        // Player color in hex format
  civilization?: string; // Civilization name (optional)
  majorGod?: string;    // Major god name (optional)
}
```

## Utility Models

### TimelineModels Class

Static utility class providing:
- **Default Configuration**: `DEFAULT_CONFIG`
- **Event Icons Mapping**: `EVENT_ICONS`
- **Time Formatting**: `formatTime()`, `formatTimeRange()`
- **Segment Creation**: `createSegment()`, `generateEmptySegments()`
- **Event Processing**: `createEvent()`, `addEventToSegments()`
- **Configuration Merging**: `mergeConfig()`

## Features

- **Service Architecture**: Clean separation of concerns with dedicated service layer
- **Type Safety**: Comprehensive TypeScript interfaces and enums
- **Flexible Configuration**: Support for both legacy input properties and modern config objects
- **Event Categorization**: Built-in event type system with icon mappings
- **Player Color Integration**: Automatic player color application from game data
- **Utility Functions**: Rich set of helper functions for data manipulation
- **Backward Compatibility**: Maintains compatibility with existing implementations
- **Extensible**: Easy to add new event types and processing logic

## Styling

The component includes comprehensive SCSS styling with:
- Enhanced timeline dots with proper visibility on dark backgrounds
- Player-specific icon coloring using actual game colors
- Responsive design with mobile-friendly breakpoints
- Custom scrollbar styling
- Hover effects and visual feedback
- Support for both light and dark themes

## Migration Guide

### From Legacy Implementation
```typescript
// Old way - inline processing
getTimelineData(commands: any[]): TimelineSegment[] {
  // Complex inline processing logic...
}

// New way - service-based
constructor(private timelineService: TimelineService) {}

getTimelineData(commands: any[], playerNum: number): TimelineSegment[] {
  return this.timelineService.createTimelineFromReplayData(
    commands, 
    playerNum, 
    { maxSegments: 20, segmentDuration: 30 }
  );
}
```

### Benefits of New Architecture
1. **Reusability**: Timeline service can be used across multiple components
2. **Maintainability**: Centralized business logic is easier to maintain
3. **Testing**: Service methods can be unit tested independently
4. **Consistency**: Standardized event processing and formatting
5. **Extensibility**: Easy to add new features and event types