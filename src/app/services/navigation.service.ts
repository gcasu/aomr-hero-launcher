import { Injectable } from '@angular/core';
import { NavigationItem, NavItem, NavGroup } from '../models/navigation.model';
import { NAVIGATION_CONFIG } from '../config/navigation.config';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  
  // Get the navigation configuration
  getNavigationItems(): NavigationItem[] {
    return NAVIGATION_CONFIG;
  }

  // Check if a navigation item is active
  isNavItemActive(item: NavItem, activeTab: string): boolean {
    return activeTab === item.id;
  }

  // Check if any item in a navigation group is active
  isNavGroupActive(group: NavGroup, activeTab: string): boolean {
    return group.items.some(item => activeTab === item.id);
  }

  // Type guard to check if item is a dropdown group
  isDropdownGroup(item: NavigationItem): item is NavGroup {
    return 'items' in item;
  }

  // Get all available routes from navigation config
  getAllRoutes(): string[] {
    const routes: string[] = [];
    
    NAVIGATION_CONFIG.forEach(item => {
      if (this.isDropdownGroup(item)) {
        item.items.forEach(subItem => routes.push(subItem.route));
      } else {
        routes.push(item.route);
      }
    });
    
    return routes;
  }

  // Determine active tab based on current URL
  getActiveTabFromUrl(url: string): string {
    let activeTab = 'home'; // Default
    
    NAVIGATION_CONFIG.forEach(item => {
      if (this.isDropdownGroup(item)) {
        item.items.forEach(subItem => {
          if (url.includes(subItem.route)) {
            activeTab = subItem.id;
          }
        });
      } else {
        if (url.includes(item.route)) {
          activeTab = item.id;
        }
      }
    });
    
    return activeTab;
  }
}
