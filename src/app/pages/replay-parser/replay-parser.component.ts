import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReplayParserService, ParseOptions, ParseResult } from '../../services/replay-parser.service';
import { ToastService } from '../../services/toast.service';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { GlassCardComponent } from '../../shared/glass-card/glass-card.component';
import { TimelineComponent } from '../../shared/timeline/timeline.component';
import { TimelineSegment, TimelineEvent, TimelinePlayerInfo } from '../../shared/timeline/timeline.interfaces';
import { TimelineService } from '../../shared/timeline/timeline.service';

@Component({
  selector: 'app-replay-parser',
  templateUrl: './replay-parser.component.html',
  styleUrls: ['./replay-parser.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    GlassCardComponent,
    TimelineComponent
  ]
})
export class ReplayParserComponent implements OnInit {
  selectedFile: File | null = null;
  parseOptions: ParseOptions = {
    slim: false,
    stats: false,
    prettyPrint: true,
    isGzip: false,
    verbose: false
  };
  isProcessing = false;
  parseResult: ParseResult | null = null;
  isDragOver = false;

  private replayParserService = inject(ReplayParserService);
  private toastService = inject(ToastService);
  private timelineService = inject(TimelineService);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    // Component initialization
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Check if file has supported extension
    const supportedExtensions = ['.mythrec', '.mythrec.gz'];
    const hasValidExtension = supportedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      this.toastService.showError(this.translateService.instant('REPLAY_PARSER.ERRORS.INVALID_FILE_TYPE'));
      return;
    }

    this.selectedFile = file;
    this.parseResult = null;

    // Auto-detect gzip compression based on file extension
    this.parseOptions.isGzip = file.name.toLowerCase().endsWith('.mythrec.gz');
  }

  async parseReplay(): Promise<void> {
    if (!this.selectedFile) {
      this.toastService.showError(this.translateService.instant('REPLAY_PARSER.ERRORS.NO_FILE_SELECTED'));
      return;
    }

    this.isProcessing = true;
    this.parseResult = null;

    try {
      const result = await this.replayParserService.parseReplay(
        this.selectedFile,
        this.parseOptions
      ) as ParseResult;
      
      this.parseResult = result;

      if (result.success) {
        this.toastService.showSuccess(this.translateService.instant('REPLAY_PARSER.MESSAGES.PARSE_SUCCESS'));
      } else {
        this.toastService.showError(
          result.error || this.translateService.instant('REPLAY_PARSER.ERRORS.PARSE_FAILED')
        );
      }
    } catch (error) {
      this.toastService.showError(this.translateService.instant('REPLAY_PARSER.ERRORS.PARSE_FAILED'));
    } finally {
      this.isProcessing = false;
    }
  }

  downloadResult(): void {
    if (!this.parseResult?.data || !this.selectedFile) {
      return;
    }

    const jsonData = JSON.stringify(this.parseResult.data, null, this.parseOptions.prettyPrint ? 2 : 0);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedFile.name.replace(/\.(mythrec|mythrec\.gz)$/i, '')}_parsed.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.parseResult = null;
    this.isDragOver = false;
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  }



  getFileSizeString(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getResultSizeString(): string {
    if (!this.parseResult?.data) return '0 Bytes';
    const jsonString = JSON.stringify(this.parseResult.data);
    return this.getFileSizeString(jsonString.length);
  }

  // New methods for replay analysis visualization
  formatGameTime(seconds: number): string {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getPlayerColor(colorIndex: number): string {
    const colors = [
      '#FF0000', '#0000FF', '#FFFF00', '#00FF00', 
      '#00FFFF', '#FF00FF', '#808080', '#FFA500',
      '#FFB6C1', '#800080', '#A52A2A', '#FFFFFF'
    ];
    return colors[colorIndex] || '#FFFFFF';
  }

  getPlayerColorForTimeline(playerNum: number): string {
    if (!this.parseResult?.data?.Players) return '#FFFFFF';
    
    const player = this.parseResult.data.Players.find((p: any) => p.PlayerNumber === playerNum);
    return player ? this.getPlayerColor(player.Color) : '#FFFFFF';
  }

  getPlayerStatsArray(): Array<{playerNum: string, stats: any}> {
    if (!this.parseResult?.data?.Stats) return [];
    return Object.keys(this.parseResult.data.Stats).map(playerNum => ({
      playerNum,
      stats: this.parseResult!.data.Stats[playerNum]
    }));
  }

  getPlayerName(playerNum: string): string {
    const player = this.parseResult?.data?.Players?.find((p: any) => p.PlayerNum.toString() === playerNum);
    return player?.Name || `Player ${playerNum}`;
  }

  getPlayerLabel(playerNum: number | string): string {
    return `Player ${playerNum}`;
  }

  getMinorGods(player: any): string[] {
    if (!player?.MinorGods) return [];
    return player.MinorGods.filter((g: string) => g && g.trim() !== '');
  }

  private minorGodIconCache: Record<string, string> = {};
  private minorGodIconFolders: string[] = [
    'assets/images/tiers/Minor Gods (Classical Age)',
    'assets/images/tiers/Minor Gods (Heroic Age)',
    'assets/images/tiers/Minor Gods (Mythic Age)'
  ];

  getMinorGodIcon(godName: string): string | null {
    if (!godName) return null;
    const key = godName.toLowerCase();
    if (this.minorGodIconCache[key]) {
      return this.minorGodIconCache[key];
    }
    const fileName = key.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
    
    // Create a mapping of known gods to their correct age folders
    const godToAgeMap: Record<string, string> = {
      // Classical Age
      'anubis': 'Minor Gods (Classical Age)',
      'ares': 'Minor Gods (Classical Age)',
      'athena': 'Minor Gods (Classical Age)',
      'bast': 'Minor Gods (Classical Age)',
      'chiyou': 'Minor Gods (Classical Age)',
      'forseti': 'Minor Gods (Classical Age)',
      'freyja': 'Minor Gods (Classical Age)',
      'heimdall': 'Minor Gods (Classical Age)',
      'hermes': 'Minor Gods (Classical Age)',
      'houtu': 'Minor Gods (Classical Age)',
      'leto': 'Minor Gods (Classical Age)',
      'oceanus': 'Minor Gods (Classical Age)',
      'prometheus': 'Minor Gods (Classical Age)',
      'ptah': 'Minor Gods (Classical Age)',
      'ullr': 'Minor Gods (Classical Age)',
      'xuannu': 'Minor Gods (Classical Age)',
      
      // Heroic Age
      'aegir': 'Minor Gods (Heroic Age)',
      'aphrodite': 'Minor Gods (Heroic Age)',
      'apollo': 'Minor Gods (Heroic Age)',
      'bragi': 'Minor Gods (Heroic Age)',
      'dionysus': 'Minor Gods (Heroic Age)',
      'goumang': 'Minor Gods (Heroic Age)',
      'hyperion': 'Minor Gods (Heroic Age)',
      'nephthys': 'Minor Gods (Heroic Age)',
      'njord': 'Minor Gods (Heroic Age)',
      'nuba': 'Minor Gods (Heroic Age)',
      'rheia': 'Minor Gods (Heroic Age)',
      'rushou': 'Minor Gods (Heroic Age)',
      'sekhmet': 'Minor Gods (Heroic Age)',
      'skadi': 'Minor Gods (Heroic Age)',
      'sobek': 'Minor Gods (Heroic Age)',
      'theia': 'Minor Gods (Heroic Age)',
      
      // Mythic Age
      'artemis': 'Minor Gods (Mythic Age)',
      'atlas': 'Minor Gods (Mythic Age)',
      'baldr': 'Minor Gods (Mythic Age)',
      'gonggong': 'Minor Gods (Mythic Age)',
      'hekate': 'Minor Gods (Mythic Age)',
      'hel': 'Minor Gods (Mythic Age)',
      'helios': 'Minor Gods (Mythic Age)',
      'hephaestus': 'Minor Gods (Mythic Age)',
      'hera': 'Minor Gods (Mythic Age)',
      'horus': 'Minor Gods (Mythic Age)',
      'huangdi': 'Minor Gods (Mythic Age)',
      'osiris': 'Minor Gods (Mythic Age)',
      'thoth': 'Minor Gods (Mythic Age)',
      'tyr': 'Minor Gods (Mythic Age)',
      'vidar': 'Minor Gods (Mythic Age)',
      'zhurong': 'Minor Gods (Mythic Age)'
    };
    
    // Try to use the mapped folder first
    const correctFolder = godToAgeMap[key];
    if (correctFolder) {
      const path = `assets/images/tiers/${correctFolder}/${fileName}`;
      this.minorGodIconCache[key] = path;
      return path;
    }
    
    // Fallback: try all folders in order
    for (const folder of this.minorGodIconFolders) {
      const path = `${folder}/${fileName}`;
      this.minorGodIconCache[key] = path;
      return path;
    }
    
    return null;
  }

  handleGodIconError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  getTotalCount(countObject: any): number {
    if (!countObject) return 0;
    return Object.values(countObject).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);
  }

  hasTimelineData(): boolean {
    // Check for commands data first (independent of stats) - using correct field name
    if (this.parseResult?.data?.GameCommands && Array.isArray(this.parseResult.data.GameCommands) && 
        this.parseResult.data.GameCommands.length > 0) {
      return true;
    }
    
    // Also check for stats-based timeline data as fallback
    if (this.parseResult?.data?.Stats) {
      const players = Object.keys(this.parseResult.data.Stats);
      for (const playerNum of players) {
        const playerStats = this.parseResult.data.Stats[playerNum];
        if (playerStats?.Timelines) {
          // Check if there's any timeline data
          if (playerStats.Timelines.UnitCounts || 
              playerStats.Timelines.BuildingCounts || 
              playerStats.Timelines.TechsPrequeued) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  getTimelineSegments(): Array<Array<{playerName: string, events: string[]}>> {
    const maxSegments = 20; // 10 minutes / 30 seconds = 20 segments
    const segments: Array<Array<{playerName: string, events: string[]}>> = [];
    
    if (this.parseResult?.data?.GameCommands && Array.isArray(this.parseResult.data.GameCommands)) {
      const playersSet = new Set<number>();
      this.parseResult.data.GameCommands.forEach((command: any) => {
        if (command.PlayerNum !== undefined) {
          playersSet.add(command.PlayerNum);
        }
      });
      const players = Array.from(playersSet);
      
      for (let i = 0; i < maxSegments; i++) {
        const segmentActivities: Array<{playerName: string, events: string[]}> = [];
        const startTime = i * 30;
        const endTime = (i + 1) * 30;
        
        players.forEach(playerNum => {
          const playerName = this.getPlayerName(playerNum.toString());
          const events: string[] = [];
          
          // Filter commands for this player and time segment
          const playerCommands = this.parseResult!.data.GameCommands.filter((command: any) => 
            command.PlayerNum === playerNum &&
            command.GameTimeSecs >= startTime && 
            command.GameTimeSecs < endTime
          );
          
          // Process commands to extract meaningful information
          const eventGroups: { [key: string]: number } = {};
          playerCommands.forEach((command: any) => {
            let eventDescription = '';
            
            switch (command.CommandType) {
              case 'train':
                const unitName = command.Payload || 'Unknown Unit';
                eventDescription = `Trained ${unitName}`;
                break;
              case 'build':
                const buildingName = command.Payload?.Name || 'Unknown Building';
                const isQueued = command.Payload?.Queued === true;
                if (isQueued) {
                  eventDescription = `Queued ${buildingName}`;
                } else {
                  eventDescription = `Built ${buildingName}`;
                }
                break;
              case 'prequeueTech':
                // Handle prequeue - this is queuing research, not actually researching
                const prequeueTechName = command.Payload || 'Unknown Technology';
                if (prequeueTechName && prequeueTechName.trim() !== '') {
                  eventDescription = `Prequeued ${prequeueTechName}`;
                } else {
                  eventDescription = 'Prequeued Unknown Technology';
                }
                break;
              case 'research':
                const techName = command.Payload || 'Unknown Technology';
                if (techName && techName.trim() !== '') {
                  eventDescription = `Researched ${techName}`;
                } else {
                  eventDescription = 'Researched Unknown Technology';
                }
                break;
              case 'autoqueue':
                const autoUnit = command.Payload || 'Unknown Unit';
                eventDescription = `Auto-queued ${autoUnit}`;
                break;
              case 'godPower':
                const godPowerName = command.Payload?.Name || 'Unknown God Power';
                eventDescription = `Used ${godPowerName}`;
                break;
              case 'protoPower':
                const protoPowerName = command.Payload?.Name || 'Unknown Proto Power';
                eventDescription = `Used ${protoPowerName}`;
                break;
              case 'attack':
                eventDescription = 'Attack command';
                break;
              case 'move':
                eventDescription = 'Move command';
                break;
              case 'stop':
                eventDescription = 'Stop command';
                break;
              case 'garrison':
                eventDescription = 'Garrison command';
                break;
              case 'ungarrison':
                eventDescription = 'Ungarrison command';
                break;
              case 'work':
                eventDescription = 'Work command';
                break;
              case 'gather':
                eventDescription = 'Gather command';
                break;
              case 'repair':
                eventDescription = 'Repair command';
                break;
              case 'heal':
                eventDescription = 'Heal command';
                break;
              default:
                // For unknown command types, show the raw command type and payload if available
                if (command.Payload) {
                  if (typeof command.Payload === 'string') {
                    eventDescription = `${command.CommandType}: ${command.Payload}`;
                  } else if (command.Payload.Name) {
                    eventDescription = `${command.CommandType}: ${command.Payload.Name}`;
                  } else {
                    eventDescription = `${command.CommandType} command`;
                  }
                } else {
                  eventDescription = `${command.CommandType} command`;
                }
            }
            
            eventGroups[eventDescription] = (eventGroups[eventDescription] || 0) + 1;
          });
          
          // Convert to events - for research, show each one individually even if duplicated
          Object.entries(eventGroups).forEach(([eventDesc, count]) => {
            if (eventDesc.startsWith('Researched ')) {
              // For research, add each one individually to see what was researched
              for (let i = 0; i < count; i++) {
                events.push(eventDesc);
              }
            } else {
              // For other commands, group with count
              if (count === 1) {
                events.push(eventDesc);
              } else {
                events.push(`${eventDesc} (×${count})`);
              }
            }
          });
          
          segmentActivities.push({ playerName, events });
        });
        
        segments.push(segmentActivities);
      }
      
      return segments;
    }
    
    if (this.parseResult?.data?.Stats) {
      
      for (let i = 0; i < maxSegments; i++) {
        const segmentActivities: Array<{playerName: string, events: string[]}> = [];
        
        Object.keys(this.parseResult.data.Stats).forEach(playerNum => {
          const playerStats = this.parseResult!.data.Stats[playerNum];
          const playerName = this.getPlayerName(playerNum);
          const events: string[] = [];
          
          if (playerStats.Timelines) {
            // Check unit production
            if (playerStats.Timelines.UnitCounts && 
                Array.isArray(playerStats.Timelines.UnitCounts) && 
                playerStats.Timelines.UnitCounts[i]) {
              const units = playerStats.Timelines.UnitCounts[i];
              Object.entries(units).forEach(([unit, count]) => {
                if (count && Number(count) > 0) {
                  events.push(`Created ${count} ${unit}`);
                }
              });
            }
            
            // Check building construction
            if (playerStats.Timelines.BuildingCounts && 
                Array.isArray(playerStats.Timelines.BuildingCounts) && 
                playerStats.Timelines.BuildingCounts[i]) {
              const buildings = playerStats.Timelines.BuildingCounts[i];
              Object.entries(buildings).forEach(([building, count]) => {
                if (count && Number(count) > 0) {
                  events.push(`Built ${count} ${building}`);
                }
              });
            }
            
            // Check technologies researched in this timeframe
            if (playerStats.Timelines.TechsPrequeued && Array.isArray(playerStats.Timelines.TechsPrequeued)) {
              const startTime = i * 30;
              const endTime = (i + 1) * 30;
              playerStats.Timelines.TechsPrequeued.forEach((tech: any) => {
                if (tech.GameTimeSecs >= startTime && tech.GameTimeSecs < endTime) {
                  events.push(`Researched ${tech.Name}`);
                }
              });
            }
          }
          
          segmentActivities.push({ playerName, events });
        });
        
        segments.push(segmentActivities);
      }
    }
    
    return segments;
  }

  formatTimeSegment(index: number): string {
    const startMinutes = Math.floor((index * 30) / 60);
    const startSeconds = (index * 30) % 60;
    const endMinutes = Math.floor(((index + 1) * 30) / 60);
    const endSeconds = ((index + 1) * 30) % 60;
    
    return `${startMinutes}:${startSeconds.toString().padStart(2, '0')} - ${endMinutes}:${endSeconds.toString().padStart(2, '0')}`;
  }

  hasSegmentActivity(segment: Array<{playerName: string, events: string[]}>): boolean {
    return segment.some(playerActivity => playerActivity.events.length > 0);
  }

  getPlayerActivity(segment: Array<{playerName: string, events: string[]}>, playerNum: number): {playerName: string, events: string[]} {
    // Find the activity for the specific player number
    const playerActivity = segment.find(activity => {
      // Extract player number from name or use the order
      const playerName = activity.playerName;
      if (playerName.includes('Player 1') || playerName === this.getPlayerName('1')) {
        return playerNum === 1;
      } else if (playerName.includes('Player 2') || playerName === this.getPlayerName('2')) {
        return playerNum === 2;
      }
      return false;
    });
    
    return playerActivity || { 
      playerName: `Player ${playerNum}`, 
      events: [] 
    };
  }

  roundNumber(value: number): number {
    return Math.round(value || 0);
  }

  getMinorGodsCount(minorGods: string[]): number {
    if (!minorGods) return 0;
    return minorGods.filter(g => g && g.trim() !== '').length;
  }

  getLastAgeReached(player: any): string {
    if (!player?.MinorGods || !Array.isArray(player.MinorGods)) {
      return 'Classical Age';
    }
    
    const minorGods = this.getMinorGods(player);
    if (minorGods.length === 0) {
      return 'Classical Age';
    }
    
    // Define age tiers based on minor god names
    const classicalAge = ['anubis', 'ares', 'athena', 'bast', 'chiyou', 'forseti', 'freyja', 'heimdall', 'hermes', 'houtu', 'leto', 'oceanus', 'prometheus', 'ptah', 'ullr', 'xuannu'];
    const heroicAge = ['aegir', 'aphrodite', 'apollo', 'bragi', 'dionysus', 'goumang', 'hyperion', 'nephthys', 'njord', 'nuba', 'rheia', 'rushou', 'sekhmet', 'skadi', 'sobek', 'theia'];
    const mythicAge = ['artemis', 'atlas', 'baldr', 'gonggong', 'hekate', 'hel', 'helios', 'hephaestus', 'hera', 'horus', 'huangdi', 'osiris', 'thoth', 'tyr', 'vidar', 'zhurong'];
    
    let lastAge = 'Classical Age';
    
    for (const god of minorGods) {
      const godKey = god.toLowerCase();
      if (mythicAge.includes(godKey)) {
        lastAge = 'Mythic Age';
      } else if (heroicAge.includes(godKey) && lastAge !== 'Mythic Age') {
        lastAge = 'Heroic Age';
      }
    }
    
    return lastAge;
  }

  getWinnerNames(): string {
    if (!this.parseResult?.data?.Players) return '';
    
    const winners = this.parseResult.data.Players.filter((p: any) => p.Winner);
    return winners.map((p: any) => p.Name).join(', ');
  }

  // Methods for the new timeline component
  getTimelineDataForPlayer(playerNum: number): TimelineSegment[] {
    if (!this.parseResult?.data?.GameCommands || !Array.isArray(this.parseResult.data.GameCommands)) {
      return [];
    }

    // Transform the game commands to match the original format expected by the timeline service
    const transformedCommands = this.parseResult.data.GameCommands.map((command: any) => ({
      PlayerNumber: command.PlayerNum,
      Time: command.GameTimeSecs,
      Type: command.CommandType,
      // Extract data based on command type to match original logic
      Unit: typeof command.Payload === 'string' ? command.Payload : command.Payload?.Name,
      Target: command.Payload?.Name || (typeof command.Payload === 'string' ? command.Payload : ''),
      Building: command.Payload?.Name,
      Technology: typeof command.Payload === 'string' ? command.Payload : command.Payload?.Name,
      GodPower: command.Payload?.Name,
      Queued: command.Payload?.Queued,
      Quantity: 1
    }));

    return this.timelineService.createTimelineFromReplayData(
      transformedCommands,
      playerNum,
      {
        maxSegments: 20,
        segmentDuration: 30,
        showEmptySegments: false,
        compact: false
      }
    );
  }

  getPlayerTimelineName(playerNum: number): string {
    return this.getPlayerName(playerNum.toString());
  }
}