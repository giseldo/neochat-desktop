const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- [Test Suite] Splash Screen & Startup Transition ---');

// [Test 1] Verify splash.html presence and contents
console.log('\n[1] Testing splash.html file structure...');
const splashHtmlPath = path.join(__dirname, '../electron/splash.html');
assert.ok(fs.existsSync(splashHtmlPath), 'splash.html must exist in electron/');

const htmlContent = fs.readFileSync(splashHtmlPath, 'utf8');
assert.ok(htmlContent.includes('id="app-name"'), 'splash.html must have an app-name element');
assert.ok(htmlContent.includes('id="app-version"'), 'splash.html must have an app-version element');
assert.ok(htmlContent.includes('id="status-label"'), 'splash.html must have a status-label element');
assert.ok(htmlContent.includes('progress-indicator'), 'splash.html must have a progress indicator');
assert.ok(htmlContent.includes('URLSearchParams'), 'splash.html should parse query parameters for dynamic branding');
console.log('   ✓ splash.html verified successfully');

// [Test 2] Verify splashManager module exports and mock execution
console.log('\n[2] Testing splashManager lifecycle...');
const splashManager = require('../electron/splashManager');
assert.strictEqual(typeof splashManager.createSplashScreen, 'function');
assert.strictEqual(typeof splashManager.closeSplashScreen, 'function');
assert.strictEqual(typeof splashManager.armSafetyFallback, 'function');
assert.strictEqual(typeof splashManager.isSplashActive, 'function');

// Mock BrowserWindow
class MockBrowserWindow {
  constructor(options) {
    this.options = options;
    this.events = {};
    this.loadedFile = null;
    this.loadSearch = null;
    this.destroyed = false;
    this.visible = options.show || false;
    this.maximized = false;
    this.focused = false;
  }

  loadFile(filePath, options = {}) {
    this.loadedFile = filePath;
    this.loadSearch = options.search;
  }

  once(event, callback) {
    this.events[event] = callback;
  }

  on(event, callback) {
    this.events[event] = callback;
  }

  show() {
    this.visible = true;
  }

  maximize() {
    this.maximized = true;
  }

  focus() {
    this.focused = true;
  }

  destroy() {
    this.destroyed = true;
    if (this.events['closed']) this.events['closed']();
  }

  isDestroyed() {
    return this.destroyed;
  }
}

const mockApp = {
  getName: () => 'NeoChat Desktop',
  getVersion: () => '0.0.11'
};

// Create splash window
const splashWin = splashManager.createSplashScreen(MockBrowserWindow, mockApp);
assert.ok(splashWin, 'Splash window should be created');
assert.strictEqual(splashWin.options.frame, false, 'Splash should be frameless');
assert.strictEqual(splashWin.options.width, 480, 'Splash should have width 480');
assert.strictEqual(splashWin.options.height, 320, 'Splash should have height 320');
assert.strictEqual(splashManager.isSplashActive(), true, 'isSplashActive should be true');
assert.ok(splashWin.loadSearch.includes('NeoChat+Desktop') || splashWin.loadSearch.includes('NeoChat%20Desktop'));
assert.ok(splashWin.loadSearch.includes('0.0.11'));
console.log('   ✓ Splash window created with accurate options and parameters');

// Simulate splash ready-to-show
if (splashWin.events['ready-to-show']) {
  splashWin.events['ready-to-show']();
}
assert.strictEqual(splashWin.visible, true, 'Splash window should become visible on ready-to-show');

// [Test 3] Test transition to mainWindow
console.log('\n[3] Testing transition from splash to mainWindow...');
const mockMainWin = new MockBrowserWindow({ show: false });

splashManager.closeSplashScreen(mockMainWin, 0);

assert.strictEqual(splashWin.destroyed, true, 'Splash window should be destroyed upon closing');
assert.strictEqual(splashManager.isSplashActive(), false, 'isSplashActive should be false after closing');
assert.strictEqual(mockMainWin.visible, true, 'mainWindow should be visible after transition');
assert.strictEqual(mockMainWin.maximized, true, 'mainWindow should be maximized');
assert.strictEqual(mockMainWin.focused, true, 'mainWindow should be focused');
console.log('   ✓ Seamless transition to mainWindow confirmed');

// [Test 4] Test safety fallback
console.log('\n[4] Testing safety fallback mechanism...');
const splashWin2 = splashManager.createSplashScreen(MockBrowserWindow, mockApp);
assert.strictEqual(splashManager.isSplashActive(), true);

const mockMainWin2 = new MockBrowserWindow({ show: false });
splashManager.armSafetyFallback(mockMainWin2, 50);

setTimeout(() => {
  assert.strictEqual(splashWin2.destroyed, true, 'Safety fallback should close splash window after timeout');
  assert.strictEqual(mockMainWin2.visible, true, 'Safety fallback should reveal main window');
  console.log('   ✓ Safety fallback verified successfully');
  console.log('\n========================================');
  console.log('🎉 ALL SPLASH SCREEN TESTS PASSED! 🎉');
  console.log('========================================\n');
}, 100);
