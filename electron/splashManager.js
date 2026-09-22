const path = require('path');

let splashWindow = null;
let splashStartTime = 0;
let fallbackTimeout = null;

/**
 * Creates and displays the splash screen window.
 *
 * @param {typeof import('electron').BrowserWindow} BrowserWindow
 * @param {import('electron').App} app
 * @returns {import('electron').BrowserWindow}
 */
function createSplashScreen(BrowserWindow, app) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  const appName = (app && typeof app.getName === 'function' && app.getName()) || 'NeoChat Desktop';
  const appVersion = (app && typeof app.getVersion === 'function' && app.getVersion()) || '0.0.11';

  splashStartTime = Date.now();

  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    show: false,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#090d16',
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const splashPath = path.join(__dirname, 'splash.html');
  const queryParams = new URLSearchParams({
    name: appName,
    version: appVersion
  }).toString();

  splashWindow.loadFile(splashPath, { search: queryParams });

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
    if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = null;
    }
  });

  return splashWindow;
}

/**
 * Gracefully closes the splash screen and brings the main window into view.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {number} [minDisplayTimeMs=900] Minimum time in ms the splash remains visible to prevent flickering.
 */
function closeSplashScreen(mainWindow, minDisplayTimeMs = 900) {
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
    fallbackTimeout = null;
  }

  const elapsed = Date.now() - splashStartTime;
  const remaining = Math.max(0, minDisplayTimeMs - elapsed);

  const transitionToMain = () => {
    try {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
        splashWindow = null;
      }
    } catch (err) {
      console.warn('[SplashManager] Error closing splash screen:', err.message);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.show();
        if (typeof mainWindow.maximize === 'function') {
          mainWindow.maximize();
        }
        mainWindow.focus();
      } catch (err) {
        console.warn('[SplashManager] Error revealing main window:', err.message);
      }
    }
  };

  if (remaining > 0) {
    setTimeout(transitionToMain, remaining);
  } else {
    transitionToMain();
  }
}

/**
 * Sets up a safety timeout to ensure splash screen never hangs permanently.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {number} [timeoutMs=10000]
 */
function armSafetyFallback(mainWindow, timeoutMs = 10000) {
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
  }
  fallbackTimeout = setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      console.warn('[SplashManager] Safety timeout reached, revealing main window.');
      closeSplashScreen(mainWindow, 0);
    }
  }, timeoutMs);
}

/**
 * Checks if splash screen is currently active.
 *
 * @returns {boolean}
 */
function isSplashActive() {
  return !!(splashWindow && !splashWindow.isDestroyed());
}

module.exports = {
  createSplashScreen,
  closeSplashScreen,
  armSafetyFallback,
  isSplashActive
};
