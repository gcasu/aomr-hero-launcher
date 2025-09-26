import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TimelineEvent, TimelineSegment, TimelineConfig } from './timeline.interfaces';
import { TimelineService } from './timeline.service';
import { TimelineModels } from './timeline.models';
import { GameIconService } from '../../services/game-icon.service';

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
  @Input() config: Partial<TimelineConfig> = {};
  
  // Legacy inputs for backward compatibility - will be merged into config
  @Input() maxSegments: number = 20;
  @Input() segmentDuration: number = 30;
  @Input() primaryColor: string = 'text-primary';
  @Input() playerColor: string = '';
  @Input() showEmptySegments: boolean = false;
  @Input() compact: boolean = false;

  private timelineConfig: TimelineConfig = TimelineModels.DEFAULT_CONFIG;
  private gameIconService = inject(GameIconService);

  constructor(private timelineService: TimelineService) {}

  ngOnInit(): void {
    // Merge legacy inputs with config for backward compatibility
    this.timelineConfig = TimelineModels.mergeConfig({
      ...this.config,
      maxSegments: this.maxSegments,
      segmentDuration: this.segmentDuration,
      primaryColor: this.primaryColor,
      playerColor: this.playerColor,
      showEmptySegments: this.showEmptySegments,
      compact: this.compact
    });
  }

  hasEvents(segment: TimelineSegment): boolean {
    return TimelineModels.hasEvents(segment);
  }

  getSegmentLabel(segment: TimelineSegment): string {
    return segment.label || TimelineModels.formatTimeRange(segment.startTime, segment.endTime);
  }

  getEventIcon(event: TimelineEvent): string {
    return this.timelineService.getEventIcon(event);
  }

  getEventIconColor(event: TimelineEvent): string {
    const color = this.timelineService.getEventColor(
      event, 
      this.timelineConfig.playerColor, 
      this.timelineConfig.primaryColor
    );
    
    // Return empty class if using hex color (will use inline style)
    return color.startsWith('#') ? '' : color;
  }

  getEventIconStyle(event: TimelineEvent): any {
    const color = this.timelineService.getEventColor(
      event, 
      this.timelineConfig.playerColor, 
      this.timelineConfig.primaryColor
    );
    
    // Return inline style if hex color, otherwise empty
    return color.startsWith('#') ? { color } : {};
  }

  getGameIconPath(iconName: string): string {
    return this.gameIconService.getIconPath(iconName);
  }
}