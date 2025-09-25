import { Injectable, inject } from '@angular/core';
import { ToastService } from '../toast.service';

export interface ParseOptions {
  slim: boolean;
  stats: boolean;
  prettyPrint: boolean;
  isGzip: boolean;
  verbose: boolean;
}

export interface ParseResult {
  success: boolean;
  data?: any;
  error?: string;
  fileName?: string;
}

export interface ExecuteCommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReplayParserService {
  private toastService = inject(ToastService);

  async parseReplay(file: File, options: ParseOptions): Promise<ParseResult> {
    try {
      // Check if we're running in Electron
      if (!window.electronAPI) {
        throw new Error('Replay parsing is only available in Electron environment');
      }

      // Get app path to locate the restoration script
      const appPath = await window.electronAPI.getAppPath();
      const scriptPath = window.electronAPI.pathJoin(appPath, 'scripts', 'restoration-windows-amd64.exe');

      // Check if the script exists
      const scriptExists = await window.electronAPI.fileExists(scriptPath);
      if (!scriptExists) {
        throw new Error('Restoration parser script not found. Please ensure the application is properly installed.');
      }

      // Create a temporary file path for the uploaded file
      const tempDir = window.electronAPI.pathJoin(appPath, 'temp');
      await window.electronAPI.ensureDirectory(tempDir);
      
      const tempFilePath = window.electronAPI.pathJoin(tempDir, file.name);
      
      // Write the file to the temporary location
      const fileBuffer = await this.fileToArrayBuffer(file);
      await window.electronAPI.writeFileBuffer(tempFilePath, fileBuffer);

      // Build command arguments
      const args = ['parse'];
      
      if (options.slim) {
        args.push('--slim');
      }
      
      if (options.stats && !options.slim) {
        args.push('--stats');
      }
      
      if (options.prettyPrint) {
        args.push('--pretty-print');
      }
      
      if (options.isGzip) {
        args.push('--is-gzip');
      }
      
      if (options.verbose) {
        args.push('--verbose');
      }
      
      // Add the file path as the last argument
      args.push(tempFilePath);

      // Execute the restoration script
      const result = await window.electronAPI.executeCommand(scriptPath, args);

      // Clean up temporary file
      try {
        await window.electronAPI.deleteFile(tempFilePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', cleanupError);
      }

      if (!result.success) {
        return {
          success: false,
          error: result.stderr || result.error || 'Failed to execute parser script'
        };
      }

      // Parse the JSON output
      try {
        const jsonData = JSON.parse(result.stdout || '{}');
        return {
          success: true,
          data: jsonData,
          fileName: file.name
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse script output as JSON'
        };
      }

    } catch (error) {
      console.error('Error parsing replay:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get supported file extensions for replay files
   */
  getSupportedExtensions(): string[] {
    return ['.mythrec', '.mythrec.gz'];
  }

  /**
   * Validate if a file has a supported extension
   */
  isValidReplayFile(fileName: string): boolean {
    const supportedExtensions = this.getSupportedExtensions();
    return supportedExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Get file size in human-readable format
   */
  getFileSizeString(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}