import { Injectable, inject } from '@angular/core';
import { 
  TimelineEvent, 
  TimelineSegment, 
  TimelineConfig, 
  TimelineEventType, 
  TimelinePlayerInfo 
} from './timeline.interfaces';
import { TimelineModels } from './timeline.models';
import { PlayerColorService } from '../../services/player-color.service';

/**
 * Service for processing and transforming data into timeline format
 */
@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private playerColorService = inject(PlayerColorService);

  /**
   * Create timeline segments from replay data with proper event grouping
   */
  createTimelineFromReplayData(
    gameCommands: any[],
    playerNumber: number,
    config: Partial<TimelineConfig> = {}
  ): TimelineSegment[] {
    const fullConfig = TimelineModels.mergeConfig(config);
    
    // Find the maximum time to determine timeline duration
    const maxTime = gameCommands.length > 0 
      ? Math.max(...gameCommands.map(cmd => cmd.Time || 0))
      : 0;

    // Generate empty segments
    const segments = TimelineModels.generateEmptySegments(
      maxTime,
      fullConfig.segmentDuration,
      fullConfig.maxSegments
    );

    // Group commands by segment and process with grouping logic
    const playerCommands = gameCommands.filter(cmd => cmd.PlayerNumber === playerNumber);
    
    segments.forEach(segment => {
      // Get commands for this time segment
      const segmentCommands = playerCommands.filter(cmd => 
        cmd.Time >= segment.startTime && cmd.Time < segment.endTime
      );

      // Group events and add to segment
      const groupedEvents = this.groupEventsInSegment(segmentCommands);
      segment.events.push(...groupedEvents);
    });

    return TimelineModels.filterSegments(segments, fullConfig);
  }

  /**
   * Group events within a segment to avoid repetition
   */
  private groupEventsInSegment(commands: any[]): TimelineEvent[] {
    const eventGroups: { [key: string]: { count: number; event: TimelineEvent } } = {};

    // Process each command and group by description
    commands.forEach(command => {
      const event = this.parseCommandToEvent(command);
      if (!event) return;

      const baseDescription = this.getBaseDescription(event.description);
      
      if (!eventGroups[baseDescription]) {
        eventGroups[baseDescription] = { count: 0, event };
      }
      
      eventGroups[baseDescription].count++;
    });

    // Convert groups to final events with counts
    return Object.values(eventGroups).map(group => {
      // Special handling for research - show each one individually
      if (group.event.description.toLowerCase().includes('research')) {
        const events: TimelineEvent[] = [];
        for (let i = 0; i < group.count; i++) {
          events.push({ ...group.event });
        }
        return events;
      } else {
        // For other events, group with count
        const description = group.count === 1 
          ? group.event.description 
          : `${group.event.description} (×${group.count})`;
        
        return [{
          ...group.event,
          description
        }];
      }
    }).flat();
  }

  /**
   * Get base description for grouping (removes existing count indicators)
   */
  private getBaseDescription(description: string): string {
    return description.replace(/\s*\(×\d+\)$/, '');
  }

  /**
   * Parse a game command into a timeline event (matching original logic)
   */
  private parseCommandToEvent(command: any): TimelineEvent | null {
    if (!command.Type) return null;

    let description = '';
    let eventType = TimelineEventType.OTHER;
    let icon = 'fas fa-dot-circle';
    let iconColor = '';

    // Match the original parsing logic from replay-parser component
    switch (command.Type) {
      case 'train':
        const unitName = command.Unit || command.Target || 'Unknown Unit';
        description = `Trained ${unitName}`;
        eventType = TimelineEventType.TRAIN;
        icon = 'fas fa-user-plus';
        break;
      
      case 'build':
        const buildingName = command.Building || command.Target || 'Unknown Building';
        const isQueued = command.Queued === true;
        if (isQueued) {
          description = `Queued ${buildingName}`;
          icon = 'fas fa-clock';
        } else {
          description = `Built ${buildingName}`;
          icon = 'fas fa-hammer';
        }
        eventType = TimelineEventType.BUILD;
        break;
      
      case 'prequeueTech':
        const prequeueTechName = command.Technology || command.Target || 'Unknown Technology';
        description = prequeueTechName && prequeueTechName.trim() !== '' 
          ? `Prequeued ${prequeueTechName}` 
          : 'Prequeued Unknown Technology';
        eventType = TimelineEventType.RESEARCH;
        icon = 'fas fa-hourglass-start';
        break;
      
      case 'research':
        const techName = command.Technology || command.Target || 'Unknown Technology';
        description = techName && techName.trim() !== '' 
          ? `Researched ${techName}` 
          : 'Researched Unknown Technology';
        eventType = TimelineEventType.RESEARCH;
        icon = 'fas fa-flask';
        break;
      
      case 'autoqueue':
        const autoUnit = command.Unit || command.Target || 'Unknown Unit';
        description = `Auto-queued ${autoUnit}`;
        eventType = TimelineEventType.TRAIN;
        icon = 'fas fa-sync-alt';
        break;
      
      case 'godPower':
        const godPowerName = command.GodPower || command.Target || 'Unknown God Power';
        description = `Used ${godPowerName}`;
        eventType = TimelineEventType.GOD_POWER;
        icon = 'fas fa-bolt';
        // Don't set iconColor - let it use player color
        break;
      
      case 'protoPower':
        const protoPowerName = command.GodPower || command.Target || 'Unknown Proto Power';
        description = `Used ${protoPowerName}`;
        eventType = TimelineEventType.GOD_POWER;
        icon = 'fas fa-magic';
        // Don't set iconColor - let it use player color
        break;
      
      default:
        if (command.Target) {
          description = `${command.Type}: ${command.Target}`;
        } else {
          description = `${command.Type} command`;
        }
        break;
    }

    const eventResult: TimelineEvent = {
      description,
      type: eventType,
      icon,
      metadata: { ...command }
    };

    // Only add iconColor if it has a meaningful value
    if (iconColor && iconColor.trim() !== '') {
      eventResult.iconColor = iconColor;
    }

    return eventResult;
  }



  /**
   * Create player info from replay data
   */
  createPlayerInfo(playerData: any, playerColors: string[]): TimelinePlayerInfo {
    return {
      playerNumber: playerData.PlayerNumber || 0,
      name: playerData.Name || `Player ${playerData.PlayerNumber || 'Unknown'}`,
      color: playerColors[playerData.Color] || this.playerColorService.getDefaultColor(),
      civilization: playerData.Civilization,
      majorGod: playerData.God
    };
  }

  /**
   * Get event icon with fallback
   */
  getEventIcon(event: TimelineEvent): string {
    if (event.icon) {
      return event.icon;
    }
    
    if (event.type) {
      return TimelineModels.EVENT_ICONS[event.type];
    }
    
    return TimelineModels.EVENT_ICONS[TimelineEventType.OTHER];
  }

  /**
   * Get event color with player color fallback
   */
  getEventColor(event: TimelineEvent, playerColor?: string, primaryColor: string = 'text-primary'): string {
    // Only use event's iconColor if it's a meaningful value
    if (event.iconColor && event.iconColor.trim() !== '') {
      return event.iconColor;
    }
    
    return playerColor || primaryColor;
  }

  /**
   * Create timeline configuration for a player
   */
  createPlayerTimelineConfig(
    playerInfo: TimelinePlayerInfo,
    options: Partial<TimelineConfig> = {}
  ): TimelineConfig {
    return TimelineModels.mergeConfig({
      ...options,
      playerColor: playerInfo.color
    });
  }
}