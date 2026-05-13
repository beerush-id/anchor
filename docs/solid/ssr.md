---
title: "Server-Side Rendering (SSR)"
description: "How to implement Server-Side Rendering with Anchor for Solid."
keywords:
  - anchor solid
  - ssr
  - server-side rendering
  - headless
---

# Server-Side Rendering (SSR)

Anchor's Solid integration supports full SSR with request isolation, cookie round-tripping, and headless routing.

## Server Module

Import `@anchorlib/solid/server` **before any other Anchor import** in your server entry point. This configures `AsyncLocalStorage` for request isolation and disables reactive tracking for single-pass server rendering.

```tsx
// entry-server.tsx
import '@anchorlib/solid/server'; // MUST be the first import
```

## Request Isolation

For every incoming request, wrap your rendering logic inside `withIsolation()` and `createLifecycle()`.

- **`withIsolation()`** creates an isolated async execution boundary, preventing state from leaking across concurrent requests.
- **`createLifecycle()`** tracks providers, bindings, and side effects generated during the request for explicit cleanup.

```tsx
import { withIsolation, createLifecycle } from '@anchorlib/solid';

await withIsolation(async () => {
  const ssr = createLifecycle();

  await ssr.runAsync(async () => {
    // Activate router, render app...
  });

  ssr.destroy();
});
```

## Cookie Round-Tripping

Decode incoming cookies from the request header, inject them into the async scope, and encode mutations back into response headers after rendering.

```tsx
import { decodeCookies, setCookieContext } from '@anchorlib/solid';

await withIsolation(async () => {
  const jar = decodeCookies(cookie);
  setCookieContext(jar);

  const ssr = createLifecycle();
  await ssr.runAsync(async () => {
    // Components using cookies() will read/write to this jar
  });

  // Encode only mutated cookies into Set-Cookie header strings
  const setCookieHeaders = jar.encode();
  ssr.destroy();
});
```

## Headless Routing

Pass `headless` and `url` to `UIRouter` to bypass browser APIs during SSR:

```tsx
import { UIRouter } from '@anchorlib/solid';
import { renderToString } from 'solid-js/web';

html = renderToString(() => (
  <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
));
```

## Redirect Handling

`router.activate()` returns a blocker when a guard triggers a redirect. Guards that `throw redirect()` propagate as thrown errors. Handle both:

```tsx
import { Redirect, redirectUrl } from '@anchorlib/solid';

try {
  const blocker = await router.activate(url);

  if (blocker instanceof Redirect) {
    redirect = redirectUrl(blocker);
    return { redirect };
  }

  html = renderToString(() => (
    <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
  ));
} catch (error) {
  if (error instanceof Redirect) {
    redirect = redirectUrl(error);
  } else {
    html = `SSR render error: ${error}`;
  }
} finally {
  router.cleanup();
}
```

## Complete Example

### Server Entry (`entry-server.tsx`)

```tsx
import '@anchorlib/solid/server';
import {
  createLifecycle,
  decodeCookies,
  headings,
  Redirect,
  redirectUrl,
  setCookieContext,
  UIRouter,
  withIsolation,
} from '@anchorlib/solid';
import { renderToString } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

export async function render(url: string, cookie = '') {
  let html = '';
  let head = '';
  let redirect: string | undefined;
  let cookies: string[] = [];

  await withIsolation(async () => {
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    const ssr = createLifecycle();
    await ssr.runAsync(async () => {
      try {
        const blocker = await router.activate(url);

        if (blocker instanceof Redirect) {
          redirect = redirectUrl(blocker);
          return { redirect };
        }

        html = renderToString(() => (
          <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
        ));
        head = renderToString(() =>
          [...headings().values()].map(({ Renderer }) => <Renderer />)
        );
      } catch (error) {
        if (error instanceof Redirect) {
          redirect = redirectUrl(error);
        } else {
          head = '';
          html = `SSR render error: ${error}`;
        }
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

### Client Entry (`entry-client.tsx`)

```tsx
import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  const root = document.getElementById('root');
  root.innerHTML = '';
  render(
    () => <UIRouter router={router} root={RootLayout} headless={true} resetScroll />,
    document.getElementById('root')!
  );
});
```

### Vite Dev Server (`server.ts`)

```typescript
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
      const { html, head, redirect, cookies } = await render(url, req.headers.cookie ?? '');

      if (redirect) {
        return res.redirect(302, redirect);
      }

      for (const cookie of cookies) {
        res.append('Set-Cookie', cookie);
      }

      const page = template
        .replace('<!--ssr-head-->', head)
        .replace('<!--ssr-outlet-->', html);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5174;
  app.listen(port, () => console.log(`Vite SSR Dev Server running on http://localhost:${port}`));
}

createServer();
```

### Edge Worker (`worker.ts`)

The same `render` function works in edge environments (Bun, Cloudflare Workers):

```typescript
import template from '../dist/client/index.html?raw';
import { render } from './entry-server.tsx';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Serve static assets (platform-specific)
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(`./dist/client${url.pathname}`);
      if (url.pathname !== '/' && (await file.exists())) return new Response(file);
    }
    if (env?.ASSETS) {
      try {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status < 400) return asset;
      } catch (_e) {}
    }

    const cookie = request.headers.get('cookie') ?? '';

    try {
      const { html, head, redirect } = await render(url.pathname, cookie);

      if (redirect) return Response.redirect(redirect, 302);

      const page = template
        .replace('<!--ssr-head-->', head)
        .replace('<!--ssr-outlet-->', html);

      return new Response(page, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (e) {
      console.error('SSR Error:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```

## Key Takeaways

*   **`import '@anchorlib/solid/server'`**: Configures `AsyncLocalStorage` and disables reactive tracking. Must be the first import.
*   **`withIsolation()`**: Isolates each request's state boundary.
*   **`createLifecycle()`**: Tracks and explicitly destroys request-scoped resources.
*   **`router.cleanup()`**: Releases route state after rendering.
*   **`renderToString(() => ...)`**: Solid's SSR uses a function wrapper (not direct JSX like React).

## Next Steps

- [**Router**](/solid/router/index.html) — Route definitions, navigation, guards, and data loading
- [**Getting Started**](/solid/getting-started) — State management basics
