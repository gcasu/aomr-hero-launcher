import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ModService } from '../../services/mod.service';
import { ModDisplayItem } from '../../models/mod.model';
import { ToastService } from '../../services/toast.service';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

// Bootstrap types for tooltips
declare const bootstrap: {
  Tooltip: new (element: Element, options?: Record<string, unknown>) => unknown;
};

@Component({
  selector: 'app-my-mods',
  templateUrl: './my-mods.component.html',
  styleUrls: ['./my-mods.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SearchFilterComponent,
    LoadingStateComponent
  ]
})
export class MyModsComponent implements OnInit, OnDestroy, AfterViewInit {
  mods: ModDisplayItem[] = [];
  filteredMods: ModDisplayItem[] = [];
  filterText = '';
  isLoading = false;
  simdataMergerEnabled = false;
  private autoSaveTimeout: number | null = null;

  private modService = inject(ModService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  async ngOnInit(): Promise<void> {
    await this.loadMods();
  }

  ngAfterViewInit(): void {
    // Initialize Bootstrap tooltips after view is loaded
    this.initializeTooltips();
  }

  private initializeTooltips(): void {
    // Check if we're in a browser environment and Bootstrap is available
    if (typeof document !== 'undefined' && typeof bootstrap !== 'undefined') {
      setTimeout(() => {
        const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => {
          new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true,
            placement: 'top',
            trigger: 'hover focus'
          });
        });
      }, 100);
    }
  }

  async loadMods(): Promise<void> {
    this.isLoading = true;
    try {
      this.mods = await this.modService.loadMods();
      this.applyFilter();
    } catch (error) {
      console.error('Error loading mods:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get hasAnyMods(): boolean {
    return this.mods && this.mods.length > 0;
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.filterText.trim()) {
      this.filteredMods = [...this.mods];
    } else {
      const filter = this.filterText.toLowerCase();
      this.filteredMods = this.mods.filter(mod =>
        mod.Title.toLowerCase().includes(filter) ||
        mod.Author.toLowerCase().includes(filter) ||
        mod.Description.toLowerCase().includes(filter) ||
        mod.Path.toLowerCase().includes(filter)
      );
    }
    
    // Reinitialize tooltips after filtering
    setTimeout(() => this.initializeTooltips(), 50);
  }

  onEnabledToggle(mod: ModDisplayItem): void {
    mod.Enabled = !mod.Enabled;
    this.triggerAutoSave();
  }

  onDrop(event: CdkDragDrop<ModDisplayItem[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      // Move item in the array
      moveItemInArray(this.mods, event.previousIndex, event.currentIndex);
      
      // Update priorities based on new order
      this.mods = this.modService.updatePriorities(this.mods);
      
      // Reapply filter to show updated order
      this.applyFilter();
      
      this.triggerAutoSave();
    }
  }

  private triggerAutoSave(): void {
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    // Set new timeout for auto-save after 1 second of no changes
    this.autoSaveTimeout = window.setTimeout(async () => {
      await this.autoSaveMods();
    }, 1000);
  }

  private async autoSaveMods(): Promise<void> {
    try {
      const success = await this.modService.saveMods(this.mods);
      // Only show error toasts, success is silent for auto-save
      if (!success) {
        this.toastService.showError(this.translate.instant('MY_MODS.MESSAGES.AUTO_SAVE_ERROR'));
      }
    } catch (error) {
      console.error('Error auto-saving mods:', error);
      this.toastService.showError(this.translate.instant('MY_MODS.MESSAGES.AUTO_SAVE_ERROR'));
    }
  }

  formatTimestamp(date?: Date): string {
    if (!date) {
      return this.translate.instant('MY_MODS.MESSAGES.UNKNOWN_DATE');
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  getModIcon(mod: ModDisplayItem): string {
    return mod.isLocal ? 'fas fa-folder' : 'fab fa-steam';
  }

  getModSource(mod: ModDisplayItem): string {
    return mod.isLocal ? this.translate.instant('MY_MODS.SOURCE.LOCAL') : this.translate.instant('MY_MODS.SOURCE.WORKSHOP');
  }

  onSimdataMergerToggle(): void {
    this.toastService.showInfo(this.translate.instant('MY_MODS.MESSAGES.SIMDATA_MERGER_TOGGLE_INFO'));
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }
}
