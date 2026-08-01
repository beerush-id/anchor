import type { AnyType } from '@anchorlib/core';
import { createRenderer } from './renderer.js';
import type { CoreAppOptions, SSRRenderView } from './types.js';
import { createFullWorker, createWorker } from './worker.js';

export function createApp<E = AnyType>(renderView: SSRRenderView, options: CoreAppOptions<E>) {
  const renderer = createRenderer(options.router, renderView, options);
  if (options.httpRouter) {
    return createFullWorker<E>(options.httpRouter, renderer, options);
  }
  return createWorker<E>(renderer, options);
}
