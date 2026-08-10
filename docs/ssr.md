---
title: "Universal SSR"
description: "The SSR pipeline — from the airPages dev server to the production worker: serving across Bun, Node.js, Cloudflare, and Deno, with static generation, on-demand pre-rendering, and caching."
keywords:
  - anchor
  - ssr
  - server-side rendering
  - universal ssr
  - static site generation
  - incremental static regeneration
  - isr
  - edge worker
---

# Universal SSR

The same components render on the server and in the browser. There is no `'use client'` / `'use server'` split — one codebase, one router, one state model, and the server sends a complete page that the client hydrates.

This page covers the SSR pipeline end to end: the dev server, the production worker, running it on each runtime, and making pages static. The basics of building an app — layouts, pages, guards, providers, routing — are in [Getting Started](/getting-started).

## The Pipeline at a Glance

Three pieces, three commands:

1. **Dev** — `bun dev` runs `airPages()`, one server that serves SSR pages, file-routed pages and MDX, IRPC, WebSockets, and image optimization with HMR.
2. **Build** — `bun run build` produces two outputs: `dist/client` (static assets and pre-rendered HTML) and `dist/server` (the worker).
3. **Run** — `bun start` runs the built worker, which serves SSR pages, static assets, IRPC, and WebSockets from a single `fetch` handler.

## Configuring the Pipeline

`airPages()` wires up everything — file routing, MDX, the worker, image optimization, the route manifest — with defaults that work for most apps. Every piece can be configured or turned off.

::: warning SolidJS Support
MDX pages are currently only supported when using React. The integration with SolidJS is temporarily unavailable due to differences in how JSX is compiled to native DOM instructions. Support for SolidJS MDX pages will be restored in an upcoming patch.
:::

### Image Defaults

Every `?asset` import generates WebP variants at `[128, 256, 512, 1024]` by default. When your images need different sizes or format, set the defaults once — every import follows:

```ts
// vite.config.ts
import { airPages } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [
    airPages({
      image: {
        sizes: [256, 512, 1024, 2048],
        format: 'avif',
        quality: 80,
      },
    }),
  ],
});
```

A single import can still override the defaults with its own `with { ... }` attributes — sizes, format, and quality are all per-import overridable:

```ts
import hero from './assets/hero.jpg?asset' with { sizes: '350,700', format: 'png' };
```

### Turning Automatic Behavior Off

Everything `airPages()` does automatically is optional. Pass `false` to the pieces you don't want:

```ts
export default defineConfig({
  plugins: [
    airPages({
      ssg: false,        // don't pre-render static routes at build
      image: false,      // `?asset` imports stay plain files
      markdown: false,   // no MDX pages
      worker: false,     // no worker integration
      scaffold: false,   // don't write starter content into new pages
      manifest: false,   // no route manifest
      metadata: false,   // no MDX frontmatter metadata
      irpc: false,       // don't auto-detect IRPC from the worker
    }),
  ],
});
```

::: tip What we learn
- `ssg` runs the build-time pre-render pass; `worker` controls the worker plugin itself (`entry`, `removeIndexHtml`, `ignoreDotPath`, `ssg` live under it).
- `manifest` and `metadata` generate the [route manifest](/getting-started#building-navigation) and MDX frontmatter data.
- `irpc` is auto-detected from your worker file — disable it only when you wire IRPC yourself.
:::

## The Worker

`createApp` is the production entry point — one call that returns a complete worker: SSR rendering, static asset serving, optional IRPC HTTP routing, and optional WebSocket upgrades.

```ts
// src/worker.ts
import { createApp } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { httpTransport, wsTransport } from './api.js';
import App from './app.js';
import router from './router.js';

const httpRouter = new HTTPRouter(httpTransport);
const wsRouter = new WebSocketRouter(wsTransport);

export default createApp(router, App, { httpRouter, wsRouter });
```

::: tip What we learn
- `createApp` takes the router, the app entry, and options, and returns a `fetch` handler — the same shape Bun and Cloudflare Workers expect natively.
- `httpRouter` and `wsRouter` are optional. An app without IRPC or realtime leaves them out and still gets a full SSR worker.
- The app entry receives `{ url }` and renders the router — the exact component the client hydrates.
:::

The app entry is the same component on both sides:

```tsx
// src/app.tsx
import { type AppEntry, UIRouter } from '@anchorlib/react';
import RootLayout from './pages/layout.tsx';
import router from './router.ts';

export default (({ url }) => (
  <UIRouter router={router} root={RootLayout} url={url} />
)) satisfies AppEntry;
```

The client entry activates the route before hydrating:

```tsx
// src/client.tsx
import '@anchorlib/react/client'; // must be the first import

import { hydrateRoot } from 'react-dom/client';
import App from './app.js';
import router from './router.js';
import { acceptInteractions } from '@anchorlib/react/browser';

router
  .activate(window.location.href)
  .then(() => hydrateRoot(document.getElementById('root')!, <App />))
  .then(() => acceptInteractions());
```

::: tip What we learn
- The server sent a complete page — the user sees the full static content immediately.
- Client activation re-runs guards and providers before hydrating, so a page is only hydrated if it still passes every guard and every provider still resolves.
- `acceptInteractions()` is optional — it enables the live browser states (see [Browser Utilities](/ui/browser.md)). Without it the page works; the live objects just stay off.
:::

## Running the Worker

The worker exposes `fetch`, so each runtime only needs to bind that handler.

::: code-group

```js [Bun]
// Bun runs fetch-exporting modules natively — the built worker is runnable as-is.
// package.json:
//   "start": "bun run dist/server/worker.js"
```

```js [Node.js]
// server/node.js
import { serve } from '@hono/node-server';
import worker from '../dist/server/worker.js';

serve({ fetch: worker.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
```

```js [Deno]
// server/deno.js
import worker from '../dist/server/worker.js';

Deno.serve({ port: Number(Deno.env.get('PORT') || 3000) }, worker.fetch);
```

```toml [Cloudflare]
# wrangler.toml
name = "my-air-app"
main = "dist/server/worker.js"
compatibility_date = "2024-04-05"

[assets]
directory = "./dist/client"
binding = "ASSETS"
```

:::

The worker serves static assets from `dist/client` across all runtimes with correct MIME types, and maps Cloudflare's `ASSETS` binding natively — no asset configuration needed.

## Static Pages

Pages that never change can be pre-rendered to plain HTML at build time. Mark a route `static` in its `route.ts`:

```typescript
// src/pages/docs/route.ts
export const docsRoute = docsParentRoute.route('/docs', { static: true });
```

Or pre-render the entire site at once:

```typescript
// src/router.ts
const router = createRouter({ static: true });
```

During the server build, the worker is run against every `static` route and the resulting HTML is written into `dist/client` — `/` becomes `dist/client/index.html`, `/docs` becomes `dist/client/docs.html`. Requests to those routes are then served straight from the file, skipping rendering entirely.

Only URLs known at build time can be pre-rendered. A dynamic route like `/products/:id` has no concrete URLs to enumerate — that's where on-demand pre-rendering comes in.

## On-Demand Pre-Render

A dynamic route marked `static` is pre-rendered on each URL's first request: the page renders once, is written to disk, and every later request is served from that file — so every slug ends up as static HTML without a rebuild.

```typescript
// src/pages/products/[id]/route.ts
export const productsDynamicRoute = productsRoute.route('/:id', { static: true });
```

When the content behind a static URL changes, the file on disk goes stale. Give the route a `maxAge` and stale files re-render on the next request, refreshing the file:

```typescript
export const productsDynamicRoute = productsRoute.route('/:id', {
  static: { maxAge: 3600 },
});
```

### Where Static Pages Are Stored

The default storage is the filesystem (`dist/client`). On serverless platforms without a filesystem — Cloudflare Workers, Vercel — hand the worker a `cacheAdapter` that reads and writes your storage instead:

```ts
// src/worker.ts
export default createApp(router, App, {
  cacheAdapter: {
    async get(url, ctx, env) {
      // e.g. return await env.STATIC_KV.get(url.pathname);
    },
    async set(url, body, ctx, env) {
      // e.g. await env.STATIC_KV.put(url.pathname, body);
    },
  },
});
```

The adapter receives the URL, the static route's metadata (including `maxAge` and any custom keys), and the platform environment — everything needed to implement expiry in the store.

## Cache Headers

Static assets and pages need different caching policies. The worker applies sensible defaults and lets you override both.

- **Assets** — in production, files from `dist/client` are served with `public, max-age=31536000, immutable` (hashed filenames never change). In development, `no-cache`.
- **Pages** — never cached by default. SSR pages can contain user-specific content, and a wrong `Cache-Control` leaks it to shared caches.

```ts
// src/worker.ts
export default createApp(router, App, {
  cache: {
    assets: 'public, max-age=31536000, immutable',
    pages: { public: true, maxAge: 60, staleWhileRevalidate: 300 },
  },
});
```

For per-route policies, pass a function that inspects the URL:

```ts
export default createApp(router, App, {
  cache: {
    pages: (url) => {
      // Marketing pages cache aggressively
      if (url.pathname === '/sale') return { public: true, maxAge: 86400 };
      // User areas never cache
      if (url.pathname.startsWith('/dashboard')) return false;
      // Everything else falls back to the default (no cache)
    },
  },
});
```

`Cache-Control` on redirects and error responses is never applied — only successful pages are cached.

## Worker Options

| Option | Type | Description |
|--------|------|-------------|
| `httpRouter` | `HTTPRouter` | IRPC HTTP routing — POST requests to your remote functions. |
| `wsRouter` | `WebSocketRouter` | WebSocket upgrades for realtime state. |
| `cache` | `{ assets?, pages? }` | Cache policies for static assets and pages (string, object, or per-URL resolver). |
| `cacheDir` | `string` | Directory for pre-rendered HTML. Defaults to `./dist/client`. |
| `cacheAdapter` | `StaticAdapter` | Custom storage for pre-rendered pages (KV, R2, etc.). |
| `resolveAsset` | `(request, url, env?) => Promise<Response \| undefined>` | Intercept asset requests before they reach the default resolver. Return `undefined` to fall through. |
| `resolveContext` | `(request, url) => SSRContextSeed` | Extra async-context values per request. |
| `createResponse` | `(response) => Response` | Modify every outgoing response (e.g. security headers). |
| `timeout` | `number` | Milliseconds before the SSR render is aborted. |
| `template` | `string` | The HTML shell. `airPages()` injects it automatically during dev and build. |
| `headTag` | `string` | Placeholder replaced with the rendered head. Defaults to `<!--ssr-head-->`. |
| `bodyTag` | `string` | Placeholder replaced with the rendered body. Defaults to `<!--ssr-outlet-->`. |
| `devMode` | `boolean` | Treat the worker as a dev server — skips static-page reads and writes. |
| `sitemap` | `boolean \| SitemapConfig` | Enable automatic `/sitemap.xml` generation. |

## Custom Worker

`createApp` composes the standard pipeline: static pages → assets → IRPC → SSR → WebSocket. The worker it returns is a plain `fetch` handler, so when your request flow is genuinely different — custom middleware, non-standard protocols — wrap it and take over the parts you need.

```ts
// src/worker.ts
import { createApp } from '@anchorlib/react/ssr';
import App from './app.js';
import router from './router.js';

const worker = createApp(router, App);

export default {
  async fetch(request, env) {
    // Custom logic before the standard pipeline — e.g. path-based routing
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/custom')) {
      return new Response('custom', { headers: { 'Content-Type': 'text/plain' } });
    }

    // Everything else goes through the standard worker
    return worker.fetch(request, env);
  },
};
```

::: tip What we learn
- The worker object exposes `{ router, options, fetch }` — `fetch(request, env)` is the full pipeline you can delegate to or override around.
- The worker's own options (`resolveAsset`, `resolveContext`, `createResponse`, `template`, `cache`, `cacheAdapter`) cover the common customizations — middleware, headers, custom templates, alternate storage — without touching the fetch loop at all.
- For a fully hand-rolled request loop, the pieces `createApp` uses are exported from the same SSR entry: `createRenderer` (rendering), `createStatic` (pre-rendered pages), `createAssetResolver` (static assets), `createWorker` / `createFullWorker` (the request loop).
:::

The [Remote Function](/remote-function/index.md) guide covers IRPC routing in depth.
