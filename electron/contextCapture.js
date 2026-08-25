const { globalShortcut, clipboard } = require('electron');

class ContextCapture {
  constructor() {
    this.isRegistered = false;
    this.currentAccelerator = null;
    this.onContextCaptured = null;
  }

  // Register global hotkey with customizable accelerator
  registerGlobalHotkey(callback, customAccelerator = null) {
    if (callback) {
      this.onContextCaptured = callback;
    }

    // Default accelerator if not provided
    const defaultAccelerator = process.platform === 'darwin' 
      ? 'CommandOrControl+Shift+Space' 
      : 'CommandOrControl+Shift+Space';

    const accelerator = customAccelerator && customAccelerator.trim() 
      ? customAccelerator.trim() 
      : defaultAccelerator;

    // Unregister existing shortcut if registered
    if (this.isRegistered) {
      this.unregisterGlobalHotkey();
    }

    try {
      const success = globalShortcut.register(accelerator, () => {
        console.log(`[ContextCapture] Global hotkey ${accelerator} pressed`);
        this.handleHotkeyTrigger();
      });

      if (success) {
        this.isRegistered = true;
        this.currentAccelerator = accelerator;
        console.log(`[ContextCapture] Global hotkey ${accelerator} registered successfully`);
        return { success: true, accelerator };
      } else {
        console.warn(`[ContextCapture] Failed to register global hotkey: ${accelerator}. Trying fallback.`);
        
        // If custom shortcut failed, try default
        if (accelerator !== defaultAccelerator) {
          const fallbackSuccess = globalShortcut.register(defaultAccelerator, () => {
            console.log(`[ContextCapture] Fallback global hotkey ${defaultAccelerator} pressed`);
            this.handleHotkeyTrigger();
          });

          if (fallbackSuccess) {
            this.isRegistered = true;
            this.currentAccelerator = defaultAccelerator;
            console.log(`[ContextCapture] Fallback hotkey ${defaultAccelerator} registered successfully`);
            return { success: true, accelerator: defaultAccelerator, fallback: true };
          }
        }

        this.isRegistered = false;
        this.currentAccelerator = null;
        return { success: false, error: `Could not register hotkey: ${accelerator}` };
      }
    } catch (error) {
      console.error('[ContextCapture] Exception registering global hotkey:', error);
      this.isRegistered = false;
      this.currentAccelerator = null;
      return { success: false, error: error.message };
    }
  }

  // Unregister global hotkey
  unregisterGlobalHotkey() {
    if (this.currentAccelerator) {
      try {
        globalShortcut.unregister(this.currentAccelerator);
      } catch (err) {
        console.warn('[ContextCapture] Error unregistering accelerator:', err);
      }
    }
    this.isRegistered = false;
    this.currentAccelerator = null;
    console.log('[ContextCapture] Global hotkey unregistered');
    return true;
  }

  // Quick trigger on hotkey press - invokes callback immediately
  handleHotkeyTrigger() {
    // Fast clipboard read (0ms)
    let clipboardText = '';
    try {
      clipboardText = clipboard.readText() || '';
    } catch (_err) {
      clipboardText = '';
    }

    const context = {
      timestamp: Date.now(),
      source: 'Clipboard / Quick Launch',
      text: clipboardText ? clipboardText.trim() : '',
      title: clipboardText ? 'Conteúdo da Área de Transferência' : 'Captura Rápida',
      appName: 'Sistema',
      contextType: clipboardText ? 'clipboard' : 'quick_launch'
    };

    if (this.onContextCaptured) {
      try {
        this.onContextCaptured(context);
      } catch (err) {
        console.error('[ContextCapture] Error in onContextCaptured callback:', err);
      }
    }

    return context;
  }

  // Main context capture function (manual or programmatic trigger)
  async captureContext() {
    return this.handleHotkeyTrigger();
  }

  // Manual context input helper
  async captureManualContext(text, title, source) {
    const context = {
      timestamp: Date.now(),
      text: text || '',
      title: title || 'Contexto Manual',
      source: source || 'Usuário',
      contextType: 'manual'
    };

    if (this.onContextCaptured) {
      this.onContextCaptured(context);
    }

    return context;
  }

  // Get current registration status
  getStatus() {
    return {
      isRegistered: this.isRegistered,
      accelerator: this.currentAccelerator
    };
  }
}

module.exports = ContextCapture; 