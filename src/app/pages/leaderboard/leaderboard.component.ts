import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { LeaderboardService } from '../../services/leaderboard.service';
import { ToastService } from '../../services/toast.service';
import { LeaderboardPlayer, LeaderboardRequest } from '../../interfaces/leaderboard.interface';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss'],
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
    SearchFilterComponent
  ]
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  isLoading = false;
  players: LeaderboardPlayer[] = [];
  totalPlayers = 0;
  currentPage = 1;
  playersPerPage = 100;
  filterText = '';
  lastUpdated: string | null = null;

  // Sorting state
  sortColumn = 'rank';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Expose Math for template use
  Math = Math;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private leaderboardService = inject(LeaderboardService);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.currentPage = 1; // Reset to first page when searching
      this.loadLeaderboard();
    });
  }

  private loadLeaderboard(): void {
    this.isLoading = true;
    
    const request: LeaderboardRequest = {
      ...this.leaderboardService.getDefaultRequest(),
      page: this.currentPage,
      searchPlayer: this.filterText,
      count: this.playersPerPage,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection
    };

    this.leaderboardService.getLeaderboard(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.players = response.items;
        this.totalPlayers = response.count;
        this.lastUpdated = response.lastUpdated;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load leaderboard:', error);
        this.translateService.get('LEADERBOARD.ERRORS.FAILED_TO_LOAD_DATA').subscribe(message => {
          this.toastService.showError(message);
        });
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.searchSubject.next(this.filterText);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadLeaderboard();
  }

  onPageInputChange(inputValue: string): void {
    // Remove any non-numeric characters
    const numericValue = inputValue.replace(/[^0-9]/g, '');
    
    // Convert to number
    const pageNumber = parseInt(numericValue, 10);
    
    // Validate the page number
    if (isNaN(pageNumber) || pageNumber < 1) {
      // Invalid input, keep current page
      return;
    }
    
    let targetPage: number;
    
    if (pageNumber > this.totalPages) {
      // Page exceeds maximum, target last page
      targetPage = this.totalPages;
    } else {
      // Valid page number
      targetPage = pageNumber;
    }
    
    // Only change page if it's different from current page
    if (targetPage !== this.currentPage) {
      this.onPageChange(targetPage);
    }
  }

  // Custom pagination helper methods
  get totalPages(): number {
    return Math.ceil(this.totalPlayers / this.playersPerPage);
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  goToPreviousPage(): void {
    if (this.canGoPrevious) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.canGoNext) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  goToFirstPage(): void {
    if (this.currentPage !== 1) {
      this.onPageChange(1);
    }
  }

  goToLastPage(): void {
    if (this.currentPage !== this.totalPages) {
      this.onPageChange(this.totalPages);
    }
  }

  getPageNumbers(): number[] {
    const delta = 2; // Show 2 pages before and after current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    
    const start = Math.max(1, this.currentPage - delta);
    const end = Math.min(this.totalPages, this.currentPage + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Add first page and ellipsis if needed
    if (start > 1) {
      if (start > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }
    }

    rangeWithDots.push(...range);

    // Add last page and ellipsis if needed
    if (end < this.totalPages) {
      if (end < this.totalPages - 1) {
        rangeWithDots.push('...', this.totalPages);
      } else {
        rangeWithDots.push(this.totalPages);
      }
    }

    return rangeWithDots.filter(item => typeof item === 'number') as number[];
  }

  get startItemNumber(): number {
    return (this.currentPage - 1) * this.playersPerPage + 1;
  }

  get endItemNumber(): number {
    return Math.min(this.currentPage * this.playersPerPage, this.totalPlayers);
  }

  // Sorting methods
  onSort(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    // Reset to first page when sorting changes
    this.currentPage = 1;
    this.loadLeaderboard();
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

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
  }

  trackByPlayer(index: number, player: LeaderboardPlayer): number {
    return player.rlUserId;
  }

  getRankClass(rank: number): string {
    switch (rank) {
      case 1: return 'rank-gold';
      case 2: return 'rank-silver';
      case 3: return 'rank-bronze';
      default: return '';
    }
  }

  openPlayerStats(player: LeaderboardPlayer): void {
    if (!player.rlUserId) {
      console.warn('No profile ID available for player:', player.userName);
      this.translateService.get('LEADERBOARD.ERRORS.PLAYER_PROFILE_NOT_AVAILABLE').subscribe(message => {
        this.toastService.showWarning(message);
      });
      return;
    }
    
    const statsUrl = `https://www.ageofempires.com/stats/?profileId=${player.rlUserId}&game=ageMyth&matchType=1`;
    window.open(statsUrl, '_blank');
  }
}
