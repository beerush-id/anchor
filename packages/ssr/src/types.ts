import type { AsyncKey, AsyncStore, AsyncValue } from '@anchorlib/core';
import type { Router, SitemapConfig } from '@anchorlib/router';

export type SSROptions = {
  sitemap?: boolean | Omit<SitemapConfig, 'url'>;
};

export type SSROutput = {
  html: string;
  head: string;
  status: number;
  cookies: string[];
  redirect?: string;
  contentType?: string;
};

export type SSRContextSeed = Array<[AsyncKey, AsyncValue]>;
export type SSRContext = SSRContextSeed | AsyncStore;

export type SSRRenderOptions = {
  url: string;
  cookie?: string;
  context?: SSRContext;
  controller?: AbortController;
  isolated?: boolean;
  options?: SSROptions;
};

export type SSRRenderView = (options: {
  url: string;
}) => { html: string; head: string } | Promise<{ html: string; head: string }>;

export type SSRRenderer = (options: SSRRenderOptions) => Promise<SSROutput>;

export type AssetResolver<E> = (request: Request, url: URL, env?: E) => Promise<Response | undefined>;

export type CacheControlInit = {
  public?: boolean;
  private?: boolean;
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  immutable?: boolean;
};

export type CacheControlResolver = (url: URL) => CacheControlInit | string | undefined | null;
export type CacheControl = string | CacheControlInit | CacheControlResolver | false;

export type WsSender = { send: (message: string) => void };

export interface WsRouter {
  resolve(message: string | ArrayBuffer, ws: WsSender, initContext?: SSRContextSeed): Promise<void>;
  disconnect?(ws?: WsSender): void;
}

export interface IRPCHandler {
  transport: { endpoint: string };
  resolve(request: Request, contextSeed?: SSRContextSeed): Promise<Response>;
  isolate(
    callback: () => Promise<Response>,
    controller: AbortController,
    contextSeed: SSRContextSeed,
    init: () => void
  ): Promise<Response>;
}

export type WorkerOptions<E> = {
  template?: string;
  headTag?: string;
  bodyTag?: string;
  resolveAsset?: AssetResolver<E>;
  resolveContext?: (request: Request, url: URL, env?: E) => SSRContextSeed | Promise<SSRContextSeed>;
  createResponse?: (response: Response) => Response;
  timeout?: number;
  wsRouter?: WsRouter;
  cache?: {
    assets?: CacheControl;
    pages?: CacheControl;
  };
};

export type CoreAppOptions<E> = {
  router: Router;
  renderView: SSRRenderView;
  ssr?: SSROptions;
  worker?: WorkerOptions<E>;
  httpRouter?: IRPCHandler;
};
