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

  // Background selection
  backgroundSet: 'original' | 'heavenly' = 'original';
  background1920: string = '';
  background3840: string = '';

  private http = inject(HttpClient);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.selectRandomBackground();
    this.loadCarouselConfig();
  }

  private selectRandomBackground(): void {
    // Randomly pick between original and heavenly spear backgrounds
    const sets = [
      {
        key: 'original',
        bg1920: 'assets/images/home/age-of-mythology-1920x1080.jpg',
        bg3840: 'assets/images/home/age-of-mythology-3840x2160.jpg',
      },
      {
        key: 'heavenly',
        bg1920: 'assets/images/home/age-of-mythology-heavenly-spear-1920x1080.jpg',
        bg3840: 'assets/images/home/age-of-mythology-heavenly-spear-3840x2160.jpg',
      }
    ];
    const chosen = sets[Math.floor(Math.random() * sets.length)];
    this.backgroundSet = chosen.key as 'original' | 'heavenly';
    this.background1920 = chosen.bg1920;
    this.background3840 = chosen.bg3840;
  }

  getBackgroundStyle(): { [key: string]: string } {
    // Detect high resolution screens
    const isHighRes = window.innerWidth >= 2560;
    const backgroundImage = isHighRes ? this.background3840 : this.background1920;
    
    return {
      'background-image': `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${backgroundImage})`
    };
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

  async launchGame(): Promise<void> {
    if (this.isLaunchingGame) {
      return; // Prevent multiple simultaneous launches
    }

    try {
      // Get the saved game executable path from localStorage
      const gameExePath = localStorage.getItem('gameExePath');
      
      if (!gameExePath) {
        // Show error toast for missing game path
        this.toastService.showError(
          this.translateService.instant('HOME.LAUNCH.GAME_PATH_NOT_SET')
        );
        return;
      }

      // Check if we're running in Electron
      if (window.electronAPI) {
        // Set launching state
        this.isLaunchingGame = true;
        
        // Show launching toast
        this.toastService.showInfo(
          this.translateService.instant('HOME.LAUNCH.LAUNCHING')
        );

        const result = await window.electronAPI.launchGame(gameExePath);
        
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
      }
    } catch (error) {
      this.isLaunchingGame = false;
      console.error('Error launching game:', error);
      this.toastService.showError(
        this.translateService.instant('HOME.LAUNCH.LAUNCH_ERROR')
      );
    }
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
