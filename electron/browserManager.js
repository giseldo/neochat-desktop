/**
 * BrowserManager - In-App Browser preview, content extraction, and popup window management.
 */

const { BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');

class BrowserManager {
  constructor() {
    this.popupWindows = new Map();
  }

  /**
   * Format URL to ensure valid http/https protocol.
   * @param {string} rawUrl
   * @returns {string}
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'http://localhost:5173';
    let trimmed = rawUrl.trim();
    if (/^\d{2,5}$/.test(trimmed)) {
      return `http://localhost:${trimmed}`;
    }
    if (trimmed.startsWith('localhost:')) {
      return `http://${trimmed}`;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('file://')) {
      if (trimmed.includes('.') || trimmed.includes(':')) {
        return `https://${trimmed}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  }

  /**
   * Fetch page content or HTML text for agent consumption.
   * @param {string} targetUrl
   * @param {number} [timeoutMs=10000]
   * @returns {Promise<{ url: string, content: string, status: number }>}
   */
  async fetchPageContent(targetUrl, timeoutMs = 10000) {
    const url = this.normalizeUrl(targetUrl);
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.get(url, {
          timeout: timeoutMs,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            if (data.length < 500000) {
              data += chunk.toString('utf8');
            }
          });
          res.on('end', () => {
            resolve({
              url,
              status: res.statusCode || 200,
              content: data.slice(0, 100000)
            });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ url, status: 408, content: 'Error: Request timed out.' });
        });

        req.on('error', (err) => {
          resolve({ url, status: 500, content: `Error fetching URL: ${err.message}` });
        });
      } catch (err) {
        resolve({ url, status: 500, content: `Invalid URL: ${err.message}` });
      }
    });
  }

  /**
   * Open the URL in a dedicated popout browser window.
   * @param {string} targetUrl
   */
  openPopoutWindow(targetUrl) {
    const url = this.normalizeUrl(targetUrl);
    const win = new BrowserWindow({
      width: 1024,
      height: 768,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      title: `Neo Browser - ${url}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    win.loadURL(url).catch((err) => {
      console.warn('Could not load URL in browser popout:', err.message);
    });

    return { success: true, url };
  }

  registerIpcHandlers(ipcMain) {
    if (!ipcMain) return;
    const safeHandle = (channel, fn) => {
      try {
        if (typeof ipcMain.removeHandler === 'function') {
          ipcMain.removeHandler(channel);
        }
      } catch (_) {}
      ipcMain.handle(channel, fn);
    };

    safeHandle('browser:fetch-page', async (_event, { url, timeoutMs }) => {
      return await this.fetchPageContent(url, timeoutMs);
    });

    safeHandle('browser:open-popout', async (_event, { url }) => {
      return this.openPopoutWindow(url);
    });

    safeHandle('browser:open-external', async (_event, { url }) => {
      const normalized = this.normalizeUrl(url);
      shell.openExternal(normalized);
      return { success: true, url: normalized };
    });
  }
}

const browserManager = new BrowserManager();

module.exports = {
  BrowserManager,
  browserManager
};
