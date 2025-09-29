import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { MatchDataFetcherService } from '../../services/match-data-fetcher.service';
import { ReplayDownloadService } from '../../services/replays/replay-download.service';
import { ReplayCacheService } from '../../services/replays/replay-cache.service';
import { ReplayFileService } from '../../services/replays/replay-file.service';
import { ReplayParserService, ParseOptions, ParseResult } from '../../services/replays/replay-parser.service';
import { TimelineService } from '../../shared/timeline/timeline.service';
import { PlayerColorService } from '../../services/player-color.service';
import { DodBuildOrdersService, BuildOrder } from '../../services/dod-build-orders.service';
import { MajorGod } from '../../interfaces/major-god.interface';
import { ProcessedMatch } from '../../interfaces/leaderboard.interface';
import { CachedReplay } from '../../interfaces/replay-cache.interface';
import { TimelineSegment, TimelineEventType } from '../../shared/timeline/timeline.interfaces';
import { MAJOR_GODS_DATA, DEFAULT_SELECTED_GOD_ID } from '../../interfaces/major-gods.data';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';
import { TimelineComponent } from '../../shared/timeline/timeline.component';



@Component({
  selector: 'app-build-orders',
  templateUrl: './build-orders.component.html',
  styleUrls: ['./build-orders.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    SearchFilterComponent,
    TimelineComponent
  ]
})
export class BuildOrdersComponent implements OnInit {
  isLoading = true;
  majorGods: MajorGod[] = [];
  selectedGodId: string = DEFAULT_SELECTED_GOD_ID;
  matchHistory: ProcessedMatch[] = [];
  filteredMatches: ProcessedMatch[] = [];
  godMatches: ProcessedMatch[] = []; // Matches for the selected god (before search filter)
  searchTerm = '';

  // Tab state
  activeTabId = 'top-rank-matches';

  // Sorting state
  sortColumn = 'matchDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Replay analysis state
  isAnalyzingReplay = false;
  currentAnalyzingMatchId: string | null = null;
  showTimeline = false;
  timelineData: TimelineSegment[] = [];
  winnerPlayerName = '';
  analysisMatchId = '';
  
  // Row-specific timeline state
  expandedRows: Set<string> = new Set(); // Track which rows have their timeline expanded
  rowTimelineData: Map<string, TimelineSegment[]> = new Map(); // Store timeline data per row
  rowWinnerNames: Map<string, string> = new Map(); // Store winner names per row
  rowParsedData: Map<string, any> = new Map(); // Store parsed data per row for color extraction

  // DoD Clan Build Orders state
  dodBuildOrders: BuildOrder[] = [];
  isDodLoading = false;
  dodError: string | null = null;
  expandedBuildOrderIndex: number = -1;
  expandedBuildOrderData: BuildOrder | null = null;

  private toastService = inject(ToastService);
  private matchDataFetcher = inject(MatchDataFetcherService);
  private translateService = inject(TranslateService);
  private replayDownloadService = inject(ReplayDownloadService);
  private replayCacheService = inject(ReplayCacheService);
  private replayFileService = inject(ReplayFileService);
  private replayParserService = inject(ReplayParserService);
  private timelineService = inject(TimelineService);
  private playerColorService = inject(PlayerColorService);
  private dodBuildOrdersService = inject(DodBuildOrdersService);

  ngOnInit(): void {
    this.loadMajorGods();
    this.loadSelectedGod();
    this.loadMatchHistory();
  }

  private loadMajorGods(): void {
    // Simulate loading time
    setTimeout(() => {
      this.majorGods = MAJOR_GODS_DATA;
      this.isLoading = false;
      // Filter matches after gods are loaded
      this.filterMatchesByGod();
    }, 500);
  }

  private loadSelectedGod(): void {
    const savedGodId = localStorage.getItem('selectedMajorGod');
    if (savedGodId) {
      this.selectedGodId = savedGodId;
    }
  }

  private saveSelectedGod(godId: string): void {
    localStorage.setItem('selectedMajorGod', godId);
  }

  onGodSelect(god: MajorGod): void {
    this.selectedGodId = god.id;
    this.searchTerm = ''; // Reset search when god changes
    this.saveSelectedGod(god.id);
    this.filterMatchesByGod();
    
    // If DoD build orders tab is active, trigger file fetch for the new god
    if (this.activeTabId === 'dod-clan-build-orders') {
      // Clear previous DoD data
      this.dodBuildOrders = [];
      this.dodError = null;
      
      // Load build orders for the newly selected god
      if (this.isDodGodAvailable()) {
        this.loadDodBuildOrders();
      }
    }
    
    // Smooth scroll to match history section
    this.scrollToMatchHistory();
  }

  onTabChange(tabId: string): void {
    this.activeTabId = tabId;
    // Reset search when tab changes
    this.searchTerm = '';
    
    // You can add different logic based on the active tab
    if (tabId === 'top-rank-matches') {
      // Logic for top rank matches tab
      this.filterMatchesByGod();
    } else if (tabId === 'dod-clan-build-orders') {
      // Logic for DoD clan build orders tab
      this.filteredMatches = [];
      if (this.isDodGodAvailable()) {
        this.loadDodBuildOrders();
      }
    }
  }

  private scrollToMatchHistory(): void {
    setTimeout(() => {
      const element = document.getElementById('match-history-section');
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // Small delay to ensure the section is rendered
  }

  isGodSelected(godId: string): boolean {
    return this.selectedGodId === godId;
  }

  trackByGod(index: number, god: MajorGod): string {
    return god.id;
  }

  trackByMatch(index: number, match: ProcessedMatch): string {
    return match.matchId;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
  }

  private loadMatchHistory(): void {
    const cachedData = this.matchDataFetcher.getCachedData();
    if (cachedData) {
      this.matchHistory = cachedData.matches;
      // Don't filter here - will be called after gods are loaded
    }
  }

  private filterMatchesByGod(): void {
    const selectedGod = this.majorGods.find(god => god.id === this.selectedGodId);
    if (selectedGod) {
      this.godMatches = this.matchHistory.filter(match => 
        match.civilization.toLowerCase() === selectedGod.name.toLowerCase()
      );
      this.applySearchFilter();
    } else {
      this.godMatches = [];
      this.filteredMatches = [];
    }
  }

  private applySearchFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMatches = [...this.godMatches];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredMatches = this.godMatches.filter(match => 
        match.winningPlayer.toLowerCase().includes(searchLower) ||
        this.formatMapName(match.mapType).toLowerCase().includes(searchLower)
      );
    }
    this.sortMatches();
  }

  onSearchChange(): void {
    this.applySearchFilter();
  }

  onFilterByPlayer(playerName: string): void {
    this.searchTerm = playerName;
    this.applySearchFilter();
  }

  onFilterByMap(mapType: string): void {
    this.searchTerm = this.formatMapName(mapType);
    this.applySearchFilter();
  }

  hasGodMatches(): boolean {
    return this.godMatches.length > 0;
  }

  isSearchFiltered(): boolean {
    return this.searchTerm.trim().length > 0 && this.filteredMatches.length === 0 && this.godMatches.length > 0;
  }

  formatMapName(mapType: string): string {
    // Remove "Rm_" prefix and convert to Title Case
    return mapType
      .replace(/^Rm_/, '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  formatDate(dateString: string): Date {
    return new Date(dateString);
  }

  getSelectedGodMatchTitle(): string {
    const baseTitle = this.translateService.instant('BUILD_ORDERS.RECENT_MATCHES');
    const selectedGod = this.majorGods.find(god => god.id === this.selectedGodId);
    if (selectedGod) {
      return `${baseTitle} for ${selectedGod.name}`;
    }
    return baseTitle;
  }

  getMatchCountText(): string {
    const total = this.godMatches.length;
    const filtered = this.filteredMatches.length;
    
    if (this.searchTerm.trim()) {
      return `${filtered} of ${total} matches`;
    }
    return `${total} matches`;
  }

  // Sorting methods (supports both matches and DoD build orders)
  onSort(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending (except for date which defaults to desc)
      this.sortColumn = column;
      this.sortDirection = column === 'matchDate' ? 'desc' : 'asc';
    }
    
    // Sort appropriate data based on current tab/view
    if (this.dodBuildOrders.length > 0) {
      this.sortDodBuildOrders();
    } else {
      this.sortMatches();
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'fas fa-sort'; // No sort applied
    }
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  isSortedBy(column: string): boolean {
    return this.sortColumn === column;
  }

  private sortMatches(): void {
    this.filteredMatches.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortColumn) {
        case 'winningPlayer':
          valueA = a.winningPlayer.toLowerCase();
          valueB = b.winningPlayer.toLowerCase();
          break;
        case 'matchDate':
          valueA = new Date(a.matchDate).getTime();
          valueB = new Date(b.matchDate).getTime();
          break;
        case 'mapType':
          valueA = this.formatMapName(a.mapType).toLowerCase();
          valueB = this.formatMapName(b.mapType).toLowerCase();
          break;
        default:
          return 0;
      }

      let comparison = 0;
      if (valueA < valueB) {
        comparison = -1;
      } else if (valueA > valueB) {
        comparison = 1;
      }

      return this.sortDirection === 'desc' ? comparison * -1 : comparison;
    });
  }

  private sortDodBuildOrders(): void {
    this.dodBuildOrders.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortColumn) {
        case 'buildOrder':
          valueA = a.buildOrder.toLowerCase();
          valueB = b.buildOrder.toLowerCase();
          break;
        case 'author':
          valueA = (a.author || 'Unknown').toLowerCase();
          valueB = (b.author || 'Unknown').toLowerCase();
          break;
        case 'steps':
          valueA = a.steps.length;
          valueB = b.steps.length;
          break;
        case 'opponent':
          valueA = (a.opponent?.civ || 'Any').toLowerCase();
          valueB = (b.opponent?.civ || 'Any').toLowerCase();
          break;
        default:
          return 0;
      }

      let comparison = 0;
      if (valueA < valueB) {
        comparison = -1;
      } else if (valueA > valueB) {
        comparison = 1;
      }

      return this.sortDirection === 'desc' ? comparison * -1 : comparison;
    });
  }

  // Replay analysis methods
  async analyzeReplay(match: ProcessedMatch): Promise<void> {
    if (this.isAnalyzingReplay) {
      return; // Prevent multiple simultaneous analyses
    }

    // Check if replay is already cached
    const cachedReplay = this.replayCacheService.getCachedReplay(match.matchId, match.profileId);
    if (cachedReplay) {
      this.displayCachedReplay(cachedReplay, match);
      return;
    }

    this.isAnalyzingReplay = true;
    this.currentAnalyzingMatchId = match.matchId;
    this.showTimeline = false;

    try {
      // Step 1: Download the replay (service will show its own toast)
      const downloadResult = await this.replayDownloadService.downloadReplay(
        match.matchId, 
        match.profileId
      );

      if (!downloadResult.success || !downloadResult.file) {
        throw new Error(downloadResult.error || 'Failed to download replay');
      }

      // Step 2: Parse the replay
      this.toastService.showInfo(
        this.translateService.instant('BUILD_ORDERS.REPLAY.PARSING')
      );

      const parseOptions: ParseOptions = {
        slim: false,
        stats: false,
        prettyPrint: false,
        isGzip: false,
        verbose: false
      };

      const parseResult = await this.replayFileService.processReplayFile(
        downloadResult.file,
        parseOptions
      ) as ParseResult;

      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || 'Failed to parse replay');
      }

      // Step 3: Find the winner and create timeline
      const winner = this.findWinner(parseResult.data);
      if (!winner) {
        throw new Error('No winner data found in replay');
      }

      // Transform the game commands to match the expected format
      const transformedCommands = this.transformGameCommands(parseResult.data.GameCommands);
      
      // Create timeline for the winner
      const timelineData = this.timelineService.createTimelineFromReplayData(
        transformedCommands,
        winner.playerNumber,
        {
          maxSegments: 20,
          segmentDuration: 30,
          showEmptySegments: false,
          compact: false
        }
      );

      // Store in row-specific data
      const rowKey = this.getRowKey(match);
      this.rowTimelineData.set(rowKey, timelineData);
      this.rowWinnerNames.set(rowKey, winner.playerName);
      this.rowParsedData.set(rowKey, parseResult.data);

      // Keep for backward compatibility (if needed)
      this.timelineData = timelineData;
      this.winnerPlayerName = winner.playerName;
      this.analysisMatchId = match.matchId;

      // Step 4: Cache the replay data
      try {
        const processedFile = await this.replayFileService.decompressFile(downloadResult.file);
        await this.replayCacheService.cacheReplay(
          match.matchId,
          match.profileId,
          processedFile,
          parseResult.data,
          timelineData,
          winner.playerName
        );
      } catch (cacheError) {
        console.warn('Failed to cache replay:', cacheError);
      }

      // Step 5: Automatically expand the timeline for this row
      this.expandedRows.add(rowKey);

      this.toastService.showSuccess(
        this.translateService.instant('BUILD_ORDERS.REPLAY.PARSE_SUCCESS')
      );

    } catch (error) {
      console.error('Failed to analyze replay:', error);
      
      // Try to cache the failed replay
      let fileToCache: File | null = null;
      try {
        const downloadResult = await this.replayDownloadService.downloadReplay(
          match.matchId, 
          match.profileId
        );
        
        if (downloadResult.success && downloadResult.file) {
          fileToCache = await this.replayFileService.decompressFile(downloadResult.file);
        }
      } catch (downloadError) {
        console.warn('Could not get file for failed replay caching:', downloadError);
      }

      // Cache the failed replay if we have a file
      if (fileToCache) {
        try {
          const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
          await this.replayCacheService.cacheFailedReplay(
            match.matchId,
            match.profileId,
            fileToCache,
            errorMessage
          );
        } catch (cacheError) {
          console.warn('Failed to cache failed replay:', cacheError);
        }
      }

      this.toastService.showError(
        error instanceof Error ? error.message : 
        this.translateService.instant('BUILD_ORDERS.REPLAY.PARSE_ERROR')
      );
    } finally {
      this.isAnalyzingReplay = false;
      this.currentAnalyzingMatchId = null;
    }
  }

  private displayCachedReplay(cachedReplay: CachedReplay, match: ProcessedMatch): void {
    if (cachedReplay.hasError) {
      // Show error message for failed cached replays
      this.toastService.showError(
        cachedReplay.errorMessage || this.translateService.instant('BUILD_ORDERS.REPLAY.CACHED_ERROR')
      );
      return;
    }

    // Store cached data in row-specific data (if not already done)
    const rowKey = this.getRowKey(match);
    if (!this.rowTimelineData.has(rowKey)) {
      this.rowTimelineData.set(rowKey, cachedReplay.timelineData || []);
      this.rowWinnerNames.set(rowKey, cachedReplay.winnerPlayerName || '');
      this.rowParsedData.set(rowKey, cachedReplay.parsedData);
    }

    // Automatically expand the timeline for this row
    this.expandedRows.add(rowKey);

    this.toastService.showSuccess(
      this.translateService.instant('BUILD_ORDERS.REPLAY.CACHED_SUCCESS')
    );
  }

  private findWinner(replayData: any): { playerNumber: number, playerName: string } | null {
    if (!replayData?.Players || !Array.isArray(replayData.Players)) {
      return null;
    }

    const winner = replayData.Players.find((player: any) => player.Winner === true);
    if (!winner) {
      return null;
    }

    return {
      playerNumber: winner.PlayerNumber || winner.PlayerNum,
      playerName: winner.Name || `Player ${winner.PlayerNumber || winner.PlayerNum}`
    };
  }

  private transformGameCommands(gameCommands: any[]): any[] {
    if (!gameCommands || !Array.isArray(gameCommands)) {
      return [];
    }

    return gameCommands.map((command: any) => ({
      PlayerNumber: command.PlayerNum,
      Time: command.GameTimeSecs,
      Type: command.CommandType,
      Unit: typeof command.Payload === 'string' ? command.Payload : command.Payload?.Name,
      Target: command.Payload?.Name || (typeof command.Payload === 'string' ? command.Payload : ''),
      Building: command.Payload?.Name,
      Technology: typeof command.Payload === 'string' ? command.Payload : command.Payload?.Name,
      GodPower: command.Payload?.Name,
      Queued: command.Payload?.Queued,
      Quantity: 1
    }));
  }

  closeTimeline(): void {
    // Legacy method - no longer used since timelines are now inline
    this.showTimeline = false;
    this.timelineData = [];
    this.winnerPlayerName = '';
    this.analysisMatchId = '';
  }

  isMatchBeingAnalyzed(matchId: string): boolean {
    return this.isAnalyzingReplay && this.currentAnalyzingMatchId === matchId;
  }

  // Row expansion methods
  getRowKey(match: ProcessedMatch): string {
    return `${match.matchId}_${match.profileId}`;
  }

  isRowExpanded(match: ProcessedMatch): boolean {
    return this.expandedRows.has(this.getRowKey(match));
  }

  toggleRowTimeline(match: ProcessedMatch): void {
    const rowKey = this.getRowKey(match);
    
    if (this.expandedRows.has(rowKey)) {
      // Collapse the row
      this.expandedRows.delete(rowKey);
    } else {
      // Expand the row - load timeline data if not already loaded
      const cachedReplay = this.replayCacheService.getCachedReplay(match.matchId, match.profileId);
      if (cachedReplay && !cachedReplay.hasError) {
        this.rowTimelineData.set(rowKey, cachedReplay.timelineData || []);
        this.rowWinnerNames.set(rowKey, cachedReplay.winnerPlayerName || '');
        this.rowParsedData.set(rowKey, cachedReplay.parsedData);
        this.expandedRows.add(rowKey);
      }
    }
  }

  getRowTimelineData(match: ProcessedMatch): TimelineSegment[] {
    return this.rowTimelineData.get(this.getRowKey(match)) || [];
  }

  getRowWinnerName(match: ProcessedMatch): string {
    return this.rowWinnerNames.get(this.getRowKey(match)) || '';
  }

  getPlayerColorFromParsedData(match: ProcessedMatch): string {
    // const parsedData = this.rowParsedData.get(this.getRowKey(match));
    // return this.playerColorService.getPlayerColorFromParsedData(parsedData);
    return this.playerColorService.getDefaultColor();
  }

  // Cache utility methods
  isReplayCached(match: ProcessedMatch): boolean {
    return this.replayCacheService.isReplayCached(match.matchId, match.profileId);
  }

  hasReplayCacheError(match: ProcessedMatch): boolean {
    return this.replayCacheService.hasReplayCacheError(match.matchId, match.profileId);
  }

  isReplayCacheSuccessful(match: ProcessedMatch): boolean {
    return this.replayCacheService.isReplayCacheSuccessful(match.matchId, match.profileId);
  }

  async downloadReplayFile(match: ProcessedMatch): Promise<void> {
    try {
      const replayFile = await this.replayCacheService.exportReplayFile(match.matchId, match.profileId);
      if (!replayFile) {
        // If not cached, download it first
        await this.analyzeReplay(match);
        
        // Try again after analysis
        const newReplayFile = await this.replayCacheService.exportReplayFile(match.matchId, match.profileId);
        if (!newReplayFile) {
          throw new Error('Failed to get replay file after analysis');
        }
        this.downloadFile(newReplayFile, `match_${match.matchId}.mythrec`);
      } else {
        this.downloadFile(replayFile, `match_${match.matchId}.mythrec`);
      }

      this.toastService.showSuccess(
        this.translateService.instant('BUILD_ORDERS.REPLAY.DOWNLOAD_SUCCESS')
      );
    } catch (error) {
      console.error('Failed to download replay file:', error);
      this.toastService.showError(
        this.translateService.instant('BUILD_ORDERS.REPLAY.DOWNLOAD_ERROR')
      );
    }
  }

  async downloadReplayJson(match: ProcessedMatch): Promise<void> {
    try {
      const jsonBlob = this.replayCacheService.exportParsedJson(match.matchId, match.profileId);
      if (!jsonBlob) {
        // If not cached, analyze it first
        await this.analyzeReplay(match);
        
        // Try again after analysis
        const newJsonBlob = this.replayCacheService.exportParsedJson(match.matchId, match.profileId);
        if (!newJsonBlob) {
          throw new Error('Failed to get parsed JSON after analysis');
        }
        this.downloadBlob(newJsonBlob, `match_${match.matchId}_parsed.json`);
      } else {
        this.downloadBlob(jsonBlob, `match_${match.matchId}_parsed.json`);
      }

      this.toastService.showSuccess(
        this.translateService.instant('BUILD_ORDERS.REPLAY.JSON_DOWNLOAD_SUCCESS')
      );
    } catch (error) {
      console.error('Failed to download parsed JSON:', error);
      this.toastService.showError(
        this.translateService.instant('BUILD_ORDERS.REPLAY.JSON_DOWNLOAD_ERROR')
      );
    }
  }

  async showCachedTimeline(match: ProcessedMatch): Promise<void> {
    try {
      const cachedReplay = this.replayCacheService.getCachedReplay(match.matchId, match.profileId);
      if (!cachedReplay) {
        // If not cached, analyze it first
        await this.analyzeReplay(match);
        // After analysis, toggle the row if successful
        const newCachedReplay = this.replayCacheService.getCachedReplay(match.matchId, match.profileId);
        if (newCachedReplay && !newCachedReplay.hasError) {
          this.toggleRowTimeline(match);
        }
      } else {
        this.toggleRowTimeline(match);
      }
    } catch (error) {
      console.error('Failed to show timeline:', error);
      this.toastService.showError(
        this.translateService.instant('BUILD_ORDERS.REPLAY.TIMELINE_ERROR')
      );
    }
  }

  private downloadFile(file: File, filename: string): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // DoD Clan Build Orders Methods

  /**
   * Load DoD build orders for the currently selected god
   */
  loadDodBuildOrders(): void {
    if (!this.selectedGodId) return;

    const selectedGod = this.majorGods.find(god => god.id === this.selectedGodId);
    if (!selectedGod) return;

    this.isDodLoading = true;
    this.dodError = null;

    this.dodBuildOrdersService.getBuildOrdersForGod(selectedGod.name).subscribe({
      next: (buildOrders: BuildOrder[]) => {
        this.dodBuildOrders = buildOrders;
        this.isDodLoading = false;
        this.showSuccessMessage(
          this.translateService.instant('BUILD_ORDERS.DOD_CLAN.LOADED_SUCCESS', { godName: selectedGod.name })
        );
      },
      error: (error: any) => {
        console.error('Error loading DoD build orders:', error);
        this.dodError = this.translateService.instant('BUILD_ORDERS.DOD_CLAN.LOAD_ERROR', { 
          godName: selectedGod.name, 
          error: error.message || 'Unknown error' 
        });
        this.isDodLoading = false;
        this.showErrorMessage(this.dodError || 'Unknown error');
      }
    });
  }

  /**
   * Export build order as JSON
   */
  downloadDodBuildOrder(buildOrder: BuildOrder): void {
    try {
      const jsonData = JSON.stringify(buildOrder, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const fileName = `${buildOrder.godName}_${buildOrder.buildOrder.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      this.downloadBlob(blob, fileName);
      this.showSuccessMessage(
        this.translateService.instant('BUILD_ORDERS.DOD_CLAN.DOWNLOAD_SUCCESS', { fileName })
      );
    } catch (error) {
      console.error('Error downloading build order:', error);
      this.showErrorMessage(this.translateService.instant('BUILD_ORDERS.DOD_CLAN.DOWNLOAD_ERROR'));
    }
  }

  /**
   * Get all available god names for DoD build orders
   */
  getAvailableDodGods(): string[] {
    // Since this is now async, we'll return empty array and load async
    this.dodBuildOrdersService.getAvailableGods().subscribe(gods => {
      // This could be used to populate a dropdown or similar
    });
    return [];
  }

  /**
   * Check if current god has DoD build orders available
   */
  isDodGodAvailable(): boolean {
    if (!this.selectedGodId) return false;
    const selectedGod = this.majorGods.find(god => god.id === this.selectedGodId);
    if (!selectedGod) return false;
    
    // Since isGodAvailable is now async, we need to handle this differently
    // For now, we'll assume availability and let the actual fetch handle errors
    return true;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Clear DoD build orders from memory (no cache to clear in new implementation)
   */
  clearDodCache(): void {
    this.dodBuildOrders = [];
    this.showSuccessMessage(this.translateService.instant('BUILD_ORDERS.DOD_CLAN.CACHE_CLEARED'));
  }

  /**
   * Show success message via toast
   */
  private showSuccessMessage(message: string): void {
    this.toastService.showSuccess(message);
  }

  /**
   * Show error message via toast
   */
  private showErrorMessage(message: string): void {
    this.toastService.showError(message);
  }

  /**
   * Get the latest DoD build order for the selected god
   */
  getLatestDodBuildOrder() {
    return this.dodBuildOrders.length > 0 ? this.dodBuildOrders[0] : null;
  }

  /**
   * Get the selected god name
   */
  getSelectedGodName(): string {
    if (!this.selectedGodId) return '';
    const selectedGod = this.majorGods.find(god => god.id === this.selectedGodId);
    return selectedGod ? selectedGod.name : '';
  }

  /**
   * Toggle build order expansion (table row style)
   */
  toggleBuildOrderExpansion(index: number): void {
    this.expandedBuildOrderIndex = this.expandedBuildOrderIndex === index ? -1 : index;
    this.expandedBuildOrderData = this.expandedBuildOrderIndex === index ? this.dodBuildOrders[index] : null;
  }

  /**
   * Check if build order is expanded
   */
  isBuildOrderExpanded(index: number): boolean {
    return this.expandedBuildOrderIndex === index;
  }

  /**
   * Track by function for build order table
   */
  trackByBuildOrder(index: number, buildOrder: BuildOrder): string {
    return `${buildOrder.godName}-${buildOrder.buildOrder}-${index}`;
  }

  /**
   * Get total number of actions across all steps in a build order
   */
  getTotalActions(buildOrder: BuildOrder): number {
    return buildOrder.steps.reduce((total, step) => total + step.actions.length, 0);
  }

  /**
   * Convert build order to timeline segments
   */
  convertBuildOrderToTimeline(buildOrder: BuildOrder): TimelineSegment[] {
    const segments: TimelineSegment[] = [];
    let currentTime = 0;
    
    buildOrder.steps.forEach((step, stepIndex) => {
      // Parse timing or use estimated time
      const stepTime = this.parseTimingToSeconds(step.timing) || (stepIndex * 60); // Default 1 minute per step
      
      const events = step.actions.map(action => ({
        description: action.description,
        icon: this.getActionIcon(action.description),
        iconColor: 'text-primary',
        type: this.getActionEventType(action.description),
        metadata: {
          workers: action.workers,
          delta: action.delta,
          timing: action.timing
        }
      }));
      
      segments.push({
        startTime: currentTime,
        endTime: stepTime,
        events: events,
        label: step.name
      });
      
      currentTime = stepTime;
    });
    
    return segments;
  }

  /**
   * Parse timing string to seconds
   */
  private parseTimingToSeconds(timing: string | null | undefined): number | null {
    if (!timing) return null;
    
    const timeMatch = timing.match(/(\d+):(\d+)/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    }
    
    const minuteMatch = timing.match(/(\d+)\s*min/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]) * 60;
    }
    
    return null;
  }

  /**
   * Get appropriate icon for action description
   */
  private getActionIcon(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('villager') || desc.includes('worker')) return 'fas fa-user';
    if (desc.includes('house') || desc.includes('build')) return 'fas fa-home';
    if (desc.includes('advance') || desc.includes('age')) return 'fas fa-arrow-up';
    if (desc.includes('military') || desc.includes('soldier')) return 'fas fa-shield-alt';
    if (desc.includes('temple') || desc.includes('god')) return 'fas fa-place-of-worship';
    if (desc.includes('research') || desc.includes('technology')) return 'fas fa-flask';
    if (desc.includes('food') || desc.includes('hunt')) return 'fas fa-apple-alt';
    if (desc.includes('wood') || desc.includes('lumber')) return 'fas fa-tree';
    if (desc.includes('gold') || desc.includes('mine')) return 'fas fa-coins';
    if (desc.includes('favor')) return 'fas fa-star';
    
    return 'fas fa-play';
  }

  /**
   * Get appropriate event type for action description
   */
  private getActionEventType(description: string): TimelineEventType {
    const desc = description.toLowerCase();
    
    if (desc.includes('villager') || desc.includes('worker')) return TimelineEventType.TRAIN;
    if (desc.includes('house') || desc.includes('build')) return TimelineEventType.BUILD;
    if (desc.includes('advance') || desc.includes('age')) return TimelineEventType.ADVANCEMENT;
    if (desc.includes('military') || desc.includes('soldier')) return TimelineEventType.MILITARY;
    if (desc.includes('temple') || desc.includes('god')) return TimelineEventType.GOD_POWER;
    if (desc.includes('research') || desc.includes('technology')) return TimelineEventType.RESEARCH;
    if (desc.includes('food') || desc.includes('wood') || desc.includes('gold') || desc.includes('favor')) return TimelineEventType.ECONOMIC;
    if (desc.includes('tribute') || desc.includes('trade')) return TimelineEventType.TRADE;
    
    return TimelineEventType.OTHER;
  }

}
