import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../services/toast.service';
import { FALLBACK_TIER_LISTS } from './tiers-data';
import { TierItem, TierRow, TierList, TierConfiguration } from './tiers.interfaces';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { TitleCasePipe } from '../../shared/pipes/title-case.pipe';

// Constants
const AUTO_SAVE_DELAY = 2000;
const STORAGE_KEY_PREFIX = 'tierlist_';
const IMAGE_EXTENSIONS = /\.(webp|jpg|jpeg|png)$/i;
const TIER_COLORS = {
  S: '#ff7f7f',
  A: '#ffbf7f', 
  B: '#ffff7f',
  C: '#bfff7f',
  D: '#7fff7f'
} as const;

@Component({
  selector: 'app-tiers',
  templateUrl: './tiers.component.html',
  styleUrls: ['./tiers.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    TranslateModule, 
    NgbDropdownModule, 
    NgbTooltipModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    TitleCasePipe
  ]
})
export class TiersComponent implements OnInit, OnDestroy {
  availableTierLists: TierList[] = [];
  selectedTierList = '';
  isLoading = true;
  
  tierRows: TierRow[] = [
    { tier: 'S', items: [], color: TIER_COLORS.S },
    { tier: 'A', items: [], color: TIER_COLORS.A },
    { tier: 'B', items: [], color: TIER_COLORS.B },
    { tier: 'C', items: [], color: TIER_COLORS.C },
    { tier: 'D', items: [], color: TIER_COLORS.D }
  ];
  
  unassignedItems: TierItem[] = [];
  private autoSaveTimeout: number | null = null;
  private currentlyDraggedItem: TierItem | null = null;
  private dragInProgress: boolean = false;

  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    await this.loadAvailableTierLists();
  }

  ngOnDestroy(): void {
    this.clearAutoSaveTimeout();
  }

  private clearAutoSaveTimeout(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }

  async loadAvailableTierLists(): Promise<void> {
    this.isLoading = true;
    try {
      // Check if we're running in Electron environment
      if (!window.electronAPI) {
        this.loadFallbackTierLists();
        return;
      }

      const tiersPath = await this.findTiersDirectory();
      if (!tiersPath) {
        this.toastService.showWarning(this.translateService.instant('TIERS.MESSAGES.NO_TIER_LISTS_FOUND'));
        return;
      }

      await this.loadTierListsFromDirectory(tiersPath);
      
      if (this.availableTierLists.length > 0) {
        this.selectedTierList = this.availableTierLists[0].name;
        await this.loadTierList();
      } else {
        this.toastService.showWarning(this.translateService.instant('TIERS.MESSAGES.NO_TIER_LISTS_FOUND'));
      }
    } catch (error) {
      console.error('Error loading tier lists:', error);
      this.toastService.showError(this.translateService.instant('TIERS.MESSAGES.LOAD_ERROR'));
    } finally {
      this.isLoading = false;
    }
  }

  private async findTiersDirectory(): Promise<string | null> {
    const appPath = await window.electronAPI.getAppPath();
    
    // Try different possible paths for the tiers directory
    const possiblePaths = [
      window.electronAPI.pathJoin(appPath, 'dist', 'aom-launcher', 'assets', 'images', 'tiers'), // Production build
      window.electronAPI.pathJoin(appPath, 'src', 'assets', 'images', 'tiers'), // Development
      window.electronAPI.pathJoin(appPath, 'assets', 'images', 'tiers'), // Alternative production
      window.electronAPI.pathJoin(appPath, '..', 'src', 'assets', 'images', 'tiers') // Alternative development
    ];
    
    // Try each path until we find one that works
    for (const path of possiblePaths) {
      try {
        const exists = await window.electronAPI.fileExists(path);
        if (exists) {
          const tierFolders = await window.electronAPI.readDirectory(path);
          if (tierFolders.length > 0) {
            return path;
          }
        }
      } catch {
        continue;
      }
    }
    
    return null;
  }

  private async loadTierListsFromDirectory(tiersPath: string): Promise<void> {
    const tierFolders = await window.electronAPI.readDirectory(tiersPath);
    this.availableTierLists = [];
    
    for (const folderName of tierFolders) {
      const folderPath = window.electronAPI.pathJoin(tiersPath, folderName);
      
      try {
        const tierList = await this.createTierListFromFolder(folderName, folderPath);
        if (tierList) {
          this.availableTierLists.push(tierList);
        }
      } catch {
        // Silently skip folders that can't be read
      }
    }
  }

  private async createTierListFromFolder(folderName: string, folderPath: string): Promise<TierList | null> {
    // Read the contents of each tier list folder
    const imageFiles = await window.electronAPI.readDirectory(folderPath);
    
    // Filter for image files (webp, jpg, jpeg, png)
    const validImages = imageFiles.filter((file: string) => 
      IMAGE_EXTENSIONS.test(file)
    );
    
    if (validImages.length === 0) {
      return null;
    }

    const tierItems: TierItem[] = validImages.map((imageFile: string) => {
      // Extract name by removing the file extension properly
      const baseName = window.electronAPI.pathBasename(imageFile);
      const lastDotIndex = baseName.lastIndexOf('.');
      const itemName = lastDotIndex > 0 ? baseName.substring(0, lastDotIndex) : baseName;
      
      return {
        id: itemName.toLowerCase().replace(/\s+/g, '_'),
        name: itemName,
        imagePath: `assets/images/tiers/${folderName}/${imageFile}`
      };
    });
    
    return {
      name: folderName,
      path: `assets/images/tiers/${folderName}`,
      items: tierItems
    };
  }

  private loadFallbackTierLists(): void {
    // Fallback data when running in browser environment (not Electron)
    this.availableTierLists = [...FALLBACK_TIER_LISTS];
    
    if (this.availableTierLists.length > 0) {
      this.selectedTierList = this.availableTierLists[0].name;
      this.loadTierListSync();
    }
    
    this.isLoading = false;
  }

  private loadTierListSync(): void {
    const tierList = this.availableTierLists.find(list => list.name === this.selectedTierList);
    if (!tierList) return;

    // Load saved configuration or create default
    const savedConfig = this.loadSavedConfiguration(this.selectedTierList);
    
    if (savedConfig) {
      this.tierRows = savedConfig.tiers;
      this.unassignedItems = savedConfig.unassignedItems;
    } else {
      // Reset tiers and load all items as unassigned
      this.resetTiers();
      this.unassignedItems = [...tierList.items];
    }
    
    // this.toastService.showSuccess(
    //   this.translateService.instant('TIERS.MESSAGES.TIER_LIST_LOADED', { name: this.selectedTierList })
    // );
  }

  async onTierListChange(): Promise<void> {
    if (this.selectedTierList) {
      if (window.electronAPI) {
        await this.loadTierList();
      } else {
        this.loadTierListSync();
      }
    }
  }

  private async loadTierList(): Promise<void> {
    try {
      const tierList = this.availableTierLists.find(list => list.name === this.selectedTierList);
      if (!tierList) return;

      // Load saved configuration or create default
      const savedConfig = this.loadSavedConfiguration(this.selectedTierList);
      
      if (savedConfig) {
        this.tierRows = savedConfig.tiers;
        this.unassignedItems = savedConfig.unassignedItems;
      } else {
        // Reset tiers and load all items as unassigned
        this.resetTiers();
        await this.loadTierItems(tierList);
      }
      
      // this.toastService.showSuccess(
      //   this.translateService.instant('TIERS.MESSAGES.TIER_LIST_LOADED', { name: this.selectedTierList })
      // );
    } catch (error) {
      console.error('Error loading tier list:', error);
      this.toastService.showError(this.translateService.instant('TIERS.MESSAGES.LOAD_ERROR'));
    }
  }

  private async loadTierItems(tierList: TierList): Promise<void> {
    // Load items from the tier list configuration
    this.unassignedItems = [...tierList.items];
  }

  private resetTiers(): void {
    this.tierRows.forEach(tier => tier.items = []);
    this.unassignedItems = [];
  }

  onDrop(event: CdkDragDrop<TierItem[]>): void {
    // Prevent duplicate drop events
    if (this.dragInProgress) {
      return;
    }
    
    this.dragInProgress = true;
    
    // Use the tracked dragged item instead of relying on the event index
    const draggedItem = this.currentlyDraggedItem;
    
    if (!draggedItem) {
      console.warn('No dragged item found, falling back to event data');
      // Fallback to event data if tracking failed
      const fallbackItem = event.previousContainer.data[event.previousIndex];
      if (!fallbackItem) {
        console.error('Could not determine dragged item');
        this.dragInProgress = false;
        return;
      }
      this.currentlyDraggedItem = fallbackItem;
    }

    // Find the actual source index by searching for the item
    const sourceIndex = event.previousContainer.data.findIndex(item => 
      item.id === draggedItem!.id
    );
    
    if (sourceIndex === -1) {
      console.error('Could not find source index for dragged item');
      this.dragInProgress = false;
      return;
    }
    
    // Calculate the actual drop position based on mouse coordinates
    const dropPosition = this.calculateDropPosition(event);

    // Perform the move manually without using CDK's automatic handling
    this.performManualMove(
      event.previousContainer,
      event.container,
      sourceIndex,
      dropPosition,
      draggedItem!
    );

    // Update UI and save
    this.cdr.detectChanges();
    this.autoSave();
    
    // Reset drag state
    setTimeout(() => {
      this.dragInProgress = false;
    }, 100);
  }

  onDragStarted(item: TierItem): void {
    this.currentlyDraggedItem = item;
    this.dragInProgress = false; // Reset in case of previous incomplete drag
  }

  onDragEnded(): void {
    // Small delay to ensure drop event is processed first
    setTimeout(() => {
      this.currentlyDraggedItem = null;
      this.dragInProgress = false;
    }, 50);
  }

  private calculateDropPosition(event: CdkDragDrop<TierItem[]>): number {
    const container = event.container.element.nativeElement;
    const rect = container.getBoundingClientRect();
    
    // Get drop coordinates relative to container
    const dropX = event.dropPoint.x - rect.left;
    const dropY = event.dropPoint.y - rect.top;

    // Get all item elements in the container
    const itemElements = Array.from(container.children) as HTMLElement[];
    
    if (itemElements.length === 0) {
      return 0;
    }

    // Calculate the closest insertion point
    let bestPosition = 0;
    let bestDistance = Infinity;

    // Check position before each item and after the last item
    for (let i = 0; i <= itemElements.length; i++) {
      let targetX: number, targetY: number;

      if (i === 0) {
        // Before first item
        const firstItem = itemElements[0];
        const firstRect = firstItem.getBoundingClientRect();
        targetX = firstRect.left - rect.left - 10; // 10px before the item
        targetY = firstRect.top - rect.top + (firstRect.height / 2);
      } else if (i === itemElements.length) {
        // After last item
        const lastItem = itemElements[itemElements.length - 1];
        const lastRect = lastItem.getBoundingClientRect();
        targetX = lastRect.right - rect.left + 10; // 10px after the item
        targetY = lastRect.top - rect.top + (lastRect.height / 2);
      } else {
        // Between items - use the left edge of the current item
        const currentItem = itemElements[i];
        const currentRect = currentItem.getBoundingClientRect();
        targetX = currentRect.left - rect.left - 5; // 5px before current item
        targetY = currentRect.top - rect.top + (currentRect.height / 2);
      }

      const distance = Math.sqrt(
        Math.pow(dropX - targetX, 2) + Math.pow(dropY - targetY, 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = i;
      }
    }

    return bestPosition;
  }

  private performManualMove(
    sourceContainer: any,
    targetContainer: any,
    sourceIndex: number,
    targetIndex: number,
    draggedItem: TierItem
  ): void {
    // Validate inputs
    if (!sourceContainer || !targetContainer || !draggedItem) {
      console.error('Invalid container or item for move operation');
      return;
    }
    
    if (sourceIndex < 0 || sourceIndex >= sourceContainer.data.length) {
      console.error('Invalid source index:', sourceIndex, 'for container with length:', sourceContainer.data.length);
      return;
    }
    
    if (targetIndex < 0 || targetIndex > targetContainer.data.length) {
      console.error('Invalid target index:', targetIndex, 'for container with length:', targetContainer.data.length);
      return;
    }

    if (sourceContainer === targetContainer) {
      // Same container - reorder
      const items = [...sourceContainer.data];
      
      // Verify the item at source index matches our dragged item
      if (items[sourceIndex].id !== draggedItem.id) {
        console.warn('Source item mismatch, searching for correct index');
        const correctIndex = items.findIndex(item => item.id === draggedItem.id);
        if (correctIndex === -1) {
          console.error('Could not find dragged item in source container');
          return;
        }
        sourceIndex = correctIndex;
      }
      
      // Remove from old position
      items.splice(sourceIndex, 1);
      
      // Adjust target index if we're moving forward in the same container
      const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      
      // Insert at new position
      items.splice(adjustedIndex, 0, draggedItem);
      
      // Update the container data
      this.updateContainerData(targetContainer, items);
    } else {
      // Different containers - transfer
      const sourceItems = [...sourceContainer.data];
      const targetItems = [...targetContainer.data];
      
      // Verify the item at source index matches our dragged item
      if (sourceItems[sourceIndex].id !== draggedItem.id) {
        console.warn('Source item mismatch, searching for correct index');
        const correctIndex = sourceItems.findIndex(item => item.id === draggedItem.id);
        if (correctIndex === -1) {
          console.error('Could not find dragged item in source container');
          return;
        }
        sourceIndex = correctIndex;
      }
      
      // Remove from source
      sourceItems.splice(sourceIndex, 1);
      
      // Add to target
      targetItems.splice(targetIndex, 0, draggedItem);
      
      // Update both containers
      this.updateContainerData(sourceContainer, sourceItems);
      this.updateContainerData(targetContainer, targetItems);
    }
  }

  private updateContainerData(container: any, newData: TierItem[]): void {
    // Find which array this container represents and update it
    if (container.id === 'unassigned') {
      this.unassignedItems = newData;
    } else {
      // Find the tier index from the container id (tier-0, tier-1, etc.)
      const tierIndex = parseInt(container.id.replace('tier-', ''));
      if (tierIndex >= 0 && tierIndex < this.tierRows.length) {
        this.tierRows[tierIndex].items = newData;
      }
    }
  }

  private autoSave(): void {
    this.clearAutoSaveTimeout();
    
    this.autoSaveTimeout = window.setTimeout(() => {
      this.saveConfiguration();
    }, AUTO_SAVE_DELAY);
  }

  private saveConfiguration(): void {
    if (!this.selectedTierList || !this.isValidConfiguration()) {
      return;
    }
    
    const configuration: TierConfiguration = {
      tierListName: this.selectedTierList,
      tiers: this.tierRows.map(tier => ({
        tier: tier.tier,
        items: [...tier.items],
        color: tier.color
      })),
      unassignedItems: [...this.unassignedItems]
    };
    
    try {
      // Save to localStorage
      const key = `${STORAGE_KEY_PREFIX}${this.selectedTierList}`;
      localStorage.setItem(key, JSON.stringify(configuration));
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  private isValidConfiguration(): boolean {
    return this.tierRows.length > 0 && 
           this.tierRows.every(tier => tier.tier && tier.color);
  }

  private loadSavedConfiguration(tierListName: string): TierConfiguration | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${tierListName}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading saved configuration:', error);
      return null;
    }
  }

  resetTierList(): void {
    if (!this.selectedTierList) return;
    
    // Find the original tier list to restore the original order
    const originalTierList = this.availableTierLists.find(list => list.name === this.selectedTierList);
    if (!originalTierList) return;
    
    // Clear all tiers
    this.tierRows.forEach(tier => tier.items = []);
    
    // Restore original order in unassigned pool
    this.unassignedItems = [...originalTierList.items];
    
    this.autoSave();
    
    this.toastService.showInfo(
      this.translateService.instant('TIERS.MESSAGES.RESET_SUCCESS', { name: this.selectedTierList })
    );
  }

  trackByTier(index: number, tier: TierRow): string {
    return tier.tier;
  }

  trackByItem(index: number, item: TierItem): string {
    return item.id;
  }

  getConnectedDropLists(): string[] {
    const tierLists = this.tierRows.map((_, index) => `tier-${index}`);
    return [...tierLists, 'unassigned'];
  }

  sortPredicate = (index: number, drag: any, drop: any) => {
    // Always return false to prevent CDK from doing any automatic sorting
    // We'll handle all the sorting logic manually in onDrop
    return false;
  };

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg'; // Fallback image
  }
}
