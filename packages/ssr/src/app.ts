import type { AnyType } from '@anchorlib/core';
import { createRenderer } from './renderer.js';
import type { CoreAppOptions } from './types.js';
import { createFullWorker, createWorker } from './worker.js';

export function createApp<E = AnyType>(options: CoreAppOptions<E>) {
  const renderer = createRenderer(options.router, options.renderView, options.ssr);
  if (options.httpRouter) {
    return createFullWorker<E>(options.httpRouter, renderer, options.worker);
  }
  return createWorker<E>(renderer, options.worker);
}
