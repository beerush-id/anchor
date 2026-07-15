---
title: "Universal SSR"
description: "Server-side rendering across Bun, Node.js, Cloudflare Workers, and Deno with request isolation, cookie propagation, and ISR."
keywords:
  - anchor
  - ssr
  - server-side rendering
  - universal ssr
  - isr
  - incremental static regeneration
  - edge worker
---

# Universal SSR

AIR Stack renders the same components on every runtime — Bun, Node.js, Cloudflare Workers, Deno. There is no `'use client'` / `'use server'` split. The SSR layer handles request isolation, cookie propagation, abort signals, and redirect capture so your components stay isomorphic.

This page covers the deployment architecture: the Vite plugin for development, the production workers for deployment, and ISR patterns for caching. For framework-specific internals (isolation, lifecycle, hydration), see the [React SSR](/react/ssr) and [Solid SSR](/solid/ssr) guides.

## Vite Plugin

The `airWorker()` Vite plugin runs SSR rendering, IRPC routing, and WebSocket streaming on a single dev server by delegating to your edge worker. Configure it in `vite.config.ts`.

::: code-group

```ts [React]
// vite.config.ts
import { airWorker } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [
    react(),
    airWorker(),
  ],
});
```

```ts [SolidJS]
// vite.config.ts
import { airWorker } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    airWorker(),
  ],
});
```

:::

## Client Entry

The client entry activates the router before hydrating the pre-rendered HTML.

::: code-group

```tsx [React]
// App.tsx
import '@anchorlib/react/client'; // MUST be first import
import './styles/styles.css';

import { UIRouter } from '@anchorlib/react';
import { hydrateRoot } from 'react-dom/client';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <UIRouter router={router} root={RootLayout} headless={true} resetScroll />
  );
});
```

```tsx [SolidJS]
// App.tsx
import './styles/styles.css';

import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  render(() => <UIRouter router={router} root={RootLayout} headless={true} resetScroll />, root);
});
```

:::

`router.activate()` resolves route state (guards, providers) before React attaches to the DOM, ensuring no hydration mismatch.

## Production Workers

### SSR-Only Worker

For apps that only need SSR without an IRPC backend. Handles abort signals, timeouts, asset resolution, cookie propagation, and redirects.

The only difference between React and Solid is the SSR import path.

::: code-group

```ts [React]
// worker.ts
import { createWorker, createSSR } from '@anchorlib/react/ssr';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

export default createWorker(render);
```

```ts [SolidJS]
// worker.ts
import { createWorker, createSSR } from '@anchorlib/solid/ssr';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

export default createWorker(render);
```

:::

### Full-Stack Worker

For apps that run IRPC and SSR on the same thread. Routes POST requests to IRPC, GET requests to SSR. Shares hooks, context isolation, and abort signals between both.

::: code-group

```ts [React]
// worker.ts
import { createFullWorker, createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);

export default createFullWorker(irpcHttpRouter, render);
```

```ts [SolidJS]
// worker.ts
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);

export default createFullWorker(irpcHttpRouter, render);
```

:::

By default, both `createWorker` and `createFullWorker` automatically serve static assets from `./dist/client` across Bun, Deno, and Node, and map Cloudflare's `env.ASSETS` binding natively. You do not need to configure anything.

### Full-Stack Worker with WebSocket

To enable WebSocket connections, import the `wsTransport` and pass a `WebSocketRouter` instance in the `createFullWorker` options. The `airWorker()` Vite plugin will automatically intercept upgrade requests during development and forward them to this worker.

::: code-group

```ts [React]
// worker.ts
import { createFullWorker, createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { transport, wsTransport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);
const irpcWsRouter = new WebSocketRouter(wsTransport);

export default createFullWorker(irpcHttpRouter, render, {
  wsRouter: irpcWsRouter,
});
```

```ts [SolidJS]
// worker.ts
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { transport, wsTransport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);
const irpcWsRouter = new WebSocketRouter(wsTransport);

export default createFullWorker(irpcHttpRouter, render, {
  wsRouter: irpcWsRouter,
});
```

:::

## Running the Server

Once you have your `worker.ts` configured, you can launch it across different runtimes. To keep deployment simple, we recommend placing small entry point scripts into a `server/` directory and running them natively.

::: code-group

```js [Bun]
// server/bun.js
import worker from "../dist/server/worker.js";

// Bun natively serves files that export { fetch }
export default worker;

// package.json script:
// "start:bun": "NODE_ENV=production bun server/bun.js"
```

```js [Node.js]
// server/node.js
import { serve } from '@hono/node-server';
import worker from '../dist/server/worker.js';

// Hono seamlessly binds Web Standard Request/Response to Node.js HTTP
serve({
  fetch: worker.fetch,
  port: process.env.PORT || 3000,
}, (info) => {
  console.log(`Node server running at http://localhost:${info.port}`);
});

// package.json script:
// "start:node": "NODE_ENV=production node server/node.js"
```

```js [Deno]
// server/deno.js
import worker from '../dist/server/worker.js';

// Deno natively serves files with Deno.serve
Deno.serve({ port: Deno.env.get('PORT') || 3000 }, worker.fetch);

// package.json script:
// "start:deno": "NODE_ENV=production deno run --allow-net --allow-read --allow-env server/deno.js"
```

```toml [Cloudflare]
# wrangler.toml
name = "my-air-app"
main = "dist/server/worker.js"
compatibility_date = "2024-04-05"
compatibility_flags = ["nodejs_compat"]

# Map standard static assets directory to Cloudflare Pages ASSETS binding
[assets]
directory = "./dist/client"
binding = "ASSETS"

# package.json script:
# "start:cf": "wrangler dev"
```

:::

## Worker Options

Both `createWorker` and `createFullWorker` accept the same base options:

| Option | Type | Description |
|--------|------|-------------|
| `template` | `string` | Optional. The HTML template string. Automatically injected by the `airWorker` Vite plugin during dev and build. |
| `headTag` | `string` | Placeholder to replace with rendered head. Defaults to `<!--ssr-head-->`. |
| `bodyTag` | `string` | Placeholder to replace with rendered body. Defaults to `<!--ssr-outlet-->`. |
| `resolveAsset` | `(request, url, env?) => Response \| undefined` | Serves static assets before SSR. Return `undefined` to fall through to SSR. |
| `resolveContext` | `(request, url) => SSRContextSeed` | Custom context seed per request. Defaults to `[]`. |
| `createResponse` | `(response: Response) => Response` | Hook to modify all outgoing responses (e.g., add security headers). |
| `timeout` | `number` | Milliseconds before aborting the SSR render. Only applies to SSR, not IRPC. |

## Incremental Static Regeneration (ISR)

ISR is not a built-in mode — you implement it by explicitly defining `resolveAsset`. When you define `resolveAsset`, it **completely overrides** the universal `defaultAssetResolver`. The worker checks for a pre-generated HTML file before falling through to SSR. On a cache miss, the rendered page is written to disk so subsequent requests skip SSR entirely.

The key insight: `resolveAsset` runs **before** SSR. If it returns a `Response`, SSR is skipped completely. This makes it the natural interception point for overriding default assets and serving custom SSG cached pages.

### Basic ISR

Serves cached HTML when available, renders and caches on miss.

::: tip Framework Import
The ISR examples below use `@anchorlib/react/ssr`. For SolidJS, replace with `@anchorlib/solid/ssr`.
:::

```ts
import { createWorker, createSSR, defaultAssetResolver } from '@anchorlib/react/ssr'; // or '@anchorlib/solid/ssr'
import router from './lib/router.js';
import RootLayout from './pages/layout.js';
import { cacheLayer } from './lib/cache.js'; // Implement your own storage (KV, FS, etc.)

const render = createSSR(router, RootLayout);

const ISR_PATHS = ['/', '/about', '/blog', '/pricing'];

export default createWorker(render, {
  async resolveAsset(request, url, env) {
    // Serve static client assets via the universal resolver
    const asset = await defaultAssetResolver(request, url, env);
    if (asset) return asset;

    // ISR — serve pre-generated HTML if it exists
    if (ISR_PATHS.includes(url.pathname)) {
      const htmlPath = url.pathname === '/' ? '/index' : url.pathname;
      const cachedHtml = await cacheLayer.get(htmlPath);

      if (cachedHtml) {
        return new Response(cachedHtml, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // Fall through to SSR
  },
  createResponse(response) {
    const url = new URL(response.url || '/');

    // After SSR, cache the rendered HTML for future ISR hits
    if (ISR_PATHS.includes(url.pathname) && response.status === 200) {
      const htmlPath = url.pathname === '/' ? '/index' : url.pathname;
      response.clone().text().then((html) => cacheLayer.set(htmlPath, html));
    }

    return response;
  },
});
```

### Stale-While-Revalidate

Serves stale pages instantly and re-renders in the background based on file age.

```ts
import { createFullWorker, createSSR, defaultAssetResolver } from '@anchorlib/react/ssr'; // or '@anchorlib/solid/ssr'
import { HTTPRouter } from '@irpclib/http/router';
import { transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';
import { cacheLayer } from './lib/cache.js'; // Implement your own storage (KV, FS, etc.)

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);

const MAX_AGE_MS = 60_000; // 1 minute

// Track in-flight background renders to prevent stampede
const revalidating = new Set<string>();

async function revalidate(pathname: string, cookie: string) {
  if (revalidating.has(pathname)) return;
  revalidating.add(pathname);

  try {
    const { html, head, status } = await render(pathname, cookie);
    if (status === 200) {
      const htmlPath = pathname === '/' ? '/index' : pathname;
      // In a real implementation, you would inject head/html into your base template here
      // before caching the final payload.
      await cacheLayer.set(htmlPath, { html, head, timestamp: Date.now() });
    }
  } finally {
    revalidating.delete(pathname);
  }
}

export default createFullWorker(irpcHttpRouter, render, {
  async resolveAsset(request, url, env) {
    // Serve static client assets via the universal resolver
    const asset = await defaultAssetResolver(request, url, env);
    if (asset) return asset;

    const htmlPath = url.pathname === '/' ? '/index' : url.pathname;
    const cached = await cacheLayer.get(htmlPath);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const cookie = request.headers.get('cookie') ?? '';

      // Stale — serve immediately, revalidate in background
      if (age > MAX_AGE_MS) {
        revalidate(url.pathname, cookie);
      }

      // Reconstruct the HTML response using the cached head and body
      return new Response(cached.html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  },
});
```

### Build-Time Pre-Generation

Generate static HTML at build time so ISR serves cached pages from the first request. Run this script after `vite build`.

```ts
// scripts/prerender.ts
import { createSSR } from '@anchorlib/react/ssr'; // or '@anchorlib/solid/ssr'
import router from '../src/lib/router.js';
import RootLayout from '../src/pages/layout.js';

const template = await Bun.file('./dist/client/index.html').text();
const render = createSSR(router, RootLayout);

const PAGES = ['/', '/about', '/blog', '/pricing'];
const STATIC_DIR = './dist/static';

for (const pathname of PAGES) {
  const { html, head, status } = await render(pathname, '');
  if (status === 200) {
    const body = template
      .replace('<!--ssr-head-->', head)
      .replace('<!--ssr-outlet-->', html);
    const filePath = `${STATIC_DIR}${pathname === '/' ? '/index' : pathname}.html`;
    await Bun.write(filePath, body);
    console.log(`Pre-rendered: ${pathname} → ${filePath}`);
  }
}
```

::: tip ISR and Per-Request Context
ISR pages bypass `resolveContext` since they are served as static files. For pages that need per-request context (auth-gated content, user-specific data), exclude them from `ISR_PATHS` and let them fall through to SSR.
:::

## Custom Worker

For full control over request routing, IRPC resolution, and SSR rendering with manual abort propagation, request isolation, and cookie management.

```ts
import { createSSR } from '@anchorlib/react/ssr'; // or '@anchorlib/solid/ssr'
import { HTTPRouter } from '@irpclib/http/router';
import { decodeCookies, setCookieContext } from '@anchorlib/react'; // or '@anchorlib/solid'
import template from '../dist/client/index.html?raw';
import { transport } from './lib/module.js';
import pageRouter from './lib/router.js';
import RootLayout from './pages/layout.js';
import './pages/constructor.js';

const render = createSSR(pageRouter, RootLayout);
const router = new HTTPRouter(transport);

// Provide CookieJar to the IRPC handlers
router.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

export default {
  async fetch(request: Request): Promise<Response> {
    const controller = new AbortController();
    const abort = (reason: unknown) => controller.abort(reason);
    request.signal.addEventListener('abort', abort, { once: true });

    try {
      const url = new URL(request.url);
      const cookie = request.headers.get('cookie') ?? '';

      // 1. IRPC routing
      if (request.method === 'POST' && url.pathname.startsWith(transport.endpoint)) {
        return router.resolve(request, [['cookie', cookie]]);
      }

      // 2. Static assets
      if (typeof Bun !== 'undefined') {
        const file = Bun.file(`./dist/client${url.pathname}`);
        if (url.pathname !== '/' && (await file.exists())) return new Response(file);
      }

      // 3. SSR with IRPC isolation
      const cookieJar = decodeCookies(cookie);

      const response = await router.isolate(
        async () => {
          const { html, head, status, redirect } = await render(
            url.pathname, cookie, undefined, controller, true
          );

          const body = template
            .replace('<!--ssr-head-->', head)
            .replace('<!--ssr-outlet-->', html);

          const headers = new Headers({ 'Content-Type': 'text/html' });
          cookieJar.encode().forEach((c) => headers.append('Set-Cookie', c));

          if (redirect) {
            headers.append('Location', redirect);
            return new Response(null, { status: 302, headers });
          }

          return new Response(body, { status, headers });
        },
        controller,
        [['cookie', cookie]],
        () => {
          setCookieContext(cookieJar);
        }
      );

      return response;
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    } finally {
      request.signal.removeEventListener('abort', abort);
    }
  },
};
```

This gives you direct access to the request/response cycle for cases where the standard workers don't fit — custom middleware, per-route caching strategies, or non-standard protocols.
