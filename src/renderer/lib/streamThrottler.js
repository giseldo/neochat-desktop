/**
 * StreamThrottler provides a high-performance batching mechanism for LLM token streaming.
 * Instead of triggering dozens or hundreds of React state updates per second (which causes UI jank),
 * it batches incoming token chunks and schedules updates aligned with the display refresh rate (via requestAnimationFrame).
 */

export function createStreamThrottler(onFlush, minIntervalMs = 16) {
  let pendingData = null;
  let rafId = null;
  let timerId = null;
  let lastFlushTime = 0;

  function flushNow() {
    if (rafId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      rafId = null;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }

    if (pendingData !== null) {
      const dataToFlush = pendingData;
      pendingData = null;
      lastFlushTime = Date.now();
      onFlush(dataToFlush);
    }
  }

  function scheduleFlush() {
    if (rafId !== null || timerId !== null) {
      return; // Already scheduled
    }

    const elapsed = Date.now() - lastFlushTime;
    if (elapsed >= minIntervalMs) {
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          flushNow();
        });
      } else {
        timerId = setTimeout(() => {
          timerId = null;
          flushNow();
        }, 0);
      }
    } else {
      const waitTime = minIntervalMs - elapsed;
      timerId = setTimeout(() => {
        timerId = null;
        if (typeof requestAnimationFrame === 'function') {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            flushNow();
          });
        } else {
          flushNow();
        }
      }, waitTime);
    }
  }

  return {
    push(data) {
      pendingData = data;
      scheduleFlush();
    },
    flush() {
      flushNow();
    },
    cancel() {
      if (rafId !== null) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
        }
        rafId = null;
      }
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      pendingData = null;
    }
  };
}

export default createStreamThrottler;
