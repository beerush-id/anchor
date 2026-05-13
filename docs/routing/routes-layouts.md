---
title: "Routes & Layouts"
description: "Route definitions, nesting, layouts, independent routes, modals, and error boundaries in Anchor."
keywords:
  - anchor
  - routes
  - layouts
  - page factory
  - error boundaries
---

# Routes & Layouts

Anchor decouples the structure of your application from its UI implementation. Routes are defined mathematically as pure TypeScript objects, forming an abstract tree independent of the view framework.

**What it solves:**
- **Massive Central Routers:** Huge global component files filled with hundreds of `<Route>` markup tags that cause team merge conflicts.
- **Node Incompatibility:** The inability to parse, test, or evaluate application routing paths outside of a browser environment.

## Defining Routes

Start with a router instance, then chain `.route()` calls to create the tree structure. 

::: code-group

```ts [React]
// lib/router.ts
import { createRouter } from '@anchorlib/react';
import type { ReactNode } from 'react';

export const router = createRouter<ReactNode>();
```

```ts [SolidJS]
// lib/router.ts
import { createRouter } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export const router = createRouter<JSX.Element>();
```

:::

The routing structure itself is completely framework-agnostic:

```ts
// routes/route.ts
import { router } from '../lib/router.js';

export const rootRoute = router.route(); // Getting the root route object.
```

```ts
// routes/users/route.ts
import { rootRoute } from '../route.js';

export const usersRoute = rootRoute.route('/users');
```

```ts
// routes/users/[user_id]/route.ts
import { usersRoute } from '../route.js';

export const profileRoute = usersRoute.route('/:user_id');
```

This structural chaining produces a strict tree:

```
/                    → rootRoute
├── /users           → usersRoute
│   ├── /            → usersRoute.route('/')   (index)
│   └── /:user_id   → profileRoute
```

By defining routes as objects rather than framework components, Anchor forces a scalable architecture. The route files express *what* your application is, without importing a single kilobyte of view logic. 

**What it solves:**
- **String Typos:** Manually typing broken string paths across large applications, instead of utilizing programmatic tree navigation.

## Decoupled Rendering

Once a route exists in the abstract tree, you attach the actual UI using `.render()` and wrap the result back to the framework using `page()`.

::: code-group

```tsx [React]
// routes/users/layout.tsx
import { page } from '@anchorlib/react';
import { usersRoute } from './route.js';

export const UsersLayout = page(usersRoute).render(({ children }) => (
  <div>
    <header>Users</header>
    {children}
  </div>
));

export default UsersLayout;
```

```tsx [SolidJS]
// routes/users/layout.tsx
import { page } from '@anchorlib/solid';
import { usersRoute } from './route.js';

export const UsersLayout = page(usersRoute).render(({ children }) => (
  <div>
    <header>Users</header>
    {children}
  </div>
));

export default UsersLayout;
```

:::

### Render Callback Arguments

| Argument | Type | Description |
|---|---|---|
| `state` | Route state | The reactive state for this specific route segment. |
| `context` | Context | The shared `RouterContext` across the entire active route tree. |
| `children` | `Node` | The child route's rendered output (layout routes only). |

**What it solves:**
- **Circular Dependencies:** UI components attempting to import the router, while the router simultaneously tries to import the UI components.
- **Bundle Bloat:** Forcing an application to eagerly evaluate or import every single View module just to construct the initial routing paths.

## Fine-Grained Routing

Anchor routing is decentralized. In traditional applications, navigating triggers a global context change at the top-level `<Router>`, forcing an expensive view diff across the entire app.

Anchor bypasses this cascade. By driving route states with native observables, Anchor achieves **fine-grained routing**. 

When navigation occurs, the router computes the exact structural node that changed. Instead of re-rendering from the top down, only the specific component observing that precise state evaluates. 

- **Parameter Mutations:** If a user remains on a route but the URL parameter mutates (`/users/1` to `/users/2`), the view **does not unmount**. The route mutates the observable `state`, and only the specific DOM elements bound to that state update in place.
- **Node Swapping:** If a user swaps branches (`/profile` to `/settings`), unchanged parent nodes are ignored by the render cycle. Anchor replaces only the exact leaf component at the point of intersection.

**What it solves:**
- **Global Re-renders:** Wasting CPU cycles re-evaluating the entire component tree when only a single parameter or leaf node actually changed.

## Surgical Layouts

In Anchor, every route inherently acts as a layout boundary. The `.render()` callback provides a `children` slot, which serves as the dedicated projection area for any nested descendant routes.

This allows you to construct UI structures through the route topology without having to pass component props down a monolithic tree.

### Layout routes (with children)

When building a parent route, use the `children` parameter to compose a persistent UI shell around your nested views:

```tsx
.render(({ state, context, children }) => (
  <div>
    <nav>Sidebar</nav>
    <main>{children}</main>
  </div>
))
```

### Leaf routes (no children)

Conversely, leaf routes sit at the absolute end of a path. Because they have no further descendants to project, they operate on their own `state` without needing to render the slot:

```tsx
.render(({ state, context }) => (
  <div>
    <h1>User Profile</h1>
    <p>{context.params.user_id}</p>
  </div>
))
```

**What it solves:**
- **Heavy DOM Destruction:** Accidentally unmounting expensive parent shells (WebSockets, Video Players, interactive maps) during deep child navigation.

## Index Routes

Calling `.route('/')` on a parent creates an index route—the default view injected into the `children` slot when the parent path matches without traversing deeper.

```tsx
// routes/users/route.ts
export const usersIndexRoute = usersRoute
  .route('/')
  .provide('users', () => [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]);
```

::: code-group

```tsx [React]
// routes/users/page.tsx
import { page, snippet, render, Link } from '@anchorlib/react';
import { usersIndexRoute } from './route.js';
import { ProfilePage } from './[user_id]/page.js';

export const UsersPage = page(usersIndexRoute).render(({ state }) => {
  return render(() => (
    <ul>
      {state.data?.users?.map((user) => (
        <li key={user.id}>
          <Link to={ProfilePage} params={{ user_id: user.id }}>
            {user.name}
          </Link>
        </li>
      ))}
    </ul>
  ));
});
```

```tsx [SolidJS]
// routes/users/page.tsx
import { page, Link } from '@anchorlib/solid';
import { For } from 'solid-js';
import { usersIndexRoute } from './route.js';
import { ProfilePage } from './[user_id]/page.js';

export const UsersPage = page(usersIndexRoute).render(({ state }) => (
  <ul>
    <For each={state.data?.users}>
      {(user) => (
        <li>
          <Link to={ProfilePage} params={{ user_id: user.id }}>
            {user.name}
          </Link>
        </li>
      )}
    </For>
  </ul>
));
```

:::

When the URL is `/users`, the layout renders with `UsersPage` sitting in its `{children}` slot. When the user navigates to `/users/42`, the parent layout stays where it is, `UsersPage` unmounts, and the Profile leaf route replaces it.

## Modal Routes

Sometimes you want a route to render as an overlay floating on top of the current page, rather than swapping out the page content. Anchor provides a `modal()` factory for this.

```tsx
// routes/users/invite/route.ts
import { usersRoute } from '../route.js';

export const userInviteRoute = usersRoute.route('/invite');
```

::: code-group

```tsx [React]
// routes/users/invite/page.tsx
import { modal, render } from '@anchorlib/react';
import { userInviteRoute } from './route.js';

export const UserInvitePage = modal(userInviteRoute).render(() => (
  <dialog open>
    <h1>Invite User</h1>
  </dialog>
));
```

```tsx [SolidJS]
// routes/users/invite/page.tsx
import { modal } from '@anchorlib/solid';
import { userInviteRoute } from './route.js';

export const UserInvitePage = modal(userInviteRoute).render(() => (
  <dialog open>
    <h1>Invite User</h1>
  </dialog>
));
```

:::

When navigating to `/users/invite`, the main page remains mounted as it was. The `UserInvitePage` renders globally in a separate, top-level reactive stack managed by `<UIRouter>`, placing it above the rest of the application tree. Everything else (guards, providers, reactivity) functions like a standard `page()` route. Shareable links and browser back navigation are handled out of the box.

## Route State

The `state` object passed to `.render()` is reactive. It triggers surgical updates to the bound component if its internal values change.

| Property | Type | Description |
|---|---|---|
| `state.active` | `boolean` | Whether this route is currently matched |
| `state.status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Current lifecycle status |
| `state.data` | `object` | Resolved provider data |
| `state.error` | `RouteError \| undefined` | Error from guard or provider failure |
| `state.resolving` | `boolean` | Whether providers are currently running |
| `state.authenticating` | `boolean` | Whether guards are currently running |

### `state` vs `context`

When calling `.render(({ state, context }) => ...)`, it is crucial to understand the difference between the two reactive objects:

- **`state` (Route-Scoped):** Represents the specific state of *this exact route segment*. `state.data` only contains data resolved by providers attached directly to this specific route.
- **`context` (Tree-Scoped):** Represents the global `RouterContext` shared across the entire active route tree. `context.data` contains the merged result of all providers across all active parent and child routes, and `context.params` contains all merged URL parameters.

Use `state` when you only care about the lifecycle and data of the current component. Use `context` when you need to read URL parameters or access data provided by a parent layout.

You can leverage `state.status` to render loading layouts while preserving the layout shell:

::: code-group

```tsx [React]
.render(({ state, context }) => {
  return render(() => {
    if (state.status === 'pending') return <div>Loading Profile...</div>;

    return <h1>{context?.data?.profile?.name}</h1>;
  });
})
```

```tsx [SolidJS]
.render(({ state, context }) => {
  return (
    <Show 
      when={state.status !== 'pending'} 
      fallback={<div>Loading Profile...</div>}
    >
      <h1>{context?.data?.profile?.name}</h1>
    </Show>
  );
})
```

:::

## Route Options

You can enforce specific behaviors by passing options directly into `.route()`. Options set on the root router instance apply globally, while per-route options override the defaults for that specific route block.

```ts
const profile = usersRoute.route('/:user_id', {
  keepAlive: true,          // Preserve state when navigating away
  preloadMode: 'hover',     // Preload when a Link to this route is hovered
  maxAge: 60000,            // Cache provider data for 60 seconds
  maxRetries: 3,            // Retry failed providers up to 3 times
  retryDelay: 1000,         // Wait 1s between retries
});
```

## Scalable File Structure

By treating route declarations and view injections as two separate stages, you ensure architectural scalability and eliminate circular dependencies. 

```
src/
├── lib/
│   └── router.ts           ← createRouter()
├── routes/
│   ├── route.ts             ← rootRoute = router.route('/')
│   ├── layout.tsx           ← RootLayout (layout shell)
│   ├── page.tsx             ← HomePage (leaf)
│   ├── users/
│   │   ├── route.ts         ← usersRoute = rootRoute.route('/users')
│   │   ├── layout.tsx       ← UsersLayout (layout)
│   │   ├── page.tsx         ← UsersPage (exact match at /users)
│   │   └── [user_id]/
│   │       ├── route.ts     ← profileRoute = usersRoute.route('/:user_id')
│   │       └── page.tsx     ← ProfilePage (leaf)
│   └── settings/
│       ├── route.ts         ← settingsRoute = rootRoute.route('/settings')
│       └── page.tsx         ← SettingsPage (leaf)
```

The route definition file (`route.ts`) acts as the pure schema. The component file (`layout.tsx` or `page.tsx`) imports that schema, chains the UI via `.render()`, and exports the sealed `page()`.

## Independent Top-Level Routes

Use `router.append()` to create top-level routes that exist outside the root route tree. This is useful for routes that need their own layout (e.g., authentication pages that don't share the main application shell):

```ts
// routes/auth/route.ts
import { router } from '../../lib/router.js';

export const authRoute = router.append('/auth');
```

Routes created with `.append()` are matched independently. They do not inherit the root route's layout, guards, or providers — they are a separate route tree.

```ts
// routes/auth/signin/route.ts
import { authRoute } from '../route.js';

export const signinRoute = authRoute.route('/signin');
```

### Index Redirect

An index route on an independent tree can redirect to a specific child:

::: code-group

```ts [React]
import { redirect } from '@anchorlib/react';
import { SignInPage } from './signin/index.js';

authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});
```

```ts [SolidJS]
import { redirect } from '@anchorlib/solid';
import { SignInPage } from './signin/index.js';

authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});
```

:::

## Error Boundaries

### Global Error Boundary

Use `router.catch()` to define a fallback renderer for unmatched routes or unhandled errors:

::: code-group

```tsx [React]
import { router } from '../lib/router.js';

router.catch(() => {
  return (
    <div className="error-page">
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
});
```

```tsx [SolidJS]
import { router } from '../lib/router.js';

router.catch(() => {
  return (
    <div class="error-page">
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
});
```

:::

### Per-Route Error Boundary

Use `.catch()` on individual routes to define route-specific error renderers:

::: code-group

```tsx [React]
usersRoute.catch((error) => {
  return (
    <div className="error">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
});
```

```tsx [SolidJS]
usersRoute.catch((error) => {
  return (
    <div class="error">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
});
```

:::

If a route defines a `.catch()` handler, errors during that route's activation or rendering are caught and rendered by the handler instead of propagating to the global boundary.
