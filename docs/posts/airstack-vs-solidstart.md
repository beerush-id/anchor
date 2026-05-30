---
title: 'AIR Stack vs. SolidStart'
description: "A comparison of fine-grained reactive frameworks. See how AIR Stack's isomorphic functions differ from SolidStart's server actions and resources."
sidebar: false
prev: false
next: false
---

# AIR Stack vs. SolidStart

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`SolidStart`** **`AIR Stack`**

[SolidStart](https://start.solidjs.com/) is the official meta-framework for SolidJS. It leverages Solid's incredibly fast, fine-grained reactivity (Signals) and extends it to the server using Server Functions (`"use server"`), `createResource`, and file-system routing.

**AIR Stack** (Anchor, IRPC, Router) shares a nearly identical philosophy when it comes to performance: both bypass traditional Virtual DOM diffing in favor of direct, fine-grained DOM updates. However, while SolidStart's reactivity and routing are strictly bound to SolidJS, AIR Stack's reactive graph (Anchor) and Isomorphic RPC are entirely framework-agnostic. AIR Stack brings Solid-like performance to any framework (including React).

## Framework comparison

Both frameworks are designed to eliminate unnecessary re-renders using reactive primitives, but they structure their full-stack communication differently.

| Aspect | SolidStart | AIR Stack |
|---|---|---|
| **Paradigm** | Framework-bound Signals | Framework-agnostic Reactive Graph |
| **Routing** | File-based (Solid Router) | Programmatic (`createRouter()`) |
| **Data Fetching** | `createResource` + Server Functions | Isomorphic Function call (IRPC) |
| **Mutations** | Server Actions (`"use server"`) | Isomorphic Function call (IRPC) |
| **State** | Signals (`createSignal`) | Anchor State (`mutable()`) |

## Application Setup

Both frameworks use a root entry point to configure routing and hydration.

### SolidStart Setup

SolidStart relies on file-system routing and the `<FileRoutes>` component to automatically map your file structure to the browser.

```tsx
import { Suspense } from 'solid-js';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';

export default function App() {
  return (
    <Router root={(props) => (
      <main>
        <h1>Welcome to SolidStart</h1>
        <Suspense fallback={<div>Loading...</div>}>
          {props.children}
        </Suspense>
      </main>
    )}>
      <FileRoutes />
    </Router>
  );
}
```

The routing is coupled directly to the file system and relies heavily on `<Suspense>` to handle asynchronous boundaries.

### AIR Stack Setup

AIR Stack uses explicit, programmatic routing. You define your route graph and pass it to the UI Router. Because AIR Stack is framework-agnostic, the exact same router code works across React, Solid, and Vue.

```tsx
import { createRouter } from '@anchorlib/solid';

export const router = createRouter();
export const rootRoute = router.route();
```

```tsx
import { page } from '@anchorlib/solid';
import { rootRoute } from './route.js';

export const RootLayout = page(rootRoute).render(({ children }) => (
  <main>
    <h1>Welcome to AIR Stack</h1>
    {children}
  </main>
));
```

```tsx
import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './routes/route.js';
import { RootLayout } from './routes/layout.js';

router.activate(window.location.href).then(() => {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  render(() => <UIRouter router={router} root={RootLayout} headless={true} resetScroll />, root);
});
```

Because routing and reactivity are decoupled from the UI framework, you define the architecture purely in TypeScript, and the UI layer simply consumes it.

## Rendering Paradigms

Both SolidStart and AIR Stack handle Server-Side Rendering (SSR) and Client-Side Rendering (CSR), but they fetch data differently.

### Server-Side Rendering (SSR)

When rendering on the server, you need to block the initial HTML response until the data is ready.

#### SolidStart `createResource`

In SolidStart, you fetch data using `cache` and `createResource`. The router automatically waits for resources to resolve before streaming the HTML.

```tsx
import { cache, createResource, Suspense } from "@solidjs/router";
import { For } from "solid-js";

const getUsers = cache(async () => {
  const res = await fetch('/api/users');
  return res.json();
}, "users");

export default function UsersPage() {
  const [users] = createResource(getUsers);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ul>
        <For each={users()}>{(u) => <li>{u.name}</li>}</For>
      </ul>
    </Suspense>
  );
}
```

This ensures the data is dehydrated and sent to the client without a double fetch.

#### AIR Stack Providers

AIR Stack blocks the router during navigation if a provider returns a Promise. The router waits for it to resolve before rendering the page.

```typescript
export const usersRoute = rootRoute
  .route('/users')
  .provide('users', () => getUsers()); 
```

```tsx
import { page } from '@anchorlib/solid';
import { For } from 'solid-js';
import { usersRoute } from './route.js';

export const UsersPage = page(usersRoute).render(({ state }) => (
  <ul>
    <For each={state.data.users}>{(u) => <li>{u.name}</li>}</For>
  </ul>
));
```

This moves the fetch to the router, keeping the component as a pure view layer.

### Pure Client-Side Rendering (CSR)

Sometimes you need to fetch data entirely from the browser after the initial shell loads.

#### SolidStart `createResource`

In SolidStart, `createResource` is still used, but the request happens in the browser.

```tsx
import { createResource, Suspense, For } from "solid-js";

async function fetchUsers() {
  const res = await fetch('/api/users');
  return res.json();
}

export default function UsersPage() {
  const [users] = createResource(fetchUsers);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ul>
        <For each={users()}>{(u) => <li>{u.name}</li>}</For>
      </ul>
    </Suspense>
  );
}
```

#### AIR Stack Component

In AIR Stack, you just call the function directly in the component.

```tsx
import { setup } from '@anchorlib/solid';
import { For, Show } from 'solid-js';
import { getUsers } from './function.js';

export const UsersPage = setup(() => {
  const users = getUsers.once();

  return () => (
    <Show when={users.status !== 'pending'} fallback={<div>Loading...</div>}>
      <ul>
        <For each={users.data}>{(u) => <li>{u.name}</li>}</For>
      </ul>
    </Show>
  );
});
```

IRPC handles the serialization, and the component simply reads the resolved state.

## Mutations and Forms

When sending data to the server, SolidStart relies on Server Actions, while AIR Stack relies on direct IRPC calls.

### SolidStart Actions

SolidStart uses the `"use server"` pragma to turn a function into a network endpoint. You can dispatch it using an HTML `<form>` or via the `action` primitive.

```tsx
import { action, useSubmission } from "@solidjs/router";

const createUser = action(async (formData: FormData) => {
  "use server";
  const name = formData.get("name") as string;
});

export default function NewUserForm() {
  const submission = useSubmission(createUser);

  return (
    <form action={createUser} method="post">
      <input name="name" required />
      <button type="submit" disabled={submission.pending}>
        {submission.pending ? 'Saving...' : 'Create User'}
      </button>
    </form>
  );
}
```

This explicitly ties the mutation to the router's lifecycle and standard HTTP form semantics.

### AIR Stack IRPC Call

In AIR Stack, calling an IRPC function is no different than calling a local async function. You just pass your rich JavaScript objects directly to the backend function.

```tsx
import { setup, $bind } from '@anchorlib/solid';
import { createUser } from './function.js';

export const NewUserForm = setup((props) => {
  const newUser = createUser.later();

  const submit = async (e: Event) => {
    e.preventDefault();
    await newUser.dispatch(props.name);
  };

  return () => (
    <form onSubmit={submit}>
      <Input name="name" value={$bind(props, 'name')} required />
      <button type="submit" disabled={newUser.status === 'pending'}>
        {newUser.status === 'pending' ? 'Saving...' : 'Create User'}
      </button>
    </form>
  );
});
```

Because `createUser` is an IRPC stub, you get end-to-end type safety automatically.

## Client State Management

Both frameworks excel at fine-grained reactivity.

### SolidJS Signals

Solid uses `createSignal`. It creates a getter and a setter. When the setter is called, Solid surgically updates the DOM nodes bound to the getter.

```tsx
import { createSignal } from 'solid-js';

export function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button onClick={() => setCount(count() + 1)}>
      Clicked {count()} times
    </button>
  );
}
```

### AIR Stack State

In AIR Stack, Anchor provides a decoupled reactive proxy graph (`mutable`). You don't need a getter or setter function; you mutate the object directly.

```tsx
import { setup, mutable } from '@anchorlib/solid';

export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  return () => (
    <button onClick={() => state.count++}>
      Clicked {state.count} times
    </button>
  );
});
```

Because `mutable` state is just a reactive proxy, you can mutate it directly. There is no difference between local vs global state, where it is declared is the scope of the state.

## Optimistic UI

Immediate feedback is critical. Both frameworks allow you to optimistically update the UI before the network responds.

### SolidStart Actions

In SolidStart, you typically read from the `submission` state inside the component to overlay optimistic values while the action is inflight.

```tsx
import { action, useSubmission } from "@solidjs/router";

const likePost = action(async (formData: FormData) => {
  "use server";
});

export default function LikeButton(props: { post: any }) {
  const submission = useSubmission(likePost);
  
  const isOptimisticallyLiked = () => {
    if (submission.pending) return !props.post.liked;
    return props.post.liked;
  };

  return (
    <form action={likePost} method="post">
      <input type="hidden" name="id" value={props.post.id} />
      <button type="submit">
        {isOptimisticallyLiked() ? 'Unlike' : 'Like'}
      </button>
    </form>
  );
}
```

### AIR Stack `undoable`

AIR Stack provides the `undoable()` primitive. You apply the change instantly to your actual reactive state, and it automatically rolls back if the network request fails.

```tsx
import { setup, undoable } from '@anchorlib/solid';
import { likePost } from './function.js';

export const LikeButton = setup<{ post: any }>((props) => {
  const toggleLike = async () => {
    const [undo, settled] = undoable(() => {
      props.post.liked = !props.post.liked;
    });

    await likePost(props.post.id).then(settled, undo);
  };

  return () => (
    <button onClick={toggleLike}>
      {props.post.liked ? 'Unlike' : 'Like'}
    </button>
  );
});
```

Because AIR Stack state is mutable, you literally change the data in place, and `undoable` reverses the exact change if the server rejects it. No snapshots or parallel state required.

## Final thoughts

SolidStart and AIR Stack share a deep appreciation for performance and fine-grained reactivity, but they apply it differently across the full stack.

**Choose SolidStart if:** You are completely bought into the SolidJS ecosystem, you prefer file-system routing, and you want to use web standard semantics (Forms and FormData) coupled with `"use server"` pragmas.

**Choose AIR Stack if:** You want the incredible performance of fine-grained reactivity, but you want to use it agnostically across any framework (like React or Vue). If you prefer programmatic routing and pure type-safe function calls over HTTP semantics, AIR Stack provides a highly decoupled, cohesive architecture.
