---
title: 'AIR Stack: Overview'
description: 'The Zero-Boilerplate, AI-Native Stack. Full-stack TypeScript architecture with fine-grained reactivity, reactive network transport, and reactive routing.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Router
  - Zero Boilerplate
  - AI-Native
  - fine-grained reactivity
  - full-stack TypeScript
---

# AIR Stack: Overview

**Zero-Boilerplate, AI-Native Reactive Application Stack**

You want to build an app that is **highly reactive**, **performant**, and **maintainable**, you are forced to stitch together:

- A UI framework — **React**, **Solid**, **Vue**, **Svelte**.
- A state library — **Zustand**, **Redux**, **MobX**, **Pinia**.
- An API framework — **tRPC**, **Express**, **Hono**, **Elysia**.
- A caching layer — **React Query**, **SWR**, **Apollo**.
- A streaming transport — **Socket.io**, **ws**, **Ably**.
- A form library — **React Hook Form**, **Formik**.
- A validation library — **Zod**, **Yup**, **Joi**.
- A runtime — **Node**, **Bun**, **Deno**.
- A deployment target — **Vercel**, **Cloudflare**, **AWS**.

Each with its own **mental model**, its own **lifecycle**, and its own **failure modes**. And even then, you often end up sacrificing **maintainability** just to keep the **performance** intact.

::: tip What if:
**Building an application is just writing functions and calling them?**
:::

```ts
type GetUserFn = (id: string) => Promise<User | undefined>;
const getUser = irpc.declare<GetUserFn>('getUser');
```

```ts
irpc.construct(getUser, async (id) => {
  return await db.users.find(id);
});
```

::: code-group

```tsx [React]
const UserCard = setup((props) => {
  const user = getUser.once(props.id]);

  return (
    <div className="user-card">
      <Show when={() => user.status === 'pending'}>
        <span>Loading...</span>
      </Show>
      <Show when={() => user.status === 'success' && user.data}>
        {({ name }) => <h1>{name}</h1>}  
      </Show>
    </div>
  );
});
```

```tsx [Solid]
const UserCard = setup((props) => {
  const user = getUser.once(props.id]);

  return (
    <div class="user-card">
      <Show when={user.status === 'pending'}>
        <span>Loading...</span>
      </Show>
      <Show when={user.status === 'success' && user.data}>
        {({ name }) => <h1>{name}</h1>}
      </Show>
    </div>
  );
});
```

```ts [Provider]
profileRoute.provide('user', async ({ params }) => {
  return await getUser(params.id);
});
```

```ts [Anywhere]
const user = await getUser('1');
console.log(user);
```

:::

With AIR Stack, you don't need to install a million libraries to build an app that is **highly reactive**, **performant**, and **maintainable**—all **without making sacrifices**.

## IRPC: Reactive Network Abstraction

To use server data in the UI, you pick:

- **Express** — define routes, handlers, middleware, no type inference across the boundary.
- **Hono** — define routes, handlers, RPC mode still needs a separate caching layer.
- **Elysia** — end-to-end types, but still needs a separate caching and streaming layer.
- **tRPC** — define procedures and routers, still wire **React Query** for caching.
- **GraphQL** — write schemas, resolvers, run code generation for every change.
- **gRPC** — write protobuf definitions, generate client stubs, handle browser incompatibility.

Whichever you pick, you still:

- Wire a **caching** layer — **React Query**, **SWR**, **Apollo Client** — and manually track cache keys.
- Set up **streaming** — **Socket.io**, **ws**, **Ably**, **Pusher** — with its own connection lifecycle.
- Manage **loading**, **error**, and **success** states in every component.
- Configure **retry** and **deduplication** logic per query.
- Handle **serialization** and **error formatting** between server and client.
- Write the same **boilerplate** for every new endpoint — route, handler, validation, fetch wrapper, loading state.
- **Rename** a route — then hunt through every controller, every `fetch('/api/old-name')`, every `queryClient.invalidateQueries(['old-name'])` to update them.
- Keep server and client **types in sync** manually — or run **code generation** on every change.

::: tip What if:
**Using server data is just writing a function and calling it?**
:::

### Async Function

**Declare** the function signature:
```ts
type PriceFn = (ticker: string) => Promise<number>;
const getPrice = irpc.declare<PriceFn>('getPrice', () => 0);
```

**Construct** the function implementation:
```ts
irpc.construct(getPrice, async (ticker) => {
  return db.prices.find(ticker);
});
```

**Call** the function:
```ts
const price = await getPrice('AAPL');
```

### Streaming

Now look at streaming — a completely different problem that normally needs **WebSocket** servers, connection lifecycle, and reconnection logic:

**Declare** a streaming function:
```ts
type WatchPriceFn = (symbol: string) => RemoteState<Stock>;
const watchPrice = irpc.declare<WatchPriceFn>('watchPrice', () => ({
  symbol: '', price: 0,
}));
```

**Construct** the streaming handler:
```ts
irpc.construct(watchPrice, (symbol) => {
  return stream((state, resolve) => {
    state.data = { symbol, price: 50 }; // [!code highlight]

    const interval = setInterval(() => {
      state.data?.price += Math.random() * 2 - 1; // [!code highlight]
    }, 100);

    return () => clearInterval(interval);
  });
});
```

**Call** the streaming function and observe:

::: code-group

```tsx [React]
const StockCard = setup((props) => {
  const stock = watchPrice.with(() => [props.symbol]);

  return (
    <div className="stock-card">
      <Show when={() => stock.data}>
        {({ symbol, price }) => <h1>{symbol}: {price}</h1>}
      </Show>
    </div>
  );
});
```

```tsx [Solid]
const StockCard = setup((props) => {
  const stock = watchPrice.with(() => [props.symbol]);

  return (
    <div class="stock-card">
      <Show when={stock.data}>
        {({ symbol, price }) => <h1>{symbol}: {price}</h1>}
      </Show>
    </div>
  );
});
```

```tsx [Anywhere]
watchPrice('AAPL').subscribe((stock) => {
  console.log('Stock:', stock.data?.symbol, stock.data?.price);
});
```

:::

::: tip Isomorphic RPC
Same API. Two different worlds — one pattern. **Batching**, **caching**, **retry logic**, and **call coalescing** are built into the protocol.
:::

### Guards & Middlewares

Need to protect an endpoint? The IRPC pipeline supports strict **request validation (Guards)**. You can intercept requests and enforce authentication before they ever reach your main handlers.

### File Transfers & WebSockets

IRPC is not limited to simple JSON objects. You can seamlessly return secure file references for uploads and downloads using `IRPCBlob`, or spin up native **WebSocket** handlers side-by-side with your HTTP transports.

## Workflows: Promise-like Execution Pipelines

You want to build a reliable payment processor, an AI agent loop, or a complex background job. To handle it safely, you are forced to:

- Write massive, deeply nested **`try/catch`** blocks to handle intermediate failures.
- Manually pass **mutable state** from one asynchronous operation to the next.
- Wire bespoke **`if/else`** branching logic that makes the function impossible to read.

Whichever way you structure it, business logic is quickly **buried** under error handling, logging, and data validation.

::: tip What if:
Multi-step asynchronous logic was just a predictable, **Promise-like chaining?**
:::

**Define** the pipeline:
```ts
type ChatInput = {
  prompt: string
  model: 'gpt-4' | 'claude-3'
};

export const chatWorkflow = plan<ChatInput>()
  .then(async (input) => {
    const system = 'You are a helpful assistant.';
    return { ...input, system };
  })
  .switch('model', {
    'gpt-4': (resolve) => resolve((input) => openai.chat(input.prompt, input.system)),
    'claude-3': (resolve) => resolve((input) => anthropic.chat(input.prompt, input.system)),
  })
  .catch((error) => {
    console.error('AI Request failed!', error);
    return { text: 'An error occurred.', error: true };
  });
```

**Execute** the pipeline:
```ts
const response = await chatWorkflow({ 
  prompt: 'Hello!', 
  model: 'gpt-4' 
});

console.log(response.text);
```

Because the **Workflow API** is just JavaScript, you can **orchestrate complex logic anywhere** JavaScript runs—in the **browser**, **Bun**, **Deno**, **Node.js**, or **Cloudflare Workers**.

## Anchor: Reactive State Engine

To present data on the screen, you pick a UI library or framework:

- **React** — huge ecosystem, but you battle hook cascades, stale closures, and component re-renders.
- **Solid**, **Vue**, or **Svelte** — fine-grained reactivity without the re-render battles, but they each invent their own reactive primitives.

Whichever you pick, your state is still locked inside client code, and you still need to:

- Wire a separate **server state** library — **React Query**, **SWR**, or **Apollo** — to fetch and cache data.
- Wire a separate **global state** library — **Zustand**, **Redux**, **Pinia**, or **MobX** — to hold data outside components.
- Wire a separate **form state** library — **React Hook Form**, **Formik**, or **VeeValidate** — to manage inputs and validation.
- Write bridging logic and effects to keep all these fragmented state libraries in sync.
- Wrap your application in a nested tree of **Context** providers or **Stores** just to share state across components.
- Trace through multiple stores, caching layers, and subscription chains to debug why the UI is out of sync with the data.

::: tip What if:
**One library can do them all?**
:::

::: code-group

```tsx [React]
import { setup, Show } from '@anchorlib/react';
import { watchPrice } from './function.js';

const PriceCard = setup(() => {
  const stream = watchPrice.with(() => ['AAPL']);

  return (
    <div className="price-card">
      <h2>AAPL</h2>
      <Show when={() => stream.data}>
        {({ price }) => <span>${price.toFixed(2)} {stream.status === 'pending' ? '🟢' : '🛑'}</span>}
      </Show>
    </div>
  );
});
```

```tsx [Solid]
import { setup, Show } from '@anchorlib/solid';
import { watchPrice } from './function.js';

const PriceCard = setup(() => {
  const stream = watchPrice.with(() => ['AAPL']);

  return (
    <div class="price-card">
      <h2>AAPL</h2>
      <Show when={stream.data}>
        {({ price }) => <span>${price.toFixed(2)} {stream.status === 'pending' ? '🟢' : '🛑'}</span>}
      </Show>
    </div>
  );
});
```

:::

### Fine-Grained Reactivity

When you want to defer state reads without extracting UI into smaller components, use the `<Snippet>` component to create an inline reactive boundary. Fast updates are isolated automatically.

::: code-group

```tsx [React]
import { setup, Snippet } from '@anchorlib/react';

export const UserProfile = setup(() => {
  const state = mutable({ cpu: 45 });
  
  return (
    <div className="card">
      {/* Isolate fast updates while deferring the property read */}
      <Snippet data={state}>
        {({ cpu }) => <span>CPU: {cpu}%</span>}
      </Snippet>
    </div>
  );
});
```

```tsx [Solid]
import { setup, mutable } from '@anchorlib/solid';

export const UserProfile = setup(() => {
  const state = mutable({ cpu: 45 });
  
  return (
    <div class="card">
      {/* Solid natively isolates the update to this specific text node */}
      <span>CPU: {state.cpu}%</span>
    </div>
  );
});
```

:::

With Anchor, you stop wiring libraries together. Whether it's a **live data stream**, a **global user session**, or a **complex form**, it's just **reactive state**. One field changes, one fragment updates. Everything else stays still. You get **fine-grained updates**, **controlled write contracts**, and **schema validation** through Zod — all for free.

## Browser: Reactive DOM Primitives

Listening to global DOM events like pointer tracking, scrolling, or dragging usually requires manual lifecycle management to avoid memory leaks, especially during Server-Side Rendering (SSR).

::: tip What if:
**Handling browser events is just writing `if`?**
:::

::: code-group

```tsx [React]
import { setup, mutable, effect, Show } from '@anchorlib/react';
import { LIVE_SELECTION as selection, LIVE_KEYBOARD as key } from '@anchorlib/react/browser';

export const CopyCapture = setup(() => {
  const clip = mutable('');

  // Declarative event composition without manual listeners
  effect(() => {
    if (selection.text && key.is('ctrl', 'c')) {
      clip.value = selection.text;
      console.log('Text copied to clipboard...');
    }
  });

  return (
    <div className="copy-capture">
      <p>Select some text and press Ctrl+C anywhere on the page.</p>
      
      <Show when={() => clip.value}>
        {(text) => (
          <div className="clipboard-toast">
            Copied: {text}
          </div>
        )}
      </Show>
    </div>
  );
});
```

```tsx [Solid]
import { setup, mutable, effect, Show } from '@anchorlib/solid';
import { LIVE_SELECTION as selection, LIVE_KEYBOARD as key } from '@anchorlib/solid/browser';

export const CopyCapture = setup(() => {
  const clip = mutable('');

  // Declarative event composition without manual listeners
  effect(() => {
    if (selection.text && key.is('ctrl', 'c')) {
      clip.value = selection.text;
      console.log('Text copied to clipboard...');
    }
  });

  return (
    <div class="copy-capture">
      <p>Select some text and press Ctrl+C anywhere on the page.</p>
      
      <Show when={clip.value}>
        {(text) => (
          <div class="clipboard-toast">
            Copied: {text}
          </div>
        )}
      </Show>
    </div>
  );
});
```

:::

::: tip What's happening?
As you can see, handling multiple events is as natural as saying **If there is a text selected and the key ctrl+c is pressed**. Normally, this would require attaching `selectionchange` and `keydown` listeners to the document, manually checking `event.ctrlKey`, syncing the result to state, and crucially—remembering to call `removeEventListener` on unmount.
:::

With Anchor's browser primitives, you stop writing manual event listeners and cleanup functions. You can compose DOM events **globally**, **within a component**, or under **specific conditions**—the browser simply becomes another part of your reactive state graph.

- **`LIVE_CURSOR`** & **`cursorRef()`**: Track pointer coordinates and active buttons globally or within a specific container.
- **`LIVE_SCROLL`** & **`scrollRef()`**: Monitor scroll offsets and direction reactively without layout thrashing.
- **`LIVE_SELECTION`**: Capture multi-line text selection boundaries and extract precise SVG selection paths.
- **`LIVE_DND`**: Declarative drag-and-drop primitives with reactive drag coordinates and payloads.
- **`LIVE_MEDIA`** & **`LIVE_WINDOW`**: React to device media queries (dark mode, mobile, touch) and viewport dimensions.
- **`LIVE_KEYBOARD`** & **`LIVE_CLIPBOARD`**: Manage keyboard shortcuts and clipboard payloads asynchronously.

These utilities automatically defer listener registration until client hydration is complete, keeping your application SSR-safe.

## Router: Reactive Routing Engine

You have a page. You need it to always reflect the current state of your application.

Whether you use **React Router**, **Next.js**, **TanStack Router**, or **Solid Router**, routing is fundamentally driven by the URL. When a user navigates, the route fetches data and renders. But once the page is loaded, you still have to:

- Write **imperative redirects** inside component effects to kick the user out if their session expires.
- Manually trigger **data revalidation** when global state changes, or force a hard page refresh.
- Build nested trees of **Error Boundaries** and **Suspense components** just to catch loading and failure states.
- Coordinate **loading spinners** manually for every async transition across your component tree.
- Wire up separate **subscription tracking** just to keep the route's data in sync with live state.
- Scatter **guard logic** across middlewares, loaders, and component render functions.

::: tip What if:
**The route reacts to the state, not just the URL?**
:::

::: code-group

```tsx [React] {3,4,8}
export const userRoute = usersRoute.route('/:user_id')
  .guard(() => {
    if (!auth.isAuthenticated) {
      throw redirect(loginRoute);
    }
  })
  .provide('profile', async ({ params }) => {
    return await getUser(params.user_id);
  })
  .render((state) => (
    <div className="profile-view">
      <Show when={() => state.status === 'pending'}>
        <span>Loading...</span>
      </Show>
      <Show when={() => state.status === 'success' && state.data}>
        {({ profile }) => (
          <>
            <h1>{profile.name}</h1>
            <span>{profile.email}</span>
          </>
        )}
      </Show>
    </div>
  ));
```

```tsx [Solid] {3,4,8}
export const userRoute = usersRoute.route('/:user_id')
  .guard(() => {
    if (!auth.isAuthenticated) {
      throw redirect(loginRoute);
    }
  })
  .provide('profile', async ({ params }) => {
    return await getUser(params.user_id);
  })
  .render((state) => (
    <div class="profile-view">
      <Show when={state.status === 'pending'}>
        <span>Loading...</span>
      </Show>
      <Show when={state.status === 'success' && state.data}>
        {({ profile }) => (
          <>
            <h1>{profile.name}</h1>
            <span>{profile.email}</span>
          </>
        )}
      </Show>
    </div>
  ));
```

:::

With Anchor's router, navigation is just reactive state. **Guards** and **providers** automatically re-evaluate when their **dependencies change**. If `auth.isAuthenticated` becomes false while the user is sitting on the page, the guard instantly kicks them out. **Loading**, **error**, and **authorization** states are handled centrally. Everything is fully type-safe with zero code generation, and the exact same route definition works seamlessly in both React and Solid.

## Built-in SEO & Sitemaps

You want your application to be discoverable by search engines.

Whether you use React Router or Solid Router, client-side routers are traditionally blind to SEO. You are forced to:

- Hunt for third-party sitemap generator plugins.
- Write bespoke build scripts to crawl your own file system and generate XML files.
- Hardcode language alternates (`hreflang`) manually across every single page.
- Keep your sitemap script constantly in sync every time you rename or move a route.

::: tip What if:
**The routing engine generated your sitemap automatically out of the box?**
:::

::: code-group

```ts [Static Route]
// Static routes are included automatically. 
// You can pass an object to customize properties.
export const aboutRoute = rootRoute.route('/about', {
  sitemap: { priority: 0.8, changefreq: 'monthly' }
});
```

```ts [Dynamic Route]
export const postRoute = rootRoute.route('/blog/:slug', {
  // Dynamically generate entries using the route instance
  sitemap: async (route) => {
    const posts = await getPosts();
    return posts.map(p => ({
      loc: route.url({ slug: p.slug }), // MUST use route.url()
      lastmod: p.updatedAt
    }));
  }
});
```

:::

With Anchor, your router *is* your sitemap. Because the route tree is strongly typed and centrally defined, the SSR engine intercepts `/sitemap.xml` automatically. It deeply collects your static routes, executes your dynamic generators, and natively cross-links multi-lingual alternates (`<xhtml:link>`) across your entire app—all with **zero configuration**. You can also generate sitemaps programmatically for custom server setups.

## Asset Optimization & Caching

Serving images efficiently across multiple screen sizes is traditionally a complex task, requiring manual variant generation and tedious `srcset` markup. 

With the `airPages()` plugin and the universal `<Image>` component, responsive asset generation is completely automated from the build pipeline directly into your UI components.

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import { airPages } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [airPages()],
});
```

Then, seamlessly consume the generated assets in your UI:

::: code-group

```tsx [React]
import { Image } from '@anchorlib/react';
import heroImage from './assets/hero.jpg?asset' with { sizes: '350' };

export function Hero() {
  return (
    <Image from={heroImage} alt="Hero Banner" />
  );
}
```

```tsx [Solid]
import { Image } from '@anchorlib/solid';
import heroImage from './assets/hero.jpg?asset' with { sizes: '350' };

export function Hero() {
  return (
    <Image from={heroImage} alt="Hero Banner" />
  );
}
```

:::

In addition, the SSR environment provides a robust **asset resolver** with configurable **caching strategies**. You can easily define granular cache lifetimes per route or static asset directly within your `createApp` worker, providing maximum performance on edge environments like Cloudflare and Node.js.

## Server-Side Rendering

You want to render your application on the server for speed and SEO.

With modern meta-frameworks, moving client-side state to the server fractures your application. You still have to:

- Sprinkle **`'use client'`** and **`'use server'`** directives everywhere, fracturing your codebase across **arbitrary execution boundaries**.
- Lose access to **reactive hooks** on the server because traditional **server components** are strictly static.
- Manually parse request cookies, track mutations during render, and manually reconstruct `Set-Cookie` headers.

::: tip What if:
**The server just isolates the request and runs the exact same code?**
:::

::: code-group

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import { airPages } from '@anchorlib/vite-ssr';

export default defineConfig({
  plugins: [airPages()],
});
```

```tsx [React (worker.ts)]
import { createApp } from '@anchorlib/react/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { httpTransport } from './irpc.js';
import App from './app.js';
import router from './router.js';

// The backend IRPC router
const irpcRouter = new HTTPRouter(httpTransport);

// A single universal worker handles SSR and IRPC with shared context isolation!
export default createApp(router, App, { httpRouter: irpcRouter });
```

```tsx [Solid (worker.ts)]
import { createApp } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { httpTransport } from './irpc.js';
import App from './app.js';
import router from './router.js';

// The backend IRPC router
const irpcRouter = new HTTPRouter(httpTransport);

// A single universal worker handles SSR and IRPC with shared context isolation!
export default createApp(router, App, { httpRouter: irpcRouter });
```

:::

With Anchor, state is automatically scoped to the request lifecycle. There are no **`'use client'` directives**, no **arbitrary server boundaries**, and full access to **reactive states** on the server. The reactive graph serializes itself, **cookie mutations are automatically tracked**, and client hydration automatically rebuilds the state by simply re-activating the router. Because it relies purely on standard Web APIs, the exact same code deploys seamlessly to **Bun**, **Node.js**, **Cloudflare Workers**, and **Deno**.

## Portability

| Layer | Package | Depends on |
|---|---|---|
| Data types | Plain TypeScript | Nothing |
| State & logic | `@anchorlib/core` | Nothing |
| IRPC | `@irpclib/irpc` | `@anchorlib/core` |
| Route definitions | `@anchorlib/router` | `@anchorlib/core` |
| View integration | `@anchorlib/react` or `@anchorlib/solid` | `@anchorlib/core` & Framework |

Because every layer of the architecture ultimately depends purely on **`@anchorlib/core`**, your business logic, routing, and remote procedures are completely decoupled from the UI. Switching view frameworks or deployment runtimes changes only the view layer.

## Next Steps

- [Installation](/installation) — Add AIR Stack to your project
- [Getting Started](/getting-started) — Build your first application
- [Anchor for React](/react/getting-started) — React integration
- [Anchor for Solid](/solid/getting-started) — Solid integration
- [Router](/react/router/) — Routing, guards, and data loading
- [IRPC](/irpc/) — Remote procedure calls, streaming, and transports
