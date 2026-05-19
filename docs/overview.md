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
type GetUserFn = (id: string) => Promise<User>;
const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
```

```ts
irpc.construct(getUser, async (id) => {
  return db.users.find(id);
});
```

::: code-group

```ts [Anywhere]
const user = await getUser('1');
console.log(user);
```

```ts [Provider]
profileRoute.provide('user', ({ params }) => {
  return getUser(params.id);
});
```

```tsx [React]
const UserCard = setup((props) => {
  const user = getUser.once(props.id]);

  return render(() => (
    <div>
      <Show when={() => user.status === 'pendin'}>
        <span>Loading...</span>
      </Show>
      <h1>{user.data?.name}</h1>
    </div>
  ));
});
```

```tsx [Solid]
const UserCard = setup((props) => {
  const user = getUser.once(props.id]);

  return (
    <div>
      <Show when={user.status === 'pendin'}>
        <span>Loading...</span>
      </Show>
      <h1>{user.data?.name}</h1>
    </div>
  );
});
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
const getPrice = irpc.declare<PriceFn>({ name: 'getPrice' });
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
const watchPrice = irpc.declare<WatchPriceFn>({
  name: 'watchPrice',
  init: () => ({ symbol: '', price: 0 }),
});
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

  return render(() => (
    <div>
      <h1>{stock.data?.symbol}: {stock.data?.price}</h1>
    </div>
  ));
});
```

```tsx [Solid]
const StockCard = setup((props) => {
  const stock = watchPrice.with(() => [props.symbol]);

  return (
    <div>
      <h1>{stock.data?.symbol}: {stock.data?.price}</h1>
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
import { setup, snippet } from '@anchorlib/react';
import { watchPrice } from './function.js';

const PriceCard = setup(() => {
  const stream = watchPrice.with(() => ['AAPL']);

  return render(() => (
    <div>
      <h2>AAPL</h2>
      <span>${stream.data?.price.toFixed(2)} {stream.status === 'pending' ? '🟢' : '🛑'}</span>
    </div>
  ));
});
```

```tsx [Solid]
import { setup } from '@anchorlib/solid';
import { watchPrice } from './function.js';

const PriceCard = setup(() => {
  const stream = watchPrice.with(() => ['AAPL']);

  return (
    <div>
      <h2>AAPL</h2>
      <span>${stream.data?.price.toFixed(2)} {stream.status === 'pending' ? '🟢' : '🛑'}</span>
    </div>
  );
});
```

:::

With Anchor, you stop wiring libraries together. Whether it's a **live data stream**, a **global user session**, or a **complex form**, it's just **reactive state**. One field changes, one fragment updates. Everything else stays still. You get **fine-grained updates**, **controlled write contracts**, and **schema validation** through Zod — all for free.

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
      <h1>{state.data?.profile.name}</h1>
      <span>{state.data?.profile.email}</span>
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
      <h1>{state.data?.profile.name}</h1>
      <span>{state.data?.profile.email}</span>
    </div>
  ));
```

:::

With Anchor's router, navigation is just reactive state. **Guards** and **providers** automatically re-evaluate when their **dependencies change**. If `auth.isAuthenticated` becomes false while the user is sitting on the page, the guard instantly kicks them out. **Loading**, **error**, and **authorization** states are handled centrally. Everything is fully type-safe with zero code generation, and the exact same route definition works seamlessly in both React and Solid.

## Server-Side Rendering

You want to render your application on the server for speed and SEO.

With modern meta-frameworks, moving client-side state to the server fractures your application. You still have to:

- Sprinkle **`'use client'`** and **`'use server'`** directives everywhere, fracturing your codebase across **arbitrary execution boundaries**.
- Lose access to **reactive hooks** on the server because traditional **server components** are strictly static.
- Manually parse request cookies, track mutations during render, and manually reconstruct `Set-Cookie` headers.

::: tip What if:
**The server just creates a scope and runs the exact same code?**
:::

::: code-group

```tsx [React] {6,8,14,18}
export async function render(url: string, cookie = '') {
  let html = '';
  let cookies: string[] = [];

  // 1. Create a completely isolated reactive scope for this request
  await withIsolation(async () => {
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    const ssr = createLifecycle();
    
    await ssr.runAsync(async () => {
      await router.activate(url);
      html = renderToString(<UIRouter router={router} root={RootLayout} url={url} />);
      router.cleanup();
    });

    cookies = jar.encode();
    ssr.destroy();
  });

  return { html, cookies };
}
```

```tsx [Solid] {6,8,14,18}
export async function render(url: string, cookie = '') {
  let html = '';
  let cookies: string[] = [];

  // 1. Create a completely isolated reactive scope for this request
  await withIsolation(async () => {
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    const ssr = createLifecycle();
    
    await ssr.runAsync(async () => {
      await router.activate(url);
      html = renderToString(() => <UIRouter router={router} root={RootLayout} url={url} />);
      router.cleanup();
    });

    cookies = jar.encode();
    ssr.destroy();
  });

  return { html, cookies };
}
```

:::

With Anchor, state is automatically scoped to the request lifecycle. There are no **`'use client'` directives**, no **arbitrary server boundaries**, and full access to **reactive hooks** on the server. The reactive graph serializes itself, **cookie mutations are automatically tracked**, and client hydration automatically rebuilds the state by simply re-activating the router. Because it relies purely on standard Web APIs, the exact same code deploys seamlessly to **Bun**, **Node.js**, **Cloudflare Workers**, and **Deno**.

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
