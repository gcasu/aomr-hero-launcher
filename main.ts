import { app, BrowserWindow, Menu, protocol, ipcMain, dialog, shell, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, exec } from 'child_process';

class Main {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.argv.includes('--serve');

  public init(): void {
    app.on('ready', () => {
      // Register file protocol for local assets
      protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = decodeURI(request.url.replace('file:///', ''));
        callback(pathname);
      });
      
      this.createWindow();
      this.setupIPC();
    });
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);
    
    // Handle any unhandled navigation issues
    app.on('web-contents-created', (event, contents) => {
      contents.on('will-navigate', (navigationEvent, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        // Prevent navigation to invalid file:// URLs
        if (parsedUrl.protocol === 'file:' && parsedUrl.pathname === '/') {
          navigationEvent.preventDefault();
          
          // Reload the correct index.html
          if (!this.isDev && this.mainWindow) {
            const indexPath = path.join(__dirname, '../dist/aom-launcher/index.html');
            this.mainWindow.loadFile(indexPath);
          }
        }
      });
    });
  }

  private createWindow = (): void => {
    const preloadPath = path.join(__dirname, 'preload.js');
    
    this.mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      minHeight: 600,
      minWidth: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: false, // Disable web security to allow local file access
        sandbox: false
      },
      icon: path.join(__dirname, '../src/assets/images/logo.ico'),
      titleBarStyle: 'default',
      show: false
    });

    // Load the Angular app
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:4200');
      this.mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../dist/aom-launcher/index.html');
      this.mainWindow.loadFile(indexPath);
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Remove menu bar
    Menu.setApplicationMenu(null);
  };

  private setupIPC = (): void => {
    // Handle file dialog for game executable
    ipcMain.handle('dialog:openGameExe', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow!, {
        title: 'Select Age of Mythology: Retold Executable',
        buttonLabel: 'Select',
        filters: [
          { name: 'Executable Files', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (canceled) {
        return null;
      } else {
        return filePaths[0];
      }
    });

    // Handle file dialog for mods JSON file
    ipcMain.handle('dialog:openModsJson', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow!, {
        title: 'Select Mods Status JSON File',
        buttonLabel: 'Select',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (canceled) {
        return null;
      } else {
        return filePaths[0];
      }
    });

    // Handle launching game executable
    ipcMain.handle('launch:gameExe', async (event, exePath: string) => {
      try {
        if (!exePath) {
          throw new Error('No executable path provided');
        }

        // Check if file exists
        if (!fs.existsSync(exePath)) {
          throw new Error(`Executable file not found: ${exePath}`);
        }

        // Check if file is actually executable
        const stats = fs.statSync(exePath);
        if (!stats.isFile()) {
          throw new Error('Provided path is not a file');
        }

        // Normalize path separators for Windows
        const normalizedPath = path.normalize(exePath);
        const workingDir = path.dirname(normalizedPath);
        
        return new Promise<{ success: boolean; error?: string }>((resolve) => {
          let hasResolved = false;
          
          // Set a timeout to avoid hanging indefinitely
          const timeout = setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              resolve({
                success: false,
                error: 'Process launch timeout - the executable might not be responding or may require additional permissions'
              });
            }
          }, 10000); // 10 second timeout
          
          if (process.platform === 'win32') {
            // On Windows, try using the Windows shell start command
            const startCommand = `start "Game" /D "${workingDir}" "${normalizedPath}"`;
            
            exec(startCommand, { 
              cwd: workingDir,
              windowsHide: false
            }, (error, stdout, stderr) => {
              if (error) {
                // Fallback: try direct spawn
                const child = spawn(normalizedPath, [], {
                  detached: true,
                  stdio: ['ignore', 'ignore', 'pipe'],
                  cwd: workingDir,
                  windowsHide: false
                });

                child.on('error', (spawnError) => {
                  clearTimeout(timeout);
                  if (!hasResolved) {
                    hasResolved = true;
                    resolve({
                      success: false,
                      error: `Failed to launch executable: ${spawnError.message}`
                    });
                  }
                });

                child.on('spawn', () => {
                  clearTimeout(timeout);
                  if (!hasResolved) {
                    hasResolved = true;
                    child.unref();
                    resolve({ success: true });
                  }
                });

                // Fallback timeout for spawn
                setTimeout(() => {
                  if (!hasResolved) {
                    clearTimeout(timeout);
                    hasResolved = true;
                    child.unref();
                    resolve({ success: true });
                  }
                }, 2000);
                
              } else {
                clearTimeout(timeout);
                if (!hasResolved) {
                  hasResolved = true;
                  resolve({ success: true });
                }
              }
            });
            
            // Give the start command a moment, then assume success if no error
            setTimeout(() => {
              if (!hasResolved) {
                clearTimeout(timeout);
                hasResolved = true;
                resolve({ success: true });
              }
            }, 2000);
            
          } else {
            // On other platforms, use spawn
            const child = spawn(normalizedPath, [], {
              detached: true,
              stdio: ['ignore', 'pipe', 'pipe'],
              cwd: workingDir
            });

            child.on('error', (error) => {
              clearTimeout(timeout);
              if (!hasResolved) {
                hasResolved = true;
                resolve({
                  success: false,
                  error: `Failed to start process: ${error.message}`
                });
              }
            });

            child.on('spawn', () => {
              clearTimeout(timeout);
              if (!hasResolved) {
                hasResolved = true;
                child.unref();
                resolve({ success: true });
              }
            });

            child.on('exit', (code, signal) => {
              clearTimeout(timeout);
              if (!hasResolved) {
                hasResolved = true;
                if (code === 0) {
                  resolve({ success: true });
                } else {
                  resolve({
                    success: false,
                    error: `Process exited with code ${code}`
                  });
                }
              }
            });

            // Fallback timeout
            setTimeout(() => {
              if (!hasResolved && child && !child.killed) {
                clearTimeout(timeout);
                hasResolved = true;
                child.unref();
                resolve({ success: true });
              }
            }, 2000);
          }
        });
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to launch executable' 
        };
      }
    });

    // Handle file reading
    ipcMain.handle('file:read', async (event, filePath: string) => {
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return content;
      } catch (error) {
        console.error('Error reading file:', error);
        throw error;
      }
    });

    // Handle file writing
    ipcMain.handle('file:write', async (event, filePath: string, content: string) => {
      try {
        await fs.promises.writeFile(filePath, content, 'utf8');
      } catch (error) {
        console.error('Error writing file:', error);
        throw error;
      }
    });

    // Handle file existence check
    ipcMain.handle('file:exists', async (event, filePath: string) => {
      try {
        await fs.promises.stat(filePath);
        return true;
      } catch {
        return false;
      }
    });

    // Handle directory creation
    ipcMain.handle('file:ensureDirectory', async (event, dirPath: string) => {
      try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return true;
      } catch (error) {
        console.error('Error creating directory:', error);
        throw error;
      }
    });

    // Handle directory reading
    ipcMain.handle('file:readDirectory', async (event, dirPath: string) => {
      try {
        const files = await fs.promises.readdir(dirPath);
        return files;
      } catch (error) {
        console.error('Error reading directory:', dirPath, error);
        throw error;
      }
    });

    // Handle getting app path
    ipcMain.handle('app:getPath', async () => {
      try {
        const appPath = app.getAppPath();
        return appPath;
      } catch (error) {
        console.error('Error getting app path:', error);
        throw error;
      }
    });

    // Handle opening external links
    ipcMain.handle('shell:openExternal', async (event, url: string) => {
      try {
        await shell.openExternal(url);
      } catch (error) {
        console.error('Error opening external link:', error);
        throw error;
      }
    });

    // Handle application restart (for cache clearing)
    ipcMain.handle('app:restart', async () => {
      try {
        // Clear any session data and cache before restart
        if (this.mainWindow && this.mainWindow.webContents) {
          const session = this.mainWindow.webContents.session;
          await session.clearCache();
          await session.clearStorageData();
        }
        
        app.relaunch();
        app.exit();
      } catch (error) {
        console.error('Error restarting application:', error);
        throw error;
      }
    });

    // Handle window reload (alternative to full restart)
    ipcMain.handle('window:reload', async () => {
      try {
        if (this.mainWindow && this.mainWindow.webContents) {
          // Clear session data first
          const session = this.mainWindow.webContents.session;
          await session.clearCache();
          await session.clearStorageData();
          
          // Reload the window with the main index.html
          if (!this.isDev) {
            const indexPath = path.join(__dirname, '../dist/aom-launcher/index.html');
            await this.mainWindow.loadFile(indexPath);
          } else {
            await this.mainWindow.loadURL('http://localhost:4200');
          }
        }
      } catch (error) {
        console.error('Error reloading window:', error);
        throw error;
      }
    });

    // Handle YouTube feed fetching
    ipcMain.handle('youtube:fetchFeed', async (event, channelId: string) => {
      try {
        if (!channelId) {
          return {
            success: false,
            error: 'No channel ID provided'
          };
        }

        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        console.log(`Fetching YouTube feed for channel: ${channelId}`);

        return new Promise((resolve) => {
          const request = net.request({
            method: 'GET',
            url: feedUrl,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          let responseData = '';

          request.on('response', (response) => {
            console.log(`YouTube feed response status: ${response.statusCode} for channel: ${channelId}`);
            
            if (response.statusCode !== 200) {
              resolve({
                success: false,
                error: `HTTP ${response.statusCode}: Failed to fetch YouTube feed`
              });
              return;
            }

            response.on('data', (chunk) => {
              responseData += chunk.toString();
            });

            response.on('end', () => {
              if (responseData.trim()) {
                console.log(`Successfully fetched YouTube feed for channel: ${channelId} (${responseData.length} bytes)`);
                resolve({
                  success: true,
                  data: responseData
                });
              } else {
                resolve({
                  success: false,
                  error: 'Empty response from YouTube'
                });
              }
            });
          });

          request.on('error', (error) => {
            console.error(`Error fetching YouTube feed for channel ${channelId}:`, error);
            resolve({
              success: false,
              error: `Network error: ${error.message}`
            });
          });

          // Set timeout
          const timeout = setTimeout(() => {
            request.abort();
            resolve({
              success: false,
              error: 'Request timeout'
            });
          }, 10000); // 10 seconds timeout

          request.on('close', () => {
            clearTimeout(timeout);
          });

          request.end();
        });

      } catch (error) {
        console.error('Error in YouTube feed handler:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  };

  private onWindowAllClosed = (): void => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  };

  private onActivate = (): void => {
    if (this.mainWindow === null) {
      this.createWindow();
    }
  };
}

const main = new Main();
main.init();
