---
title: "Routes & Layouts"
description: "Route definitions, nesting, layouts, independent routes, modals, and error boundaries in Anchor for Solid."
keywords:
  - anchor solid
  - routes
  - layouts
  - page factory
  - error boundaries
---

# Routes & Layouts

Anchor decouples the structure of your application from its UI implementation. Routes are defined as pure TypeScript objects, forming an abstract tree independent of Solid.

## Defining Routes

Start with a router instance, then chain `.route()` calls to create the tree structure.

```ts
// lib/router.ts
import { createRouter } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export const router = createRouter<JSX.Element>();
```

```ts
// pages/route.ts
import { router } from '../lib/router.js';

export const rootRoute = router.route();
```

```ts
// pages/users/route.ts
import { rootRoute } from '../route.js';

export const usersRoute = rootRoute.route('/users');
```

```ts
// pages/users/[user_id]/route.ts
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

## Pages

The `page()` factory binds a route definition to a renderable component. The `.render()` callback receives the route state, a context reader, and children (for layout routes):

```tsx
// pages/page.tsx
import { page, Title, Meta } from '@anchorlib/solid';
import { indexRoute } from './route.js';

export const RootPage = page(indexRoute).render(() => (
  <>
    <Title>Home</Title>
    <Meta name="description" content="Welcome to the application." />

    <h1>Home</h1>
    <p>Welcome.</p>
  </>
));
```

### Render Callback Arguments

| Argument | Type | Description |
|---|---|---|
| `state` | Route state | The reactive state for this specific route segment. |
| `context` | Context | The shared `RouterContext` across the entire active route tree. |
| `children` | `JSX.Element` | The child route's rendered output (layout routes only). |

All arguments are optional — omit what you don't need:

```tsx
// Page with no state or context needed
page(route).render(() => <div>Static page</div>);

// Layout using only children
page(route).render((_, _ctx, children) => <div>{children}</div>);
```

## Route State

The `state` object passed to `.render()` is reactive. It triggers fine-grained updates when its internal values change.

| Property | Type | Description |
|---|---|---|
| `state.active` | `boolean` | Whether this route is currently matched |
| `state.status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Current lifecycle status |
| `state.data` | `object` | Resolved provider data |
| `state.error` | `RouteError \| undefined` | Error from guard or provider failure |
| `state.resolving` | `boolean` | Whether providers are currently running |
| `state.authenticating` | `boolean` | Whether guards are currently running |

### `state` vs `context`

When calling `.render((state, context) => ...)`, it is crucial to understand the difference between the two reactive objects:

- **`state` (Route-Scoped):** Represents the specific state of *this exact route segment*. `state.data` only contains data resolved by providers attached directly to this specific route.
- **`context` (Tree-Scoped):** Represents the global `RouterContext` shared across the entire active route tree. `context.data` contains the merged result of all providers across all active parent and child routes, and `context.params` contains all merged URL parameters.

Use `state` when you only care about the lifecycle and data of the current component. Use `context` when you need to read URL parameters or access data provided by a parent layout.

```tsx
.render((state, context) => {
  if (state.status === 'pending') return <div>Loading Profile...</div>;

  return <h1>{context?.data?.profile?.name}</h1>;
})
```

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

## Layouts

Layout routes wrap child routes. The third argument (`children`) renders the matched child route:

```tsx
// pages/layout.tsx
import { page } from '@anchorlib/solid';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { rootRoute } from './route.js';

export const RootLayout = page(rootRoute).render((_state, _ctx, children) => {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
});
```

When the URL is `/users`, `{children}` contains the users index page. Navigate to `/users/42`, and only `{children}` swaps to the profile — the layout stays mounted.

### Index Routes

An index route matches the exact parent path without a trailing segment:

```ts
export const usersIndexRoute = usersRoute.route('/');
```

This matches `/users` exactly. Without an index route, the parent layout renders with no `{children}`.

## Independent Top-Level Routes

Use `router.append()` to create top-level routes that exist outside the root route tree. This is useful for routes that need their own layout (e.g., authentication pages that don't share the main application shell):

```ts
// pages/auth/route.ts
import { router } from '../../lib/router.js';

export const authRoute = router.append('/auth');
```

Routes created with `.append()` are matched independently. They do not inherit the root route's layout, guards, or providers — they are a separate route tree.

```ts
// pages/auth/signin/route.ts
import { authRoute } from '../route.js';

export const signinRoute = authRoute.route('/signin');
```

### Index Redirect

An index route on an independent tree can redirect to a specific child:

```ts
import { redirect } from '@anchorlib/solid';
import { SignInPage } from './signin/index.js';

authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});
```

## Modals

The `modal()` factory creates routes that render as overlays on top of the current page. The parent/background route remains visible beneath the modal.

```tsx
import { modal } from '@anchorlib/solid';
import { editRoute } from './route.js';

export const EditModal = modal(editRoute).render((state) => (
  <div class="modal-overlay">
    <div class="modal-content">
      <h2>Edit</h2>
    </div>
  </div>
));
```

Modals are registered in the router's stack registry, enabling stack-based rendering where multiple modals can layer on top of each other.

## Error Boundaries

### Global Error Boundary

Use `router.catch()` to define a fallback renderer for unmatched routes or unhandled errors:

```tsx
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

### Per-Route Error Boundary

Use `.catch()` on individual routes to define route-specific error renderers:

```tsx
usersRoute.catch((error) => {
  return (
    <div class="error">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
});
```

If a route defines a `.catch()` handler, errors during that route's activation or rendering are caught and rendered by the handler instead of propagating to the global boundary.

## File Structure

```
src/
├── lib/
│   └── router.ts              ← createRouter<JSX.Element>()
├── pages/
│   ├── route.ts               ← rootRoute = router.route()
│   ├── layout.tsx             ← RootLayout (layout)
│   ├── page.tsx               ← RootPage (leaf)
│   ├── about/
│   │   ├── route.ts           ← aboutRoute = rootRoute.route('/about')
│   │   └── page.tsx           ← AboutPage (leaf)
│   └── auth/
│       ├── route.ts           ← authRoute = router.append('/auth')
│       ├── layout.tsx         ← AuthLayout (layout)
│       ├── signin/
│       │   ├── route.ts       ← signinRoute = authRoute.route('/signin')
│       │   └── page.tsx       ← SignInPage (leaf)
│       └── signup/
│           ├── route.ts       ← signupRoute = authRoute.route('/signup')
│           └── page.tsx       ← SignUpPage (leaf)
```

The route definition file (`route.ts`) acts as the pure schema. The component file (`layout.tsx` or `page.tsx`) imports that schema, chains the UI via `.render()`, and exports the sealed `page()`.
