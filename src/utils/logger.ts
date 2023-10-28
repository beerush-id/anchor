let DEBUG_ENABLED = false;
let DEBUG_STACK = false;

export type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  setDebug: (enabled?: boolean, stack?: boolean) => void;
};

export const logger: Logger = {
  info: (...args: unknown[]) => {
    console.log(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `ℹ️ \x1b[32m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  warn: (...args: unknown[]) => {
    console.warn(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `⚠️ \x1b[33m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  error: (...args: unknown[]) => {
    console.error(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `❌  \x1b[31m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  debug: (...args: unknown[]) => {
    if (!DEBUG_ENABLED) {
      return;
    }

    (DEBUG_STACK ? console.trace : console.debug)(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `🐞 \x1b[34m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));

    if (DEBUG_STACK) {
      // const stack = new Error().stack;
      // console.debug(`${ stack?.split('\n').slice(2).join('\n').replace(/^\s+at\s+/, '') }`);
      // console.log(new Error().stack);
    }
  },
  setDebug: (enabled = false, stack = false) => {
    DEBUG_ENABLED = enabled;
    DEBUG_STACK = stack;
  },
};
