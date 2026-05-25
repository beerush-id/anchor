## 5. Universal SSR
This guide covers SSR in AIR Stack for React. An app needs three files: `App.tsx` (client hydration), `vite.config.ts` (dev server via plugin), and `worker.ts` (production worker).

### Client Entry (`App.tsx`)
Client-side hydration module. Resolves route state via `router.activate()` before using `hydrateRoot` to attach React to the pre-rendered HTML.

```tsx
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

### Vite Plugin (`@anchorlib/vite-ssr`)
Vite plugin that handles SSR rendering and IRPC routing. Loads the renderer, router, and layout from the config.

#### SSR Only (No IRPC)
```ts
// vite.config.ts
import { airSSR } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [
    react(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/react/ssr',
    }),
  ],
});
```

#### Full Stack (SSR + IRPC over HTTP)
```ts
// vite.config.ts
import { airSSR } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [
    react(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/react/ssr',
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

export default defineConfig({
  plugins: [
    react(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/react/ssr',
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
import { createWorker, createSSR } from '@anchorlib/react/ssr';
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
import { createFullWorker, createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);
const irpcHttpRouter = new HTTPRouter(irpc, transport);

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

### Custom Full Stack Edge Worker (Advanced)
Full control over request routing, IRPC resolution, and SSR rendering with proper abort propagation, request isolation, and cookie management.

```ts
import '@irpclib/irpc/server';
import { createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { decodeCookies, setCookieContext } from '@anchorlib/core';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import pageRouter from './lib/router.js';
import RootLayout from './pages/layout.js';
import './pages/constructor.js';

const render = createSSR(pageRouter, RootLayout);
const router = new HTTPRouter(irpc, transport);

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
