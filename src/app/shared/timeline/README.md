# Timeline Component

A reusable timeline component for displaying chronological game events.

## Usage

```typescript
import { TimelineComponent, TimelineSegment, TimelineEvent } from '../../shared/timeline/timeline.component';

// In your component's imports array
imports: [TimelineComponent]
```

```html
<app-timeline
  [playerName]="'Player Name'"
  [segments]="timelineSegments"
  [primaryColor]="'text-primary'"
  [compact]="false"
  [showEmptySegments]="false">
</app-timeline>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `playerName` | `string` | `''` | Display name for the player |
| `segments` | `TimelineSegment[]` | `[]` | Array of timeline segments to display |
| `maxSegments` | `number` | `20` | Maximum number of segments to show |
| `segmentDuration` | `number` | `30` | Duration of each segment in seconds |
| `primaryColor` | `string` | `'text-primary'` | CSS class for primary color theming |
| `showEmptySegments` | `boolean` | `false` | Whether to show segments with no events |
| `compact` | `boolean` | `false` | Enable compact display mode |

## Data Interfaces

### TimelineEvent
```typescript
interface TimelineEvent {
  description: string;  // Event description text
  icon?: string;       // FontAwesome icon class (optional)
  iconColor?: string;  // CSS color class (optional)
}
```

### TimelineSegment
```typescript
interface TimelineSegment {
  startTime: number;     // Segment start time in seconds
  endTime: number;       // Segment end time in seconds
  events: TimelineEvent[]; // Array of events in this segment
}
```

## Features

- **Flexible Display**: Can show timeline for single or multiple players
- **Icon Support**: Customizable icons for different event types
- **Color Theming**: Per-player color customization
- **Compact Mode**: Space-efficient display option
- **Responsive**: Mobile-friendly design
- **Scrollable**: Long timelines are scrollable with custom styling
- **Empty States**: Handles empty data gracefully

## Styling

The component includes comprehensive SCSS styling with:
- Timeline visual indicators (dots, lines)
- Responsive breakpoints
- Custom scrollbar styling
- Hover effects
- Support for light/dark themes

## Example Implementation

The replay parser uses two timeline components side by side:

```html
<div class="row">
  <div class="col-md-6">
    <app-timeline
      [playerName]="getPlayerTimelineName(1)"
      [segments]="getTimelineDataForPlayer(1)"
      [primaryColor]="'text-primary'">
    </app-timeline>
  </div>
  <div class="col-md-6">
    <app-timeline
      [playerName]="getPlayerTimelineName(2)"
      [segments]="getTimelineDataForPlayer(2)"
      [primaryColor]="'text-success'">
    </app-timeline>
  </div>
</div>
```

This creates a side-by-side comparison view for two players' activities during a game.