import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface TimelineEvent {
  description: string;
  icon?: string;
  iconColor?: string;
}

export interface TimelineSegment {
  startTime: number;
  endTime: number;
  events: TimelineEvent[];
}

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ]
})
export class TimelineComponent implements OnInit {
  @Input() playerName: string = '';
  @Input() segments: TimelineSegment[] = [];
  @Input() maxSegments: number = 20;
  @Input() segmentDuration: number = 30; // seconds
  @Input() primaryColor: string = 'text-primary';
  @Input() playerColor: string = ''; // Hex color from player data
  @Input() showEmptySegments: boolean = false;
  @Input() compact: boolean = false;

  ngOnInit(): void {
    // Component initialization
  }

  formatTimeSegment(startTime: number, endTime: number): string {
    const startMinutes = Math.floor(startTime / 60);
    const startSeconds = startTime % 60;
    const endMinutes = Math.floor(endTime / 60);
    const endSecondsValue = endTime % 60;
    
    return `${startMinutes}:${startSeconds.toString().padStart(2, '0')} - ${endMinutes}:${endSecondsValue.toString().padStart(2, '0')}`;
  }

  hasEvents(segment: TimelineSegment): boolean {
    return segment.events && segment.events.length > 0;
  }

  getSegmentLabel(segment: TimelineSegment): string {
    return this.formatTimeSegment(segment.startTime, segment.endTime);
  }

  getEventIcon(event: TimelineEvent): string {
    return event.icon || 'fas fa-dot-circle';
  }

  getEventIconColor(event: TimelineEvent): string {
    if (event.iconColor) {
      return event.iconColor;
    }
    
    // Use player color if available, otherwise fallback to primaryColor
    if (this.playerColor) {
      return '';  // Return empty class since we'll use inline style
    }
    
    return this.primaryColor;
  }

  getEventIconStyle(event: TimelineEvent): any {
    if (event.iconColor) {
      return {};
    }
    
    // Use player color if available
    if (this.playerColor) {
      return { color: this.playerColor };
    }
    
    return {};
  }
}