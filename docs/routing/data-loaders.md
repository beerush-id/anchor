---
title: "Data Loaders & Providers"
description: "Route-level data loading with providers, caching, and reactive re-evaluation in Anchor."
keywords:
  - anchor
  - data loaders
  - providers
  - route data
---

# Data Loaders & Providers

Providers act as the dependency injection layer for your routes. 

It executes out-of-band during the navigation phase—after guards pass, but *before* the UI component mounts. Whether a route needs to fetch an API payload, initialize a WebSocket connection, or supply static metadata, the Provider ensures the UI component gets what it needs without having to construct or load it itself.

Because providers are chained to the route builder, TypeScript tracks the return types. The framework knows the shape `state.data` takes without requiring a single generic declaration.

**What it solves:**
- **Loading spin-cycles:** Components flashing skeleton loaders or spinners because they had to wait to mount before they could start fetching their dependencies.
- **Render Waterfalls:** A parent component rendering, resolving its dependencies, and mounting a child—which only then begins resolving its own dependencies. 
- **Blind Type Casting:** Writing `useLoaderData() as UserProfile` because the router lost the exact type of your API response across the routing boundary.

## Basic Usage

Call `.provide()` to attach a named data fetcher to a route. It receives the URL `params` and `query` directly.

```ts
// route.ts
import { usersRoute } from '../route.js';

export const profileRoute = usersRoute
  .route('/:user_id')
  .provide('profile', async ({ params }) => {
    const res = await fetch(`/api/users/${params.user_id}`);
    return res.json();
  });
```

::: code-group

```tsx [React]
// page.tsx
import { page, Show } from '@anchorlib/react';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render(({ state }) => (
  <>
    <Show when={() => state.status === 'pending'}>
      <div>Loading profile...</div>
    </Show>

    <Show when={() => state.data.profile}>
      {({ name, email }) => (
        <div>
          <h1>{name}</h1>
          <p>{email}</p>
        </div>
      )}
    </Show>
  </>
));
```

```tsx [SolidJS]
// page.tsx
import { page, Show } from '@anchorlib/solid';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render(({ state }) => (
  <>
    <Show when={state.status === 'pending'}>
      <div>Loading profile...</div>
    </Show>

    <Show when={state.data.profile}>
      {(profile) => (
        <div>
          <h1>{profile.name}</h1>
          <p>{profile.email}</p>
        </div>
      )}
    </Show>
  </>
));
```

:::

When the route activates, Anchor automatically manages the lifecycle and data bindings for you:

1. **Pending State**: The `state.status` becomes `pending` while the `.provide()` callback fetches the data, triggering your loading indicator.
2. **Success State**: Once the data resolves, the status switches to `success` and the data is bound to the route.
3. **Render Props**: The `<Show>` component safely unwraps the truthy `state.data.profile` object and passes it directly to your children function. This gives you instant access to the data without needing to write `state.data.profile.X` repeatedly.

## Provider Arguments

The provider callback receives the route's activation context:

| Property | Type | Description |
|---|---|---|
| `params` | `InferParams` | Parsed URL parameters (e.g., `{ user_id: '42' }`) |
| `query` | `InferQuery` | Parsed query string parameters |
| `data` | `ProviderContext` | Data resolved by previous providers in the chain |
| `url` | `string` | The full matched URL |

## Reactive Re-evaluation

Providers run inside reactive observers. If a provider reads global reactive state (an Anchor `mutable` or `derived`), it re-runs when that state changes. 

This allows you to resolve complex dependencies based on non-URL state without tracking anything or invalidating caches. For example, if a provider reads a dynamic array of active dashboard widgets from a global store, modifying those widgets triggers a background provider re-evaluation:

::: code-group

```ts [React]
// route.ts
import { mutable } from '@anchorlib/react';
import { rootRoute } from '../route.js';

// 1. A global dynamic state (e.g., manipulated by a settings panel)
export const dashboardState = mutable({ 
  showMetrics: true,
  activeWidgets: ['revenue', 'activity'] 
});

export const dashboardRoute = rootRoute
  .route('/dashboard')
  .provide('analytics', async () => {
    // 2. The provider reads complex state. Anchor tracks the array and boolean!
    const query = new URLSearchParams({
      metrics: String(dashboardState.showMetrics),
      widgets: dashboardState.activeWidgets.join(',')
    });
    
    const res = await fetch(`/api/analytics?${query}`);
    return res.json();
  });
```

```ts [SolidJS]
// route.ts
import { mutable } from '@anchorlib/solid';
import { rootRoute } from '../route.js';

// 1. A global dynamic state (e.g., manipulated by a settings panel)
export const dashboardState = mutable({ 
  showMetrics: true,
  activeWidgets: ['revenue', 'activity'] 
});

export const dashboardRoute = rootRoute
  .route('/dashboard')
  .provide('analytics', async () => {
    // 2. The provider reads complex state. Anchor tracks the array and boolean!
    const query = new URLSearchParams({
      metrics: String(dashboardState.showMetrics),
      widgets: dashboardState.activeWidgets.join(',')
    });
    
    const res = await fetch(`/api/analytics?${query}`);
    return res.json();
  });
```

:::

::: code-group

```tsx [React]
// page.tsx
import { page, Show } from '@anchorlib/react';
import { dashboardRoute } from './route.js';
import { Dashboard } from './Dashboard.js';

export const DashboardPage = page(dashboardRoute).render(({ state }) => (
  <>
    <Show when={() => state.status === 'pending'}>
      <div>Loading analytics...</div>
    </Show>

    <Show when={() => state.data.analytics}>
      {(analytics) => <Dashboard data={analytics} />}
    </Show>
  </>
));
```

```tsx [SolidJS]
// page.tsx
import { page, Show } from '@anchorlib/solid';
import { dashboardRoute } from './route.js';
import { Dashboard } from './Dashboard.js';

export const DashboardPage = page(dashboardRoute).render(({ state }) => (
  <>
    <Show when={state.status === 'pending'}>
      <div>Loading analytics...</div>
    </Show>

    <Show when={state.data.analytics}>
      {(analytics) => <Dashboard data={analytics} />}
    </Show>
  </>
));
```

:::

**What it solves:**
- **Zero wiring:** You don't need to pass global state through the UI component tree just to get it inside a fetch function.
- **No manual dependency tracking:** You never have to declare and maintain exhaustive `queryKey` arrays.
- **Eliminates stale data bugs:** You avoid bugs where the UI state changes but the data fails to refresh because a developer forgot to write a cache invalidation hook.

## Dependent Providers

You can chain multiple `.provide()` calls on a single route. They run in sequence in the order you define them, and downstream providers receive the data resolved by the upstream providers.

```ts
// route.ts
export const profileRoute = usersRoute
  .route('/:user_id')
  .provide('user', async ({ params }) => {
    const res = await fetch(`/api/users/${params.user_id}`);
    return res.json();
  })
  .provide('posts', async ({ params, data }) => {
    // `data.user` is resolved and available here
    const res = await fetch(`/api/users/${params.user_id}/posts`);
    return res.json();
  });
```

**What it solves:**
- **Conditional fetching hacks:** Writing messy `enabled: !!userData` conditional flags in standalone fetchers just to make two API calls wait for each other.
- **God-functions:** Jamming multiple unrelated `await fetch()` calls into a single massive loader function just to sequentially use the results.

## Caching

Set `maxAge` to cache provider results. Subsequent navigations to the same route with the same `params` or `query` will reuse the cached data instead of hitting the network.

```ts
const profile = usersRoute.route('/:user_id', {
  maxAge: 60000, // Cache for 60 seconds
});
```

Or set a global cache policy on the router:

::: code-group

```ts [React]
import { createRouter, MAX_AGE } from '@anchorlib/react';

const router = createRouter<ReactNode>({
  maxAge: MAX_AGE.DAY,
});
```

```ts [SolidJS]
import { createRouter, MAX_AGE } from '@anchorlib/solid';

const router = createRouter<JSX.Element>({
  maxAge: MAX_AGE.DAY,
});
```

:::

**What it solves:**
- **Redundant fetching:** Hitting the API for the same data because a user clicked a link, navigated away, and hit the "Back" button three seconds later.
- **Heavy dependencies:** Installing standalone caching abstractions to do something the router can handle natively.

## Preloading

When combined with `<Link preload="hover">`, providers begin fetching data the exact millisecond the user hovers their mouse over a link.

```tsx
<Link to={ProfilePage} params={{ user_id: '42' }} preload="hover">
  View Profile
</Link>
```

**What it solves:**
- **Network latency:** By the time the user's cursor physically clicks the mouse button, the data is already entering the cache. The resulting navigation is mathematically instantaneous.

## Retry

Failed providers can be configured to retry failed network requests before throwing an error to the UI.

```ts
const profile = usersRoute.route('/:user_id', {
  maxRetries: 3,
  retryDelay: 1000,
  retryMode: 'exponential', // or 'linear'
});
```

**What it solves:**
- **Fragile networks:** Users seeing a catastrophic Error Boundary just because a mobile network connection dropped for half a second.

## Accessing Data

Once providers resolve, the returned objects are mapped by their explicitly defined keys (e.g., `.provide('posts', ...)`).

You can access this data in two distinct ways, depending on what you need:

1. **`state.data` (Route-Local Data):** Contains *only* the data resolved by the providers attached directly to this specific route.
2. **`context.data` (Global Merged Data):** Contains the merged data from all providers across the entire active route tree (including parent layouts). Available via the second parameter of the `.render()` function.

::: code-group

```tsx [React]
// page.tsx
import { page, Show } from '@anchorlib/react';

export const ProfilePage = page(profileRoute).render(({ state, context }) => (
  <div>
    {/* Accessing local provider data */}
    <Show when={() => state.data.profile}>
      {({ name }) => <h1>{name}</h1>}
    </Show>
    
    {/* Accessing global data provided by a parent layout */}
    <Show when={() => context.data.theme}>
      {(theme) => <p>Current Theme: {theme}</p>}
    </Show>
  </div>
));
```

```tsx [SolidJS]
// page.tsx
import { page, Show } from '@anchorlib/solid';

export const ProfilePage = page(profileRoute).render(({ state, context }) => (
  <div>
    {/* Accessing local provider data */}
    <Show when={state.data.profile}>
      {(profile) => <h1>{profile.name}</h1>}
    </Show>
    
    {/* Accessing global data provided by a parent layout */}
    <Show when={context.data.theme}>
      {(theme) => <p>Current Theme: {theme}</p>}
    </Show>
  </div>
));
```

:::
