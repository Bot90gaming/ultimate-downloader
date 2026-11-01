const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected desktop APIs to the renderer process securely via contextBridge.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform & environment flags
  isElectron: true,
  platform: process.platform,

  // App & System information
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),
  getDefaultDownloadsDir: () => ipcRenderer.invoke('app:get-downloads-dir'),

  // Native File Dialogs & Shell
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:select-directory', defaultPath),
  openPath: (fullPath) => ipcRenderer.invoke('shell:open-path', fullPath),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:show-item-in-folder', fullPath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Native Notifications
  showNotification: (options) => ipcRenderer.invoke('app:show-notification', options),

  // Window Controls (useful for frameless custom titlebars on Windows/Linux)
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Listeners for push events from the main process
  onWindowStateChange: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('window:state-changed', handler);
    return () => ipcRenderer.removeListener('window:state-changed', handler);
  },

  onNotificationClicked: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('notification:clicked', handler);
    return () => ipcRenderer.removeListener('notification:clicked', handler);
  }
});
