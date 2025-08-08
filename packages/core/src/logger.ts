import type { Logger, LoggerConfig } from './types.js';

export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
  VERBOSE,
}

const LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  verbose: false,
  traceDebug: false,
  traceVerbose: false,
};

export const logger: Logger = {
  error: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.ERROR) return;

    console.error(
      ...args.map((arg, i) => {
        if (typeof arg === 'string') {
          return i === 0 ? `❌  \x1b[31m${'[anchor]' + arg}\x1b[0m` : arg;
        }

        return arg;
      })
    );
  },
  warn: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.WARN) return;

    console.warn(
      ...args.map((arg, i) => {
        if (typeof arg === 'string') {
          return i === 0 ? `⚠️ \x1b[33m${'[anchor]' + arg}\x1b[0m` : arg;
        }

        return arg;
      })
    );
  },
  info: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.INFO) return;

    console.log(
      ...args.map((arg, i) => {
        if (typeof arg === 'string') {
          return i === 0 ? `ℹ️ \x1b[32m${'[anchor]' + arg}\x1b[0m` : arg;
        }

        return arg;
      })
    );
  },
  debug: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.DEBUG) return;

    (LOGGER_CONFIG.traceDebug ? console.trace : console.debug)(
      ...args.map((arg, i) => {
        if (typeof arg === 'string') {
          return i === 0 ? `🐞 \x1b[34m${'[anchor]' + arg}\x1b[0m` : arg;
        }

        return arg;
      })
    );
  },
  verbose: (...args: unknown[]) => {
    if (LOGGER_CONFIG.level < LogLevel.VERBOSE) return;

    (LOGGER_CONFIG.traceDebug ? console.trace : console.debug)(
      ...args.map((arg, i) => {
        if (typeof arg === 'string') {
          return i === 0 ? `🟣 \x1b[35m${'[anchor]' + arg}\x1b[0m` : arg;
        }

        return arg;
      })
    );
  },
  configure: (config: Partial<LoggerConfig>) => {
    Object.assign(LOGGER_CONFIG, config);
  },
};
