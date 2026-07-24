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

If you want to skip the manual setup and jump straight into coding, you can clone our official starter templates using `degit`.

### **1. Scaffold the Project**

::: code-group

```bash [React]
npx degit beerush-id/airstack/templates/air-react my-air-app
cd my-air-app
```

```bash [SolidJS]
npx degit beerush-id/airstack/templates/air-solid my-air-app
cd my-air-app
```

:::

### **2. Install Dependencies**

::: code-group

```bash [Bun]
bun install
```

```bash [npm]
npm install
```

:::

### **3. Start Development Server**

::: code-group

```bash [Bun]
bun run dev
```

```bash [npm]
npm run dev
```

:::

### **Deployment**

The starter templates come pre-configured with dedicated server entry points for the most popular JS runtimes. After running `npm run build`, you can deploy or run your production server natively on your target platform:

::: code-group

```bash [Bun]
bun run start:bun
```

```bash [Node.js]
npm run start:node
```

```bash [Deno]
npm run start:deno
```

```bash [Cloudflare]
npx wrangler deploy
```

:::

Prefer to understand how the architecture is wired together? Read on for the step-by-step manual setup.

## **Agent Skills (AI Coding Assistants)**

If you use AI coding assistants (Gemini, Claude, etc.), install the AIR Stack skills to enable accurate code generation:

::: code-group

```bash [React]
npx degit beerush-id/airstack/skills/air-stack-react ~/.gemini/config/skills/air-stack-react
npx degit beerush-id/airstack/skills/air-form-react ~/.gemini/config/skills/air-form-react
npx degit beerush-id/airstack/skills/air-material-css ~/.gemini/config/skills/air-material-css
```

```bash [SolidJS]
npx degit beerush-id/airstack/skills/air-stack-solid ~/.gemini/config/skills/air-stack-solid
npx degit beerush-id/airstack/skills/air-form-solid ~/.gemini/config/skills/air-form-solid
npx degit beerush-id/airstack/skills/air-material-css ~/.gemini/config/skills/air-material-css
```

:::

## **Manual Installation**

Before writing code, install the required core packages and your preferred view framework:

::: code-group

```bash [React]
npm install @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http @anchorlib/react
```

```bash [SolidJS]
npm install @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http @anchorlib/solid
```

:::

## **1. Initialize the Core Modules**

First, define your global Router and IRPC instance. We recommend placing these in a `lib` directory so they can be easily imported across your application.

### **The Router**

::: code-group

```typescript [React]
import { createRouter } from '@anchorlib/react';

// Create a reactive router instance
export const router = createRouter();
```

```typescript [SolidJS]
import { createRouter } from '@anchorlib/solid';

// Create a reactive router instance
export const router = createRouter();
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

### **The Barrel Export**

Create `src/pages/index.ts` to export your layout and automatically load all page bindings. This guarantees that neither the client nor the server will miss a route.

```typescript [src/pages/index.ts]
// 1. Export the root layout for the router
export * from './layout.js';

// 2. Export all page bindings (this auto-registers the route)
export * from './page.js';
```

## **4. Wire the Client Entry**

Mount your router to the DOM in your client entry point:

::: code-group

```tsx [React]
import '@anchorlib/react/client'; // MUST be first import

import { UIRouter } from '@anchorlib/react';
import { hydrateRoot } from 'react-dom/client';
import { router } from './lib/router.js';
import { RootLayout } from './pages/index.js';

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
import { RootLayout } from './pages/index.js';

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

For Server-Side Rendering (SSR) and full-stack backend functionality, the AIR Stack provides a streamlined edge worker architecture that automatically isolates request state and intercepts IRPC routes.

Create `src/worker.ts`:

::: code-group

```typescript [React]
import { createFullWorker, createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';

import { irpc, transport } from './lib/module.js';
import { router } from './lib/router.js';
import { RootLayout } from './pages/index.js';

// 1. Create the SSR Renderer
const render = createSSR(router, RootLayout);

// 2. Create the IRPC Router
const rpcRouter = new HTTPRouter(transport);

// 3. Export the standard Edge Worker
export default createFullWorker(rpcRouter, render);
```

```typescript [SolidJS]
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';

import { irpc, transport } from './lib/module.js';
import { router } from './lib/router.js';
import { RootLayout } from './pages/index.js';

// 1. Create the SSR Renderer
const render = createSSR(router, RootLayout);

// 2. Create the IRPC Router
const rpcRouter = new HTTPRouter(transport);

// 3. Export the standard Edge Worker
export default createFullWorker(rpcRouter, render);
```

:::

## **6. Serve the Application**

During development, the `@anchorlib/vite-ssr` plugin automatically binds your `worker.ts` to Vite, instantly handling SSR, IRPC requests, and static assets with zero configuration.

### **Vite Configuration**

Update `vite.config.ts`:

::: code-group

```typescript [React]
import react from '@vitejs/plugin-react';
import { airWorker } from '@anchorlib/vite-ssr';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), airWorker()],
});
```

```typescript [SolidJS]
import solid from 'vite-plugin-solid';
import { airWorker } from '@anchorlib/vite-ssr';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [solid(), airWorker()],
});
```

:::

### **Production Deployment**

In production, your worker natively supports modern JS edge runtimes (Node, Bun, Deno, Cloudflare) using standardized Web Request/Response objects. Just build and run:

::: code-group

```javascript [Node.js]
// server/node.js
import { serve } from '@hono/node-server';
import worker from '../dist/server/worker.js';

serve({
  fetch: worker.fetch,
  port: process.env.PORT || 3000,
});
```

```javascript [Bun / Cloudflare]
// server/bun.js
// Bun and Cloudflare natively serve files that export a default fetch handler
import worker from '../dist/server/worker.js';

export default worker; 
```

:::

## **Next Steps**

You now have a fully functional AIR Stack foundation! From here, you can dive deeper into specific modules:

- [Universal SSR](/ssr.md) - Learn about the unified Edge Worker architecture and asset caching.
- [Remote Function](/remote-function/index.md) - Connect your UI to a Node.js or Bun backend.
- [Workflows](/workflow/index.md) - Create reactive workflows to orchestrate your data.
- [State Management](/state-management/index.md) - Master fine-grained state management, immutability, and write contracts.
- [Routing](/routing/index.md) - Learn how to add data loaders and reactive navigation guards.
- [User Interface](/ui/index.md) - Leverage declarative components to build your views.
