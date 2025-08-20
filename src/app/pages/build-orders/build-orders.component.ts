import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { MajorGod } from '../../interfaces/major-god.interface';
import { MAJOR_GODS_DATA, DEFAULT_SELECTED_GOD_ID } from '../../data/major-gods.data';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-build-orders',
  templateUrl: './build-orders.component.html',
  styleUrls: ['./build-orders.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ]
})
export class BuildOrdersComponent implements OnInit {
  isLoading = true;
  majorGods: MajorGod[] = [];
  selectedGodId: string = DEFAULT_SELECTED_GOD_ID;

  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.loadMajorGods();
    this.loadSelectedGod();
  }

  private loadMajorGods(): void {
    // Simulate loading time
    setTimeout(() => {
      this.majorGods = MAJOR_GODS_DATA;
      this.isLoading = false;
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
    this.saveSelectedGod(god.id);
  }

  isGodSelected(godId: string): boolean {
    return this.selectedGodId === godId;
  }

  trackByGod(index: number, god: MajorGod): string {
    return god.id;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
  }
}
