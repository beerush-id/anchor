---
title: 'AIR Stack vs. TanStack'
description: "Analyzing client-side routing and state. See how AIR Stack's unified router and RPC compares against assembling TanStack Router and Query."
sidebar: false
prev: false
next: false
---

# AIR Stack vs. TanStack

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`TanStack`** **`AIR Stack`**

[TanStack](https://tanstack.com/) is a collection of high-quality, headless utilities. To build a full-stack React application, developers typically assemble **TanStack Router** (for type-safe routing) and **TanStack Query** (for data fetching and caching), manually wiring them to a backend API (like tRPC or standard REST).

**AIR Stack** (Anchor, IRPC, Router) takes a unified approach. Rather than assembling disparate libraries to handle routing, fetching, and state, it provides a cohesive ecosystem. The router and data fetching layer share the same reactive state graph, eliminating the need for complex query caching strategies or explicit network boundaries.

## Framework comparison

Both aim to achieve the same outcome: building highly interactive, type-safe Single Page Applications (SPAs). However, their approaches to composition and state are fundamentally different.

| Aspect | TanStack (Router + Query) | AIR Stack |
|---|---|---|
| **Paradigm** | Assembled Utilities (Modular libraries) | Unified Ecosystem (Pure Functions & Reactive Graph) |
| **Routing** | File-based or Code-based (`createRouter`) | Programmatic (`createRouter()`) |
| **Data Fetching** | `useQuery` + Network Fetcher | Isomorphic Function call (IRPC) |
| **Mutations** | `useMutation` + Network Fetcher | Isomorphic Function call (IRPC) |
| **State** | Query Cache + Local State (`useState`) | Anchor State (`mutable()`) |

## Application Setup

Both frameworks operate heavily on the client side, requiring explicit configuration for routers and context providers.

### TanStack Setup

In TanStack, you must configure the router and explicitly wrap your application in multiple providers to enable routing and query caching.

```tsx
// router.tsx
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

You are responsible for wiring the query client into the router context so data can be fetched during navigation, and you rely on a CLI for type-safe route generation.

### AIR Stack Setup

AIR Stack unifies the router and the reactivity graph. You explicitly define your route tree and bind it to the DOM, with no need for separate query caches or CLI generators.

```tsx
// routes/route.ts
import { createRouter } from '@anchorlib/react';

export const router = createRouter();
export const rootRoute = router.route();
```

```tsx
// routes/layout.tsx
import { page } from '@anchorlib/react';
import { rootRoute } from './route.js';

export const RootLayout = page(rootRoute).render(({ children }) => (
  <main>
    <h1>Welcome to AIR Stack</h1>
    {children}
  </main>
));
```

```tsx
// client.tsx
import '@anchorlib/react/client';
import { UIRouter } from '@anchorlib/react';
import { hydrateRoot } from 'react-dom/client';
import { router } from './routes/route.js';
import { RootLayout } from './routes/layout.js';

router.activate(window.location.href).then(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <UIRouter router={router} root={RootLayout} headless={true} resetScroll />
  );
});
```

Because routing and reactivity are handled by the same underlying engine, there are no nested providers or external caches to orchestrate.

## Rendering Paradigms

Both TanStack and AIR Stack support full-stack rendering, but they differ in how they hydrate the client and share data.

### Server-Side Rendering (SSR)

When rendering on the server, you need to fetch data before sending HTML to the client.

#### TanStack SSR

In TanStack Router, you define a `loader` that runs before the route renders. When using SSR with TanStack Query, you typically use `queryClient.ensureQueryData` to fetch the data on the server, then dehydrate the cache to the client.

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

const usersQuery = queryOptions({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then((r) => r.json()),
});

export const Route = createFileRoute('/users')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(usersQuery),
  component: UsersPage,
});

function UsersPage() {
  const { data } = useSuspenseQuery(usersQuery);

  return (
    <ul>
      {data.map((u) => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

This ensures the cache is hydrated on the client, preventing a double fetch.

#### AIR Stack Providers

AIR Stack blocks the router during navigation if a provider returns a Promise. The router waits for it to resolve before rendering the page, sending the state to the client seamlessly.

```typescript
export const usersRoute = rootRoute
  .route('/users')
  .provide('users', () => getUsers()); 
```

```tsx
import { page } from '@anchorlib/react';
import { usersRoute } from './route.js';

export const UsersPage = page(usersRoute).render(({ state }) => (
  <ul>
    {state.data.users.map((u) => (
      <li key={u.id}>{u.name}</li>
    ))}
  </ul>
));
```

This moves the fetch to the router, keeping the component as a pure view layer.

### Pure Client-Side Rendering (CSR)

Sometimes you need to fetch data entirely from the browser.

#### TanStack `useQuery`

In TanStack, you use the standard `useQuery` hook inside the component for client-side fetching.

```tsx
import { useQuery } from '@tanstack/react-query';

export function UsersPage() {
  const { data, isLoading } = useQuery(usersQuery);

  if (isLoading) return <div>Loading...</div>;

  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

#### AIR Stack Component

In AIR Stack, you just call the function directly in the component.

```tsx
import { setup, render } from '@anchorlib/react';
import { getUsers } from './function.js';

export const UsersPage = setup(() => {
  const users = getUsers.once();

  return render(() => {
    if (users.status === 'pending') return <div>Loading...</div>;
    return <ul>{users.data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
  });
});
```

There are no cache keys to manually invalidate or network endpoints to write. IRPC handles the serialization, and the component simply reads the resolved state.

### Hybrid Rendering

To optimize perceived performance, applications often combine SSR for the static layout with CSR for heavy, slow data. Both frameworks allow you to render the shell immediately and stream data to the client.

#### TanStack `defer` & Suspense

In TanStack Router, you return a deferred promise from your loader, and the server leaves a `<Suspense>` placeholder for the slow data.

```tsx
import { defer, Await } from '@tanstack/react-router';
import { Suspense } from 'react';

export const Route = createFileRoute('/dashboard')({
  loader: () => {
    const slowSales = fetch('/api/sales').then((r) => r.json());
    return {
      sales: defer(slowSales),
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { sales } = Route.useLoaderData();

  return (
    <div className="grid">
      <header>Dashboard</header>
      
      <Suspense fallback={<div className="skeleton">Loading sales...</div>}>
        <Await promise={sales}>
          {(data) => <div>{data.total}</div>}
        </Await>
      </Suspense>
    </div>
  );
}
```

TanStack leverages React's `<Suspense>` and streaming SSR to solve the Hybrid problem.

#### AIR Stack Component

AIR Stack doesn't have special treatment to handle this because a page is just a component, and it renders anywhere (browser or server). We just need to move the data load to the component itself, so the router doesn't block the navigation.

```tsx
import { page, render } from '@anchorlib/react';
import { dashboardRoute } from './route.js';
import { getSalesData } from './function.js';

export const DashboardPage = page(dashboardRoute).render(() => {
  const sales = getSalesData.once();

  return render(() => (
    <div className="grid">
      <header>Dashboard</header>
      
      {sales.status === 'pending' ? (
        <div className="skeleton">Loading sales...</div>
      ) : (
        <div>{sales.data.total}</div>
      )}
    </div>
  ));
});
```

::: tip Bonus

Since IRPC batches multiple calls on the same tick, if you call multiple functions (e.g., sales and analytics), they are dispatched in a single HTTP Request. Each call is streamed and resolves individually as they arrive, neither blocks the other, just pure data streaming.

:::

## Mutations and Forms

When sending data to the server, TanStack Query provides `useMutation`, while AIR Stack relies on direct IRPC calls.

### TanStack `useMutation`

TanStack handles mutations via the `useMutation` hook. Because the data is cached by query keys, you must manually invalidate those keys after a successful mutation to ensure the UI stays in sync.

```tsx
// components/new-user.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function NewUserForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: (newName: string) => fetch('/api/users', { 
      method: 'POST', body: JSON.stringify({ name: newName }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate(name);
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Create User'}
      </button>
    </form>
  );
}
```

The disconnect between the mutation logic and the cached query requires manual orchestration via the `QueryClient`.

### AIR Stack IRPC Call

In AIR Stack, calling an IRPC function is no different than calling a local async function. You just pass your rich JavaScript objects directly to the backend function.

```tsx
// client/pages/new-user.tsx
import { setup, render, $bind } from '@anchorlib/react';
import { createUser } from './function.js';

export const NewUserForm = setup((props) => {
  const newUser = createUser.later();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await newUser.dispatch(props.name);
  };

  return render(() => (
    <form onSubmit={submit}>
      <Input name="name" value={$bind(props, 'name')} required />
      <button type="submit" disabled={newUser.status === 'pending'}>
        {newUser.status === 'pending' ? 'Saving...' : 'Create User'}
      </button>
    </form>
  ));
});
```

Because `createUser` is an IRPC stub, you get end-to-end type safety automatically. There is no external cache to manually invalidate; if the state is reactive, it updates seamlessly.

## Client State Management

When managing complex interactive state alongside server data, TanStack and AIR Stack handle reactivity differently.

### TanStack State

In TanStack, server state lives in the Query Cache, while local UI state is managed via React hooks (`useState`, `useReducer`) or external libraries (Zustand, Redux). 

```tsx
// components/counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

This creates a duality where developers must actively decide if a piece of state belongs in the server cache or the local client store.

### AIR Stack State

In AIR Stack, Anchor provides a built-in decoupled reactive state graph. There is no difference between global state, local state, or server state—it is just reactive data.

```tsx
// client/components/counter.tsx
import { setup, render, mutable } from '@anchorlib/react';

export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  return render(() => (
    <button onClick={() => state.count++}>
      Clicked {state.count} times
    </button>
  ));
});
```

Because `mutable` state is just a reactive proxy, you can mutate it directly. There is no difference between local vs global state, where it is declared is the scope of the state.

## Optimistic UI

Immediate feedback is critical. Both frameworks allow you to optimistically update the UI before the network responds.

### TanStack `onMutate`

In TanStack Query, you achieve optimistic UI by hooking into the `onMutate` callback. You must manually cancel inflight queries, snapshot the previous state, update the cache synchronously, and provide an `onError` handler to roll it back.

```tsx
// components/like-button.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function LikeButton({ post }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/posts/${id}/like`, { method: 'POST' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts', id] });
      
      const previousPost = queryClient.getQueryData(['posts', id]);
      
      queryClient.setQueryData(['posts', id], (old: any) => ({
        ...old,
        liked: !old.liked,
      }));
      
      return { previousPost };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['posts', id], context?.previousPost);
    },
  });

  return (
    <button onClick={() => mutation.mutate(post.id)}>
      {post.liked ? 'Unlike' : 'Like'}
    </button>
  );
}
```

This process is robust but highly verbose, requiring you to manually orchestrate the rollback logic and cache manipulation.

### AIR Stack `undoable`

AIR Stack provides the `undoable()` primitive. You apply the change instantly to your actual reactive state, and it automatically rolls back if the network request fails.

```tsx
// client/components/like-button.tsx
import { setup, render, undoable } from '@anchorlib/react';
import { likePost } from './function.js';

export const LikeButton = setup<{ post: any }>((props) => {
  const toggleLike = async () => {
    const [undo, settled] = undoable(() => {
      props.post.liked = !props.post.liked;
    });

    await likePost(props.post.id).then(settled, undo);
  };

  return render(() => (
    <button onClick={toggleLike}>
      {props.post.liked ? 'Unlike' : 'Like'}
    </button>
  ));
});
```

Because AIR Stack state is mutable, you literally change the data in place, and `undoable` reverses the exact change if the server rejects it. No snapshots or manual cache orchestration required.

## Final thoughts

TanStack and AIR Stack both provide excellent tools for building SPAs, but they approach the problem from different angles.

**Choose TanStack if:** You prefer assembling your stack from modular, headless utilities. If you are building around standard REST or GraphQL APIs and need granular control over cache lifetimes and query invalidation, TanStack Query is unmatched.

**Choose AIR Stack if:** You prefer a unified ecosystem over assembled utilities. If you want a fine-grained reactive graph where routing, data fetching, and local state share the exact same reactive engine and type-safe function calls, AIR Stack provides a cleaner, more predictable developer experience.
