// Electron shell for Hive Deck. Loads the Vite build from dist/ and nothing else.
const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('node:path');

const smokeTest = process.argv.includes('--smoke-test');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    useContentSize: true,
    backgroundColor: '#0e0c0a',
    title: 'Hive Deck',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged || smokeTest
    }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());

  // The game is fully offline. Block every navigation and popup.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  if (smokeTest) {
    const log = (...a) => console.log('[smoke]', ...a);
    win.webContents.on('console-message', (_e, level, message) => log('console', level, message));
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      log('load failed', code, desc);
      app.exit(2);
    });
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const active = await win.webContents.executeJavaScript(
            "window.game ? window.game.scene.getScenes(true).map(s => s.scene.key).join(',') : 'no game'"
          );
          log('active scene:', active);
          const img = await win.webContents.capturePage();
          require('node:fs').writeFileSync(process.env.SMOKE_SHOT || '/tmp/smoke.png', img.toPNG());
          app.exit(active === 'MainMenu' ? 0 : 3);
        } catch (err) {
          log('error', String(err));
          app.exit(4);
        }
      }, 3500);
    });
  }
}

app.whenReady().then(() => {
  // No network, no permissions prompts: deny everything except fullscreen.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'fullscreen'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
