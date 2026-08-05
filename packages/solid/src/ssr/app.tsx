import type { AnyType } from '@anchorlib/core';
import type { Router } from '@anchorlib/router';
import { createApp as createCoreApp } from '@anchorlib/ssr';
import { renderToString } from 'solid-js/web';
import { headings } from '../router/index.js';
import type { AppEntry, AppOptions } from './types.js';

export function createApp<E = AnyType>(router: Router, Entry: AppEntry, options: AppOptions<E> = {}) {
  return createCoreApp<E>(
    ({ url }) => {
      const html = renderToString(() => <Entry url={url} />);
      const head = renderToString(() => [...headings().values()].map(({ Renderer }) => <Renderer />));

      return { html, head };
    },
    { ...options, router }
  );
}
