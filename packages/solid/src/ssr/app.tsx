import type { AnyType } from '@anchorlib/core';
import type { Router } from '@anchorlib/router';
import { createApp as createCoreApp } from '@anchorlib/ssr';
import { renderToString } from 'solid-js/web';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { AppOptions } from './types.js';

export function createApp<E = AnyType>(
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  options: AppOptions<E> = {}
) {
  const Shell = options.shell;
  return createCoreApp(
    ({ url }) => {
      const application = Shell ? (
        <Shell>
          <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
        </Shell>
      ) : (
        <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
      );

      const html = renderToString(() => application);
      const head = renderToString(() => [...headings().values()].map(({ Renderer }) => <Renderer />));

      return { html, head };
    },
    { ...options, router }
  );
}
