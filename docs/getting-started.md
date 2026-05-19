---
title: "Getting Started with AIR Stack"
description: 'Build your first application using the full AIR Stack: Anchor, Router, and IRPC.'
keywords:
  - AIR Stack getting started
  - Anchor getting started
  - IRPC tutorial
  - Router tutorial
---

# Getting Started with AIR Stack

Welcome to the **AIR Stack**! In this guide, you will build a foundational application architecture using Anchor for state, Router for navigation, and IRPC for network transport.

Because AIR Stack is completely framework-agnostic at its core, the logic is identical whether you use **React** or **SolidJS**. The only difference is the view layer import.

## **Quick Start (Templates)**

If you want to skip the manual setup and jump straight into coding, you can clone our official starter templates using `degit`:

::: code-group

```bash [React]
npx degit beerush-id/anchor/templates/air-react my-air-app
cd my-air-app
npm install
npm run dev
```

```bash [SolidJS]
npx degit beerush-id/anchor/templates/air-solid my-air-app
cd my-air-app
npm install
npm run dev
```

:::

Prefer to understand how the architecture is wired together? Read on for the step-by-step manual setup.

## **1. Initialize the Core Modules**

First, define your global Router and IRPC instance. We recommend placing these in a `lib` directory so they can be easily imported across your application.

### **The Router**

::: code-group

```typescript [React]
import { createRouter } from '@anchorlib/react';
import type { ReactNode } from 'react';

// Create a strongly-typed router instance
export const router = createRouter<ReactNode>();
```

```typescript [SolidJS]
import { createRouter } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

// Create a strongly-typed router instance
export const router = createRouter<JSX.Element>();
```

:::

### **The IRPC Module**

The network layer is completely decoupled from your view framework. Create `src/lib/module.ts` to define your network transport:

```typescript [src/lib/module.ts]
import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({
  name: 'irpc',
  version: '1.0.0',
});

export const transport = new HTTPTransport({
  endpoint: `/api/${irpc.href}`,
});

irpc.use(transport);
```

## **2. Define Your Routes**

The AIR Stack uses a separate route definition file. This keeps your application's routing tree entirely decoupled from your view components.

Create `src/pages/route.ts`:

```typescript [src/pages/route.ts]
import { router } from '../lib/router.js';

// The root layout route
export const rootRoute = router.route();

// The index page route
export const indexRoute = rootRoute.route('/');
```

## **3. Build the UI Layer**

Now, bind your routes to the view layer using the `page` wrapper.

### **The Root Layout**

Create `src/pages/layout.tsx` to handle the global application layout:

::: code-group

```tsx [React]
import { page } from '@anchorlib/react';
import { rootRoute } from './route.js';

// Handle global 404s
router.catch(() => {
  return <h1>404 - Page not found</h1>;
});

// Bind the RootLayout to the rootRoute
export const RootLayout = page(rootRoute).render((state, ctx, children) => {
  return (
    <div>
      <header>My AIR Stack App</header>
      <main>{children}</main>
      <footer>© 2026 AIR Stack</footer>
    </div>
  );
});
```

```tsx [SolidJS]
import { page } from '@anchorlib/solid';
import { rootRoute } from './route.js';

// Handle global 404s
router.catch(() => {
  return <h1>404 - Page not found</h1>;
});

// Bind the RootLayout to the rootRoute
export const RootLayout = page(rootRoute).render((state, ctx, children) => {
  return (
    <div>
      <header>My AIR Stack App</header>
      <main>{children}</main>
      <footer>© 2026 AIR Stack</footer>
    </div>
  );
});
```

:::

### **The Home Page**

Create `src/pages/page.tsx` for your index route:

::: code-group

```tsx [React]
import { page, Title, Meta } from '@anchorlib/react';
import { indexRoute } from './route.js';

// Bind RootPage to the indexRoute
export const RootPage = page(indexRoute).render(() => (
  <>
    <Title>Home | AIR Stack</Title>
    <Meta name="description" content="Welcome to my AIR Stack application" />

    <div>
      <h1>Welcome Home</h1>
      <p>This page is powered by fine-grained reactivity.</p>
    </div>
  </>
));
```

```tsx [SolidJS]
import { page, Title, Meta } from '@anchorlib/solid';
import { indexRoute } from './route.js';

// Bind RootPage to the indexRoute
export const RootPage = page(indexRoute).render(() => (
  <>
    <Title>Home | AIR Stack</Title>
    <Meta name="description" content="Welcome to my AIR Stack application" />

    <div>
      <h1>Welcome Home</h1>
      <p>This page is powered by fine-grained reactivity.</p>
    </div>
  </>
));
```

:::

## **4. Wire the Client Entry**

Mount your router to the DOM in your client entry point:

::: code-group

```tsx [React]
import '@anchorlib/react/client'; // MUST be first import

import { UIRouter } from '@anchorlib/react';
import { hydrateRoot } from 'react-dom/client';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';
import './pages/page.js'; // Ensure the page registers its route binding

router.activate(window.location.href).then(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <UIRouter router={router} root={RootLayout} headless={true} resetScroll />
  );
});
```

```tsx [SolidJS]
import '@anchorlib/solid/client'; // MUST be first import

import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';
import './pages/page.js'; // Ensure the page registers its route binding

router.activate(window.location.href).then(() => {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  
  render(
    () => <UIRouter router={router} root={RootLayout} headless={true} resetScroll />,
    root
  );
});
```

:::

## **5. Wire the Server Entry**

For Server-Side Rendering (SSR), the AIR Stack provides isolated reactivity boundaries to prevent cross-request state leakage.

Create `src/entry-server.tsx`:

::: code-group

```tsx [React]
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

  await withIsolation(async () => {
    setCookieContext(decodeCookies(cookie));

    const ssr = createLifecycle();
    await ssr.runAsync(async () => {
      try {
        const blocker = await router.activate(url);

        if (blocker instanceof Redirect) {
          redirect = redirectUrl(blocker);
          return;
        }

        html = renderToString(<UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />);
        head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));
      } catch (error) {
        html = `SSR Render Error: ${error}`;
      } finally {
        router.cleanup();
      }
    });

    ssr.destroy();
  });

  return { html, head, redirect };
}
```

```tsx [SolidJS]
import '@anchorlib/solid/server'; // MUST be first!
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

  await withIsolation(async () => {
    setCookieContext(decodeCookies(cookie));

    const ssr = createLifecycle();
    await ssr.runAsync(async () => {
      try {
        const blocker = await router.activate(url);

        if (blocker instanceof Redirect) {
          redirect = redirectUrl(blocker);
          return;
        }

        html = renderToString(() => <UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />);
        head = renderToString(() => [...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));
      } catch (error) {
        html = `SSR Render Error: ${error}`;
      } finally {
        router.cleanup();
      }
    });

    ssr.destroy();
  });

  return { html, head, redirect };
}
```

:::

## **6. Serve the Application**

To actually run your app, you need a server to handle Server-Side Rendering (SSR) and IRPC API requests. We use standard Express and Vite middleware.

Create `server.ts` at the root of your project:

::: code-group

```typescript [server.ts (React)]
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/react';
import { HTTPRouter } from '@irpclib/http/router';
import express from 'express';
import { createServer as createViteServer } from 'vite';

import { irpc, transport } from './src/lib/module.js';

const rpcRouter = new HTTPRouter(irpc, transport);

// Provide CookieJar to the IRPC handlers
rpcRouter.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  // 1. Handle IRPC Network Requests
  app.post(transport.endpoint, express.text({ type: '*/*' }), async (req, res, next) => {
    try {
      const fullUrl = `${req.headers.origin}${req.originalUrl}`;
      const webReq = new Request(fullUrl, {
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

  // 2. Handle Vite SSR
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

  app.listen(5173, () => console.log(`AIR Stack running on http://localhost:5173`));
}

createServer();
```

```typescript [server.ts (SolidJS)]
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/solid';
import { HTTPRouter } from '@irpclib/http/router';
import express from 'express';
import { createServer as createViteServer } from 'vite';

import { irpc, transport } from './src/lib/module.js';

const rpcRouter = new HTTPRouter(irpc, transport);

// Provide CookieJar to the IRPC handlers
rpcRouter.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  // 1. Handle IRPC Network Requests
  app.post(transport.endpoint, express.text({ type: '*/*' }), async (req, res, next) => {
    try {
      const fullUrl = `${req.headers.origin}${req.originalUrl}`;
      const webReq = new Request(fullUrl, {
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

  // 2. Handle Vite SSR
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

  app.listen(5173, () => console.log(`AIR Stack running on http://localhost:5173`));
}

createServer();
```

:::

## **Next Steps**

You now have a fully functional AIR Stack foundation! From here, you can dive deeper into specific modules:

- [Remote Function](/remote-function/index.md) - Connect your UI to a Node.js or Bun backend.
- [Workflows](/workflow/index.md) - Create reactive workflows to orchestrate your data.
- [State Management](/state-management/index.md) - Master fine-grained state management, immutability, and write contracts.
- [Routing](/routing/index.md) - Learn how to add data loaders and reactive navigation guards.
- [User Interface](/ui/index.md) - Leverage declarative components to build your views.
