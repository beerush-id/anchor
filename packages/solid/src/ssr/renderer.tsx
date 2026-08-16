import type { Router } from '@anchorlib/router';
import {
  createRenderer as createBaseRenderer,
  type RouterOptions,
  type SSRContext,
  type SSROptions,
  type SSRRenderer,
  type SSRRenderOptions,
} from '@anchorlib/ssr';
import { generateHydrationScript, renderToString } from 'solid-js/web';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { AppShell } from './types.js';

export function createSSR(
  router: Router,
  RootLayout: RouteComponent<AnyRoute>,
  defaultOptions?: SSROptions & Omit<RouterOptions, 'router'>
): SSRRenderer {
  const renderer = ((
    urlOrOptions: string | SSRRenderOptions,
    cookie?: string,
    context?: SSRContext,
    controller?: AbortController,
    Shell?: AppShell,
    isolated?: boolean,
    options?: SSROptions & Omit<RouterOptions, 'router'>
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
        const hydration = generateHydrationScript();

        return { html, head: [hydration, head].join('\n') };
      },
      defaultOptions
    );

    return baseRenderer(renderOptions);
  }) as never;

  Object.assign(renderer, { router, options: defaultOptions });
  return renderer;
}
