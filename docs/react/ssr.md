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

Implementing SSR with Anchor requires two key adjustments to handle the concurrent nature of Node.js environments:

1. **Request-Isolated State:** Utilizing `AsyncLocalStorage` to ensure state doesn't leak across concurrent requests.
2. **Headless Routing:** Bypassing browser-specific APIs (`window`, `popstate`, `scroll`) during the server render pass.

## 1. Request-Isolated State (`AsyncLocalStorage`)

In a browser, global state is safe because each user has their own JavaScript environment. On a Node.js server, global state is shared across all incoming requests. To prevent data leakage between users, you must isolate state per request.

Anchor requires two steps to achieve this:

**Step A: Initialize the Global Storage Adapter**
You must set this up exactly once in your server entry point. This tells Anchor to use Node's `AsyncLocalStorage` under the hood.

```tsx
import { setAsyncStorageAdapter } from '@anchorlib/react';
import { AsyncLocalStorage } from 'node:async_hooks';

// Call this BEFORE starting your server or handling requests
setAsyncStorageAdapter(new AsyncLocalStorage());
```

**Step B: Isolate the Request Context**
For *every incoming request*, you must wrap your routing and rendering logic inside `isolated.async` and `createLifecycle()`. 

- `isolated.async()` provides the underlying context layer (`storage.run()`) to ensure state is strictly scoped to the current execution branch.
- `createLifecycle()` ensures that any providers, state bindings, or side effects generated during the request are properly tracked and explicitly destroyed.

```tsx
import { isolated, createLifecycle } from '@anchorlib/react';

app.get('*', async (req, res) => {
  // 1. Isolate the execution context
  await isolated.async(async () => {
    // 2. Create the request scope
    const scope = createLifecycle();
    
    await scope.runAsync(async () => {
      // 3. Activate router and render your app safely...
    });
    
    // 4. Destroy the scope to prevent memory leaks
    scope.destroy();
  });
});
```

## 2. Headless Routing

The `UIRouter` component automatically handles browser history and scroll restoration. During SSR, these browser APIs (`window`, `location`, etc.) do not exist.

To render the router on the server, you must pass the `headless` prop to disable browser integrations, and explicitly provide the requested `url`.

```tsx
import { UIRouter } from '@anchorlib/react';
import { router } from './router.js'; // Your application's router instance
import AppRoot from './routes/Index.js'; // Your root component

export function renderApp(requestUrl: string) {
  return (
    <UIRouter 
      router={router} 
      root={AppRoot}
      url={requestUrl} 
      headless={true} 
    />
  );
}
```

### Why `headless={true}`?

*   **Bypasses DOM APIs:** Prevents calls to `window.addEventListener('popstate')` and `window.scrollTo()`.
*   **Synchronous Rendering:** Forces `UIRouter` to resolve matching routes immediately without waiting for microtasks.
*   **Persistent Stacks:** Under the hood, `UIRouter` uses non-reactive `createRef` to manage modal stacks, ensuring rendering remains synchronous and thread-safe.

## Complete SSR Example

Here is a simplified example of a server entry point using Express and `react-dom/server`.

```tsx
import express from 'express';
import { renderToString } from 'react-dom/server';
import { setAsyncStorageAdapter, isolated, createLifecycle, UIRouter, headings } from '@anchorlib/react';
import { AsyncLocalStorage } from 'node:async_hooks';

// 1. Initialize the Async Storage Adapter
setAsyncStorageAdapter(new AsyncLocalStorage());

import { Redirect, redirectUrl } from '@anchorlib/react/router';
import { router } from './app/router'; // Your Anchor Router
import AppRoot from './app/Index'; // Your root component

const app = express();

app.get('*', async (req, res) => {
  // 2. Isolate the request context
  await isolated.async(async () => {
    // 3. Create a lifecycle scope for the request
    const scope = createLifecycle();
    
    await scope.runAsync(async () => {
      try {
        // 4. Pre-activate the router to load initial data/providers
        await router.activate(req.url);

        // 5. Render the application in headless mode
        const html = renderToString(
          <UIRouter 
            router={router} 
            root={AppRoot}
            url={req.url} 
            headless={true} 
          />
        );
        const head = renderToString(<>{[...headings()].map(([, { Renderer }], i) => <Renderer key={i} />)}</>);

        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              ${head}
            </head>
            <body>
              <div id="root">${html}</div>
            </body>
          </html>
        `);
      } catch (error) {
        // Handle router guard redirects
        if (error instanceof Redirect) {
          res.redirect(302, redirectUrl(error));
        } else {
          console.error('SSR Error:', error);
          res.status(500).send('Internal Server Error');
        }
      }
    });

    // 6. Destroy the lifecycle to free memory
    scope.destroy();
  });
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

## Vite SSR Setup

Vite provides excellent native support for SSR. To use Anchor with Vite SSR, you typically split your server logic into two files: a server entry point and your main Node/Express server.

### 1. Server Entry (`entry-server.tsx`)

This file exposes a `render` function that Vite will load dynamically. It isolates the request and renders the headless router.

```tsx
import { renderToString } from 'react-dom/server';
import { isolated, createLifecycle, UIRouter, headings } from '@anchorlib/react';
import { Redirect, redirectUrl } from '@anchorlib/react/router';
import { router } from './router';
import AppRoot from './Index';

export async function render(url: string) {
  let html = '';
  let head = '';
  let redirect: string | undefined;

  await isolated.async(async () => {
    const scope = createLifecycle();
    
    await scope.runAsync(async () => {
      try {
        await router.activate(url);
        html = renderToString(
          <UIRouter router={router} root={AppRoot} url={url} headless={true} />
        );
        head = renderToString(<>{[...headings()].map(([, { Renderer }], i) => <Renderer key={i} />)}</>);
      } catch (error) {
        if (error instanceof Redirect) {
          redirect = redirectUrl(error);
        } else {
          throw error;
        }
      }
    });

    scope.destroy();
  });

  return { html, head, redirect };
}
```

### 2. Vite Dev Server (`server.js`)

In your Vite development server, you initialize the storage adapter once, then call your `render` function for incoming requests.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { setAsyncStorageAdapter } from '@anchorlib/react';
import { AsyncLocalStorage } from 'node:async_hooks';

// 1. Initialize Async Storage for the entire server
setAsyncStorageAdapter(new AsyncLocalStorage());

async function createServer() {
  const app = express();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      
      // Load the Vite SSR entry point
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      
      // Call the Anchor render function
      const { html, head, redirect } = await render(url);

      if (redirect) {
        return res.redirect(302, redirect);
      }

      // Load index.html and inject the rendered app
      let template = fs.readFileSync(path.resolve(import.meta.dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      const page = template
        .replace('<!--head-outlet-->', () => head)
        .replace('<!--ssr-outlet-->', () => html);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(5173, () => console.log('Vite SSR server running on http://localhost:5173'));
}

createServer();
```

## Client Hydration

On the client side, initialization remains mostly the same. You just need to ensure the router matches the current URL before rendering, so hydration works correctly without flashes of content.

```tsx
import '@anchorlib/react/client'; // MUST be first
import { hydrateRoot } from 'react-dom/client';
import { UIRouter } from '@anchorlib/react';
import { router } from './router';
import AppRoot from './routes/Index';

// Initialize the router with the current browser URL
router.activate(window.location.href).then(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <UIRouter router={router} root={AppRoot} />
  );
});
```

### Why No Data Transfer During Hydration?

Unlike traditional SSR frameworks (Next.js, Nuxt) that inject a massive JSON payload (like `window.__INITIAL_STATE__`) into the HTML to prevent double-fetching on the client, Anchor takes a completely different approach.

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

*   **`setAsyncStorageAdapter(new AsyncLocalStorage())`**: Non-negotiable for thread-safe state on the server.
*   **`<UIRouter headless root={AppRoot} url={req.url} />`**: Required to bypass browser APIs and run routing synchronously during SSR.
*   **Agnostic Logic**: Your Anchor Components (`setup()`) and state do not need to change. The architecture remains isomorphic.
