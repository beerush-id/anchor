import type { AnyType } from '@airlib/core';
import type { Router } from '@airlib/router';
import { createApp as createCoreApp } from '@airlib/ssr';
import { generateHydrationScript, renderToString } from 'solid-js/web';
import { headings } from '../router/index.js';
import type { AppEntry } from '../types.js';
import type { AppOptions } from './types.js';

export function createApp<E = AnyType>(router: Router, Entry: AppEntry, options: AppOptions<E> = {}) {
  return createCoreApp<E>(
    ({ url }) => {
      const html = renderToString(() => <Entry url={url} />);
      const head = renderToString(() => [...headings().values()].map(({ Renderer }) => <Renderer />));
      const hydration = generateHydrationScript();

      return { html, head: [hydration, head].join('\n') };
    },
    { ...options, router }
  );
}
