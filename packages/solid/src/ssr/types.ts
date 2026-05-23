import type { AsyncKey, AsyncStore, AsyncValue } from '@anchorlib/core';

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
};

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
  controller?: AbortController
) => Promise<SSROutput>;
