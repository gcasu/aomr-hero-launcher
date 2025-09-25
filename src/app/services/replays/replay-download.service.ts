import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../toast.service';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface ReplayDownloadResult {
  success: boolean;
  file?: File;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReplayDownloadService {
  private readonly AoE_API_BASE_URL = 'https://api.ageofempires.com/api/GameStats/AgeMyth/GetMatchReplay/';
  
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);

  /**
   * Download a replay file from the Age of Empires API
   * @param matchId The match ID to download
   * @param profileId The profile ID for the match
   * @returns Promise with download result containing the file or error
   */
  async downloadReplay(matchId: string, profileId: number): Promise<ReplayDownloadResult> {
    try {
      const url = `${this.AoE_API_BASE_URL}?matchId=${matchId}&profileId=${profileId}`;
      
      // Show loading toast
      this.toastService.showInfo(
        this.translateService.instant('BUILD_ORDERS.REPLAY.DOWNLOADING')
      );

      // Download the replay file as a blob
      const response = await firstValueFrom(
        this.http.get(url, {
          responseType: 'blob',
          headers: {
            'Accept': 'application/octet-stream, application/zip, application/gzip, */*'
          }
        })
      );

      // Check if we got a valid response
      if (!response || response.size === 0) {
        throw new Error('Empty response from server');
      }

      // Determine file extension based on content type or assume it's compressed
      let fileName = `match_${matchId}.mythrec`;
      let fileExtension = '.mythrec';
      
      // Check if the response is compressed (common for API responses)
      const contentType = response.type;
      if (contentType?.includes('zip') || contentType?.includes('application/zip')) {
        fileName = `match_${matchId}.zip`;
        fileExtension = '.zip';
      } else if (contentType?.includes('gzip') || contentType?.includes('application/gzip')) {
        fileName = `match_${matchId}.gz`;
        fileExtension = '.gz';
      }

      // Create a File object from the blob
      const file = new File([response], fileName, {
        type: response.type || 'application/octet-stream'
      });

      return {
        success: true,
        file: file
      };

    } catch (error) {
      console.error('Failed to download replay:', error);
      
      let errorMessage = 'BUILD_ORDERS.REPLAY.DOWNLOAD_ERROR';
      
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 404:
            errorMessage = 'BUILD_ORDERS.REPLAY.REPLAY_NOT_FOUND';
            break;
          case 403:
            errorMessage = 'BUILD_ORDERS.REPLAY.ACCESS_DENIED';
            break;
          case 500:
            errorMessage = 'BUILD_ORDERS.REPLAY.SERVER_ERROR';
            break;
          default:
            errorMessage = 'BUILD_ORDERS.REPLAY.DOWNLOAD_ERROR';
        }
      }

      this.toastService.showError(
        this.translateService.instant(errorMessage)
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a replay is available for download
   * @param matchId The match ID to check
   * @param profileId The profile ID for the match
   * @returns Promise<boolean> indicating if the replay is available
   */
  async isReplayAvailable(matchId: string, profileId: number): Promise<boolean> {
    try {
      const url = `${this.AoE_API_BASE_URL}?matchId=${matchId}&profileId=${profileId}`;
      
      // Make a HEAD request to check if the resource exists
      await firstValueFrom(
        this.http.head(url, {
          headers: {
            'Accept': 'application/octet-stream, application/zip, application/gzip, */*'
          }
        })
      );
      
      return true;
    } catch (error) {
      return false;
    }
  }
}