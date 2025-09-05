import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { CarouselConfig, CarouselCard } from '../../interfaces/carousel.interface';
import { BadgeComponent } from '../../shared/badge/badge.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, BadgeComponent]
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  currentSlide = 0;
  carouselConfig: CarouselConfig | null = null;
  private autoSlideInterval: number | null = null;
  isLaunchingGame = false;

  private http = inject(HttpClient);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.loadCarouselConfig();
  }

  ngAfterViewInit(): void {
    // Start auto-slide after view is initialized
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    // Clean up interval when component is destroyed
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  private loadCarouselConfig(): void {
    this.http.get<CarouselConfig>('assets/config/carousel.json').subscribe({
      next: (config) => {
        this.carouselConfig = config;
      },
      error: (error) => {
        console.error('Error loading carousel config:', error);
      }
    });
  }

  get totalSlides(): number {
    return this.carouselConfig?.slides?.length || 0;
  }

  navigateToCard(card: CarouselCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.resetAutoSlide();
  }

  prevSlide(): void {
    this.currentSlide = this.currentSlide === 0 ? this.totalSlides - 1 : this.currentSlide - 1;
    this.resetAutoSlide();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.resetAutoSlide();
  }

  private startAutoSlide(): void {
    const interval = this.carouselConfig?.autoSlideInterval || 5000;
    this.autoSlideInterval = window.setInterval(() => {
      this.nextSlide();
    }, interval);
  }

  private resetAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
    this.startAutoSlide();
  }

  private cachedGamePath: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async launchGame(): Promise<void> {
    if (this.isLaunchingGame) {
      return; // Prevent multiple simultaneous launches
    }

    try {
      this.isLaunchingGame = true;
      
      // Show immediate feedback
      this.toastService.showInfo(
        this.translateService.instant('HOME.LAUNCH.LAUNCHING')
      );

      // Get cached game path (avoid repeated localStorage access)
      const gameExePath = this.getCachedGamePath();
      
      if (!gameExePath) {
        this.toastService.showError(
          this.translateService.instant('HOME.LAUNCH.GAME_PATH_NOT_SET')
        );
        this.isLaunchingGame = false;
        return;
      }

      // Check if we're running in Electron
      if (window.electronAPI) {
        // Launch game with timeout protection
        const launchPromise = window.electronAPI.launchGame(gameExePath);
        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Launch timeout')), 5000)
        );

        const result = await Promise.race([launchPromise, timeoutPromise]);
        
        if (result.success) {
          this.toastService.showSuccess(
            this.translateService.instant('HOME.LAUNCH.LAUNCH_SUCCESS')
          );
          
          // Keep button disabled for a few seconds to prevent spam launching
          setTimeout(() => {
            this.isLaunchingGame = false;
          }, 30000);
        } else {
          this.isLaunchingGame = false;
          this.toastService.showError(
            `${this.translateService.instant('HOME.LAUNCH.LAUNCH_ERROR')}: ${result.error}`
          );
        }
      } else {
        // Fallback for browser/development - can't actually launch
        this.toastService.showWarning(
          this.translateService.instant('HOME.LAUNCH.ELECTRON_ONLY')
        );
        this.isLaunchingGame = false;
      }
    } catch (error) {
      console.error('Error launching game:', error);
      
      const errorMessage = error instanceof Error && error.message === 'Launch timeout' 
        ? this.translateService.instant('HOME.LAUNCH.LAUNCH_TIMEOUT')
        : this.translateService.instant('HOME.LAUNCH.LAUNCH_ERROR');
        
      this.toastService.showError(errorMessage);
      this.isLaunchingGame = false;
    }
  }

  private getCachedGamePath(): string | null {
    const now = Date.now();
    
    // Use cached path if it's still valid
    if (this.cachedGamePath && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedGamePath;
    }
    
    // Refresh cache from localStorage
    this.cachedGamePath = localStorage.getItem('gameExePath');
    this.cacheTimestamp = now;
    
    return this.cachedGamePath;
  }

  // Method to invalidate cache when game path changes
  public invalidateGamePathCache(): void {
    this.cachedGamePath = null;
    this.cacheTimestamp = 0;
  }

  buyMeCoffee(): void {
    try {
      const url = 'https://buymeacoffee.com/sliferdevz';
      
      // Check if we're running in Electron
      if (window.electronAPI) {
        // Use Electron's shell to open the URL
        window.open(url, '_blank');
        this.toastService.showSuccess(this.translateService.instant('HOME.MESSAGES.COFFEE_OPENING'));
      } else {
        // Fallback for browser
        window.open(url, '_blank');
        this.toastService.showSuccess(this.translateService.instant('HOME.MESSAGES.COFFEE_OPENING'));
      }
    } catch (error) {
      console.error('Error opening Buy Me a Coffee page:', error);
      this.toastService.showError(this.translateService.instant('HOME.MESSAGES.COFFEE_ERROR'));
    }
  }

  openDiscord(): void {
    try {
      const url = 'https://discord.gg/ZGpW6j4w';
      
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening Discord link:', error);
      this.toastService.showError('Failed to open Discord link');
    }
  }

  openGitHub(): void {
    try {
      const url = 'https://github.com/gcasu/aomr-hero-launcher';
      
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening GitHub link:', error);
      this.toastService.showError('Failed to open GitHub link');
    }
  }
}
