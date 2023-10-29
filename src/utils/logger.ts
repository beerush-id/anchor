export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
  VERBOSE,
}

export type LoggerConfig = {
  level: LogLevel;
  verbose: boolean;
  traceDebug: boolean;
  traceVerbose: boolean;
}

export type Logger = {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  verbose: (...args: unknown[]) => void;
  configure: (config: Partial<LoggerConfig>) => void;
  setDebug: (enabled?: boolean, stack?: boolean) => void;
};

const LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  verbose: false,
  traceDebug: false,
  traceVerbose: false,
};

export const logger: Logger = {
  error: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.ERROR) return;
    console.error(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `❌  \x1b[31m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  warn: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.WARN) return;
    console.warn(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `⚠️ \x1b[33m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  info: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.INFO) return;
    console.log(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `ℹ️ \x1b[32m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  debug: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.DEBUG) return;
    (LOGGER_CONFIG.traceDebug ? console.trace : console.debug)(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `🐞 \x1b[34m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  verbose: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.VERBOSE) return;
    (LOGGER_CONFIG.traceDebug ? console.trace : console.debug)(...args.map((arg, i) => {
      if (typeof arg === 'string') {
        return i === 0 ? `🔍 \x1b[35m${ arg }\x1b[0m` : arg;
      }

      return arg;
    }));
  },
  configure: (config: Partial<LoggerConfig>) => {
    Object.assign(LOGGER_CONFIG, config);
  },
  setDebug: (enabled = false, stackTrace = false) => {
  },
};
