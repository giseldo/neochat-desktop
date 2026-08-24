/**
 * Format argument to readable string with indentation and cycle safety
 */
function formatArg(arg) {
  if (arg === undefined) return 'undefined';
  if (arg === null) return 'null';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'function') return arg.toString();
  if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
  
  try {
    const seen = new WeakSet();
    return JSON.stringify(arg, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (e) {
    return String(arg);
  }
}

/**
 * Execute JavaScript/TypeScript code in an isolated execution wrapper with captured console
 * @param {string} code 
 * @returns {Promise<Object>}
 */
export async function runJavaScript(code) {
  const logs = [];
  const startTime = performance.now();

  // Custom log push helper
  const addLog = (type, args) => {
    const message = args.map(formatArg).join(' ');
    logs.push({
      type,
      message,
      timestamp: Date.now()
    });
  };

  const customConsole = {
    log: (...args) => addLog('log', args),
    info: (...args) => addLog('info', args),
    warn: (...args) => addLog('warn', args),
    error: (...args) => addLog('error', args),
    table: (data) => {
      try {
        addLog('table', [typeof data === 'object' ? JSON.stringify(data, null, 2) : data]);
      } catch (e) {
        addLog('log', [data]);
      }
    },
    clear: () => {
      logs.length = 0;
    }
  };

  try {
    // Transform code if it contains top-level return or async statements
    const trimmedCode = code.trim();
    
    // Build async function wrapper
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    let fn;
    try {
      // First attempt: treat as a full body with potential return statement
      fn = new AsyncFunction('console', trimmedCode);
    } catch (syntaxErr) {
      // Second attempt: if it looks like an expression (e.g. `2 + 2` or `Math.sqrt(16)`), wrap with return
      try {
        fn = new AsyncFunction('console', `return (${trimmedCode});`);
      } catch (e) {
        throw syntaxErr;
      }
    }

    const rawResult = await fn(customConsole);
    const durationMs = Math.round(performance.now() - startTime);

    let formattedResult = null;
    if (rawResult !== undefined) {
      formattedResult = formatArg(rawResult);
    }

    return {
      success: true,
      logs,
      result: formattedResult,
      durationMs,
      error: null
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      logs,
      result: null,
      durationMs,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}
