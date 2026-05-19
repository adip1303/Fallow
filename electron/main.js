const { app, BrowserWindow, screen, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const store = require('./store');

function isWSL() {
  if (process.platform !== 'linux') return false;
  try {
    return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8'));
  } catch {
    return false;
  }
}

// HiDPI under WSLg cannot be fixed from inside the Electron process. WSLg
// already reports logical Windows pixels (e.g. 1728x1080) to Chromium, then
// bitmap-upscales the resulting buffer in its compositor on the Windows side.
// That upscaling is what produces the blur — and Chromium switches like
// --force-device-scale-factor only confuse the math because they double-count.
// For crisp dev iteration, open http://localhost:3000 in Chrome on the Windows
// side; Electron under WSLg is fine for shell-behavior testing but will look
// soft. Packaged Windows .exe builds use the per-monitor-v2 manifest emitted
// by electron-builder, so production output is crisp natively.

if (process.platform === 'win32') {
  app.setAppUserModelId('com.fallow.app');
  app.commandLine.appendSwitch('high-dpi-support', 'true');
}

// WSLg's virtualized GPU often fails to initialize, producing noisy "Exiting
// GPU process" errors. Disable hardware accel under WSL — software rendering
// is fine for the dev shell. Set FALLOW_ENABLE_GPU=1 to re-enable.
if (isWSL() && !process.env.FALLOW_ENABLE_GPU) {
  app.disableHardwareAcceleration();
}

const isDev = !app.isPackaged;

function getAppIconPath() {
  return isDev
    ? path.join(__dirname, '..', 'public', 'logo512.png')
    : path.join(__dirname, '..', 'build', 'logo512.png');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: getAppIconPath(),
    backgroundColor: '#F2EDE5',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// --- IPC: Hermes CLI passthrough (existing) ---

ipcMain.handle('hermes:chat', (_event, prompt) => {
  return new Promise((resolve, reject) => {
    const args = ['-d', 'Ubuntu', 'bash', '-c', '/home/adhip/.local/bin/hermes chat -m moonshotai/kimi-k2 -q ' + JSON.stringify(prompt) + ' -Q'];
    console.log('SPAWN CMD:', args);
    const proc = spawn('wsl', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`hermes exited ${code}: ${stderr.trim()}`));
      fs.writeFileSync(path.join(app.getPath('userData'), 'hermes_last.txt'), stdout);
      console.log('HERMES STDOUT written to:', path.join(app.getPath('userData'), 'hermes_last.txt'));
      resolve(stdout);
    });
    proc.on('error', reject);
  });
});

// --- IPC: Store CRUD ---

ipcMain.handle('store:path', () => store.getStorePath());
ipcMain.handle('store:read', () => store.rawStore());
ipcMain.handle('store:write', (_event, data) => store.overwriteStore(data));

ipcMain.handle('store:listSeeds', () => store.listSeeds());
ipcMain.handle('store:getSeed', (_event, id) => store.getSeed(id));
ipcMain.handle('store:createSeed', (_event, seed) => store.createSeed(seed));
ipcMain.handle('store:updateSeed', (_event, id, patch) => store.updateSeed(id, patch));
ipcMain.handle('store:deleteSeed', (_event, id) => store.deleteSeed(id));

ipcMain.handle('store:listConditions', () => store.listConditions());
ipcMain.handle('store:getCondition', (_event, id) => store.getCondition(id));
ipcMain.handle('store:createCondition', (_event, condition) => store.createCondition(condition));
ipcMain.handle('store:deleteCondition', (_event, id) => store.deleteCondition(id));

ipcMain.handle('store:branches:get', (_event, seedId) => store.getBranches(seedId));
ipcMain.handle('store:branches:set', (_event, seedId, results) => store.setBranches(seedId, results));
ipcMain.handle('store:roots:get', () => store.getRoots());
ipcMain.handle('store:roots:set', (_event, connections) => store.setRoots(connections));
ipcMain.handle('store:conditionScan:get', (_event, id) => store.getConditionScan(id));
ipcMain.handle('store:conditionScan:set', (_event, id, results) => store.setConditionScan(id, results));

// --- File Watcher: notify renderer when store changes externally ---

let storeWatcher = null;

function startStoreWatcher() {
  const p = store.getStorePath();
  if (storeWatcher) {
    fs.unwatchFile(p, storeWatcher);
  }
  storeWatcher = fs.watchFile(p, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('store:changed');
        }
      });
    }
  });
}

// --- App lifecycle ---

app.whenReady().then(() => {
  if (isDev) {
    const d = screen.getPrimaryDisplay();
    console.log(
      `[fallow] primary display ${d.size.width}x${d.size.height} ` +
        `scaleFactor=${d.scaleFactor}`,
    );
  }

  const win = createWindow();

  // print store path on startup so user knows where it lives
  const storePath = store.getStorePath();
  console.log('[fallow] store path:', storePath);
  fs.writeFileSync(
    path.join(app.getPath('userData'), 'store_path.txt'),
    storePath,
    'utf8'
  );

  startStoreWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (storeWatcher) {
    fs.unwatchFile(store.getStorePath(), storeWatcher);
    storeWatcher = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
