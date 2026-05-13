---
title: "Server-Side Rendering (SSR)"
description: "How to implement Server-Side Rendering with Anchor for React."
keywords:
  - anchor react
  - ssr
  - server-side rendering
  - headless
  - async storage
---

# Server-Side Rendering (SSR)

Anchor's fine-grained reactivity and component model work seamlessly on the server. Because `setup()` functions act as constructors that run exactly once, they translate perfectly to the server environment where components render to static HTML strings.

Implementing SSR with Anchor requires three adjustments to handle the concurrent nature of Node.js environments:

1. **Server Module Import:** Configuring `AsyncLocalStorage` and disabling reactive tracking.
2. **Request Isolation:** Scoping state per request with `withIsolation` and `createLifecycle`.
3. **Headless Routing:** Bypassing browser-specific APIs during the server render pass.

## 1. Server Module

Import `@anchorlib/react/server` **before any other Anchor import** in your server entry point. This performs two critical operations:

- Binds Node's `AsyncLocalStorage` as the async context provider, ensuring state isolation across concurrent requests.
- Disables reactive tracking (`setReactive(false)`) for single-pass server rendering, eliminating observer overhead.

```tsx
// entry-server.tsx
import '@anchorlib/react/server'; // MUST be the first import
import { createLifecycle, UIRouter, withIsolation } from '@anchorlib/react';
```

This single import replaces any manual `AsyncLocalStorage` or `setReactive(false)` configuration.

## 2. Request Isolation

For every incoming request, wrap your rendering logic inside `withIsolation()` and `createLifecycle()`.

- **`withIsolation()`** creates an isolated async execution boundary. All state created within the callback is scoped to that boundary, preventing data leakage across concurrent requests.
- **`createLifecycle()`** tracks providers, state bindings, and side effects generated during the request. Calling `.destroy()` after rendering releases all tracked resources.

```tsx
import { withIsolation, createLifecycle } from '@anchorlib/react';

await withIsolation(async () => {
  const ssr = createLifecycle();

  await ssr.runAsync(async () => {
    // Activate router, render app...
  });

  // Release all tracked resources
  ssr.destroy();
});
```

## 3. Headless Routing

The `UIRouter` component automatically handles browser history and scroll restoration. During SSR, these browser APIs (`window`, `location`, etc.) do not exist.

To render the router on the server, pass the `headless` prop to disable browser integrations, and explicitly provide the requested `url`.

```tsx
import { UIRouter } from '@anchorlib/react';
import { router } from './router.js';
import { RootLayout } from './pages/layout.js';

<UIRouter
  router={router}
  root={RootLayout}
  url={requestUrl}
  headless={true}
  resetScroll
/>
```

### Why `headless={true}`?

*   **Bypasses DOM APIs:** Prevents calls to `window.addEventListener('popstate')` and `window.scrollTo()`.
*   **Synchronous Rendering:** Forces `UIRouter` to resolve matching routes immediately without waiting for microtasks.

## 4. Cookie Round-Tripping

Anchor provides isomorphic cookie utilities for SSR. Decode incoming cookies from the request header, inject them into the async scope, and encode mutations back into response headers.

```tsx
import { decodeCookies, setCookieContext } from '@anchorlib/react';

await withIsolation(async () => {
  // Parse the incoming Cookie header into a CookieJar
  const jar = decodeCookies(cookieHeader);

  // Inject the jar into the async scope.
  // Components using cookies() will read/write to this jar.
  setCookieContext(jar);

  const ssr = createLifecycle();
  await ssr.runAsync(async () => {
    // ... render ...
  });

  // Encode only mutated cookies into Set-Cookie header strings
  const setCookieHeaders = jar.encode();

  ssr.destroy();
});
```

During rendering, any component that calls `cookies('name', defaultValue)` will read from and write to this jar. After rendering, `jar.encode()` returns an array of `Set-Cookie` header strings containing only the cookies that were modified during the request.

## 5. Redirect Handling

`router.activate()` returns a blocker when a guard triggers a redirect. Check the return value before rendering:

```tsx
import { Redirect, redirectUrl } from '@anchorlib/react';

const blocker = await router.activate(url);

if (blocker instanceof Redirect) {
  const target = redirectUrl(blocker);
  // Send a 302 redirect response
  return { redirect: target };
}

// No redirect — safe to render
const html = renderToString(/* ... */);
```

Guards that `throw redirect(target)` will also propagate as thrown errors. Handle both paths:

```tsx
try {
  const blocker = await router.activate(url);

  if (blocker instanceof Redirect) {
    redirect = redirectUrl(blocker);
    return { redirect };
  }

  html = renderToString(/* ... */);
} catch (error) {
  if (error instanceof Redirect) {
    redirect = redirectUrl(error);
  } else {
    html = `SSR Render Error: ${error}`;
  }
} finally {
  router.cleanup();
}
```

Call `router.cleanup()` in the `finally` block to release route state after rendering.

## Complete SSR Example (Vite)

### Server Entry (`entry-server.tsx`)

This file exposes a `render` function that Vite loads dynamically. It isolates the request, handles cookies, and renders the headless router.

```tsx
import '@anchorlib/react/server'; // MUST be first!
import {
  createLifecycle,
  decodeCookies,
  headings,
  Redirect,
  redirectUrl,
  setCookieContext,
  UIRouter,
  withIsolation,
} from '@anchorlib/react';
import { renderToString } from 'react-dom/server';
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

        html = renderToString(
          <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />
        );
        head = renderToString(
          [...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />)
        );
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

### Vite Dev Server (`server.ts`)

The dev server loads your `entry-server.tsx` module via Vite's SSR loader and calls the `render` function for each request.

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;

      let template = await fs.readFile(
        path.resolve(import.meta.dirname, 'index.html'), 'utf-8'
      );
      template = await vite.transformIndexHtml(url, template);

      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const { html, head, redirect, cookies } = await render(url, req.headers.cookie ?? '');

      if (redirect) {
        return res.redirect(302, redirect);
      }

      // Set mutated cookies as response headers
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

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;
  app.listen(port, () => console.log(`Vite SSR Dev Server running on http://localhost:${port}`));
}

createServer();
```

::: tip No Manual Adapter Setup
The server entry file (`entry-server.tsx`) handles all `AsyncLocalStorage` and reactivity configuration via `import '@anchorlib/react/server'`. The dev server itself requires no Anchor-specific initialization.
:::

## Client Hydration

On the client side, import the client entry point first, then activate the router before hydrating.

```tsx
import '@anchorlib/react/client'; // MUST be first
import { hydrateRoot } from 'react-dom/client';
import { UIRouter } from '@anchorlib/react';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <UIRouter router={router} root={RootLayout} />
  );
});
```

### Why No Data Transfer During Hydration?

Unlike traditional SSR frameworks that inject a massive JSON payload (like `window.__INITIAL_STATE__`) into the HTML to prevent double-fetching on the client, Anchor takes a completely different approach.

In Anchor, the router implements a **reactive graph** of states and dependencies. A reactive graph is impossible to be simply re-created or serialized directly during hydration.

Therefore, you must call `router.activate(window.location.href)` on the client before hydration to allow the route activation to actually run natively. This ensures that:
1. **The Reactive Graph Connects:** All data providers, loaders, and state nodes re-establish their reactive links accurately.
2. **Guards remain valid:** Re-running route activation on the client guarantees that any security guards and conditions are still valid at the exact time the user receives the static HTML delivery, preventing stale or bypassed security states.
3. **Data-Injection Security:** Carrying initial state via a JSON payload in HTML is inherently dangerous and exposes the application to XSS and state-injection attacks. Anchor eliminates this vector entirely.
4. **Zero Payload Overhead:** You avoid the heavy serialization cost and mismatch errors typical of JSON data transfer payloads.

### What About Double Fetching?

Developers coming from traditional SSR frameworks often worry about **double fetching**—the fact that the server fetches data to render the HTML, and the client fetches that same data again during `router.activate()`.

While Anchor does perform a network request on the client during hydration, this is an **intentional architectural decision** prioritizing security, correctness, and performance:

- **Non-Blocking UI & Zero HTML Bloat:** Traditional frameworks avoid double-fetching by injecting a massive `window.__INITIAL_STATE__` JSON payload into the document. This bloats the HTML size, delays Time To First Byte (TTFB), and blocks the main thread during parsing. Anchor keeps the HTML strictly for layout, allowing the browser to paint immediately while the client connects the data in the background.
- **IRPC / Server Caching:** The "double fetch" rarely impacts database performance. Because the server just resolved the exact same request during the SSR pass, the result is typically served instantly from the server's cache or edge network.
- **Guaranteed State Integrity:** If a page is cached on a CDN for an hour, injecting the initial state means the client hydrates into an hour-old state. By re-fetching on the client, Anchor guarantees the user always interacts with the most up-to-date, strictly validated data.

## Key Takeaways

*   **`import '@anchorlib/react/server'`**: Configures `AsyncLocalStorage` and disables reactive tracking. Must be the first import in your server entry.
*   **`withIsolation()`**: Isolates each request's state boundary.
*   **`createLifecycle()`**: Tracks and explicitly destroys request-scoped resources.
*   **`router.cleanup()`**: Releases route state after rendering.
*   **`<UIRouter headless root={RootLayout} url={req.url} />`**: Required to bypass browser APIs and run routing synchronously during SSR.
*   **Agnostic Logic**: Your Anchor Components (`setup()`) and state do not need to change. The architecture remains isomorphic.
