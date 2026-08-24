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

    // Setup stdout and stderr capture in Python
    const setupCaptureCode = `
import sys
import io

class JSOutputCapture(io.StringIO):
    def __init__(self, is_stderr=False):
        super().__init__()
        self.is_stderr = is_stderr
        self.buffer_list = []

    def write(self, s):
        if s:
            self.buffer_list.append((self.is_stderr, s))
        return len(s)

__sys_stdout_orig = sys.stdout
__sys_stderr_orig = sys.stderr

__capture_out = JSOutputCapture(is_stderr=False)
__capture_err = JSOutputCapture(is_stderr=True)

sys.stdout = __capture_out
sys.stderr = __capture_err
`;

    const restoreCaptureCode = `
sys.stdout = __sys_stdout_orig
sys.stderr = __sys_stderr_orig
`;

    // Run setup
    await pyodide.runPythonAsync(setupCaptureCode);

    let rawResult = null;
    let execError = null;

    try {
      rawResult = await pyodide.runPythonAsync(code);
    } catch (err) {
      execError = err;
    }

    // Retrieve captured buffers
    const capturedOutput = pyodide.globals.get('__capture_out').buffer_list.toJs();
    const capturedErrors = pyodide.globals.get('__capture_err').buffer_list.toJs();

    // Restore stdout
    await pyodide.runPythonAsync(restoreCaptureCode);

    // Process output logs
    let combinedStdout = '';
    let combinedStderr = '';

    if (Array.isArray(capturedOutput)) {
      combinedStdout = capturedOutput.map(([_, s]) => s).join('');
    }

    if (Array.isArray(capturedErrors)) {
      combinedStderr = capturedErrors.map(([_, s]) => s).join('');
    }

    if (combinedStdout.trim()) {
      logs.push({
        type: 'log',
        message: combinedStdout.replace(/\n$/, ''),
        timestamp: Date.now()
      });
    }

    if (combinedStderr.trim()) {
      logs.push({
        type: 'error',
        message: combinedStderr.replace(/\n$/, ''),
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
