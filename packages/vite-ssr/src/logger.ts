import { type Logger, LogLevel, logger } from '@beerush/logger';
import { consoleAdapter } from '@beerush/logger/adapters/console';

// Default sink for the whole package: visible in dev. The app can re-level or
// silence it by registering its own console adapter — adapters with the same
// name overwrite the previous one.
logger.use(consoleAdapter({ level: LogLevel.VERBOSE, timestamp: false }));

/** A logger scoped to a domain tag, e.g. `air-pages`, `air-image`. */
export function taggedLogger(tag: string): Logger<unknown> {
  return logger.create({ tags: [tag] });
}

/** Paints a value with an ANSI color code. */
const paint = (code: number) => (value: string | number) => `\x1B[${code}m${value}\x1B[0m`;

// Accent palette for message parts — pass the result as a SEPARATE argument
// (e.g. `log.debug('Compiled', color.file(name), 'in', color.timing(ms))`),
// never inside the message template: the adapter colors the message body by
// level, while extra arguments keep their own color. Bright variants (90s)
// stay readable against every level color.
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
