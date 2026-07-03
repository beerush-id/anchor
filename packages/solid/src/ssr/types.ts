import type { AsyncKey, AsyncStore, AsyncValue } from '@anchorlib/core';
import type { SitemapConfig } from '@anchorlib/router';
import type { JSX } from 'solid-js';
import type { BindableComponent } from '../hoc.js';
import type { BindableProps } from '../types.js';

/**
 * Options for the SSR rendering pipeline.
 */
export type SSROptions = {
  /** Optional sitemap configuration or false to disable automatic generation. */
  sitemap?: boolean | Omit<SitemapConfig, 'url'>;
};

/**
 * The output of the SSR process.
 */
export type SSROutput = {
  /** The rendered HTML body. */
  html: string;
  /** The rendered HTML head, including styles, meta tags, and hydration scripts. */
  head: string;
  /** The status code of the response. */
  status: number;
  /** An array of set-cookie headers. */
  cookies: string[];
  /** The redirect URL if a redirect was triggered during rendering. */
  redirect?: string;
  /** Optional content type header override (e.g. for sitemap XML). */
  contentType?: string;
};

/**
 * An array of key-value pairs used to seed the request-scoped async context store.
 */
export type SSRContextSeed = Array<[AsyncKey, AsyncValue]>;

/**
 * The context for the SSR process, which can be an array of key-value pairs or an AsyncStore.
 */
export type SSRContext = SSRContextSeed | AsyncStore;

/**
 * A function that renders a URL to a string.
 * @param url - The URL to render.
 * @param cookie - The cookie string.
 * @param context - Optional: The context for the SSR process.
 */
export type SSRRenderer = (
  url: string,
  cookie: string,
  context?: SSRContext,
  controller?: AbortController,
  Shell?: AppShell,
  isolated?: boolean,
  options?: SSROptions
) => Promise<SSROutput>;

/**
 * Resolves static assets before SSR. Return a `Response` to serve the asset,
 * or `undefined` to fall through to SSR rendering.
 */
export type AssetResolver<E> = (request: Request, url: URL, env?: E) => Promise<Response | undefined>;

/**
 * Configuration for {@link createWorker} and {@link createFullWorker}.
 *
 * @template E - The environment type passed to `fetch` (e.g., Cloudflare's `Env`).
 */
export type WorkerOptions<E> = {
  /** The HTML template string (e.g., imported via `index.html?raw`). */
  template: string;
  /** Placeholder in the template to replace with the rendered head. Defaults to `<!--ssr-head-->`. */
  headTag?: string;
  /** Placeholder in the template to replace with the rendered body. Defaults to `<!--ssr-outlet-->`. */
  bodyTag?: string;
  /** Serves static assets before SSR. Return `undefined` to fall through to SSR. */
  resolveAsset?: AssetResolver<E>;
  /** Provides request-scoped context to the SSR renderer and IRPC handlers. Defaults to `[]`. */
  resolveContext?: (request: Request, url: URL) => SSRContextSeed;
  /** Hook to modify all outgoing responses (e.g., add security headers). */
  createResponse?: (response: Response) => Response;
  /** Milliseconds before aborting the SSR render. Only applies to SSR, not IRPC. */
  timeout?: number;
};

export type AppShell = BindableComponent<BindableProps<JSX.HTMLAttributes<HTMLElement>>>;
