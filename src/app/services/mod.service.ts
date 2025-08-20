import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModStatusFile, Mod, ModDisplayItem } from '../models/mod.model';
import { ToastService } from './toast.service';
import { firstValueFrom } from 'rxjs';

interface MockModData {
  mods: Mod[];
}

@Injectable({
  providedIn: 'root'
})
export class ModService {
  private modFilePath = '';

  private toastService = inject(ToastService);
  private http = inject(HttpClient);

  // Load mods from the myth-mod-status.json file
  async loadMods(): Promise<ModDisplayItem[]> {
    try {
      // Check if we're running in Electron
      if (!window.electronAPI) {
        // Return mock data for web environment
        this.toastService.showInfo('Loading demo data - 10 sample mods for testing');
        return await this.getMockMods();
      }

      // Get the mod file path from settings
      this.modFilePath = localStorage.getItem('localModsPath') || '';
      
      if (!this.modFilePath) {
        this.toastService.showWarning('Please configure the mod file path in Settings first');
        return [];
      }

      // Read the file using Electron API
      const fileContent = await window.electronAPI.readFile(this.modFilePath);
      const modData: ModStatusFile = JSON.parse(fileContent);

      // Convert to display items and sort by priority
      return this.convertToDisplayItems(modData.Mods);
    } catch (error) {
      console.error('Error loading mods:', error);
      this.toastService.showError('Failed to load mods. Please check the file path in Settings.');
      return [];
    }
  }

  // Save mods back to the myth-mod-status.json file
  async saveMods(mods: ModDisplayItem[], showSuccessToast = false): Promise<boolean> {
    try {
      if (!this.modFilePath) {
        this.toastService.showError('No mod file path configured');
        return false;
      }

      if (!window.electronAPI) {
        this.toastService.showError('File saving is only available in Electron environment');
        return false;
      }

      // Read current file to preserve Actions array
      const currentContent = await window.electronAPI.readFile(this.modFilePath);
      const currentData: ModStatusFile = JSON.parse(currentContent);

      // Convert display items back to mod format
      const updatedMods: Mod[] = mods.map(mod => ({
        Title: mod.Title,
        Author: mod.Author,
        Description: mod.Description,
        Path: mod.Path,
        WorkshopID: mod.WorkshopID,
        LastUpdate: mod.LastUpdate,
        InstallTime: mod.InstallTime,
        Priority: mod.Priority,
        Enabled: mod.Enabled,
        ...(mod.InstallCRC && { InstallCRC: mod.InstallCRC })
      }));

      // Preserve Actions and update Mods
      const updatedData: ModStatusFile = {
        Actions: currentData.Actions,
        Mods: updatedMods
      };

      // Write back to file
      await window.electronAPI.writeFile(this.modFilePath, JSON.stringify(updatedData, null, 2));
      
      // Only show success toast if explicitly requested (for manual saves)
      if (showSuccessToast) {
        this.toastService.showSuccess('Mods saved successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving mods:', error);
      this.toastService.showError('Failed to save mods');
      return false;
    }
  }

  // Convert Mod array to ModDisplayItem array
  private convertToDisplayItems(mods: Mod[]): ModDisplayItem[] {
    return mods.map((mod, index) => ({
      ...mod,
      id: `mod-${index}-${mod.Title.replace(/\s+/g, '-')}`,
      isLocal: mod.Path.startsWith('local\\'),
      lastUpdateDate: this.parseTimestamp(mod.LastUpdate),
      installTimeDate: this.parseTimestamp(mod.InstallTime)
    })).sort((a, b) => a.Priority - b.Priority); // Sort by priority ascending
  }

  // Parse timestamp string to Date object
  private parseTimestamp(timestamp: string): Date | undefined {
    if (!timestamp || timestamp === '0') {
      return undefined;
    }
    
    // If it's a Unix timestamp (seconds since 1970)
    const numTimestamp = parseInt(timestamp);
    if (!isNaN(numTimestamp) && numTimestamp > 0) {
      return new Date(numTimestamp * 1000); // Convert seconds to milliseconds
    }
    
    return undefined;
  }

  // Update priority for drag and drop
  updatePriorities(mods: ModDisplayItem[]): ModDisplayItem[] {
    return mods.map((mod, index) => ({
      ...mod,
      Priority: index + 1
    }));
  }

  // Generate mock mod data for web environment
  private async getMockMods(): Promise<ModDisplayItem[]> {
    try {
      const mockData = await firstValueFrom(
        this.http.get<MockModData>('assets/data/mock-mods.json')
      );
      
      // Convert to display items and sort by priority
      return this.convertToDisplayItems(mockData.mods);
    } catch (error) {
      console.error('Error loading mock mod data:', error);
      this.toastService.showError('Failed to load mock mod data');
      return [];
    }
  }
}
