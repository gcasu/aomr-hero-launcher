const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Ensure we're exposing the API correctly
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    // File dialog functions
    openGameExeDialog: () => ipcRenderer.invoke('dialog:openGameExe'),
    openModsJsonDialog: () => ipcRenderer.invoke('dialog:openModsJson'),
    
    // Game launch functions
    launchGame: (exePath) => ipcRenderer.invoke('launch:gameExe', exePath),
    
    // File operations
    readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
    writeFileBuffer: (filePath, buffer) => ipcRenderer.invoke('file:writeBuffer', filePath, buffer),
    readFileBuffer: (filePath) => ipcRenderer.invoke('file:readBuffer', filePath),
    deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('file:ensureDirectory', dirPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('file:readDirectory', dirPath),
    
    // Path utilities
    getAppPath: () => ipcRenderer.invoke('app:getPath'),
    pathJoin: (...paths) => path.join(...paths),
    pathBasename: (filePath, ext) => path.basename(filePath, ext),
    
    // External link opening
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    
    // Application control
    restartApp: () => ipcRenderer.invoke('app:restart'),
    reloadWindow: () => ipcRenderer.invoke('window:reload'),
    
    // YouTube feed fetching
    fetchYouTubeFeed: (channelId) => ipcRenderer.invoke('youtube:fetchFeed', channelId),
    
    // Command execution
    executeCommand: (command, args) => ipcRenderer.invoke('command:execute', command, args),
    
    // Test function to verify API is working
    test: () => 'Electron API is working!'
  });
} catch (error) {
  console.error('Error in preload script:', error);
}
