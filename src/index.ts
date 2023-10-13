import { logger } from '@beerush/utils';

export function debug(trace?: boolean) {
  logger.setDebug(true, trace);
}

export * from './api/index.js';
export * from './core/index.js';
export * from './hook/index.js';

export { logger };
