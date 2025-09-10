import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { MatchDataFetcherService } from '../../services/match-data-fetcher.service';
import { MajorGod } from '../../interfaces/major-god.interface';
import { ProcessedMatch } from '../../interfaces/leaderboard.interface';
import { MAJOR_GODS_DATA, DEFAULT_SELECTED_GOD_ID } from '../../data/major-gods.data';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';

@Component({
  selector: 'app-build-orders',
  templateUrl: './build-orders.component.html',
  styleUrls: ['./build-orders.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    SearchFilterComponent
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

  private toastService = inject(ToastService);
  private matchDataFetcher = inject(MatchDataFetcherService);
  private translateService = inject(TranslateService);

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
}
