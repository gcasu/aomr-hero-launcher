import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { MatchDataFetcherService } from '../../services/match-data-fetcher.service';
import { ReplayDownloadService } from '../../services/replay-download.service';
import { ReplayCacheService, CachedReplay } from '../../services/replay-cache.service';
import { ReplayParserService, ParseOptions, ParseResult } from '../../services/replay-parser.service';
import { TimelineService } from '../../shared/timeline/timeline.service';
import { MajorGod } from '../../interfaces/major-god.interface';
import { ProcessedMatch } from '../../interfaces/leaderboard.interface';
import { TimelineSegment } from '../../shared/timeline/timeline.interfaces';
import { MAJOR_GODS_DATA, DEFAULT_SELECTED_GOD_ID } from '../../data/major-gods.data';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';
import { TimelineComponent } from '../../shared/timeline/timeline.component';
import { GlassCardComponent } from '../../shared/glass-card/glass-card.component';

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
    TimelineComponent,
    GlassCardComponent
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

  private toastService = inject(ToastService);
  private matchDataFetcher = inject(MatchDataFetcherService);
  private translateService = inject(TranslateService);
  private replayDownloadService = inject(ReplayDownloadService);
  private replayCacheService = inject(ReplayCacheService);
  private replayParserService = inject(ReplayParserService);
  private timelineService = inject(TimelineService);

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
    
    // Smooth scroll to match history section
    this.scrollToMatchHistory();
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

  // Sorting methods
  onSort(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending (except for date which defaults to desc)
      this.sortColumn = column;
      this.sortDirection = column === 'matchDate' ? 'desc' : 'asc';
    }
    
    this.sortMatches();
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

  // Replay analysis methods
  async analyzeReplay(match: ProcessedMatch): Promise<void> {
    if (this.isAnalyzingReplay) {
      return; // Prevent multiple simultaneous analyses
    }

    // Check if replay is already cached
    const cachedReplay = this.replayCacheService.getCachedReplay(match.matchId, match.profileId);
    if (cachedReplay) {
      this.displayCachedReplay(cachedReplay, match.matchId);
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

      // Try to detect if the file is actually compressed by checking file signature
      const isActuallyCompressed = await this.detectFileCompression(downloadResult.file);
      
      console.log('File info:', {
        name: downloadResult.file.name,
        size: downloadResult.file.size,
        type: downloadResult.file.type,
        detectedCompression: isActuallyCompressed
      });

      let fileToProcess = downloadResult.file;
      
      // If compressed, decompress it first
      if (isActuallyCompressed) {
        try {
          console.log('Decompressing file...');
          fileToProcess = await this.decompressFile(downloadResult.file);
          console.log('File decompressed successfully, new size:', fileToProcess.size);
        } catch (decompError) {
          console.error('Decompression failed:', decompError);
          const errorMessage = decompError instanceof Error ? decompError.message : 'Unknown decompression error';
          throw new Error('Failed to decompress replay file: ' + errorMessage);
        }
      }
      
      const parseOptions: ParseOptions = {
        slim: false,
        stats: false,
        prettyPrint: false,
        isGzip: false, // Always false since we decompress everything
        verbose: false
      };

      console.log('Parsing with options:', parseOptions);
      console.log('File to process:', {
        name: fileToProcess.name,
        size: fileToProcess.size,
        type: fileToProcess.type
      });

      const parseResult = await this.replayParserService.parseReplay(
        fileToProcess,
        parseOptions
      ) as ParseResult;

      console.log('Parse result:', {
        success: parseResult.success,
        hasData: !!parseResult.data,
        error: parseResult.error
      });

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
      this.timelineData = this.timelineService.createTimelineFromReplayData(
        transformedCommands,
        winner.playerNumber,
        {
          maxSegments: 20,
          segmentDuration: 30,
          showEmptySegments: false,
          compact: false
        }
      );

      this.winnerPlayerName = winner.playerName;
      this.analysisMatchId = match.matchId;
      this.showTimeline = true;

      // Step 4: Cache the replay data (using uncompressed file)
      try {
        await this.replayCacheService.cacheReplay(
          match.matchId,
          match.profileId,
          fileToProcess, // This is the uncompressed file
          parseResult.data,
          this.timelineData,
          winner.playerName
        );
        console.log('Replay cached successfully');
      } catch (cacheError) {
        console.warn('Failed to cache replay:', cacheError);
      }

      this.toastService.showSuccess(
        this.translateService.instant('BUILD_ORDERS.REPLAY.PARSE_SUCCESS')
      );

    } catch (error) {
      console.error('Failed to analyze replay:', error);
      
      // Try to cache the failed replay if we have an uncompressed file
      let fileToCache: File | null = null;
      try {
        // Check if we got a downloaded file and potentially decompressed it
        const downloadResult = await this.replayDownloadService.downloadReplay(
          match.matchId, 
          match.profileId
        );
        
        if (downloadResult.success && downloadResult.file) {
          const isActuallyCompressed = await this.detectFileCompression(downloadResult.file);
          if (isActuallyCompressed) {
            fileToCache = await this.decompressFile(downloadResult.file);
          } else {
            fileToCache = downloadResult.file;
          }
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
          console.log('Failed replay cached for download access');
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

  private displayCachedReplay(cachedReplay: CachedReplay, matchId: string): void {
    if (cachedReplay.hasError) {
      // Show error message for failed cached replays
      this.toastService.showError(
        cachedReplay.errorMessage || this.translateService.instant('BUILD_ORDERS.REPLAY.CACHED_ERROR')
      );
      return;
    }

    this.timelineData = cachedReplay.timelineData || [];
    this.winnerPlayerName = cachedReplay.winnerPlayerName || '';
    this.analysisMatchId = matchId;
    this.showTimeline = true;

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
    this.showTimeline = false;
    this.timelineData = [];
    this.winnerPlayerName = '';
    this.analysisMatchId = '';
  }

  isMatchBeingAnalyzed(matchId: string): boolean {
    return this.isAnalyzingReplay && this.currentAnalyzingMatchId === matchId;
  }

  getPlayerColorForTimeline(playerNum: number): string {
    const colors = [
      '#FF0000', '#0000FF', '#FFFF00', '#00FF00', 
      '#00FFFF', '#FF00FF', '#808080', '#FFA500',
      '#FFB6C1', '#800080', '#A52A2A', '#FFFFFF'
    ];
    return colors[playerNum - 1] || '#FFFFFF';
  }

  private async detectFileCompression(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as ArrayBuffer;
        if (!result) {
          resolve(false);
          return;
        }

        const bytes = new Uint8Array(result.slice(0, 4));
        
        // Check for gzip magic numbers (1f 8b)
        if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
          resolve(true);
          return;
        }
        
        // Check for zip magic numbers (50 4b 03 04 or 50 4b 05 06 or 50 4b 07 08)
        if (bytes[0] === 0x50 && bytes[1] === 0x4b && 
            (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
          resolve(true);
          return;
        }
        
        // Not compressed
        resolve(false);
      };
      
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  }

  private async decompressFile(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const compressedData = e.target?.result as ArrayBuffer;
          if (!compressedData) {
            reject(new Error('Failed to read file data'));
            return;
          }

          const bytes = new Uint8Array(compressedData);
          
          // Check if it's gzip format
          if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
            try {
              console.log('Decompressing GZIP file...');
              const decompressedStream = new DecompressionStream('gzip');
              const stream = new ReadableStream({
                start(controller) {
                  controller.enqueue(bytes);
                  controller.close();
                }
              });

              const decompressedData = await new Response(
                stream.pipeThrough(decompressedStream)
              ).arrayBuffer();

              const decompressedFile = new File(
                [decompressedData], 
                file.name.replace(/\.(gz|zip)$/, '.mythrec'),
                { type: 'application/octet-stream' }
              );
              
              console.log('GZIP decompression successful');
              resolve(decompressedFile);
            } catch (gzipError) {
              console.error('GZIP decompression failed:', gzipError);
              reject(gzipError);
            }
          }
          // Check if it's zip format
          else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
            try {
              console.log('Decompressing ZIP file...');
              const decompressedFile = await this.extractFromZip(bytes, file.name);
              console.log('ZIP decompression successful');
              resolve(decompressedFile);
            } catch (zipError) {
              console.error('ZIP decompression failed:', zipError);
              reject(zipError);
            }
          }
          else {
            // Not compressed, return as is
            console.log('File is not compressed, returning as-is');
            resolve(file);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async extractFromZip(zipBytes: Uint8Array, originalFileName: string): Promise<File> {
    // Find the first file entry in the ZIP
    const centralDirStart = this.findCentralDirectory(zipBytes);
    if (centralDirStart === -1) {
      throw new Error('Invalid ZIP file: Central directory not found');
    }

    // Read central directory record
    const centralDir = zipBytes.slice(centralDirStart);
    if (centralDir.length < 46) {
      throw new Error('Invalid ZIP file: Central directory too short');
    }

    // Extract file information from central directory
    const compressedSize = this.readUint32LE(centralDir, 20);
    const uncompressedSize = this.readUint32LE(centralDir, 24);
    const compressionMethod = this.readUint16LE(centralDir, 10);
    const fileNameLength = this.readUint16LE(centralDir, 28);
    const extraFieldLength = this.readUint16LE(centralDir, 30);
    const localHeaderOffset = this.readUint32LE(centralDir, 42);

    console.log('ZIP file info:', {
      compressedSize,
      uncompressedSize,
      compressionMethod,
      fileNameLength,
      extraFieldLength,
      localHeaderOffset
    });

    // Find local file header
    const localHeader = zipBytes.slice(localHeaderOffset);
    if (localHeader.length < 30) {
      throw new Error('Invalid ZIP file: Local header too short');
    }

    // Skip local header and filename/extra fields to get to compressed data
    const localFileNameLength = this.readUint16LE(localHeader, 26);
    const localExtraFieldLength = this.readUint16LE(localHeader, 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = zipBytes.slice(dataStart, dataStart + compressedSize);

    console.log('Extracting compressed data from offset:', dataStart, 'size:', compressedSize);

    // Decompress based on compression method
    if (compressionMethod === 0) {
      // No compression
      const decompressedFile = new File(
        [compressedData], 
        originalFileName.replace(/\.(gz|zip)$/, '.mythrec'),
        { type: 'application/octet-stream' }
      );
      return decompressedFile;
    } else if (compressionMethod === 8) {
      // Deflate compression
      try {
        const decompressedStream = new DecompressionStream('deflate-raw');
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(compressedData);
            controller.close();
          }
        });

        const decompressedData = await new Response(
          stream.pipeThrough(decompressedStream)
        ).arrayBuffer();

        const decompressedFile = new File(
          [decompressedData], 
          originalFileName.replace(/\.(gz|zip)$/, '.mythrec'),
          { type: 'application/octet-stream' }
        );
        
        return decompressedFile;
      } catch (deflateError) {
        console.error('Deflate decompression failed:', deflateError);
        throw new Error('Failed to decompress ZIP file data');
      }
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }
  }

  private findCentralDirectory(zipBytes: Uint8Array): number {
    // Look for End of Central Directory signature (0x06054b50) from the end
    for (let i = zipBytes.length - 22; i >= 0; i--) {
      if (zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b && 
          zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06) {
        // Found EOCD, read central directory offset
        const centralDirOffset = this.readUint32LE(zipBytes, i + 16);
        return centralDirOffset;
      }
    }
    return -1;
  }

  private readUint16LE(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  private readUint32LE(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
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
      } else {
        this.displayCachedReplay(cachedReplay, match.matchId);
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


}
