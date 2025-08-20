import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { SharedModule } from './shared/shared.module';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NavigationItem, NavItem, NavGroup } from './models/navigation.model';
import { NavigationService } from './services/navigation.service';
import { ScrollService } from './services/scroll.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    TranslateModule,
    SharedModule,
    NgbDropdownModule
  ]
})
export class AppComponent implements OnInit {
  title = 'aom-launcher';
  activeTab = 'home';

  translate = inject(TranslateService);
  router = inject(Router);
  navigationService = inject(NavigationService);
  private scrollService = inject(ScrollService); // Initialize scroll service

  // Navigation structure from config
  navigationItems: NavigationItem[] = this.navigationService.getNavigationItems();

  constructor() {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngOnInit(): void {
    // Check for post-reload navigation flag to prevent blank screen
    this.checkPostReloadNavigation();
    
    // Listen to route changes to update active tab
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateActiveTab(event.urlAfterRedirects);
    });
  }

  // Navigation helper methods
  isNavItemActive(item: NavItem): boolean {
    return this.navigationService.isNavItemActive(item, this.activeTab);
  }

  isNavGroupActive(group: NavGroup): boolean {
    return this.navigationService.isNavGroupActive(group, this.activeTab);
  }

  isDropdownGroup(item: NavigationItem): item is NavGroup {
    return this.navigationService.isDropdownGroup(item);
  }

  // Get all navigation routes for easier route tracking
  getAllRoutes(): string[] {
    return this.navigationService.getAllRoutes();
  }

  // Update active tab based on current route
  private updateActiveTab(url: string): void {
    this.activeTab = this.navigationService.getActiveTabFromUrl(url);
  }

  private checkPostReloadNavigation(): void {
    try {
      const navigateAfterReload = sessionStorage.getItem('navigateAfterReload');
      if (navigateAfterReload) {
        // Clear the flag immediately to prevent repeated navigation
        sessionStorage.removeItem('navigateAfterReload');
        
        // Clear the rest of sessionStorage now that we've used the flag
        sessionStorage.clear();
        
        // Navigate to the specified route after a short delay to ensure app is fully loaded
        setTimeout(() => {
          this.router.navigate([`/${navigateAfterReload}`]);
        }, 100);
      }
    } catch (error) {
      console.error('Error checking post-reload navigation:', error);
    }
  }
}
