import type { Router } from '@anchorlib/router';
import {
  createRenderer as createBaseRenderer,
  type RouterOptions,
  type SSRContext,
  type SSROptions,
  type SSRRenderer,
  type SSRRenderOptions,
} from '@anchorlib/ssr';
import { renderToString } from 'react-dom/server';
import { type AnyRoute, headings, type RouteComponent, UIRouter } from '../router/index.js';
import type { AppShell } from './types.js';

/**
 * Creates a legacy React SSR renderer function.
 *
 * Wraps route evaluation and server-side rendering of the application layout into an HTML string,
 * supporting custom shell components and per-request rendering options.
 *
 * @param router - The application router instance
 * @param RootLayout - The root route component layout rendered by the UI router
 * @param defaultOptions - Default routing and server rendering options applied across invocations
 * @returns A renderer function accepting request URLs or structured render options
 */
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
        const application = Shell ? (
          <Shell>
            <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
          </Shell>
        ) : (
          <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
        );

        const html = renderToString(application);
        const head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));

        return { html, head };
      },
      defaultOptions
    );

    return baseRenderer(renderOptions);
  }) as never;

  Object.assign(renderer, { router, options: defaultOptions });

  return renderer;
}
