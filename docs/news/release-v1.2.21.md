---
title: AIR Stack v1.2.21 — SSR Workers, Sitemaps, and Fine-Grained Reactivity
description: Major enhancements to SSR worker flows, programmatic sitemaps, new React/Solid utilities, and IRPC Guards.
date: 2026-07-18
sidebar: false
prev: false
next: false
---

[← Back to News](/news/)

# AIR Stack v1.2.21 — SSR Workers, Sitemaps, and Fine-Grained Reactivity

**v1.2.21** — [GitHub](https://github.com/beerush-id/airstack) | [View Changes (v1.2.0...v1.2.21)](https://github.com/beerush-id/airstack/compare/v1.2.0...v1.2.21)

This massive release brings powerful new capabilities across the entire AIR Stack. We've heavily upgraded the Server-Side Rendering (SSR) worker flows, introduced programmatic SEO tools for routing, shipped powerful UI isolation utilities for React, and fortified the IRPC lifecycle with robust guards.

## SSR Workers & WebSocket Support

We've supercharged our SSR environment to behave more like a full-fledged server runtime, capable of handling complex networking natively.

- **Multi-Runtime Entry Points**: Added dedicated server entry points for SSR workers (`airWorker`), allowing your SSR code to run smoothly across different runtimes (Bun, Node, Cloudflare).

First, add the `airWorker` plugin to your Vite configuration alongside your framework plugin to inject the entry point during development and build:

::: code-group

```ts [React (vite.config.ts)]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { airWorker } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [react(), airWorker()],
});
```

```ts [SolidJS (vite.config.ts)]
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { airWorker } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [solid({ ssr: true }), airWorker()],
});
```

:::

Then, configure the universal SSR worker baseline in your entry script:

::: code-group

```ts [React (worker.ts)]
import { createFullWorker, createSSR } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';

const render = createSSR(router, RootLayout);
const httpRouter = new HTTPRouter(httpTransport);

// The required baseline entry point for your universal SSR worker
export default createFullWorker(httpRouter, render);
```

```ts [SolidJS (worker.ts)]
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';

const render = createSSR(router, RootLayout);
const httpRouter = new HTTPRouter(httpTransport);

// The required baseline entry point for your universal SSR worker
export default createFullWorker(httpRouter, render);
```

:::

- **WebSocket Upgrades**: Native support for WebSocket upgrades directly within the `solid`, `react`, and `vite-ssr` server workers.

```ts [Worker WebSockets]
import { WebSocketRouter } from '@irpclib/ws/router';

// ... existing worker setup ...

// Native WebSocket support is an optional addition to your full worker
export default createFullWorker(httpRouter, render, {
  wsRouter: new WebSocketRouter(wsTransport),
});
```
- **Asset Resolution**: Added `defaultAssetResolver` with built-in MIME type handling for SSR workers, so static assets route seamlessly during development and production.

```ts [ISR Worker Fallback]
import { createWorker, defaultAssetResolver } from '@anchorlib/react/ssr';
import { cacheLayer } from './cache.js';
import router from './router.js';
import RootLayout from './layout.js';

export const worker = createWorker(router, RootLayout, {
  resolveAsset: async (request, url, env) => {
    // ISR — serve pre-generated HTML if it exists
    const cachedHtml = await cacheLayer.get(url.pathname);
    if (cachedHtml) return new Response(cachedHtml, { headers: { 'Content-Type': 'text/html' } });

    // Fallback — easily serve static client assets via the newly exported universal resolver
    return await defaultAssetResolver(request, url, env);
  }
});
```

- **Worker Configuration**: Introduced the `ignoreDotPath` option to bypass hidden files, and `removeIndexHtml` in `vite-ssr` to streamline worker HTML handling.
- **App Shell Wrapping**: SSR workers now support an optional `Shell` component argument. To avoid hydration mismatches, ensure the same shell wraps your application on both the server and the client.

::: code-group

```tsx [shell.tsx (Shared)]
export const AppShell = ({ children }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);
```

```tsx [App.tsx (Client)]
import { UIRouter } from '@anchorlib/react';
import { AppShell } from './shell.js';

export default function App() {
  return (
    <AppShell>
      <UIRouter router={router} root={RootLayout} />
    </AppShell>
  );
}
```

```tsx [worker.ts (Server)]
import { createWorker } from '@anchorlib/react/ssr';
import { AppShell } from './shell.js';

export const worker = createWorker(router, RootLayout, {}, AppShell);
```

:::

## SEO & Routing: Sitemaps & Auth State

Routing just got significantly smarter when it comes to search engines and route-level protection.

- **Automatic & Programmatic Sitemaps**: Introduced a comprehensive API for generating sitemaps. When deployed via the Vite SSR template, `/sitemap.xml` is automatically generated and served out of the box. You can also generate sitemaps programmatically for custom backends. It includes built-in support for alternate links and `hreflang`.

```ts [Sitemap Configuration]
import { createRouter } from '@anchorlib/router';

const router = createRouter();
const rootRoute = router.route();

// Configure the sitemap options directly on the route
rootRoute.route('/dashboard', { 
  sitemap: { changefreq: 'daily', priority: 0.8 } 
}).component(Dashboard);

// `/sitemap.xml` is automatically intercepted and served during SSR.
// Or, generate it programmatically for custom server setups:
const xml = await router.sitemap({ baseUrl: 'https://airlib.dev' });
```

- **Auth State Integration**: The `Route` class now features an `authenticated` getter. This enforces strict authentication state checks directly at the route level, and handles unauthorized exceptions gracefully.
- **Strict Navigation Links**: The `<Link>` component now supports a `fullMatch` property. This improves index route behavior, ensuring the link is only marked as active during strict, exact path navigation.

```tsx [Strict Navigation]
{/* Disable fullMatch to keep the index link active when sibling/child routes are active */}
<Link to={UsersIndexPage} fullMatch={false} activeClass="active">Users</Link>
```

## Core Reactivity & Presentation

We've introduced several powerful utilities to manage conditional styling, unique IDs, and fine-grained reactivity across React, Solid, and Svelte.

- **Inline Reactive Boundaries (`<Snippet>`)**: React receives the new `<Snippet>` component. It allows you to create inline reactive boundaries and defer state reads without having to extract the UI into a semantic factory or God component.

```tsx [Snippet Component]
import { setup, Snippet } from '@anchorlib/react';

export const UserProfile = setup(() => {
  const state = mutable({ active: true, cpu: 45 });
  
  return render(() => (
    <div className="card">
      {/* Isolate fast updates while deferring the property read */}
      <Snippet data={state}>
        {({ cpu }) => <span>CPU: {cpu}%</span>}
      </Snippet>
    </div>
  ));
});
```

- **Class & Style Utilities**: Added the `classx` and `stylex` utilities to `@anchorlib/core` for seamless conditional class and inline-style management. This includes `.use()` for fine-grained reactive bindings on Anchor components (React only) and `$unit()` for precise style units.

::: code-group

```tsx [React (Conditional Styling)]
import { classx, stylex, $unit } from '@anchorlib/react';
import { Counter } from './Counter.js'; // Example Anchor Component

// Static evaluation for native elements
<div 
  className={classx('card', { 'card-active': state.active })}
  style={stylex({ 
    opacity: state.active ? 1 : 0.5,
    width: $unit.percent(state.width)
  })}
>
  {/* Reactive binding for Anchor components */}
  <Counter className={classx.use(() => ['counter', { active: state.active }])} />
</div>
```

```tsx [SolidJS (Conditional Styling)]
import { classx, stylex } from '@anchorlib/solid';
import { Counter } from './Counter.js'; // Example Anchor Component

// SolidJS handles reactivity natively
<div 
  class={classx('card', { 'card-active': state.active })}
  style={stylex({ 
    opacity: state.active ? 1 : 0.5,
    width: stylex.unit.percent(state.width)
  })}
>
  <Counter class={classx('counter', { active: state.active })} />
</div>
```

:::

- **Ref Bindings (`refTo`)**: Added the `refTo` (or `$ref`) utility for React bindings, allowing you to directly bind DOM references to state object properties.

```tsx [Ref Binding]
import { setup, refTo, mutable } from '@anchorlib/react';

export const Form = setup(() => {
  const refs = mutable({ input: null });

  return render(() => (
    // Automatically binds the DOM node directly to refs.input
    <input ref={refTo(refs, 'input')} />
  ));
});
```

- **Portals & Bindings**: React now fully supports Portal rendering with dynamic children, handles falsy values and booleans natively for attributes, and introduces the `refTo` utility for component bindings.
- **Serializable Collections**: `@anchorlib/core` now natively implements serializable Map and Set data structures.
- **Scoped Indexing (`uIndex`)**: Added across all frameworks to safely generate unique indexes that are scoped to the current reactive or request context (via Async Context) without leaking globally.

```tsx [Context-Scoped Indexing]
import { setup, uIndex, $symbol } from '@anchorlib/react';

const PROFILE = $symbol('profile');

export const UserProfile = setup(() => {
  // Returns 1, 2, 3... scoped safely to the current component render instance
  // It will not leak globally across the module or other component instances
  const id1 = uIndex(PROFILE); 
  const id2 = uIndex(PROFILE); 
  
  return render(() => <div id={`profile-${id1}`} />);
});
```

## IRPC Lifecycle: Guards & Hooks

Building secure and predictable internal APIs is easier with the latest IRPC updates.

- **Request Validation (Guards)**: Added `Guards` to the IRPC execution pipeline. This allows you to run strict validation logic and intercept requests before they reach the main handlers.

```ts [IRPC Guards]
import { adminPackage } from './index.js';
import { GuardError, getContext } from '@irpclib/irpc';

// Register a guard on the package instance to protect an entire namespace
adminPackage.guard(async (req) => {
  const user = getContext('user');
  
  if (!user || user.role !== 'admin') {
    // Intercepts the request and throws a standardized rejection to the client
    throw GuardError.failed('Forbidden: Admin access required');
  }
});
```

- **Deferred Hooks**: Introduced `DeferredHook` in `@anchorlib/core` to enhance asynchronous lifecycle handling within IRPC.
- **Multi-Package Support**: IRPC now natively supports splitting routers and transports across multiple packages, allowing you to compose APIs seamlessly.

```ts [IRPC Packages & Transports]
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';
import { BroadcastTransport } from '@irpclib/broadcast';

export const api = createPackage({ name: 'api', version: '1.0.0' });
export const compute = createPackage({ name: 'compute', version: '1.0.0' });

// Cloud Server: for data access
api.use(new HTTPTransport({ endpoint: `/irpc/${api.href}` })); 

// Local Web Worker: for heavy offline processing
compute.use(new BroadcastTransport({ channel: compute.href })); 
```
- **File Transfers (`IRPCBlob`)**: Added native file upload and download support via `IRPCBlob`. Returning this object allows you to serve secure file references without immediately buffering massive file data.

```ts [IRPC Blob Handling]
import { irpc, IRPCBlob } from '@irpclib/irpc';

export const downloadReport = irpc.declare<() => Promise<IRPCBlob>>(
  'downloadReport', 
  async () => {
    // Return a secure file reference from the server
    return new IRPCBlob('https://s3.aws.com/secure-url', { type: 'application/pdf' });
  }
);
```
- **Improved Diagnostics**: Duplicate function registrations now emit a non-breaking diagnostic warning rather than throwing a fatal error.

## Get Started

Upgrade all your packages to **v1.2.21** to access these new features:

::: code-group

```sh [React]
bun add @anchorlib/core@1.2.21 @anchorlib/react@1.2.21 @anchorlib/router@1.2.21
```

```sh [SolidJS]
bun add @anchorlib/core@1.2.21 @anchorlib/solid@1.2.21 @anchorlib/router@1.2.21
```

:::

[GitHub](https://github.com/beerush-id/airstack) · [Documentation](https://airlib.dev) · [View Full Diff](https://github.com/beerush-id/airstack/compare/v1.2.0...v1.2.21)

## Full Changelog

### 🚀 Features

- *(docs)* Update AIR Form documentation and v1.2 release notes
- *(ssr)* Add serverless option and optimize asset resolution
- *(irpc)* Add IRPCBlob support for remote blob handling
- *(file)* Add abort support and blob decoding for file operations
- *(ssr)* Add support for optional app shell wrapping during SSR rendering
- *(ssr)* Add support for optional app shell component in SSR rendering
- *(ssr)* Add support for optional Shell component during SSR rendering
- *(irpc)* Add file upload/download and enhance adapter drivers
- *(irpc)* Add detailed documentation for CRUD, declarations, execution, and library authoring
- *(core)* Implement serializable map and set
- *(react)* Add refTo binding utility
- *(react)* Handle falsy values and boolean true for attributes
- *(irpc)* Introduce multi-package support for routers and transports
- *(router,ssr)* Introduce comprehensive sitemap generation and route iteration API
- *(router)* Add sitemap alternate links and hreflang support
- *(react)* Add portal rendering and dynamic children support with tests
- *(core)* Add `classx` and `stylex` utilities for conditional class and style management
- *(core, react, solid, svelte)* Update exports and refine `isValueGetter` logic
- *(core, solid, react)* Integrate `isValueGetter` into props logic and enhance tests
- *(core, solid, react, svelte)* Add `uIndex` utility for scoped unique indexing with tests
- *(react, solid)* Add support for request-scoped SSR environment
- *(irpc)* Enhance `dispatch` logic and improve stream handling
- *(irpc)* Replace duplicate function error with warning and improve diagnostics
- *(solid, react, vite-ssr)* Add WebSocket upgrade support and improve SSR worker flows
- *(core, solid, react)* Add default asset resolution and MIME type handling for SSR workers
- *(templates)* Add multi-runtime server entry points for SSR workers
- *(vite-ssr)* Add `removeIndexHtml` option and improve SSR worker handling
- *(router, core)* Add `DeferredHook` and enhance IRPC lifecycle handling
- *(irpc)* Add `Guards` to IRPC for request validation and enhance hook/guard lifecycle handling
- *(docs)* Add detailed guide on interceptors and lifecycle management in IRPC
- *(router, react)* Refine route rendering, enhance exception handling, and update displayName assignments
- *(ssr, core)* Enhance cookie handling and update URL usage in SSR renderer and worker
- *(worker)* Add `ignoreDotPath` option to exclude dot-prefixed paths from processing
- *(router)* Add `authenticated` getter to `Route` class for state access
- *(router)* Enforce authentication state checks and improve exception rendering
- *(router)* Add `fullMatch` prop to `Link` and improve Index route behavior
- *(router)* Add `fullMatch` prop to `Link` and improve strict navigation logic
- *(react)* Add `Snippet` component for fine-grained rendering control

### 🎨 Styling

- *(docs)* Update heading tags and css specificity in news and posts pages

### 💼 Other

- *(irpc)* Split IRPCAdapter into base and extended classes

### 🐛 Bug Fixes

- *(irpc)* Update IRPCReader initialization and state management for scheduled executions
- Bump all package versions to 1.2.9
- *(deps)* Bump @anchorlib/* dependencies to 1.2.9
- *(react)* Correctly order the context and content render sequence.
- Bump all package versions to 1.2.10
- *(react)* Critical context fixing by streamline context handling in HOCs
- Bump all package versions to 1.2.11
- *(vite-ssr)* Ensure async_hooks modules are marked as external in build config
- *(core)* Improve async hooks import and task scheduling behavior
- *(engine)* Unlink current state if registered and subscribed before delete

### 🚜 Refactor

- *(reactive)* Simplify derived ref observer creation
- *(irpc)* Rename and restructure adapter and driver for CRUD operations
- *(irpc)* Standardize id parameter types and enhance type safety
- *(docs)* Update examples to use IRPCCrudAdapter and IRPCCrudDriver
- *(ui)* Update setup return syntax
- *(core)* Improve browser detection and server-side import
- *(ssr)* Update irpc router instantiation
- *(vite-ssr)* Deprecate irpc module option
- *(core)* Centralize registries and async scope to module namespace
- *(tests)* Remove deprecated server imports and update to auto-detection warnings
- *(core)* Replace Symbol with $symbol for consistent global symbols
- *(core)* Preserve underlying object in recursive and non-recursive states
- *(solid, react)* Export `defaultAssetResolver` for broader utility in SSR workers
- *(templates)* Remove unused imports in `irpc-bun-starter` template
- *(tests)* Reformat mocks and standardize async function syntax in SSR worker tests
- *(solid, react)* Set default value for `WorkerOptions` in SSR worker functions
- *(irpc)* Improve resource cleanup and lifecycle handling
- *(irpc)* Update hook handling and improve type safety in router and tests
- *(irpc)* Reorganize guard and hook execution logic, update tests for consistency
- *(templates)* Replace `airSSR` with `airWorker` and simplify Vite plugin configs
- *(router)* Consolidate route rendering logic and enhance exception handling in `Shell`
- *(router)* Improve route activation flow and async handling
- *(async)* Standardize `awaited` usage and improve async handling

### 📚 Documentation

- *(posts)* Update forms tutorial with reactive state example
- *(skills)* Introduce air-form-react agent skill and update form engine documentation
- Add SolidJS skills and update installation commands
- *(material-css)* Add comprehensive documentation for AIR Material 3 CSS library
- *(material-css)* Remove components documentation pages
- *(getting-started)* Add air-material-css skill installation instructions
- *(air-stack)* Enhance library authoring and testing documentation
- *(air-material-css)* Prefix all utility classes with `air-`
- *(irpc)* Enhance specification with binary attachments and error taxonomy
- Update router instantiation examples
- *(seo)* Enhance sitemap integration guide
- *(router)* Update navigation and guards documentation with `fullMatch` and `authenticated` state
- *(router)* Expand authentication and SSR documentation, refine examples
- *(react)* Enhance `Snippet` documentation with inline and semantic usage examples

### 🧪 Testing

- *(router)* Stub global document in setup
- *(router)* Add sitemap test cases for various routing and configuration scenarios
- *(ssr)* Enhance SSR tests with async scope and reactive settings
- *(router)* Add assertions for defined `children` in route tests
- *(router)* Add authentication state validations and improve exception handling tests
- *(router)* Add assertion for `authenticated` state in route tests
- *(router)* Fix formatting in `Link` component tests
- *(router)* Add tests for `start` method and update activation logic
- *(react)* Add test for `Snippet` component using deferred data with destructured children
- *(react)* Expand `Snippet` tests with edge cases for data handling and error states

### ⚙️ Miscellaneous Tasks

- *(release)* Bump version to 1.2.1 across all packages
- *(release)* Bump version to 1.2.2 across all packages
- *(release)* Bump version to 1.2.3 across all packages
- *(release)* Bump version to 1.2.4 across all packages
- *(release)* Bump version to 1.2.5 across packages and demos
- *(version)* Bump version to 1.2.6 across all packages and demos
- Bump version to 1.2.7 across all packages
- Bump version to 1.2.8 across all packages
- Update template dependencies to 1.2.8
- *(release)* Bump versions to 1.2.12 across all packages
- *(release)* Bump versions to 1.2.13 across all packages
- *(release)* Bump versions to 1.2.14 across all packages
- *(scripts)* Update build script to include `irpclib` directory
- *(release)* Bump package versions to `1.2.15`
- *(templates)* Update compatibility date and add `nodejs_compat` flag in Wrangler configs
- *(release)* Bump package versions to `1.2.16`
- *(release)* Bump package versions to `1.2.17`
- *(release)* Bump package versions to `1.2.18`
- *(release)* Bump package versions to `1.2.19`
- *(release)* Bump package versions to `1.2.20`
- *(release)* Bump package versions to `1.2.21`
