type ConsoleLevel = 'debug' | 'info' | 'warn' | 'error';

interface QueuedConsoleEvent {
  level: ConsoleLevel;
  args: unknown[];
  timestamp: number;
}

declare global {
  // Deliberately internal: this queue is drained by the structured logger.
  // eslint-disable-next-line no-var
  var __UHURU_OBSERVABILITY_QUEUE__: QueuedConsoleEvent[] | undefined;
  // eslint-disable-next-line no-var
  var __UHURU_OBSERVABILITY_CAPTURE__: ((event: QueuedConsoleEvent) => void) | undefined;
}

if (import.meta.env.PROD) {
  const queue = globalThis.__UHURU_OBSERVABILITY_QUEUE__ ?? [];
  globalThis.__UHURU_OBSERVABILITY_QUEUE__ = queue;

  const enqueue = (level: ConsoleLevel) => (...args: unknown[]) => {
    const event = { level, args, timestamp: Date.now() };
    if (globalThis.__UHURU_OBSERVABILITY_CAPTURE__) {
      globalThis.__UHURU_OBSERVABILITY_CAPTURE__(event);
      return;
    }
    if (queue.length >= 100) queue.shift();
    queue.push(event);
  };

  // Production console output is intentionally suppressed. Calls left in legacy
  // modules become bounded structured events instead of leaking data to DevTools.
  console.log = enqueue('info');
  console.info = enqueue('info');
  console.debug = enqueue('debug');
  console.warn = enqueue('warn');
  console.error = enqueue('error');
}

export {};
