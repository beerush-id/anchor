import type { Router } from '@anchorlib/router';
import {
  createRenderer as createBaseRenderer,
  type SSRContext,
  type SSROptions,
  type SSRRenderOptions,
} from '@anchorlib/ssr';
import { renderToString } from 'solid-js/web';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { AppShell, LegacySSRRenderer } from './types.js';

export function createSSR(
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  defaultOptions?: SSROptions
): LegacySSRRenderer {
  return ((
    urlOrOptions: string | SSRRenderOptions,
    cookie?: string,
    context?: SSRContext,
    controller?: AbortController,
    Shell?: AppShell,
    isolated?: boolean,
    options?: SSROptions
  ) => {
    let renderOptions: SSRRenderOptions;

    if (typeof urlOrOptions === 'string') {
      renderOptions = {
        url: urlOrOptions,
        cookie,
        context,
        controller,
        isolated,
        options,
      };
    } else {
      renderOptions = urlOrOptions;
    }

    const baseRenderer = createBaseRenderer(
      router,
      ({ url }) => {
        /* v8 ignore start */
        const html = renderToString(() =>
          Shell ? (
            <Shell>
              <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
            </Shell>
          ) : (
            <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
          )
        );
        /* v8 ignore end */
        const head = renderToString(() => [...headings().values()].map(({ Renderer }) => <Renderer />));

        return { html, head };
      },
      defaultOptions
    );

    return baseRenderer(renderOptions);
  }) as never;
}
