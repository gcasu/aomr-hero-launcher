import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { CacheDescriptionService } from '../../services/cache-description.service';
import { UserConfigItem, CacheItem } from '../../interfaces/settings.interface';
import { USER_CONFIG_KEYS } from '../../constants/settings.constants';
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { GlassCardComponent } from '../../shared/glass-card/glass-card.component';
import { PathInputComponent } from '../../shared/path-input/path-input.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    GlassCardComponent,
    PathInputComponent
  ]
})
export class SettingsComponent implements OnInit, AfterViewInit {
  gameExePath = '';
  localModsPath = '';
  gameExePathError = '';
  localModsPathError = '';
  
  // User config management
  userConfigs: UserConfigItem[] = [];
  private autoSaveTimeout: number | null = null;
  
  // Cache management
  isClearingCache = false;
  cacheItems: CacheItem[] = [];

  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);
  private cacheDescriptionService = inject(CacheDescriptionService);

  ngOnInit(): void {
    // Load settings immediately
    this.loadSettings();
    this.initializeUserConfigs();
    this.loadCacheItems();
  }

  ngAfterViewInit(): void {
    // Re-validate after view is initialized to ensure UI reflects correct state
    setTimeout(() => {
      this.revalidateAll();
    }, 100);
  }

  async loadSettings(): Promise<void> {
    try {
      // Use localStorage - it's persistent in Electron and simpler than electron-store for this use case
      const savedGameExePath = localStorage.getItem('gameExePath');
      const savedLocalModsPath = localStorage.getItem('localModsPath');
      
      if (savedGameExePath) {
        this.gameExePath = savedGameExePath;
        // Extract filename more robustly
        const gameFileName = this.extractFileName(savedGameExePath);
        await this.validateGameExePath(gameFileName);
      } else {
        // Clear any previous errors when no path is saved
        this.gameExePathError = '';
      }
      
      if (savedLocalModsPath) {
        this.localModsPath = savedLocalModsPath;
        // Extract filename more robustly
        const modsFileName = this.extractFileName(savedLocalModsPath);
        await this.validateLocalModsPath(modsFileName);
      } else {
        // Clear any previous errors when no path is saved
        this.localModsPathError = '';
      }
      
      // Reload user config if paths are valid
      if (this.isFormValid() && this.userConfigs.length > 0) {
        await this.loadUserConfig();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't show error toast immediately after cache clear
      // as this is expected behavior
    }
  }

  // Helper method to extract filename from path
  private extractFileName(filePath: string): string {
    if (!filePath) return '';
    
    // Try different path separators
    let fileName = filePath.split('\\').pop(); // Windows
    if (!fileName || fileName === filePath) {
      fileName = filePath.split('/').pop(); // Unix/Linux
    }
    
    return fileName || '';
  }

  // Force re-validation of all paths
  async revalidateAll(): Promise<void> {
    if (this.gameExePath) {
      const gameFileName = this.extractFileName(this.gameExePath);
      await this.validateGameExePath(gameFileName);
    }
    
    if (this.localModsPath) {
      const modsFileName = this.extractFileName(this.localModsPath);
      await this.validateLocalModsPath(modsFileName);
    }
  }

  async selectGameExePath(): Promise<void> {
    try {
      // Check if we're running in Electron
      if (window.electronAPI) {
        const filePath = await window.electronAPI.openGameExeDialog();
        if (filePath) {
          this.gameExePath = filePath;
          const fileName = this.extractFileName(filePath);
          await this.validateGameExePath(fileName);
        }
      } else {
        // Fallback for browser/development
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.exe';
        input.onchange = async (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            const fileName = file.name;
            // In browser, we can only show the filename
            this.gameExePath = fileName;
            await this.validateGameExePath(fileName);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('Error selecting game exe path:', error);
    }
  }

  async selectLocalModsPath(): Promise<void> {
    try {
      // Check if we're running in Electron
      if (window.electronAPI) {
        const filePath = await window.electronAPI.openModsJsonDialog();
        if (filePath) {
          this.localModsPath = filePath;
          const fileName = this.extractFileName(filePath);
          await this.validateLocalModsPath(fileName);
        }
      } else {
        // Fallback for browser/development
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            const fileName = file.name;
            // In browser, we can only show the filename
            this.localModsPath = fileName;
            await this.validateLocalModsPath(fileName);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('Error selecting local mods path:', error);
    }
  }

  async validateGameExePath(fileName: string): Promise<void> {
    // Clear any existing error
    this.gameExePathError = '';
    
    if (!fileName) {
      // If no filename extracted, it might be because the path doesn't contain expected separators
      // Check if the entire gameExePath looks like a valid exe file
      if (this.gameExePath) {
        if (!this.gameExePath.toLowerCase().endsWith('.exe')) {
          this.gameExePathError = this.translateService.instant('SETTINGS.FORM.GAME_EXE_NOT_FOUND');
        }
        // If it ends with .exe, consider it valid even if we couldn't extract the filename
      }
      return;
    }

    // Check if the selected file is aomrt_s.exe (case insensitive)
    if (fileName.toLowerCase() !== 'aomrt_s.exe') {
      this.gameExePathError = this.translateService.instant('SETTINGS.FORM.GAME_EXE_NOT_FOUND');
      return;
    }

    // Check if the file actually exists at the specified path
    if (window.electronAPI && this.gameExePath) {
      try {
        const exists = await window.electronAPI.fileExists(this.gameExePath);
        if (!exists) {
          this.gameExePathError = this.translateService.instant('SETTINGS.FORM.GAME_EXE_NOT_FOUND');
        }
      } catch (error) {
        console.error('Error checking file existence:', error);
        this.gameExePathError = this.translateService.instant('SETTINGS.FORM.GAME_EXE_NOT_FOUND');
      }
    }
  }

  async validateLocalModsPath(fileName: string): Promise<void> {
    // Clear any existing error
    this.localModsPathError = '';
    
    if (!fileName) {
      // If no filename extracted, check if the path looks like a JSON file
      if (this.localModsPath) {
        if (!this.localModsPath.toLowerCase().endsWith('.json')) {
          this.localModsPathError = this.translateService.instant('SETTINGS.FORM.MODS_JSON_NOT_FOUND');
        }
        // If it ends with .json, consider it valid even if we couldn't extract the filename
      }
      return;
    }

    // Check if the selected file is myth-mod-status.json (case insensitive)
    if (fileName.toLowerCase() !== 'myth-mod-status.json') {
      this.localModsPathError = this.translateService.instant('SETTINGS.FORM.MODS_JSON_NOT_FOUND');
      return;
    }

    // Check if the file actually exists at the specified path
    if (window.electronAPI && this.localModsPath) {
      try {
        const exists = await window.electronAPI.fileExists(this.localModsPath);
        if (!exists) {
          this.localModsPathError = this.translateService.instant('SETTINGS.FORM.MODS_JSON_NOT_FOUND');
        }
      } catch (error) {
        console.error('Error checking file existence:', error);
        this.localModsPathError = this.translateService.instant('SETTINGS.FORM.MODS_JSON_NOT_FOUND');
      }
    }
  }

  isFormValid(): boolean {
    return !!this.gameExePath && !this.gameExePathError && 
           !!this.localModsPath && !this.localModsPathError;
  }

  saveSettings(): void {
    if (this.isFormValid()) {
      try {
        // Use localStorage - it's persistent in Electron and sufficient for our needs
        localStorage.setItem('gameExePath', this.gameExePath);
        localStorage.setItem('localModsPath', this.localModsPath);
        
        // Load user config now that paths are saved
        if (this.userConfigs.length > 0) {
          this.loadUserConfig();
        }
        
        // Show success message using toast service
        const successMessage = this.translateService.instant('SETTINGS.FORM.SUCCESS');
        this.toastService.showSuccess(successMessage);
      } catch (error) {
        console.error('Error saving settings:', error);
        const errorMessage = this.translateService.instant('SETTINGS.FORM.ERROR');
        this.toastService.showError(errorMessage);
      }
    } else {
      // Show error message using toast service
      const errorMessage = this.translateService.instant('SETTINGS.FORM.ERROR');
      this.toastService.showError(errorMessage);
    }
  }

  // Cache Management Methods
  loadCacheItems(): void {
    this.cacheItems = [];
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const size = this.cacheDescriptionService.formatBytes(new Blob([value || '']).size);
        
        this.cacheItems.push({
          key,
          selected: false,
          description: this.cacheDescriptionService.getCacheItemDescription(key),
          size,
          type: this.cacheDescriptionService.getCacheItemType(key)
        });
      }
    }
    
    // Sort by type and then by key
    this.cacheItems.sort((a, b) => {
      if (a.type !== b.type) {
        const typeOrder = { 'config': 0, 'data': 1, 'other': 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.key.localeCompare(b.key);
    });
  }

  onCacheItemToggle(item: CacheItem): void {
    item.selected = !item.selected;
  }

  selectAllCacheItems(): void {
    const allSelected = this.cacheItems.every(item => item.selected);
    this.cacheItems.forEach(item => item.selected = !allSelected);
  }

  get hasSelectedCacheItems(): boolean {
    return this.cacheItems.some(item => item.selected);
  }

  get selectedCacheItemsCount(): number {
    return this.cacheItems.filter(item => item.selected).length;
  }

  get allCacheItemsSelected(): boolean {
    return this.cacheItems.length > 0 && this.cacheItems.every(item => item.selected);
  }

  get someButNotAllCacheItemsSelected(): boolean {
    return this.hasSelectedCacheItems && !this.cacheItems.every(item => item.selected);
  }

  async clearSelectedCacheItems(): Promise<void> {
    if (!this.hasSelectedCacheItems) {
      return;
    }

    this.isClearingCache = true;
    
    try {
      const selectedItems = this.cacheItems.filter(item => item.selected);
      
      // Set navigation flag before clearing storage to avoid blank screen
      sessionStorage.setItem('navigateAfterReload', 'home');
      
      // Remove selected items from localStorage
      selectedItems.forEach(item => {
        localStorage.removeItem(item.key);
      });
      
      // Show success message
      const successMessage = this.translateService.instant('SETTINGS.CACHE.CLEAR_SELECTED_SUCCESS');
      this.toastService.showSuccess(successMessage);
      
      // Inform user that application will reload
      const reloadMessage = this.translateService.instant('SETTINGS.CACHE.RELOAD_MESSAGE');
      this.toastService.showInfo(reloadMessage);
      
      // Reload the application after a short delay
      setTimeout(async () => {
        try {
          if (window.electronAPI && window.electronAPI.reloadWindow) {
            // Use Electron's window reload method
            await window.electronAPI.reloadWindow();
          } else if (window.electronAPI && window.electronAPI.restartApp) {
            // Fallback to full restart
            await window.electronAPI.restartApp();
          } else {
            // Web environment - simple reload
            window.location.reload();
          }
        } catch (error) {
          console.error('Error reloading application:', error);
          // Ultimate fallback
          window.location.reload();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing selected cache items:', error);
      const errorMessage = this.translateService.instant('SETTINGS.CACHE.CLEAR_ERROR');
      this.toastService.showError(errorMessage);
    } finally {
      this.isClearingCache = false;
    }
  }

  async clearApplicationCache(): Promise<void> {
    this.isClearingCache = true;
    
    try {
      // Set navigation flag before clearing storage to avoid blank screen
      sessionStorage.setItem('navigateAfterReload', 'home');
      
      // Clear localStorage
      localStorage.clear();
      
      // Show success message
      const successMessage = this.translateService.instant('SETTINGS.CACHE.CLEAR_SUCCESS');
      this.toastService.showSuccess(successMessage);
      
      // Inform user that application will reload
      const reloadMessage = this.translateService.instant('SETTINGS.CACHE.RELOAD_MESSAGE');
      this.toastService.showInfo(reloadMessage);
      
      // Reload the application after a short delay
      setTimeout(async () => {
        try {
          if (window.electronAPI && window.electronAPI.reloadWindow) {
            // Use Electron's window reload method
            await window.electronAPI.reloadWindow();
          } else if (window.electronAPI && window.electronAPI.restartApp) {
            // Fallback to full restart
            await window.electronAPI.restartApp();
          } else {
            // Web environment - simple reload
            window.location.reload();
          }
        } catch (error) {
          console.error('Error reloading application:', error);
          // Ultimate fallback
          window.location.reload();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      const errorMessage = this.translateService.instant('SETTINGS.CACHE.CLEAR_ERROR');
      this.toastService.showError(errorMessage);
    } finally {
      this.isClearingCache = false;
    }
  }

  // User Config Management Methods
  initializeUserConfigs(): void {
    this.userConfigs = USER_CONFIG_KEYS.map(key => ({
      key,
      enabled: false,
      description: this.translateService.instant(`SETTINGS.USER_CONFIG.CONFIGS.${key}`)
    }));
    
    if (this.isFormValid()) {
      this.loadUserConfig();
    }
  }

  async loadUserConfig(): Promise<void> {
    if (!this.localModsPath) return;
    
    try {
      // Calculate user.cfg path based on mods path
      const userConfigPath = this.getUserConfigPath();
      
      if (window.electronAPI && window.electronAPI.readFile) {
        const content = await window.electronAPI.readFile(userConfigPath);
        this.parseUserConfig(content);
        
        // Configuration loaded successfully
        const enabledCount = this.userConfigs.filter(c => c.enabled).length;
      }
    } catch {
      // File doesn't exist or can't be read - create it with default config
      await this.createDefaultUserConfig();
    }
  }

  async createDefaultUserConfig(): Promise<void> {
    if (!this.localModsPath) return;
    
    try {
      // Calculate user.cfg path based on mods path
      const userConfigPath = this.getUserConfigPath();
      
      // Create config directory if it doesn't exist
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const lastSeparator = Math.max(userConfigPath.lastIndexOf('\\'), userConfigPath.lastIndexOf('/'));
        const configDir = userConfigPath.substring(0, lastSeparator);
        await window.electronAPI.ensureDirectory(configDir);
      }
      
      // Create empty user.cfg file
      if (window.electronAPI && window.electronAPI.writeFile) {
        await window.electronAPI.writeFile(userConfigPath, '');
        
        // Initialize with default values (all disabled)
        this.initializeUserConfigs();
        
        const createdMessage = this.translateService.instant('SETTINGS.USER_CONFIG.MESSAGES.FILE_CREATED');
        this.toastService.showSuccess(createdMessage);
      }
    } catch {
      const errorMessage = this.translateService.instant('SETTINGS.USER_CONFIG.MESSAGES.CREATE_ERROR');
      this.toastService.showError(errorMessage);
    }
  }

  parseUserConfig(content: string): void {
    const enabledConfigs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    this.userConfigs.forEach(config => {
      config.enabled = enabledConfigs.includes(config.key);
    });
  }

  onConfigToggle(config: UserConfigItem): void {
    config.enabled = !config.enabled;
    
    // Provide immediate feedback
    // const statusKey = config.enabled ? 'ENABLED' : 'DISABLED';
    // const message = this.translateService.instant('SETTINGS.USER_CONFIG.MESSAGES.CONFIG_TOGGLED', {
    //   configName: config.key,
    //   state: this.translateService.instant(`SETTINGS.USER_CONFIG.MESSAGES.${statusKey}`)
    // });
    // this.toastService.showInfo(message);
    
    this.autoSaveUserConfig();
  }

  autoSaveUserConfig(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = window.setTimeout(() => {
      this.saveUserConfig();
    }, 1000); // Auto-save after 1 second of inactivity
  }

  async saveUserConfig(): Promise<void> {
    if (!this.localModsPath) return;
    
    try {
      // Calculate user.cfg path based on mods path
      const userConfigPath = this.getUserConfigPath();
      
      // Generate config content
      const enabledConfigs = this.userConfigs
        .filter(config => config.enabled)
        .map(config => config.key);
      
      const content = enabledConfigs.length > 0 ? enabledConfigs.join('\n') + '\n' : '';
      
      if (window.electronAPI && window.electronAPI.writeFile) {
        await window.electronAPI.writeFile(userConfigPath, content);
        
        // Provide detailed feedback about what was saved
        const enabledCount = enabledConfigs.length;
        const successMessage = this.translateService.instant('SETTINGS.USER_CONFIG.MESSAGES.SAVE_SUCCESS', {
          count: enabledCount
        });
        this.toastService.showSuccess(successMessage);
      }
    } catch (error) {
      console.error('Error saving user config:', error);
      const errorMessage = this.translateService.instant('SETTINGS.USER_CONFIG.MESSAGES.AUTO_SAVE_ERROR');
      this.toastService.showError(errorMessage);
    }
  }

  isUserConfigSectionEnabled(): boolean {
    // Check if form is valid AND paths are currently saved in localStorage
    const savedGameExePath = localStorage.getItem('gameExePath');
    const savedLocalModsPath = localStorage.getItem('localModsPath');
    
    return this.isFormValid() && 
           !!savedGameExePath && savedGameExePath === this.gameExePath &&
           !!savedLocalModsPath && savedLocalModsPath === this.localModsPath;
  }

  private getUserConfigPath(): string {
    if (!this.localModsPath) return '';
    
    // Calculate user.cfg path based on mods path using string methods to avoid regex warnings
    const lastSeparator = Math.max(this.localModsPath.lastIndexOf('\\'), this.localModsPath.lastIndexOf('/'));
    const modsDir = this.localModsPath.substring(0, lastSeparator);
    
    const configDir = modsDir.toLowerCase().endsWith('mods') 
      ? modsDir.slice(0, -4) + 'config'
      : modsDir + '/config';
    
    return `${configDir}/user.cfg`;
  }
}
