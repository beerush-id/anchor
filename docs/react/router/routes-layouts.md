# Routes & Layouts

Anchor decouples the structure of your application from its UI implementation. Routes are defined mathematically as pure TypeScript objects, forming an abstract tree independent of React.

**What it solves:**
- **Massive Central Routers:** Huge `App.tsx` files filled with hundreds of `<Route>` JSX blobs that cause team merge conflicts.
- **Node Incompatibility:** The inability to parse, test, or evaluate application routing paths outside of a browser environment.

## Defining Routes

Start with a router instance, then chain `.route()` calls to create the tree structure. 

```ts
// lib/router.ts
import { createRouter } from '@anchorlib/react/router';
import type { ReactNode } from 'react';

export const router = createRouter<ReactNode>();
```

```ts
// routes/route.ts
import { router } from '../lib/router.js';

export const rootRoute = router.route('/');
```

```ts
// routes/users/route.ts
import { rootRoute } from '../route.js';

export const usersRoute = rootRoute.route('/users');
```

```ts
// routes/users/profile/route.ts
import { usersRoute } from '../route.js';

export const profileRoute = usersRoute.route('/:user_id');
```

This structural chaining produces a strict programmatic tree:

```
/                    → rootRoute
├── /users           → usersRoute
│   ├── /            → usersRoute.route('/')   (index)
│   └── /:user_id   → profileRoute
```

By defining routes as objects rather than React components, Anchor forces a scalable architecture. The route files express *what* your application is, without importing a single kilobyte of React view logic. 

**What it solves:**
- **String Typos:** Manually typing broken string paths across large applications, instead of utilizing strict programmatic tree navigation.

## Decoupled Rendering

Once a route exists in the abstract tree, you attach the actual UI using `.render()` and wrap the result back to the framework using `route()`.

```tsx
// routes/users/Index.tsx
import { route } from '@anchorlib/react/router';
import { usersRoute } from './route.js';

export const UsersRoute = route(
  usersRoute.render((_state, _ctx, children) => (
    <div>
      <header>Users</header>
      {children}
    </div>
  ))
);

export default UsersRoute;
```

**What it solves:**
- **Circular Dependencies:** UI components attempting to import the router, while the router simultaneously tries to import the UI components.
- **Bundle Bloat:** Forcing an application to eagerly evaluate or import every single View module just to construct the initial routing paths.

## Fine-Grained Routing

Anchor routing is fundamentally decentralized. In traditional React applications, navigating triggers a global context change at the top-level `<Router>`, forcing an expensive VDOM diff across the entire app.

Anchor bypasses this cascade. By driving route states with native observables, Anchor achieves **fine-grained routing**. 

When navigation occurs, the router computes the exact structural node that changed. Instead of re-rendering from the top down, only the specific React component observing that precise state evaluates. 

- **Parameter Mutations:** If a user remains on a route but the URL parameter mutates (`/users/1` to `/users/2`), the React view **does not unmount**. The route mutates the observable `state`, and only the specific DOM elements bound to that state update in place.
- **Node Swapping:** If a user swaps branches (`/profile` to `/settings`), unchanged parent nodes are completely ignored by the render cycle. Anchor surgically replaces only the exact leaf component at the point of intersection.

**What it solves:**
- **Global Re-renders:** Wasting CPU cycles re-evaluating the entire component tree when only a single parameter or leaf node actually changed.

## Surgical Layouts

In Anchor, every route inherently acts as a layout boundary. The `.render()` callback provides a `children` slot, which serves as the dedicated projection area for any nested descendant routes.

This allows you to construct UI structures natively through the route topology without having to manually pass component props down a monolithic tree.

### Layout routes (with children)

When building a parent route, use the `children` parameter to compose a persistent UI shell around your nested views:

```tsx
.render((state, context, children) => (
  <div>
    <nav>Sidebar</nav>
    <main>{children}</main>
  </div>
))
```

### Leaf routes (no children)

Conversely, leaf routes sit at the absolute end of a path. Because they have no further descendants to project, they operate entirely on their own `state` without needing to render the slot:

```tsx
.render((state) => (
  <div>
    <h1>User Profile</h1>
    <p>{state.context?.params.user_id}</p>
  </div>
))
```

**What it solves:**
- **Heavy DOM Destruction:** Accidentally unmounting expensive parent shells (WebSockets, Video Players, interactive maps) during deep child navigation.

## Index Routes

Calling `.route('/')` on a parent creates an index route—the default view injected into the `children` slot when the parent path matches exactly without traversing deeper.

```tsx
// routes/users/UserList.tsx
import { route, Link } from '@anchorlib/react/router';
import { usersRoute } from './route.js';
import Profile from './profile/Index.js';

export const UserListRoute = route(
  usersRoute
    .route('/')
    .provide('users', () => [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
    .render((state) => (
      <ul>
        {state.data?.users?.map((user) => (
          <li key={user.id}>
            <Link to={Profile} params={{ user_id: user.id }}>
              {user.name}
            </Link>
          </li>
        ))}
      </ul>
    ))
);
```

When the URL is `/users`, the layout renders with `UserListRoute` sitting in its `{children}` slot. When the user navigates directly to `/users/42`, the parent layout stays exactly where it is, `UserListRoute` unmounts, and the Profile leaf route replaces it.

## Route State

The `state` object passed to `.render()` is fully reactive. It automatically triggers surgical updates to the bound component if its internal values change.

| Property | Type | Description |
|---|---|---|
| `state.active` | `boolean` | Whether this route is currently matched |
| `state.status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Current lifecycle status |
| `state.data` | `object` | Resolved provider data |
| `state.error` | `RouteError \| undefined` | Error from guard or provider failure |
| `state.context` | `object` | Active context: `{ params, query, data }` |
| `state.resolving` | `boolean` | Whether providers are currently running |
| `state.authenticating` | `boolean` | Whether guards are currently running |

You can leverage `state.status` to render loading layouts while preserving the layout shell when using `renderMode: 'immediate'`:

```tsx
.render((state) => {
  if (state.status === 'pending') return <div>Loading Profile...</div>;

  return <h1>{state.context?.data?.profile?.name}</h1>;
})
```

## Route Options

You can enforce specific behaviors by passing options directly into `.route()`. Options set on the root router instance apply globally, while per-route options override the defaults for that specific route block.

```ts
const profile = usersRoute.route('/:user_id', {
  keepAlive: true,          // Preserve state when navigating away
  renderMode: 'immediate',  // Mount the component before providers resolve
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
│   ├── Index.tsx            ← RootRoute (layout + nav)
│   ├── users/
│   │   ├── route.ts         ← usersRoute = rootRoute.route('/users')
│   │   ├── Index.tsx        ← UsersRoute (layout)
│   │   ├── UserList.tsx     ← usersRoute.route('/') (index)
│   │   └── profile/
│   │       ├── route.ts     ← profileRoute = usersRoute.route('/:user_id')
│   │       └── Index.tsx    ← ProfileRoute (leaf)
│   └── settings/
│       ├── route.ts         ← settingsRoute = rootRoute.route('/settings')
│       └── Index.tsx        ← SettingsRoute (leaf)
```

The route definition file (`route.ts`) acts as the pure schema. The component file (`Index.tsx`) imports that schema, chains the UI via `.render()`, and exports the sealed `route()`.
