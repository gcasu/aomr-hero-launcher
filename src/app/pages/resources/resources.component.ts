import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { ResourceCard, ResourcesConfig, ResourceBadge, BadgeConfig } from '../../interfaces/resources.interface';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { BadgeComponent } from '../../shared/badge/badge.component';

@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SearchFilterComponent,
    LoadingStateComponent,
    BadgeComponent
  ]
})
export class ResourcesComponent implements OnInit {
  resourcesConfig: ResourcesConfig | null = null;
  filteredResources: ResourceCard[] = [];
  filterText = '';
  isLoading = true;

  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  // Badge configuration mapping
  private badgeConfigs: Record<ResourceBadge, BadgeConfig> = {
    web: { icon: 'fas fa-globe', variant: 'primary' },
    zip: { icon: 'fas fa-file-archive', variant: 'warning' },
    pdf: { icon: 'fas fa-file-pdf', variant: 'danger' },
    discord: { icon: 'fab fa-discord', variant: 'primary' },
    github: { icon: 'fab fa-github', variant: 'dark' },
    youtube: { icon: 'fab fa-youtube', variant: 'danger' }
  };

  ngOnInit(): void {
    this.loadResourcesConfig();
  }

  loadResourcesConfig(): void {
    this.isLoading = true;
    this.http.get<ResourcesConfig>('assets/config/resources.json').subscribe({
      next: (config) => {
        this.resourcesConfig = config;
        this.filteredResources = config.resources;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading resources config:', error);
        this.toastService.showError('Failed to load resources configuration');
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    if (!this.resourcesConfig) return;
    
    const filter = this.filterText.toLowerCase().trim();
    this.filteredResources = this.resourcesConfig.resources.filter(resource => {
      // Check title and description
      const titleMatch = resource.title.toLowerCase().includes(filter);
      const descriptionMatch = resource.description.toLowerCase().includes(filter);
      
      // Check author if available
      const authorMatch = resource.author ? resource.author.toLowerCase().includes(filter) : false;
      
      // Check badge text
      const badgeText = this.getBadgeText(resource.badge);
      const badgeMatch = badgeText.toLowerCase().includes(filter);
      
      return titleMatch || descriptionMatch || authorMatch || badgeMatch;
    });
  }

  onCardClick(resource: ResourceCard): void {
    if (resource.type === 'web') {
      // Open link in external browser
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(resource.source);
      } else {
        window.open(resource.source, '_blank');
      }
    } else if (resource.type === 'local') {
      // Download local asset
      this.downloadResource(resource.source);
    }
  }

  private downloadResource(url: string): void {
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.click();
    this.toastService.showSuccess('Download started');
  }

  getCardBackgroundStyle(bgImage?: string): any {
    if (bgImage) {
      return {
        'background-image': `linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url('${bgImage}')`,
        'background-size': 'cover',
        'background-position': 'center'
      };
    }
    return {};
  }

  // Helper method to chunk resources into rows of 3
  getResourceRows(): ResourceCard[][] {
    if (!this.filteredResources.length) return [];
    
    const rows: ResourceCard[][] = [];
    const resources = [...this.filteredResources];
    
    for (let i = 0; i < resources.length; i += 3) {
      rows.push(resources.slice(i, i + 3));
    }
    
    return rows;
  }

  // Badge helper methods
  getBadgeConfig(badge: ResourceBadge): BadgeConfig {
    return this.badgeConfigs[badge] || this.badgeConfigs.web;
  }

  getBadgeIcon(badge: ResourceBadge): string {
    return this.getBadgeConfig(badge).icon;
  }

  getBadgeVariant(badge: ResourceBadge): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark' {
    return this.getBadgeConfig(badge).variant;
  }

  getBadgeText(badge: ResourceBadge): string {
    const badgeTextMap: Record<ResourceBadge, string> = {
      web: 'Web',
      zip: 'ZIP',
      pdf: 'PDF',
      discord: 'Discord',
      github: 'GitHub',
      youtube: 'YouTube'
    };
    return badgeTextMap[badge] || 'Web';
  }

  getActionIcon(type: 'web' | 'local'): string {
    return type === 'web' ? 'fas fa-external-link-alt' : 'fas fa-download';
  }

  getActionText(type: 'web' | 'local'): string {
    return type === 'web' ? 'RESOURCES.ACTION.OPEN_LINK' : 'RESOURCES.ACTION.DOWNLOAD';
  }
}
