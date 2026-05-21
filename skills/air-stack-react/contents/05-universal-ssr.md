## 5. Universal SSR
This guide explains the components required for SSR in Anchor. It covers the Client Entry (`entry-client.tsx`), the Server Entry (`entry-server.tsx`), and the difference between an SSR Only server and a Full Stack server (`server.ts`).

### Client Entry (`entry-client.tsx`)
A client-side hydration module. It resolves the route state via `router.activate()` before using `hydrateRoot` to attach React to the pre-rendered HTML.

```tsx
import '@anchorlib/react/client'; // MUST be first import
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

### Server Entry (`entry-server.tsx`)
A server-side rendering module. It uses `withIsolation` and `createLifecycle` to create an isolated state scope for each request and renders the React tree to HTML.

```tsx
import '@anchorlib/react/server'; // MUST be first!
import {
  createLifecycle, decodeCookies, headings, Redirect,
  redirectUrl, setCookieContext, UIRouter, withIsolation
} from '@anchorlib/react';
import { renderToString } from 'react-dom/server';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

export async function render(url: string, cookie = '') {
  let html = '';
  let head = '';
  let redirect: string | undefined;
  let cookies: string[] = [];

  // 1. Create an isolated state scope
  await withIsolation(async () => {
    // 2. Initialize Cookies
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    // 3. Create SSR Lifecycle
    const ssr = createLifecycle();
    
    await ssr.runAsync(async () => {
      try {
        // Activate router with hydration snapshotting enabled (`true`)
        const blocker = await router.activate(url, true);

        // Handle Route Guards and Redirects
        if (blocker instanceof Redirect) {
          redirect = redirectUrl(blocker);
          return;
        }

        // Generate hydration script from snapshot
        const script = router.createHydrationScript(blocker);

        // Render HTML and Head elements (e.g. dynamic meta tags)
        html = renderToString(<UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />);
        // biome-ignore lint/suspicious/noArrayIndexKey: Safe to use index as key.
        head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));
        
        // Inject hydration script into head
        head += script;
      } catch (error) {
        head = '';
        html = `SSR Render Error: ${error}`;
      } finally {
        router.cleanup();
      }
    });

    cookies = jar.encode();
    ssr.destroy();
  });

  return { html, head, redirect, cookies };
}
```

### SSR Only Dev Server (`server.ts`)
A Node/Express development server. It runs Vite middleware and executes `entry-server.tsx` to provide Hot Module Replacement (HMR).

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await fs.readFile(path.resolve(import.meta.dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);

      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const { html, head, redirect } = await render(url, req.headers.cookie ?? '');

      if (redirect) return res.redirect(302, redirect);

      const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-outlet-->', html);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(5173);
}

createServer();
```

### Full Stack Dev Server (`server.ts`)
A combined Node/Express development server. It runs Vite middleware for the frontend and natively resolves IRPC POST requests in the same process.

```ts
import '@irpclib/irpc/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { HTTPRouter } from '@irpclib/http/router';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/react';
import express from 'express';
import { createServer as createViteServer } from 'vite';

// Your IRPC configuration and Handlers
import { irpc, transport } from './src/lib/module.js';
import './src/pages/constructor.js'; 

const rpcRouter = new HTTPRouter(irpc, transport);

// Provide CookieJar to all IRPC handlers
rpcRouter.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  // 1. Handle Full Stack IRPC Backend Requests
  app.post(transport.endpoint, express.text({ type: '*/*' }), async (req, res, next) => {
    try {
      const webReq = new Request(`${req.headers.origin}${req.originalUrl}`, {
        method: 'POST',
        headers: req.headers as Record<string, string>,
        body: req.body || '',
      });

      const webRes = await rpcRouter.resolve(webReq, [['cookie', req.headers?.cookie]]);
      webRes.headers.forEach((v, k) => res.setHeader(k, v));
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.status(webRes.status);

      Readable.fromWeb(webRes.body as never).pipe(res);
    } catch (e) {
      next(e);
    }
  });

  app.use(vite.middlewares);

  // 2. Handle Frontend SSR Requests
  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await fs.readFile(path.resolve(import.meta.dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);

      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const { html, head, redirect } = await render(url, req.headers.cookie ?? '');

      if (redirect) return res.redirect(302, redirect);

      const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-outlet-->', html);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(5173);
}

createServer();
```

### Full Stack Edge Worker (`worker.ts`)
A Web Standard Worker for production. It serves static `dist/client` assets, executes the production SSR bundle, and natively resolves IRPC POST requests.

```ts
import '@irpclib/irpc/server';
import { HTTPRouter } from '@irpclib/http/router';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/react';
import template from '../dist/client/index.html?raw';
import { render } from './entry-server.tsx';
import { irpc, transport } from './lib/module.js';
import './pages/constructor.js';

const router = new HTTPRouter(irpc, transport);

// Provide CookieJar to the IRPC handlers
router.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle IRPC requests
    if (url.pathname.startsWith(transport.endpoint) && request.method === 'POST') {
      return router.resolve(request, [['cookie', request.headers.get('cookie')]]);
    }

    // 2. Attempt to serve static assets (Bun / Cloudflare Pages)
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(`./dist/client${url.pathname}`);
      if (url.pathname !== '/' && (await file.exists())) return new Response(file);
    } else if (env?.ASSETS) {
      try {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status < 400) return asset;
      } catch (_e) {}
    }

    const cookie = request.headers.get('cookie') ?? '';

    try {
      // 3. Execute the environment-agnostic SSR render function
      const { html, head, redirect } = await render(url.pathname, cookie);

      // Handle server-side redirects
      if (redirect) {
        return Response.redirect(redirect, 302);
      }

      // Inject the rendered content into the HTML shell
      const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-outlet-->', html);

      return new Response(page, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```
