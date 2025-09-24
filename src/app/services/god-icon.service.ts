import { Injectable } from '@angular/core';

export interface GodIconConfig {
  name: string;
  fileName: string;
  folderPath: string;
  age: 'Archaic' | 'Classical' | 'Heroic' | 'Mythic';
}

@Injectable({
  providedIn: 'root'
})
export class GodIconService {
  private readonly basePath = 'assets/images/tiers';
  private readonly folderPaths = {
    major: 'Major Gods (Archaic Age)',
    classical: 'Minor Gods (Classical Age)',
    heroic: 'Minor Gods (Heroic Age)',
    mythic: 'Minor Gods (Mythic Age)'
  };

  private majorGodIconCache: Record<string, string> = {};
  private minorGodIconCache: Record<string, string> = {};

  /**
   * Get the icon path for a major god
   */
  getMajorGodIcon(godName: string): string | null {
    if (!godName) return null;
    
    const key = this.normalizeGodName(godName);
    if (this.majorGodIconCache[key]) {
      return this.majorGodIconCache[key];
    }
    
    const fileName = this.getGodFileName(key);
    const path = `${this.basePath}/${this.folderPaths.major}/${fileName}`;
    this.majorGodIconCache[key] = path;
    
    return path;
  }

  /**
   * Get the icon path for a minor god
   * Uses dynamic discovery to find the correct age folder
   */
  getMinorGodIcon(godName: string): string | null {
    if (!godName) return null;
    
    const key = this.normalizeGodName(godName);
    if (this.minorGodIconCache[key]) {
      return this.minorGodIconCache[key];
    }
    
    const fileName = this.getGodFileName(key);
    
    // Try to find the god in the correct age folder using known mappings
    const ageFolderMap = this.getKnownGodAgeMapping();
    const correctFolder = ageFolderMap[key];
    
    if (correctFolder) {
      const path = `${this.basePath}/${correctFolder}/${fileName}`;
      this.minorGodIconCache[key] = path;
      return path;
    }
    
    // Fallback: try all minor god folders in age order
    const minorFolders = [
      this.folderPaths.classical,
      this.folderPaths.heroic,
      this.folderPaths.mythic
    ];
    
    for (const folder of minorFolders) {
      const path = `${this.basePath}/${folder}/${fileName}`;
      this.minorGodIconCache[key] = path;
      return path;
    }
    
    return null;
  }

  /**
   * Clear the icon caches (useful for testing or if icons are updated)
   */
  clearCache(): void {
    this.majorGodIconCache = {};
    this.minorGodIconCache = {};
  }

  /**
   * Get all known god icon configurations
   * This can be extended to dynamically discover gods from actual asset folders
   */
  getAllKnownGods(): GodIconConfig[] {
    const configs: GodIconConfig[] = [];
    
    // Add major gods (these could be dynamically discovered)
    const majorGods = [
      'zeus', 'odin', 'ra', 'kronos', 'isis', 'loki', 'gaia', 'oranos', 'set', 
      'hades', 'thor', 'poseidon', 'athena', 'nu_wa', 'fu_xi', 'shennong'
    ];
    
    majorGods.forEach(god => {
      configs.push({
        name: god,
        fileName: this.getGodFileName(god),
        folderPath: this.folderPaths.major,
        age: 'Archaic'
      });
    });
    
    // Add minor gods with their age mappings
    const ageMapping = this.getKnownGodAgeMapping();
    Object.entries(ageMapping).forEach(([godName, folderName]) => {
      const age = this.getAgeFromFolderName(folderName);
      if (age !== 'Archaic') {
        configs.push({
          name: godName,
          fileName: this.getGodFileName(godName),
          folderPath: folderName,
          age
        });
      }
    });
    
    return configs;
  }

  /**
   * Normalize god name to a consistent format for caching and file naming
   */
  private normalizeGodName(godName: string): string {
    return godName.toLowerCase().trim();
  }

  /**
   * Convert god name to expected file name format
   */
  private getGodFileName(normalizedName: string): string {
    return normalizedName.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
  }

  /**
   * Get the age category from a folder name
   */
  private getAgeFromFolderName(folderName: string): 'Archaic' | 'Classical' | 'Heroic' | 'Mythic' {
    if (folderName.includes('Archaic')) return 'Archaic';
    if (folderName.includes('Classical')) return 'Classical';
    if (folderName.includes('Heroic')) return 'Heroic';
    if (folderName.includes('Mythic')) return 'Mythic';
    return 'Classical'; // Default fallback
  }

  /**
   * Known god to age mapping
   * This could be replaced with dynamic discovery from actual asset folders
   * or loaded from a configuration file
   */
  private getKnownGodAgeMapping(): Record<string, string> {
    return {
      // Classical Age
      'anubis': this.folderPaths.classical,
      'ares': this.folderPaths.classical,
      'athena': this.folderPaths.classical,
      'bast': this.folderPaths.classical,
      'chiyou': this.folderPaths.classical,
      'forseti': this.folderPaths.classical,
      'freyja': this.folderPaths.classical,
      'heimdall': this.folderPaths.classical,
      'hermes': this.folderPaths.classical,
      'houtu': this.folderPaths.classical,
      'leto': this.folderPaths.classical,
      'oceanus': this.folderPaths.classical,
      'prometheus': this.folderPaths.classical,
      'ptah': this.folderPaths.classical,
      'ullr': this.folderPaths.classical,
      'xuannu': this.folderPaths.classical,
      
      // Heroic Age
      'aegir': this.folderPaths.heroic,
      'aphrodite': this.folderPaths.heroic,
      'apollo': this.folderPaths.heroic,
      'bragi': this.folderPaths.heroic,
      'dionysus': this.folderPaths.heroic,
      'goumang': this.folderPaths.heroic,
      'hyperion': this.folderPaths.heroic,
      'nephthys': this.folderPaths.heroic,
      'njord': this.folderPaths.heroic,
      'nuba': this.folderPaths.heroic,
      'rheia': this.folderPaths.heroic,
      'rushou': this.folderPaths.heroic,
      'sekhmet': this.folderPaths.heroic,
      'skadi': this.folderPaths.heroic,
      'sobek': this.folderPaths.heroic,
      'theia': this.folderPaths.heroic,
      
      // Mythic Age
      'artemis': this.folderPaths.mythic,
      'atlas': this.folderPaths.mythic,
      'baldr': this.folderPaths.mythic,
      'gonggong': this.folderPaths.mythic,
      'hekate': this.folderPaths.mythic,
      'hel': this.folderPaths.mythic,
      'helios': this.folderPaths.mythic,
      'hephaestus': this.folderPaths.mythic,
      'hera': this.folderPaths.mythic,
      'horus': this.folderPaths.mythic,
      'huangdi': this.folderPaths.mythic,
      'osiris': this.folderPaths.mythic,
      'thoth': this.folderPaths.mythic,
      'tyr': this.folderPaths.mythic,
      'vidar': this.folderPaths.mythic,
      'zhurong': this.folderPaths.mythic
    };
  }
}