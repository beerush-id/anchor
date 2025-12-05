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

```bash
npm install @anchorlib/react
```

## Client Initialization

**Crucial Step**: To enable reactivity in the browser, you must import the client entry point before any component setup runs. This binds Anchor's reactive system to React's hooks.

```tsx
// main.tsx or app/layout.tsx
import '@anchorlib/react/client'; // 👈 Binds React hooks
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

## Your First Component (Simple)

Anchor components don't always need complex architecture. For simple components, you can use `setup` and return `render` directly.

```tsx
import { setup, mutable, render } from '@anchorlib/react';

export const Counter = setup(() => {
  // 1. Setup: Runs ONCE. Stable logic.
  const state = mutable({ count: 0 });

  // 2. Render: Reactive.
  // The function passed to render() re-runs when state changes.
  return render(() => (
    <button onClick={() => state.count++}>
      Count: {state.count}
    </button>
  ));
});
```

## Selective Rendering

As components grow, you might be tempted to split them into multiple smaller components (e.g., `CardHeader`, `CardBody`). In standard React, this often leads to **props drilling**—passing data down through layers of components just to display it.

With Anchor, you can use **Templates** to split your UI logic *without* losing the scope.

```tsx
import { setup, mutable, template } from '@anchorlib/react';

export const UserCard = setup(() => {
  const user = mutable({ name: 'John Doe', role: 'Admin' });

  // Sub-template: Has direct access to 'user' scope.
  // No props passing required!
  const Header = template(() => (
    <div className="header">
      <h1>{user.name}</h1>
    </div>
  ));

  // Sub-template: Updates independently.
  const Body = template(() => (
    <div className="body">
      <p>Role: {user.role}</p>
    </div>
  ));

  return (
    <div className="card">
      <Header />
      <Body />
    </div>
  );
});
```

**Why this is better:**
*   **Cohesion**: Related UI parts stay together in one file.
*   **Performance**: `Header` and `Body` update independently. If `user.role` changes, `Header` does not re-render.
*   **No Props Drilling**: Sub-templates share the `setup` scope.

## Building a Universal Component

Anchor components are **Universal** by default. This means the same code can run as:
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

  // 2. Logic (Stable)
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

  // 4. Templates
  // Extract content to a template so updates to 'user.name' 
  // don't re-run the main render loop (checking loading/error).
  const Content = template(() => (
    <div className="profile">
      <h1>{state.user?.name}</h1>
      {/* Only show refresh if we have an ID to refetch with */}
      {id && <button onClick={callback(getUser)}>Refresh</button>}
    </div>
  ));

  // 5. Render
  // Main render loop only re-runs when loading/error state changes.
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
// page.tsx (SSR Route)
import { db } from './db';
import { UserProfile } from './UserProfile';

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
*   **RSC**: The component runs **once** on the server. `state` is created, logic runs, and HTML is generated. The `onClick` handler is stripped (unless it's a Client Component).
*   **SSR**: HTML is generated on the server, but the component code *also* runs on the client to "hydrate" (attach event listeners).
*   **CSR**: Everything happens in the browser.

Anchor abstracts these differences so you can write logic once.

## Best Practices

### Separate Logic from View
Keep your `setup` function focused on state and logic. Use `template`s for your view. This makes your code cleaner and easier to test.

### Use Contracts for Shared State
When sharing state between components, use `writable()` to define strict contracts. This prevents accidental mutations from unrelated components.

```ts
// shared-state.ts
import { immutable, writable } from '@anchorlib/core';

export const globalConfig = immutable({ theme: 'dark' });
export const configWriter = writable(globalConfig, ['theme']);
```

### Fine-Grained Templates
Don't be afraid to create small templates.

**Bad: Giant Render Function**
Re-renders the entire component for any small change.
```tsx
return render(() => (
  <div className="layout">
    <div className="sidebar">{state.menu}</div> {/* Updates here... */}
    <div className="content">{state.data}</div> {/* ...cause re-renders here */}
  </div>
));
```

**Good: Split Templates**
Updates are isolated. Changing `state.menu` only re-renders `<Sidebar />`.
```tsx
const Sidebar = template(() => <div className="sidebar">{state.menu}</div>);
const Content = template(() => <div className="content">{state.data}</div>);

return (
  <div className="layout">
    <Sidebar />
    <Content />
  </div>
);
```

### Direct DOM Binding
For high-performance needs (animations, drag-and-drop), use `nodeRef` to bind state directly to DOM attributes, bypassing React's render cycle entirely.

```tsx
const divRef = nodeRef(() => ({
  style: { transform: `translateX(${state.x}px)` }
}));

return <div ref={divRef} {...divRef.attributes} />;
```
