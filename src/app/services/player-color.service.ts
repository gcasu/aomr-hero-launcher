import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlayerColorService {
  private readonly playerColors = [
    '#FF0000', '#0000FF', '#FFFF00', '#00FF00', 
    '#00FFFF', '#FF00FF', '#808080', '#FFA500',
    '#FFB6C1', '#800080', '#A52A2A', '#FFFFFF'
  ];

  private readonly defaultColor = '#CDA351';

  /**
   * Get player color by color index
   */
  getPlayerColor(colorIndex: number): string {
    return this.playerColors[colorIndex] || this.defaultColor;
  }

  /**
   * Get default fallback color
   */
  getDefaultColor(): string {
    return this.defaultColor;
  }

  /**
   * Get player color from parsed data with complex color extraction logic
   */
  getPlayerColorFromParsedData(parsedData: any, playerNum?: number): string {
    if (!parsedData || !parsedData.Players || !Array.isArray(parsedData.Players)) {
      return this.defaultColor;
    }

    // Find the winner or specific player
    let targetPlayer;
    if (playerNum) {
      targetPlayer = parsedData.Players.find((player: any) => player.PlayerNumber === playerNum);
    } else {
      targetPlayer = parsedData.Players.find((player: any) => player.Winner === true);
    }

    if (!targetPlayer) {
      return this.defaultColor;
    }

    // Try to extract color from different possible formats
    if (targetPlayer.Color) {
      // Format 1: Already a hex string
      if (typeof targetPlayer.Color === 'string' && targetPlayer.Color.startsWith('#')) {
        return targetPlayer.Color;
      }
      
      // Format 2: RGB object with values 0-1
      if (typeof targetPlayer.Color === 'object' && targetPlayer.Color.R !== undefined) {
        const r = Math.round((targetPlayer.Color.R || 0) * 255);
        const g = Math.round((targetPlayer.Color.G || 0) * 255);
        const b = Math.round((targetPlayer.Color.B || 0) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      // Format 3: RGB object with values 0-255
      if (typeof targetPlayer.Color === 'object' && targetPlayer.Color.r !== undefined) {
        const r = Math.round(targetPlayer.Color.r || 0);
        const g = Math.round(targetPlayer.Color.g || 0);
        const b = Math.round(targetPlayer.Color.b || 0);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      // Format 4: Array [r, g, b]
      if (Array.isArray(targetPlayer.Color) && targetPlayer.Color.length >= 3) {
        const r = Math.round(targetPlayer.Color[0] * (targetPlayer.Color[0] <= 1 ? 255 : 1));
        const g = Math.round(targetPlayer.Color[1] * (targetPlayer.Color[1] <= 1 ? 255 : 1));
        const b = Math.round(targetPlayer.Color[2] * (targetPlayer.Color[2] <= 1 ? 255 : 1));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }

      // Format 5: Direct color index
      if (typeof targetPlayer.Color === 'number') {
        return this.getPlayerColor(targetPlayer.Color);
      }
    }

    // Fallback: Use default color
    return this.defaultColor;
  }
}