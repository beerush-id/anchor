---
title: "Getting Started"
description: "A comprehensive guide to building applications with Anchor."
keywords:
  - getting started
  - tutorial
  - anchor react
---

# Getting Started

This guide covers the essentials of building React applications with Anchor, from your first simple component to scalable, universal applications.

## Installation

::: code-group

```bash [Bun]
bun add @anchorlib/react
```

```bash [npm]
npm install @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/react
```

```bash [pnpm]
pnpm add @anchorlib/react
```
:::

## Client Initialization

**Crucial Step**: To enable reactivity in the browser, you must import the client entry point before any component runs. This binds Anchor's reactive system to React's hooks.

```tsx
// main.tsx or app/layout.tsx
import '@anchorlib/react/client'; // 👈 Binds React hooks

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

## Your First Component

In Anchor, you create components with `setup()`. It runs once to define your state and logic. For a simple reactive View, use `render()`.

```tsx
import { setup, mutable, render } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup(() => {
  const state = mutable({ count: 0 });

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => (
    <button onClick={() => state.count++}>
      Count: {state.count}
    </button>
  ));
});
```

::: details Try it Yourself

::: anchor-react-sandbox

```tsx /App.tsx [active]
import '@anchorlib/react/client';
import { setup, mutable, render } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup(() => {
  const state = mutable({ count: 0 });

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => (
    <button onClick={() => state.count++}>
      Count: {state.count}
    </button>
  ));
});

export default Counter;
```

:::

## Selective Rendering

As components grow, you might be tempted to split them into multiple smaller components (e.g., `CardHeader`, `CardBody`). In standard React, this often leads to **props drilling**—passing data down through layers of components just to display it.

With Anchor, you can use **Snippets** to split your **Views** *without* losing the scope.

```tsx
import { setup, mutable, snippet } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const UserCard = setup(() => {
  const user = mutable({ name: 'John Doe', role: 'Admin' });

  // ━━━ SNIPPET (Context-aware View) ━━━
  const Header = snippet(() => (
    <div className="header">
      <h1>{user.name}</h1>
    </div>
  ));

  // ━━━ SNIPPET (Context-aware View) ━━━
  const Body = snippet(() => (
    <div className="body">
      <p>Role: {user.role}</p>
    </div>
  ));

  // ━━━ STATIC JSX (Static Presentation Layer) ━━━
  return (
    <div className="card">
      <Header />
      <Body />
    </div>
  );
});
```

::: details Try it Yourself

::: anchor-react-sandbox


```tsx
import '@anchorlib/react/client';
import { setup, mutable, snippet } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const UserCard = setup(() => {
  const user = mutable({ name: 'John Doe', role: 'Admin' });

  // ━━━ SNIPPET (Context-aware View) ━━━
  const Header = snippet(() => (
    <div className="header">
      <h1>{user.name}</h1>
    </div>
  ));

  // ━━━ SNIPPET (Context-aware View) ━━━
  const Body = snippet(() => (
    <div className="body">
      <p>Role: {user.role}</p>
    </div>
  ));

  // ━━━ STATIC JSX (Static Presentation Layer) ━━━
  return (
    <div className="card">
      <Header />
      <Body />
      <button onClick={() => user.role = 'User'}>Change Role</button>
    </div>
  );
});

export default UserCard;
```
:::

**Why this is better:**
*   **Cohesion**: Related UI parts stay together in the same Component.
*   **No Props Drilling**: Snippets access state directly—no need to pass data through layers.
*   **Performance**: `Header` and `Body` update independently. If `user.role` changes, `Header` does not re-render.

## Universal Components

Anchor components are **Universal** by default. This means the same component can be rendered as:
1.  **RSC (React Server Components)**: Generates static HTML. Zero JavaScript sent to the client.
2.  **SSR (Server-Side Rendering)**: Generates HTML on the server, then hydrates on the client.
3.  **CSR (Client-Side Rendering)**: Runs entirely in the browser.

Let's build a `UserProfile` that fetches data and handles interactions safely across all environments.

```tsx
import { setup, mutable, render, onMount, callback } from '@anchorlib/react';

type User = { id: number; name: string };

type UserState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type Props = {
  id?: number;
  user?: User;
};

export const UserProfile = setup(({ id, user }: Props) => {
  // 1. State
  // If 'user' is provided (RSC), we start loaded!
  const state = mutable<UserState>({
    user: user || null,
    loading: !user,
    error: null,
  });

  // 2. Logic
  const getUser = () => {
    if (!id) return; // Can't fetch without ID
    
    state.loading = true;
    state.error = null;
    
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        state.user = data;
        state.loading = false;
      })
      .catch(err => {
        state.error = err.message;
        state.loading = false;
      });
  };

  // 3. Lifecycle
  // Only fetch on mount if we don't have a user yet.
  onMount(() => {
    if (!state.user && id) {
      getUser();
    }
  });

  // 4. Snippets
  // Extract content to a snippet so updates to 'user.name' 
  // don't re-run the main render loop (checking loading/error).
  const Content = snippet(() => (
    <div className="profile">
      <h1>{state.user?.name}</h1>
      {/* Only show refresh if we have an ID to refetch with */}
      {id && <button onClick={callback(getUser)}>Refresh</button>}
    </div>
  ));

  // 5. Component View
  // Main view only re-renders when loading/error state changes.
  return render(() => {
    if (state.loading) return <div>Loading...</div>;
    if (state.error) return <div className="error">{state.error}</div>;

    return <Content />;
  });
});
```

### Usage Examples

**1. As a Server Component (RSC)**
Pass only the data. It renders static HTML. Since no ID is passed, the "Refresh" button (which requires JS) is not rendered.

```tsx
// page.tsx (Server Component)
import { db } from './db';
import { UserProfile } from './UserProfile';

export default async function Page({ params }) {
  const user = await db.user.find(params.id);
  
  // Renders Static HTML. Zero JS.
  return <UserProfile user={user} />;
}
```

**2. Server-Side Rendering (SSR)**
Pass both data and ID. The HTML is generated on the server, but the component hydrates on the client, enabling the "Refresh" button.

```tsx
// clients/index.ts
'use client';

export { UserProfile } from '../components/UserProfile';
```

```tsx
// page.tsx (SSR Route)
import { db } from './db';
import { UserProfile } from './clients';

export default async function Page({ params }) {
  const user = await db.user.find(params.id);
  
  // Renders HTML + Hydrates. Interactive.
  return <UserProfile user={user} id={user.id} />;
}
```

**3. As a Client Component (CSR)**
Pass just the ID. It handles the loading state and fetching entirely in the browser.

```tsx
// App.tsx (Client Component)
import { UserProfile } from './UserProfile';

export default function App() {
  // Shows "Loading..." then fetches data
  return <UserProfile id={1} />;
}
```

### RSC vs SSR vs CSR
*   **RSC**: The component runs **once** on the server. `state` is created, logic runs, and HTML is generated. Event handlers are stripped.
*   **SSR**: HTML is generated on the server, but the component code *also* runs on the client to "hydrate" (attach event listeners).
*   **CSR**: Everything happens in the browser.

Anchor abstracts these differences so you can write logic once.

## Next Steps

Now that you understand the basics, explore these topics:

- [**State**](/react/state/index.html) — `mutable`, `immutable`, `derived`, and write contracts
- [**View & Template**](/react/component/view) — Templates, Snippets, and Component Views in depth
- [**Lifecycle**](/react/component/lifecycle) — `onMount`, `onCleanup`, and effect handlers
- [**Binding & Refs**](/react/component/binding) — Direct DOM binding for high-performance updates

Have an existing project? See the [**Migration Guide**](/react/migration-guide) for gradual adoption strategies.
