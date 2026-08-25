let pyodideInstance = null;
let loadPyodidePromise = null;

const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';

/**
 * Dynamically load Pyodide script tag
 */
function loadPyodideScript() {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve();
      return;
    }

    // Check if script element already exists
    const existingScript = document.querySelector(`script[src="${PYODIDE_CDN_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = PYODIDE_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Failed to load Pyodide WebAssembly runtime from CDN. Check your internet connection or use Local Python.'));
    document.head.appendChild(script);
  });
}

/**
 * Get or initialize singleton Pyodide instance
 * @param {Function} [onStatusUpdate]
 */
export async function getPyodide(onStatusUpdate) {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (loadPyodidePromise) {
    return loadPyodidePromise;
  }

  loadPyodidePromise = (async () => {
    onStatusUpdate?.('Carregando WebAssembly Pyodide...');
    await loadPyodideScript();

    if (!window.loadPyodide) {
      throw new Error('window.loadPyodide is not available after script load');
    }

    onStatusUpdate?.('Inicializando interpretador Python...');
    pyodideInstance = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
    });

    return pyodideInstance;
  })();

  return loadPyodidePromise;
}

/**
 * Run Python code via Pyodide WebAssembly
 * @param {string} code 
 * @param {Function} [onStatusUpdate]
 * @returns {Promise<Object>}
 */
export async function runPythonWithPyodide(code, onStatusUpdate) {
  const startTime = performance.now();
  const logs = [];

  try {
    const pyodide = await getPyodide(onStatusUpdate);

    const stdoutLines = [];
    const stderrLines = [];

    // Setup stdout and stderr capture via Pyodide API
    pyodide.setStdout({
      batched: (msg) => {
        if (msg) stdoutLines.push(msg);
      }
    });

    pyodide.setStderr({
      batched: (msg) => {
        if (msg) stderrLines.push(msg);
      }
    });

    let rawResult = null;
    let execError = null;

    try {
      rawResult = await pyodide.runPythonAsync(code);
    } catch (err) {
      execError = err;
    }

    if (stdoutLines.length > 0) {
      logs.push({
        type: 'log',
        message: stdoutLines.join('\n'),
        timestamp: Date.now()
      });
    }

    if (stderrLines.length > 0) {
      logs.push({
        type: 'error',
        message: stderrLines.join('\n'),
        timestamp: Date.now()
      });
    }

    const durationMs = Math.round(performance.now() - startTime);

    if (execError) {
      const errMsg = execError instanceof Error ? execError.message : String(execError);
      return {
        success: false,
        logs,
        result: null,
        durationMs,
        error: errMsg
      };
    }

    let formattedResult = null;
    if (rawResult !== undefined && rawResult !== null) {
      if (typeof rawResult === 'object' && typeof rawResult.toJs === 'function') {
        try {
          formattedResult = JSON.stringify(rawResult.toJs(), null, 2);
        } catch (e) {
          formattedResult = String(rawResult);
        }
      } else {
        formattedResult = String(rawResult);
      }
    }

    return {
      success: true,
      logs,
      result: formattedResult,
      durationMs,
      error: null
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      logs,
      result: null,
      durationMs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
