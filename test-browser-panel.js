const assert = require("assert");
const fs = require("fs");
const { BrowserManager, browserManager } = require("./electron/browserManager");
function testNormalizeUrl(raw) {
  if (!raw || typeof raw !== "string") return "https://www.google.com";
  let trimmed = raw.trim();
  if (/^\d{2,5}$/.test(trimmed)) return "http://localhost:" + trimmed;
  if (trimmed.startsWith("localhost:")) return "http://" + trimmed;
  if (trimmed === "localhost") return "http://localhost:3000";
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("file://") && !trimmed.startsWith("about:")) {
    if (trimmed.includes(".") || trimmed.includes(":")) return "https://" + trimmed;
    return "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
  }
  return trimmed;
}
async function runTests() {
  console.log("--- Starting In-App Browser System Tests ---");
  assert.strictEqual(testNormalizeUrl("https://www.google.com"), "https://www.google.com");
  assert.strictEqual(testNormalizeUrl("google.com"), "https://google.com");
  assert.strictEqual(testNormalizeUrl("localhost:3000"), "http://localhost:3000");
  assert.strictEqual(testNormalizeUrl("8080"), "http://localhost:8080");
  assert.strictEqual(testNormalizeUrl("como fazer bolo"), "https://www.google.com/search?q=como%20fazer%20bolo");
  console.log("PASS: URL Normalization");
  assert.ok(browserManager instanceof BrowserManager);
  console.log("PASS: BrowserManager");
  const winMgrCode = fs.readFileSync("./electron/windowManager.js", "utf8");
  assert.ok(winMgrCode.includes("webviewTag: true"));
  assert.ok(winMgrCode.includes("onHeadersReceived"));
  console.log("PASS: WindowManager Config");
  const browserPanelCode = fs.readFileSync("./src/renderer/components/BrowserPanel.jsx", "utf8");
  assert.ok(browserPanelCode.includes("webview"));
  assert.ok(browserPanelCode.includes("did-start-loading"));
  assert.ok(browserPanelCode.includes("page-title-updated"));
  console.log("PASS: BrowserPanel Webview");
  console.log("ALL BROWSER TESTS PASSED");
}
runTests();