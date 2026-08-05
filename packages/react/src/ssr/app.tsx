import type { AnyType } from '@anchorlib/core';
import type { Router } from '@anchorlib/router';
import { createApp as createReactApp } from '@anchorlib/ssr';
import { renderToString } from 'react-dom/server';
import { headings } from '../router/index.js';
import type { AppEntry } from '../types.js';
import type { AppOptions } from './types.js';

/**
 * Creates a React SSR execution handler.
 *
 * Renders the root application entry point to an HTML string and collects dynamic document head elements
 * registered during route execution.
 *
 * @template E - Custom runtime environment or request context type
 * @param router - The application router instance
 * @param Entry - The top-level application component accepting a target `url` prop
 * @param options - Configuration options for application routing and SSR execution
 * @returns An application instance capable of serving SSR requests and handling routes
 */
export function createApp<E = AnyType>(router: Router, Entry: AppEntry, options: AppOptions<E> = {}) {
  return createReactApp<E>(
    ({ url }) => {
      const html = renderToString(<Entry url={url} />);
      const head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));

      return { html, head };
    },
    { ...options, router }
  );
}
