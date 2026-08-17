import { type Logger, LogLevel, logger } from '@beerush/logger';
import { consoleAdapter } from '@beerush/logger/adapters/console';

logger.use(consoleAdapter({ level: LogLevel.INFO, timestamp: false }));

/**
 * Re-applies the shared console sink level. The level is global to every
 * `air-*` tag (adapters are shared across all loggers), so plugin surfaces
 * set it here — last-applied wins when several plugins configure it.
 */
export function setLogLevel(level?: LogLevel): void {
  if (level === undefined) return;
  logger.use(consoleAdapter({ level, timestamp: false }));
}

export type { Log } from '@beerush/logger';
export { LogLevel };

/** A logger scoped to a domain tag, e.g. `air-pages`, `air-image`. */
export function taggedLogger(tag: string): Logger<unknown> {
  return logger.create({ tags: [tag] });
}

/** Paints a value with an ANSI color code. */
const paint = (code: number) => (value: string | number) => `\x1B[${code}m${value}\x1B[0m`;

export const color = {
  /** Operation/event names. */
  event: paint(96),
  /** File names. */
  file: paint(95),
  /** Durations. */
  timing: paint(93),
  /** Request targets (method + path). */
  request: paint(92),
};
