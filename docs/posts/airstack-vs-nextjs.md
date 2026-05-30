---
title: 'AIR Stack vs. Next.js'
description: "'A comparison of full-stack React architectures. See how AIR Stack handles routing, data fetching, and rendering compared to the Next.js App Router.'"
sidebar: false
prev: false
next: false
---

# AIR Stack vs. Next.js

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`Next.js`** **`App Router`** **`AIR Stack`**

[Next.js](https://nextjs.org/) is the dominant React framework, bringing React Server Components (RSC), Server Actions, and file-system routing to the mainstream. It dictates a strict architecture where the server drives the initial UI and client-side boundaries (`"use client"`) must be explicitly declared.

**AIR Stack** (Anchor, IRPC, Router) takes a completely different path. It embraces Isomorphic pure functions, explicit programmatic routing, and a decoupled reactive state graph. It treats the UI as an independent reactive layer where state and data seamlessly connect to backend logic without fighting server/client boundaries.

## Framework comparison

While both aim to deliver a seamless full-stack developer experience, their approaches to the client-server boundary are fundamentally opposed.

| Aspect | Next.js App Router | AIR Stack |
|---|---|---|
| **Paradigm** | Server-Driven UI (RSC) | Separation of Concern (UI & Logic separate) |
| **Routing** | File-system based (directories as routes) | Programmatic (`createRouter()`) |
| **Data Fetching** | Server Components (`async` components) | Isomorphic Function call (IRPC) |
| **Mutations** | Server Actions (`"use server"`) | Isomorphic Function call (IRPC) |
| **State** | React Context + `useState` | Anchor State (`mutable()`) |

## Application Setup

Both frameworks require initializing an entry point, but they structure the relationship between the client and server very differently.

### Next.js Setup

In Next.js App Router, the file system dictates the application structure. You do not write a router instantiation, and you do not write a client entry point (`main.tsx`). The framework abstracts both the client hydration and the server execution behind its CLI.

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Welcome to Next.js</h1>
    </main>
  );
}
```

Next.js implicitly handles the React root hydration (`createRoot`), the client-side router configuration, and the server request handler. Because the framework owns the entry points (via `next dev`), it appears to have less boilerplate, but you completely surrender control of the application lifecycle to Next.js internals.

### AIR Stack Setup

AIR Stack separates the backend server execution from the frontend application graph. You explicitly define your route tree programmatically and bind it to the DOM.

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

By manually orchestrating the router, AIR Stack provides explicit control over the navigation graph, allowing you to compose routes freely without being constrained by the physical file system layout.

## Rendering Paradigms

Modern applications require different rendering strategies depending on the data. Both frameworks support Server-Side Rendering (SSR), Client-Side Rendering (CSR), and Hybrid approaches, but they use completely different mechanisms to achieve them.

### Pure Server-Side Rendering (SSR)
To fetch data on the server and render static HTML without client-side JavaScript overhead, Next.js uses Server Components, while AIR Stack blocks the router during navigation.

#### Next.js Server Components
Next.js achieves this naturally via Server Components. The server halts, waits for the database, and sends the finished HTML.

```tsx
// app/users/page.tsx
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.users.findMany();
  return (
    <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
  );
}
```

This tightly couples the backend request to the component lifecycle.

#### AIR Stack Providers
AIR Stack achieves this by blocking the router during navigation. If a provider returns a Promise, the router waits for it to resolve before rendering the page.

```typescript
// routes/users/route.ts
export const usersRoute = rootRoute
  .route('/users')
  .provide('users', () => getUsers()); 
```

```tsx
// routes/users/page.tsx
import { page } from '@anchorlib/react';
import { usersRoute } from './route.js';

export const UsersPage = page(usersRoute).render(({ state }) => (
  <ul>{state.data.users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
));
```

This moves the fetch to the router, keeping the component as a pure view layer.

### Pure Client-Side Rendering (CSR)
To fetch data entirely from the browser after the initial shell loads, Next.js requires explicit client boundaries, while AIR Stack just call function in components

#### Next.js Client Components
In Next.js, you must explicitly opt out of the server by creating a `"use client"` boundary and relying on standard React hooks.

```tsx
// app/users/page.tsx
'use client'
import { useState, useEffect } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState(null);
  
  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers);
  }, []);

  if (!users) return <div>Loading...</div>;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

The component must manually manage its own lifecycle, loading states, and network requests.

#### AIR Stack Component
In AIR Stack, you do not need `useEffect` or third-party fetching libraries. Every IRPC stub comes with sub-stub for UI bindings like `.once()` to track the loading state.

```tsx
// routes/users/page.tsx
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

The reactive reader returned by `.once()` manages the loading state and safely unwraps the data, completely eliminating the need for manual `useEffect` or local state.

### Hybrid Rendering
To optimize perceived performance, applications often combine SSR for the static layout with CSR for heavy, slow data. Next.js relies on server-side HTTP streaming, while AIR Stack using the same CSR pattern.

#### Next.js Streaming & Suspense
Next.js achieves this by streaming HTML. The server sends the layout immediately and leaves a placeholder (`<Suspense>`) for the slow component, streaming the chunk later.

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div>
      <header>Static Header</header>
      {children}
    </div>
  );
}
```

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { db } from '@/lib/db';

async function SalesWidget() {
  const data = await db.sales.getSlowData();
  return <div>{data.total}</div>;
}

async function AnalyticsWidget() {
  const data = await db.analytics.getSlowData();
  return <div>{data.visitors}</div>;
}

export default function DashboardPage() {
  return (
    <div className="grid">
      <Suspense fallback={<div className="skeleton">Loading sales...</div>}>
        <SalesWidget />
      </Suspense>
      
      <Suspense fallback={<div className="skeleton">Loading analytics...</div>}>
        <AnalyticsWidget />
      </Suspense>
    </div>
  );
}
```

Next.js relies heavily on server infrastructure and React's streaming capabilities to solve the Hybrid problem.

#### AIR Stack Component
AIR Stack doesn't have special treatment to handle this because page is just a component, and they renders anywhere (browser or server). We just need to move the data load to the component itself, so the router doesn't block the navigation.

```typescript
// routes/dashboard/route.ts
export const dashboardRoute = rootRoute.route('/dashboard');
```

```tsx
// routes/dashboard/page.tsx
import { page, render } from '@anchorlib/react';
import { dashboardRoute } from './route.js';
import { getSalesData, getAnalyticsData } from './function.js';

export const DashboardPage = page(dashboardRoute).render(() => {
  const sales = getSalesData.once();
  const analytics = getAnalyticsData.once();

  return render(() => (
    <div className="grid">
      {sales.status === 'pending' ? (
        <div className="skeleton">Loading sales...</div>
      ) : (
        <div>{sales.data.total}</div>
      )}

      {analytics.status === 'pending' ? (
        <div className="skeleton">Loading analytics...</div>
      ) : (
        <div>{analytics.data.visitors}</div>
      )}
    </div>
  ));
});
```

::: tip Bonus

Since IRPC batches multiple calls on the same tick, **sales** and **analytics** are dispatched in single HTTP Request. Each call streamed and resolve individually as they arrive, neither blocks the other, just pure data streaming.

:::

## Mutations and Forms

Sending data back to the server is traditionally done via API routes. Next.js introduced Server Actions to bridge this gap, while AIR Stack uses pure IRPC stubs.

### Next.js Server Actions

Server Actions allow you to define asynchronous functions on the server and call them directly from client components or form actions. To show a pending state (like disabling a submit button), you must use the `useFormStatus` hook, which *must* be rendered inside a separate child component.

```tsx
// app/actions.ts
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  await db.users.create({ name });
  
  // Tell Next.js to re-render pages displaying users
  revalidatePath('/users');
}
```

```tsx
// app/users/new/page.tsx
'use client'

import { useFormStatus } from 'react-dom';
import { createUser } from '../../actions';

function SubmitButton() {
  // Must be in a child component of the <form> to read context
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>Create User</button>;
}

export default function NewUserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <SubmitButton />
    </form>
  );
}
```

Next.js handles the API generation behind the scenes. Because the server holds the state (the HTML cache), you must manually tell the server which paths need to be rebuilt and re-fetched via `revalidatePath` after a mutation.

### AIR Stack IRPC Call

AIR Stack mutations are just standard IRPC function calls. They are invoked directly as async functions inside the client component graph.

```tsx
// client/pages/new-user.tsx
import { setup, render, mutable, $bind } from '@anchorlib/react';
import { createUser } from './function.js';

export const NewUserForm = setup((props) => {
  const newUser = createUser.later();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    newUser.dispatch(props.name);
  };

  return render(() => (
    <form onSubmit={submit}>
      <Input name="name" value={$bind(props, 'name')} required />
      <button type="submit" disabled={newUser.status === 'pending'}>Create User</button>
    </form>
  ));
});
```

Because `createUser` is just an IRPC stub, you can use the same reactive binding to the UI. There is no "mutation" and "fetch" concept, there is only "function call".

## Client State Management

When your app needs complex client-side state (like a multi-step form or a dark mode toggle), the frameworks handle reactivity differently.

### Next.js Client State

In Next.js, because components default to server-rendered, any interactive state requires you to explicitly opt into the client environment and use standard React hooks.

```tsx
// app/components/counter.tsx
'use client'

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

### AIR Stack State

In AIR Stack, there is no difference between state for server and client, it just a state, declared exactly the same way.

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

## Optimistic UI

Immediate feedback is critical for modern web apps. Both frameworks provide primitives to instantly update the UI before the server responds.

### Next.js useOptimistic

Next.js provides the `useOptimistic` hook. You pass it the true server state, and a reducer to calculate the temporary optimistic state. To trigger it properly, you must wrap the mutation in a React Transition.

```tsx
'use client'
import { useOptimistic, startTransition } from 'react';
import { likePost } from './actions';

export function LikeButton({ post }) {
  const [optimisticLike, addOptimisticLike] = useOptimistic(
    post.liked,
    (state, newLike) => newLike
  );

  const toggleLike = () => {
    // Must be wrapped in a transition to work properly
    startTransition(async () => {
      addOptimisticLike(!post.liked);
      await likePost(post.id);
    });
  };

  return (
    <button onClick={toggleLike}>
      {optimisticLike ? 'Unlike' : 'Like'}
    </button>
  );
}
```

### AIR Stack undoable

AIR Stack provides the `undoable()` primitive. You apply the mutation instantly to your actual reactive state, and it provides an `undo` function to rollback automatically if the network request fails.

```tsx
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

Because AIR Stack state is mutable, you don't need reducers or parallel "optimistic" variables. You literally change the data, and `undoable` reverses the exact mutation if things go wrong.

## Final thoughts

Next.js and AIR Stack solve the same problems using completely different paradigms.

**Choose Next.js if:** You want an opinionated framework built heavily around Server Components. You prefer file-system routing and are comfortable managing the explicit boundary between the server and the client.

**Choose AIR Stack if:** You prefer programmatic control over your application architecture. If you want a unified isomorphic environment where UI and backend logic are connected by a fine-grained reactive graph rather than explicit file boundaries, AIR Stack provides a cleaner, more predictable developer experience.
