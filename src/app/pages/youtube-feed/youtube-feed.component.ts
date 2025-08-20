import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';

import { YouTubeFeedService, YouTubeVideo, YouTubeChannel } from '../../services/youtube-feed.service';
import { ToastService } from '../../services/toast.service';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';

@Component({
  selector: 'app-youtube-feed',
  templateUrl: './youtube-feed.component.html',
  styleUrls: ['./youtube-feed.component.scss'],
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
export class YouTubeFeedComponent implements OnInit, OnDestroy {
  isLoading = false;
  hasError = false;
  channels: YouTubeChannel[] = [];
  filteredChannels: YouTubeChannel[] = [];
  filterText = '';
  selectedVideo: YouTubeVideo | null = null;
  selectedVideoEmbedUrl: SafeResourceUrl | null = null;
  showVideoModal = false;
  
  private destroy$ = new Subject<void>();
  private youtubeFeedService = inject(YouTubeFeedService);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);
  private domSanitizer = inject(DomSanitizer);

  ngOnInit(): void {
    this.loadYouTubeFeeds();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadYouTubeFeeds(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.youtubeFeedService.getAllChannelFeeds().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (channels: YouTubeChannel[]) => {
        this.channels = channels;
        this.filteredChannels = channels;
        this.isLoading = false;
        this.hasError = false;
      },
      error: (error: unknown) => {
        let errorMessage = 'Failed to load YouTube feeds';
        
        if (error instanceof Error) {
          console.error('Failed to load YouTube feeds:', error.message);
          
          // Provide specific messages for different error types
          if (error.name === 'TimeoutError') {
            errorMessage = 'Request timed out. The YouTube feed service may be slow or unavailable. Please try again later.';
          } else if (error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (error.message.includes('CORS')) {
            errorMessage = 'CORS proxy service unavailable. YouTube feeds cannot be loaded right now.';
          }
        } else {
          console.error('Failed to load YouTube feeds:', error);
        }
        
        // Check if we have cached data to fall back to
        const serviceHealth = this.youtubeFeedService.getServiceHealth();
        if (serviceHealth.totalChannels > 0) {
          errorMessage += ' Using cached data from previous load.';
          // Try to use cached data even if expired
          this.youtubeFeedService.getAllChannelFeeds().pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: (channels: YouTubeChannel[]) => {
              if (channels.length > 0) {
                this.channels = channels;
                this.filteredChannels = channels;
                this.isLoading = false;
                this.hasError = false;
                this.toastService.showWarning('Using cached YouTube data due to connection issues.');
                return;
              }
            }
          });
        }
        
        this.toastService.showError(errorMessage);
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  retryLoading(): void {
    this.loadYouTubeFeeds();
  }

  onVideoClick(video: YouTubeVideo): void {
    this.selectedVideo = video;
    this.selectedVideoEmbedUrl = this.getVideoEmbedUrl(video.videoUrl);
    this.showVideoModal = true;
  }

  closeVideoModal(): void {
    this.selectedVideo = null;
    this.selectedVideoEmbedUrl = null;
    this.showVideoModal = false;
  }

  getVideoEmbedUrl(videoUrl: string): SafeResourceUrl {
    const videoId = this.extractVideoId(videoUrl);
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
    
    return this.domSanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractVideoId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  onFilterChange(): void {
    if (!this.filterText.trim()) {
      this.filteredChannels = this.channels;
    } else {
      const searchTerm = this.filterText.toLowerCase().trim();
      this.filteredChannels = this.channels.filter(channel =>
        channel.channelTitle.toLowerCase().includes(searchTerm)
      );
    }
  }

  trackByChannel(index: number, channel: YouTubeChannel): string {
    return channel.channelId;
  }

  trackByVideo(index: number, video: YouTubeVideo): string {
    return video.id;
  }
}
