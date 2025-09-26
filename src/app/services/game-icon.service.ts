import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameIconService {
  
  // Cache for available icons (loaded dynamically)
  private availableIcons: Set<string> = new Set();
  private iconMappings: Map<string, string> = new Map();
  private iconsLoaded = false;
  
  constructor() {
    this.loadAvailableIcons();
  }

  /**
   * Load available icons dynamically from the filesystem using Electron API
   */
  public async loadAvailableIcons(): Promise<void> {
    if (this.iconsLoaded) return;
    
    try {
      if (!window.electronAPI) {
        console.warn('Electron API not available, game icons will be disabled');
        return;
      }

      // Get the app path and construct the icons directory path
      const appPath = await window.electronAPI.getAppPath();
      
      // Try different possible paths for development and production
      const possiblePaths = [
        window.electronAPI.pathJoin(appPath, 'dist/assets/images/icons'), // Production
        window.electronAPI.pathJoin(appPath, 'src/assets/images/icons'),  // Development
        window.electronAPI.pathJoin(appPath, 'assets/images/icons')       // Alternative
      ];
      
      let iconsPath = '';
      let foundPath = false;
      
      // Check each possible path until we find one that exists
      for (const path of possiblePaths) {
        const exists = await window.electronAPI.fileExists(path);
        if (exists) {
          iconsPath = path;
          foundPath = true;
          break;
        }
      }
      
      if (!foundPath) {
        console.warn('GameIconService: Icons directory not found in any of the expected locations');
        return;
      }

      // Read the directory contents
      const files = await window.electronAPI.readDirectory(iconsPath);
      
      // Filter for PNG files and extract icon names
      const iconFiles = files
        .filter(file => file.endsWith('.png'))
        .map(file => file.replace('.png', ''));

      // Add icons to the set and create lowercase mappings for better matching
      iconFiles.forEach(iconName => {
        this.availableIcons.add(iconName);
        this.iconMappings.set(iconName.toLowerCase(), iconName);
      });

      this.iconsLoaded = true;      
    } catch (error) {
      console.error('Failed to load game icons from filesystem:', error);
    }
  }

  /**
   * Extract entity names from a game command object
   * @param command The parsed game command object
   * @returns Array of entity names (units, buildings, technologies)
   */
  private extractEntityNamesFromCommand(command: any): string[] {
    const entities: string[] = [];
    
    // Extract entity names based on command type
    if (command.Unit) {
      entities.push(...this.splitCompoundEntityName(command.Unit));
    }
    
    if (command.Building) {
      entities.push(...this.splitCompoundEntityName(command.Building));
    }
    
    if (command.Technology) {
      entities.push(...this.splitCompoundEntityName(command.Technology));
    }
    
    if (command.Target && !entities.includes(command.Target)) {
      entities.push(...this.splitCompoundEntityName(command.Target));
    }
    
    // Filter out empty/invalid names and remove duplicates
    return [...new Set(entities.filter(entity => entity && entity.trim().length > 0))];
  }

  /**
   * Split compound entity names like "ClassicalAgeAres" into ["ClassicalAge", "Ares"]
   * @param entityName The entity name to potentially split
   * @returns Array of entity names
   */
  private splitCompoundEntityName(entityName: string): string[] {
    // Check for age advancement patterns
    const agePatterns = [
      'ClassicalAge',
      'HeroicAge', 
      'MythicAge'
    ];
    
    for (const agePattern of agePatterns) {
      if (entityName.startsWith(agePattern) && entityName.length > agePattern.length) {
        const godName = entityName.substring(agePattern.length);
        // Return both the age and the god name
        return [agePattern, godName];
      }
    }
    
    // If no compound pattern found, return the original name
    return [entityName];
  }

  /**
   * Find matching game icon for a PascalCase term (exact match only)
   * @param term The PascalCase term to find an icon for
   * @returns The icon filename without extension, or null if no exact match found
   */
  private findMatchingIcon(term: string): string | null {
    // Direct exact match
    if (this.availableIcons.has(term)) {
      return term;
    }

    // Case-insensitive exact match
    const lowerTerm = term.toLowerCase();
    if (this.iconMappings.has(lowerTerm)) {
      return this.iconMappings.get(lowerTerm) || null;
    }

    return null;
  }

  /**
   * Get game icons for a game command object
   * @param command The parsed game command object
   * @returns Array of icon filenames (without extension) that match entities in the command
   */
  async getGameIconsForCommand(command: any): Promise<string[]> {
    // Ensure icons are loaded
    if (!this.iconsLoaded) {
      await this.loadAvailableIcons();
    }

    const entityNames = this.extractEntityNamesFromCommand(command);
    const matchedIcons: string[] = [];

    for (const entityName of entityNames) {
      const matchedIcon = this.findMatchingIcon(entityName);
      if (matchedIcon && !matchedIcons.includes(matchedIcon)) {
        matchedIcons.push(matchedIcon);
      }
    }

    return matchedIcons;
  }

  /**
   * Get game icons for a game command object (synchronous version for when icons are already loaded)
   * @param command The parsed game command object
   * @returns Array of icon filenames (without extension) that match entities in the command
   */
  getGameIconsForCommandSync(command: any): string[] {
    if (!this.iconsLoaded) {
      return []; // Return empty array if icons not loaded yet
    }

    const entityNames = this.extractEntityNamesFromCommand(command);
    const matchedIcons: string[] = [];

    for (const entityName of entityNames) {
      const matchedIcon = this.findMatchingIcon(entityName);
      if (matchedIcon && !matchedIcons.includes(matchedIcon)) {
        matchedIcons.push(matchedIcon);
      }
    }

    return matchedIcons;
  }

  /**
   * Get the full asset path for an icon
   * @param iconName The icon filename without extension
   * @returns The full asset path to the icon
   */
  getIconPath(iconName: string): string {
    return `assets/images/icons/${iconName}.png`;
  }

  /**
   * Check if an icon exists
   * @param iconName The icon filename without extension
   * @returns True if the icon exists
   */
  hasIcon(iconName: string): boolean {
    return this.availableIcons.has(iconName);
  }
}