/**
 * Utilities to build isolated and interactive Live Sandboxes
 * for HTML, CSS, JavaScript, React/JSX, Mermaid, and SVG artifacts.
 */

/**
 * Check if the code is a React / JSX component
 */
export function isReactCode(code = '') {
  if (!code || typeof code !== 'string') return false;
  return (
    code.includes('import React') ||
    code.includes('export default function') ||
    code.includes('export default') ||
    code.includes('function App') ||
    code.includes('const App =') ||
    code.includes('useState(') ||
    code.includes('useEffect(') ||
    code.includes('useRef(') ||
    code.includes('className=') ||
    /<\w+[\s\S]*>[\s\S]*<\/\w+>/.test(code)
  );
}

/**
 * Common script to intercept console logs and runtime errors
 * and transmit them back to the parent window via postMessage.
 */
const CONSOLE_INTERCEPT_SCRIPT = `
  (function() {
    function sendLog(level, args) {
      try {
        var stringArgs = Array.prototype.slice.call(args).map(function(item) {
          if (item === null) return 'null';
          if (item === undefined) return 'undefined';
          if (typeof item === 'object') {
            try { return JSON.stringify(item, null, 2); } catch(e) { return String(item); }
          }
          return String(item);
        });
        window.parent.postMessage({
          type: 'NEOCHAT_SANDBOX_CONSOLE',
          level: level,
          message: stringArgs.join(' '),
          timestamp: Date.now()
        }, '*');
      } catch(e) {}
    }

    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;

    console.log = function() { originalLog.apply(console, arguments); sendLog('log', arguments); };
    console.warn = function() { originalWarn.apply(console, arguments); sendLog('warn', arguments); };
    console.error = function() { originalError.apply(console, arguments); sendLog('error', arguments); };
    console.info = function() { originalInfo.apply(console, arguments); sendLog('info', arguments); };

    window.onerror = function(msg, url, line, col, error) {
      sendLog('error', ['[Runtime Error]: ' + msg + (line ? ' (Line ' + line + ')' : '')]);
      return false;
    };

    window.addEventListener('unhandledrejection', function(event) {
      sendLog('error', ['[Unhandled Promise Rejection]: ' + (event.reason ? (event.reason.message || String(event.reason)) : 'Unknown rejection')]);
    });
  })();
`;

/**
 * Build Live HTML/CSS/JS Sandbox document
 */
export function buildHtmlSandboxDoc(code = '', isDark = true) {
  const isFullHtml = /<!DOCTYPE html|<html[\s>]/i.test(code);

  if (isFullHtml) {
    // Inject console intercept script right after <head> or at top
    if (code.includes('<head>')) {
      return code.replace('<head>', `<head><script>${CONSOLE_INTERCEPT_SCRIPT}</script>`);
    }
    return `<script>${CONSOLE_INTERCEPT_SCRIPT}</script>${code}`;
  }

  // Fragment: wrap with standard HTML5 boilerplate, Tailwind CSS, Lucide and Inter font
  return `<!DOCTYPE html>
<html lang="pt" class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#f55036'
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>${CONSOLE_INTERCEPT_SCRIPT}</script>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
      min-height: 100vh;
      background-color: ${isDark ? '#0f172a' : '#f8fafc'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      box-sizing: border-box;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${code}
  <script>
    if (window.lucide) {
      window.lucide.createIcons();
    }
  </script>
</body>
</html>`;
}

/**
 * Build Live React / JSX Component Sandbox document
 */
export function buildReactSandboxDoc(code = '', isDark = true) {
  // Strip import/export statements for standalone browser runtime
  let cleanedCode = code
    .replace(/import\s+React\s*,\s*\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+React\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+[^;]+from\s+['"][^'"]+['"];?/g, '')
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
    .replace(/export\s+default\s+/g, 'window.__ExportedComponent = ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ');

  return `<!DOCTYPE html>
<html lang="pt" class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#f55036'
          }
        }
      }
    }
  </script>
  <!-- React 18 & ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Babel Standalone -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>${CONSOLE_INTERCEPT_SCRIPT}</script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
      min-height: 100vh;
      background-color: ${isDark ? '#0f172a' : '#f8fafc'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

    try {
      ${cleanedCode}

      // Determine component to mount
      let ComponentToMount = null;
      if (typeof window.__ExportedComponent !== 'undefined') {
        ComponentToMount = window.__ExportedComponent;
      } else if (typeof App !== 'undefined') {
        ComponentToMount = App;
      } else if (typeof Main !== 'undefined') {
        ComponentToMount = Main;
      }

      if (ComponentToMount) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ComponentToMount />);
      } else {
        document.getElementById('root').innerHTML = '<div style="color: #f55036; font-family: monospace; padding: 12px; background: rgba(245,80,54,0.1); border-radius: 8px;">Nenhum componente principal (App ou export default) encontrado para montar.</div>';
      }
    } catch(err) {
      console.error('[React Render Error]:', err);
      document.getElementById('root').innerHTML = '<div style="color: #ef4444; font-family: monospace; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 8px;"><strong>Erro ao renderizar React:</strong><br/>' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
}

/**
 * Build Live Mermaid Diagram document
 */
export function buildMermaidDoc(mermaidCode = '', isDark = true) {
  const cleanCode = mermaidCode.trim();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${isDark ? '#0f172a' : '#f8fafc'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      font-family: system-ui, sans-serif;
    }
    .mermaid {
      max-width: 100%;
      overflow: auto;
    }
  </style>
</head>
<body>
  <div class="mermaid">
${cleanCode}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${isDark ? 'dark' : 'default'}',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`;
}
