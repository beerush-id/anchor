## 5. Universal SSR
This guide covers SSR in AIR Stack for Solid. An app needs three files: `App.tsx` (client hydration), `vite.config.ts` (dev server via plugin), and `worker.ts` (production worker).

### SSR: API Signatures
```typescript
// The render() function returns SSROutput
type SSROutput = {
  html: string;       // Rendered HTML body
  head: string;       // Rendered HTML head (styles, meta, hydration scripts)
  status: number;     // HTTP status code
  cookies: string[];  // Set-Cookie headers from cookie mutations during render
  redirect?: string;  // Redirect URL if triggered during rendering
};

type SSRRenderer = (url: string, cookie: string, context?: SSRContext, controller?: AbortController) => Promise<SSROutput>;
```

### Client Entry (`App.tsx`)
Client-side hydration module. Resolves route state via `router.activate()` before using `hydrate` to attach Solid to the pre-rendered HTML.

```tsx
import '@anchorlib/solid/client'; // MUST be first import
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

### Vite Plugin (`@anchorlib/vite-ssr`)
Vite plugin that handles SSR rendering and IRPC routing. Loads the renderer, router, and layout from the config.

#### SSR Only (No IRPC)
```ts
// vite.config.ts
import { airSSR } from '@anchorlib/vite-ssr';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/solid/ssr',
    }),
  ],
});
```

#### Full Stack (SSR + IRPC over HTTP)
```ts
// vite.config.ts
import { airSSR } from '@anchorlib/vite-ssr';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/solid/ssr',
      irpc: {
        module: { path: './src/lib/module.ts', name: 'irpc' },
        transport: { path: './src/lib/module.ts', name: 'transport' },
        handlers: ['./src/pages/constructor.ts'],
      },
    }),
  ],
});
```

#### Full Stack (SSR + IRPC over HTTP + WebSocket)
```ts
// vite.config.ts
import { airSSR } from '@anchorlib/vite-ssr';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/solid/ssr',
      irpc: {
        module: { path: './src/lib/module.ts', name: 'irpc' },
        transport: { path: './src/lib/module.ts', name: 'transport' },
        wsTransport: { path: './src/lib/module.ts', name: 'wsTransport' },
        handlers: ['./src/pages/constructor.ts'],
      },
    }),
  ],
});
```

Each `irpc` field accepts a string (loads `export default`) or `{ path, name }` (loads a named export). The plugin intercepts HTTP POST at the transport endpoint, and WebSocket upgrade at the WS transport endpoint — both on the same Vite dev server.

### Standard SSR Only Edge Worker (`worker.ts`)
For apps that only need SSR without IRPC backend. Handles abort signals, timeouts, asset resolution, cookie propagation, and redirects.

```ts
import { createWorker, createSSR } from '@anchorlib/solid/ssr';
import template from '../dist/client/index.html?raw';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

export default createWorker(render, {
  template,
  timeout: 10000, // Optional: abort SSR render after 10s
  async resolveAsset(request, url, env) {
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(`./dist/client${url.pathname}`);
      if (url.pathname !== '/' && (await file.exists())) {
        return new Response(file);
      }
    }
  },
});
```

### Standard Full Stack Edge Worker (`worker.ts`)
For apps that run IRPC and SSR on the same thread. Routes POST requests to IRPC, GET requests to SSR. Shares hooks, context isolation, and abort signals between both.

```ts
import '@irpclib/irpc/server';
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);

export default createFullWorker(irpcHttpRouter, render, {
  template,
  async resolveAsset(request, url, env) {
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(`./dist/client${url.pathname}`);
      if (url.pathname !== '/' && (await file.exists())) {
        return new Response(file);
      }
    }

    if (env?.ASSETS) {
      try {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status < 400) return asset;
      } catch (_e) {}
    }
  },
});
```

#### `WorkerOptions`
Both `createWorker` and `createFullWorker` accept the same base options:

| Option | Type | Description |
|--------|------|-------------|
| `template` | `string` | **Required.** The HTML template string (e.g., `index.html?raw`). |
| `headTag` | `string` | The placeholder to replace with rendered head. Defaults to `<!--ssr-head-->`. |
| `bodyTag` | `string` | The placeholder to replace with rendered body. Defaults to `<!--ssr-outlet-->`. |
| `resolveAsset` | `(request, url, env?) => Promise<Response \| undefined>` | Serves static assets before SSR. Return `undefined` to fall through to SSR. |
| `resolveContext` | `(request, url) => SSRContextSeed` | Custom context seed. Defaults to `[]`. |
| `createResponse` | `(response: Response) => Response` | Hook to modify all outgoing responses (e.g., add security headers). |
| `timeout` | `number` | Milliseconds before aborting the SSR render. Only applies to SSR, not IRPC. |

### Incremental Static Regeneration (ISR)
ISR is a userland pattern built on `resolveAsset`. The worker checks for a pre-generated HTML file on disk before falling through to SSR. On a cache miss, the rendered page is written to disk so subsequent requests skip SSR entirely. For stale pages, the cached file is served immediately while a background re-render refreshes it.

The key insight: `resolveAsset` runs **before** SSR. If it returns a `Response`, SSR is skipped completely. This makes it the natural interception point for serving cached static pages.

#### Basic ISR Worker
Serves cached HTML when available, renders and caches on miss.

```ts
import { createWorker, createSSR } from '@anchorlib/solid/ssr';
import template from '../dist/client/index.html?raw';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

const STATIC_DIR = './dist/static';
const ISR_PATHS = ['/', '/about', '/blog', '/pricing'];

export default createWorker(render, {
  template,
  async resolveAsset(request, url, env) {
    // 1. Serve static client assets (JS, CSS, images)
    const clientFile = Bun.file(`./dist/client${url.pathname}`);
    if (url.pathname !== '/' && (await clientFile.exists())) {
      return new Response(clientFile);
    }

    // 2. ISR — serve pre-generated HTML if it exists
    if (ISR_PATHS.includes(url.pathname)) {
      const htmlPath = `${STATIC_DIR}${url.pathname === '/' ? '/index' : url.pathname}.html`;
      const cached = Bun.file(htmlPath);

      if (await cached.exists()) {
        return new Response(cached, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // 3. Fall through to SSR
  },
  createResponse(response) {
    const url = new URL(response.url || '/');

    // After SSR, write the rendered HTML to disk for future ISR hits
    if (ISR_PATHS.includes(url.pathname) && response.status === 200) {
      const htmlPath = `${STATIC_DIR}${url.pathname === '/' ? '/index' : url.pathname}.html`;
      response.clone().text().then((html) => Bun.write(htmlPath, html));
    }

    return response;
  },
});
```

#### ISR with Stale-While-Revalidate
Serves stale pages instantly and re-renders in the background based on file age.

```ts
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(transport);

const STATIC_DIR = './dist/static';
const MAX_AGE_MS = 60_000; // 1 minute

// Track in-flight background renders to prevent stampede
const revalidating = new Set<string>();

async function revalidate(pathname: string, cookie: string) {
  if (revalidating.has(pathname)) return;
  revalidating.add(pathname);

  try {
    const { html, head, status } = await render(pathname, cookie);
    if (status === 200) {
      const body = template
        .replace('<!--ssr-head-->', head)
        .replace('<!--ssr-outlet-->', html);
      const htmlPath = `${STATIC_DIR}${pathname === '/' ? '/index' : pathname}.html`;
      await Bun.write(htmlPath, body);
    }
  } finally {
    revalidating.delete(pathname);
  }
}

export default createFullWorker(irpcHttpRouter, render, {
  template,
  async resolveAsset(request, url, env) {
    const clientFile = Bun.file(`./dist/client${url.pathname}`);
    if (url.pathname !== '/' && (await clientFile.exists())) {
      return new Response(clientFile);
    }

    const htmlPath = `${STATIC_DIR}${url.pathname === '/' ? '/index' : url.pathname}.html`;
    const cached = Bun.file(htmlPath);

    if (await cached.exists()) {
      const age = Date.now() - cached.lastModified;
      const cookie = request.headers.get('cookie') ?? '';

      // Stale — serve immediately, revalidate in background
      if (age > MAX_AGE_MS) {
        revalidate(url.pathname, cookie);
      }

      return new Response(cached, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  },
});
```

#### Build-Time Pre-Generation
Generate static HTML at build time so ISR serves cached pages from the first request. Run this script after `vite build`.

```ts
// scripts/prerender.ts
import { createSSR } from '@anchorlib/solid/ssr';
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

> **Note**: ISR pages bypass `resolveContext` since they're served as static files. For pages that need per-request context (auth-gated content, user-specific data), exclude them from `ISR_PATHS` and let them fall through to SSR.

### Custom Full Stack Edge Worker (Advanced)
Full control over request routing, IRPC resolution, and SSR rendering with proper abort propagation, request isolation, and cookie management.

```ts
import '@irpclib/irpc/server';
import { createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { decodeCookies, setCookieContext } from '@anchorlib/solid';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import pageRouter from './lib/router.js';
import RootLayout from './pages/layout.js';
import './pages/constructor.js';

const render = createSSR(pageRouter, RootLayout);
const router = new HTTPRouter(transport);

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
