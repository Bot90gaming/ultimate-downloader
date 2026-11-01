const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage, Notification } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, fork } = require('child_process');
const fs = require('fs');

// Global references to prevent garbage collection
let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

const DEFAULT_SERVER_PORT = process.env.PORT || 4000;
const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Check if a service is responding on the given host and port
 */
function checkServerHealth(port = DEFAULT_SERVER_PORT, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for the backend server to respond with retry backoff
 */
async function waitForBackend(port = DEFAULT_SERVER_PORT, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await checkServerHealth(port);
    if (healthy) {
      console.log(`[Electron] Backend verified healthy on port ${port}`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

/**
 * Launch the backend Express process if not already running
 */
async function ensureBackendRunning() {
  const isRunning = await checkServerHealth(DEFAULT_SERVER_PORT);
  if (isRunning) {
    console.log(`[Electron] Backend already active on port ${DEFAULT_SERVER_PORT}`);
    return;
  }

  console.log('[Electron] Starting embedded backend service...');

  // Locate server entry point
  let serverEntry = null;
  const potentialPaths = [
    path.join(__dirname, '../server/dist/index.js'),
    path.join(__dirname, '../server/src/index.ts'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked/server/dist/index.js'),
    path.join(process.resourcesPath || '', 'server/dist/index.js')
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      serverEntry = p;
      break;
    }
  }

  const downloadsDir = path.join(app.getPath('downloads'), 'UltimateDownloader');
  if (!fs.existsSync(downloadsDir)) {
    try {
      fs.mkdirSync(downloadsDir, { recursive: true });
    } catch (err) {
      console.warn('[Electron] Could not create downloads directory:', err);
    }
  }

  const env = {
    ...process.env,
    PORT: String(DEFAULT_SERVER_PORT),
    NODE_ENV: isDev ? 'development' : 'production',
    DOWNLOAD_DIR: downloadsDir,
    CLIENT_DIST: path.join(__dirname, '../client/dist')
  };

  if (serverEntry && serverEntry.endsWith('.js')) {
    backendProcess = fork(serverEntry, [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });
  } else if (serverEntry && serverEntry.endsWith('.ts')) {
    // Development fallback using ts-node or npm
    backendProcess = spawn('npm', ['--prefix', path.join(__dirname, '../server'), 'run', 'dev'], {
      env,
      shell: true,
      stdio: 'pipe'
    });
  } else {
    console.warn('[Electron] Server entry point not found. Assuming external backend.');
    return;
  }

  if (backendProcess) {
    backendProcess.stdout?.on('data', (d) => console.log(`[Server] ${d.toString().trim()}`));
    backendProcess.stderr?.on('data', (d) => console.error(`[Server Error] ${d.toString().trim()}`));

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });
  }

  await waitForBackend(DEFAULT_SERVER_PORT);
}

/**
 * Create the main desktop application window
 */
function createMainWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icons/icon.ico')
    : path.join(__dirname, 'icons/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#020617',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false, // Show once ready-to-show for smoother startup
    title: 'Ultimate Downloader',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    }
  });

  // Track window state changes for custom titlebars
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:state-changed', 'maximized'));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:state-changed', 'unmaximized'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      // mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Minimize to tray on close if user didn't explicitly quit
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
      return false;
    }
  });

  // Handle external link clicks securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load content
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_URL).catch(() => {
      // Fallback to built client if dev server is not running
      const indexPath = path.join(__dirname, '../client/dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        mainWindow.loadURL(`http://127.0.0.1:${DEFAULT_SERVER_PORT}`);
      }
    });
  } else {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL(`http://127.0.0.1:${DEFAULT_SERVER_PORT}`);
    }
  }
}

/**
 * Configure System Tray and Context Menu
 */
function createTray() {
  const trayIconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icons/icon.ico')
    : path.join(__dirname, 'icons/tray.png');

  if (!fs.existsSync(trayIconPath)) {
    return;
  }

  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('Ultimate Downloader');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Ultimate Downloader',
      click: () => {
        if (mainWindow) {
          if (process.platform === 'darwin') app.dock.show();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Open Downloads Folder',
      click: () => {
        const downloadsDir = path.join(app.getPath('downloads'), 'UltimateDownloader');
        if (!fs.existsSync(downloadsDir)) {
          fs.mkdirSync(downloadsDir, { recursive: true });
        }
        shell.openPath(downloadsDir);
      }
    },
    { type: 'separator' },
    {
      label: 'About Ultimate Downloader',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'Ultimate Downloader',
          message: `Ultimate Downloader v${app.getVersion()}`,
          detail: 'Universal Cross-Platform Video and Image Downloader & Bulk Media Extractor.\n\nBuilt with Electron, React, Vite, Express, and ffmpeg.',
          buttons: ['OK']
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (process.platform === 'darwin') app.dock.show();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * Register all IPC Handlers
 */
function registerIpcHandlers() {
  // App info
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('app:get-system-info', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    downloadsDir: path.join(app.getPath('downloads'), 'UltimateDownloader')
  }));

  ipcMain.handle('app:get-downloads-dir', () => {
    return path.join(app.getPath('downloads'), 'UltimateDownloader');
  });

  // Native Folder Picker
  ipcMain.handle('dialog:select-directory', async (_event, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Destination Folder for Downloads',
      defaultPath: defaultPath || app.getPath('downloads'),
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }
    return result.filePaths[0];
  });

  // Shell actions
  ipcMain.handle('shell:open-path', async (_event, targetPath) => {
    if (!targetPath) return false;
    return shell.openPath(targetPath);
  });

  ipcMain.handle('shell:show-item-in-folder', async (_event, filePath) => {
    if (!filePath) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (!url) return false;
    return shell.openExternal(url);
  });

  // Native Notification Toast
  ipcMain.handle('app:show-notification', async (_event, options = {}) => {
    if (!Notification.isSupported()) {
      return false;
    }

    const iconPath = path.join(__dirname, 'icons/icon-256.png');
    const notification = new Notification({
      title: options.title || 'Ultimate Downloader',
      body: options.body || '',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      silent: Boolean(options.silent)
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (process.platform === 'darwin') app.dock.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('notification:clicked', options.onClickData);
      }
      if (options.onClickData && options.onClickData.filePath) {
        shell.showItemInFolder(options.onClickData.filePath);
      }
    });

    notification.show();
    return true;
  });

  // Window control IPCs
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });
}

// Ensure single application instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerIpcHandlers();
    await ensureBackendRunning();
    createMainWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });

  // Clean shutdown
  app.on('before-quit', () => {
    isQuitting = true;
    if (backendProcess) {
      console.log('[Electron] Terminating embedded backend service...');
      try {
        backendProcess.kill('SIGTERM');
      } catch (err) {
        console.error('[Electron] Error killing backend process:', err);
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
