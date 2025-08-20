import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {

  constructor(private router: Router) {
    // Listen to route changes and scroll to top
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Small delay to ensure the new view is rendered
        setTimeout(() => {
          this.scrollToTop();
        }, 50);
      });
  }

  scrollToTop(): void {
    // Multiple approaches for maximum compatibility
    try {
      // Method 1: Target the main scrollable content container
      const contentContainer = document.querySelector('.content-container') as HTMLElement;
      if (contentContainer) {
        contentContainer.scrollTop = 0;
      }
      
      // Method 2: Window scroll (fallback)
      window.scrollTo(0, 0);
      
      // Method 3: Document element scroll (fallback)
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      
      // Method 4: Body element scroll (fallback)
      if (document.body) {
        document.body.scrollTop = 0;
      }
      
      // Method 5: Any other potential scrollable containers
      const otherScrollableElements = document.querySelectorAll('[data-simplebar], .page-container, main');
      otherScrollableElements.forEach(element => {
        (element as HTMLElement).scrollTop = 0;
      });
      
    } catch (error) {
      console.warn('ScrollService: Unable to scroll to top', error);
    }
  }
}
