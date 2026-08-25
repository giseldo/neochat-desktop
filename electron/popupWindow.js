const { BrowserWindow, screen } = require('electron');
const path = require('path');

class PopupWindowManager {
  constructor() {
    this.popupWindow = null;
    this.isPopupOpen = false;
  }

  // Toggle or open the popup window
  togglePopup(capturedContext = null, mousePosition = null) {
    if (this.isOpen()) {
      // If already open and focused, close it (toggle behavior)
      if (this.popupWindow.isFocused()) {
        this.closePopup();
        return null;
      } else {
        // If open but lost focus, bring to front and focus
        this.popupWindow.show();
        this.popupWindow.focus();
        if (capturedContext && this.popupWindow.webContents) {
          this.popupWindow.webContents.send('popup-context', capturedContext);
        }
        return this.popupWindow;
      }
    }
    return this.createPopupWindow(capturedContext, mousePosition);
  }

  // Create and show the popup window
  createPopupWindow(capturedContext = null, mousePosition = null) {
    // Close existing popup if open
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      try {
        this.popupWindow.close();
      } catch (_e) {
        // ignore
      }
      this.popupWindow = null;
    }

    const popupWidth = 540;
    const initialPopupHeight = 110;

    // Determine target display from mouse position or primary display
    let activeDisplay;
    try {
      const cursorPoint = mousePosition || screen.getCursorScreenPoint();
      activeDisplay = screen.getDisplayNearestPoint(cursorPoint) || screen.getPrimaryDisplay();
    } catch (_e) {
      activeDisplay = screen.getPrimaryDisplay();
    }

    const workArea = activeDisplay.workArea || { x: 0, y: 0, width: 1920, height: 1080 };

    // Position the popup comfortably in the screen or near cursor
    let x, y;
    if (mousePosition && typeof mousePosition.x === 'number' && typeof mousePosition.y === 'number') {
      x = mousePosition.x - Math.round(popupWidth / 2);
      // Place slightly above cursor or centered vertically around it
      y = mousePosition.y - Math.round(initialPopupHeight / 2);
    } else {
      x = workArea.x + Math.round((workArea.width - popupWidth) / 2);
      y = workArea.y + Math.round((workArea.height - initialPopupHeight) / 3);
    }

    // Clamp coordinates strictly inside workArea so window is 100% visible
    x = Math.max(workArea.x + 12, Math.min(x, workArea.x + workArea.width - popupWidth - 12));
    y = Math.max(workArea.y + 12, Math.min(y, workArea.y + workArea.height - initialPopupHeight - 12));

    const windowOptions = {
      width: popupWidth,
      height: initialPopupHeight,
      x: Math.round(x),
      y: Math.round(y),
      minWidth: 400,
      minHeight: initialPopupHeight,
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      transparent: true,
      hasShadow: true,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        enableRemoteModule: false
      }
    };

    if (process.platform === 'darwin') {
      windowOptions.vibrancy = 'popover';
      windowOptions.visualEffectState = 'active';
    }

    this.popupWindow = new BrowserWindow(windowOptions);

    // Determine URL based on environment
    const popupUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173/#/popup'
      : `file://${path.join(__dirname, '../dist/index.html')}#/popup`;

    this.popupWindow.loadURL(popupUrl);

    // Handle window events
    this.popupWindow.once('ready-to-show', () => {
      if (!this.popupWindow || this.popupWindow.isDestroyed()) {
        return;
      }
      this.popupWindow.show();
      this.popupWindow.focus();
      this.isPopupOpen = true;
      
      // Send captured context to the popup once it's ready
      if (capturedContext && this.popupWindow.webContents) {
        this.popupWindow.webContents.send('popup-context', capturedContext);
      }
    });

    this.popupWindow.on('closed', () => {
      this.popupWindow = null;
      this.isPopupOpen = false;
    });

    // Handle escape key to close
    this.popupWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape') {
        this.closePopup();
      }
    });

    console.log('[PopupWindow] Popup window created at coordinates:', { x, y });
    return this.popupWindow;
  }

  // Close the popup window
  closePopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.close();
    }
    this.popupWindow = null;
    this.isPopupOpen = false;
  }

  // Resize the popup window and reposition it
  resizePopup(width, height, resizable = true) {
    if (this.isOpen()) {
      const window = this.getPopupWindow();
      if (!window || window.isDestroyed()) return;

      const bounds = window.getBounds();
      const activeDisplay = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const workArea = activeDisplay.workArea;

      let newWidth = Math.min(width, workArea.width - 24);
      let newHeight = Math.min(height, workArea.height - 24);

      let newX = bounds.x;
      let newY = bounds.y;

      // Keep within workArea
      if (newX + newWidth > workArea.x + workArea.width) {
        newX = workArea.x + workArea.width - newWidth - 12;
      }
      if (newY + newHeight > workArea.y + workArea.height) {
        newY = workArea.y + workArea.height - newHeight - 12;
      }

      newX = Math.max(workArea.x + 12, newX);
      newY = Math.max(workArea.y + 12, newY);

      window.setBounds({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      }, false);

      window.setResizable(resizable);
    }
  }

  // Check if popup is open
  isOpen() {
    return this.isPopupOpen && this.popupWindow && !this.popupWindow.isDestroyed();
  }

  // Get popup window instance
  getPopupWindow() {
    return this.popupWindow;
  }

  // Send data to popup
  sendToPopup(channel, data) {
    if (this.isOpen() && this.popupWindow.webContents) {
      this.popupWindow.webContents.send(channel, data);
    }
  }

  // Focus popup if open
  focusPopup() {
    if (this.isOpen()) {
      this.popupWindow.focus();
      this.popupWindow.show();
    }
  }
}

module.exports = PopupWindowManager; 