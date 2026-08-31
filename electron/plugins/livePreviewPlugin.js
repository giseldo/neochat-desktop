/**
 * Web Sandbox & Live Dev Preview Plugin for NeoChat Desktop
 * 
 * Provides:
 * - Sandboxed HTML/CSS/JS/React live execution
 * - Console output interception
 * - Hot-reload preview iframe bundling
 */

class LivePreviewEngine {
  constructor() {
    this.activePreviews = new Map();
  }

  /**
   * Compose a full standalone HTML document with sandboxed iframe capabilities,
   * Tailwind CSS CDN, React/ReactDOM CDNs, Babel standalone (if React/JSX), and console logger.
   */
  bundlePreview({ code = '', html = '', css = '', js = '', framework = 'vanilla', title = 'Live Preview' }) {
    let finalHtml = html;
    let finalCss = css;
    let finalJs = js;

    // If a single combined block was passed (e.g. from Canvas/CodeBlock)
    if (code && !html && !css && !js) {
      if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
        finalHtml = code;
      } else if (framework === 'react' || code.includes('import React') || code.includes('export default')) {
        finalJs = code;
      } else {
        finalHtml = `<div class="p-4">${code}</div>`;
      }
    }

    const isReact = framework === 'react' || finalJs.includes('React') || finalJs.includes('ReactDOM') || finalJs.includes('export default');

    // Clean React export syntax if present for browser Babel runtime
    let sanitizedJs = finalJs;
    if (isReact) {
      sanitizedJs = sanitizedJs
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
        .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'window.App = $1;')
        .replace(/export\s+/g, '');
    }

    const bundledDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  ${isReact ? `
  <!-- React & Babel CDNs -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ` : ''}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: transparent;
    }
    ${finalCss}
  </style>
  <script>
    // Console interception to forward logs to NeoChat UI
    (function() {
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
      };

      function sendToParent(type, args) {
        try {
          const stringified = Array.from(args).map(arg => {
            if (typeof arg === 'object') {
              try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
            }
            return String(arg);
          }).join(' ');

          window.parent.postMessage({
            source: 'neochat-sandbox',
            type: type,
            message: stringified,
            timestamp: new Date().toLocaleTimeString()
          }, '*');
        } catch (e) {}
      }

      console.log = function(...args) { originalConsole.log(...args); sendToParent('log', args); };
      console.warn = function(...args) { originalConsole.warn(...args); sendToParent('warn', args); };
      console.error = function(...args) { originalConsole.error(...args); sendToParent('error', args); };
      console.info = function(...args) { originalConsole.info(...args); sendToParent('info', args); };

      window.onerror = function(message, source, lineno, colno, error) {
        sendToParent('error', [\`\${message} (line \${lineno}:\${colno})\`]);
        return false;
      };
    })();
  </script>
</head>
<body class="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-screen">
  ${finalHtml || '<div id="root"></div>'}

  ${isReact ? `
  <script type="text/babel">
    try {
      ${sanitizedJs}

      // Auto-render App component if exists
      const targetElement = document.getElementById('root') || document.body;
      if (typeof App !== 'undefined') {
        const root = ReactDOM.createRoot(targetElement);
        root.render(React.createElement(App));
      } else if (window.App) {
        const root = ReactDOM.createRoot(targetElement);
        root.render(React.createElement(window.App));
      }
    } catch (err) {
      console.error('React Runtime Error: ' + err.message);
    }
  </script>
  ` : `
  <script>
    try {
      ${sanitizedJs}
    } catch (err) {
      console.error('Runtime Error: ' + err.message);
    }
  </script>
  `}
</body>
</html>`;

    return {
      bundledHtml: bundledDocument,
      timestamp: Date.now(),
      framework: isReact ? 'react' : 'vanilla'
    };
  }
}

const livePreviewEngine = new LivePreviewEngine();

module.exports = {
  id: 'live-preview',
  name: 'Web Sandbox & Live Dev Preview',
  description: 'Ambiente sandboxed ultra-rápido para execução e preview em tempo real de HTML, Tailwind, React e JavaScript',
  category: 'developer',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('live-preview:bundle', async (_event, params = {}) => {
      return livePreviewEngine.bundlePreview(params);
    });
  },

  activate: async () => {
    console.log('[LivePreviewPlugin] Activated.');
  },

  deactivate: async () => {
    livePreviewEngine.activePreviews.clear();
    console.log('[LivePreviewPlugin] Deactivated.');
  }
};
