# Data Loaders & Providers

Providers act as the dependency injection layer for your routes. 

It executes entirely out-of-band during the navigation phase—after guards pass, but *before* the React component mounts. Whether a route needs to fetch an API payload, initialize a WebSocket connection, or simply supply static metadata, the Provider ensures the React component gets exactly what it needs without having to construct or load it itself.

Because providers are functionally chained directly to the route builder, TypeScript inherently tracks the return types. The framework knows exactly what shape `state.data` takes without requiring a single generic declaration.

**What it solves:**
- **Loading spin-cycles:** Components flashing skeleton loaders or spinners simply because they had to wait to mount before they could start fetching their dependencies.
- **Render Waterfalls:** A parent component rendering, resolving its dependencies, and finally mounting a child—which only then begins resolving its own dependencies. 
- **Blind Type Casting:** Writing `useLoaderData() as UserProfile` because the router lost the exact type of your API response across the routing boundary.

## Basic Usage

Call `.provide()` to attach a named data fetcher to a route. It receives the URL `params` and `query` directly.

```tsx
import { route } from '@anchorlib/react/router';
import { profileRoute } from './route.js';

export const ProfileRoute = route(
  profileRoute
    .provide('profile', async ({ params }) => {
      const res = await fetch(`/api/users/${params.user_id}`);
      return res.json();
    })
    .render((state) => (
      <div>
        <h1>{state.data?.profile?.name}</h1>
        <p>{state.data?.profile?.email}</p>
      </div>
    ))
);
```

## Reactive Re-evaluation

Providers run inside reactive observers. If a provider reads global reactive state (an Anchor `mutable` or `derived`), it automatically re-runs when that state changes. 

This allows you to resolve complex dependencies based on non-URL state without manually tracking anything or invalidating caches. For example, if a provider reads a dynamic array of active dashboard widgets from a global store, modifying those widgets instantly triggers a background provider re-evaluation:

```tsx
import { mutable } from '@anchorlib/react';

// 1. A global dynamic state (e.g., manipulated by a settings panel)
export const dashboardState = mutable({ 
  showMetrics: true,
  activeWidgets: ['revenue', 'activity'] 
});

export const dashboardRoute = rootRoute
  .route('/dashboard')
  .provide('analytics', async () => {
    // 2. The provider reads complex state. Anchor tracks the array and boolean automatically!
    const query = new URLSearchParams({
      metrics: String(dashboardState.showMetrics),
      widgets: dashboardState.activeWidgets.join(',')
    });
    
    const res = await fetch(`/api/analytics?${query}`);
    return res.json();
  })
  .render((state) => (
    <Dashboard data={state.data?.analytics} />
  ));
```

**What it solves:**
- **Zero wiring:** You don't need to pass global state through the React component tree just to get it inside a fetch function.
- **No manual dependency tracking:** You never have to explicitly declare and maintain exhaustive `queryKey` arrays.
- **Eliminates stale data bugs:** You avoid bugs where the UI state changes but the data fails to refresh because a developer forgot to write a cache invalidation hook.

## Dependent Providers

You can chain multiple `.provide()` calls on a single route. They run sequentially in the exact order you define them, and downstream providers receive the data resolved by the upstream providers.

```tsx
profileRoute
  .provide('user', async ({ params }) => {
    const res = await fetch(`/api/users/${params.user_id}`);
    return res.json();
  })
  .provide('posts', async ({ params, data }) => {
    // `data.user` is fully resolved and available here
    const res = await fetch(`/api/users/${params.user_id}/posts`);
    return res.json();
  })
  .render((state) => (
    <div>
      <h1>{state.data?.user?.name}</h1>
      <Feed items={state.data?.posts} />
    </div>
  ));
```

**What it solves:**
- **Conditional fetching hacks:** Writing messy `enabled: !!userData` conditional flags in React Query just to make two API calls wait for each other.
- **God-functions:** Jamming multiple unrelated `await fetch()` calls into a single massive loader function just to sequentially use the results.

## Caching

Set `maxAge` to automatically cache provider results. Subsequent navigations to the exact same route with the exact same `params` or `query` will instantly reuse the cached data instead of hitting the network.

```ts
const profile = usersRoute.route('/:user_id', {
  maxAge: 60000, // Cache for 60 seconds
});
```

Or set a global cache policy on the router:

```ts
import { createRouter, MAX_AGE } from '@anchorlib/react/router';

const router = createRouter<ReactNode>({
  maxAge: MAX_AGE.DAY,
});
```

**What it solves:**
- **Redundant fetching:** Hitting the API for the exact same data simply because a user clicked a link, navigated away, and hit the "Back" button three seconds later.
- **Heavy dependencies:** Installing standalone caching abstractions to do something the router can handle natively.

## Preloading

When combined with `<Link preload="hover">`, providers begin fetching data the exact millisecond the user hovers their mouse over a link.

```tsx
<Link to={ProfileRoute} params={{ user_id: '42' }} preload="hover">
  View Profile
</Link>
```

**What it solves:**
- **Network latency:** By the time the user's cursor physically clicks the mouse button, the data is already entering the cache. The resulting navigation is mathematically instantaneous.

## Immediate Rendering

By default, the router waits for all providers to successfully resolve before swapping the active UI component. If you prefer to render immediately and handle the loading spinner yourself, use `renderMode: 'immediate'`.

```ts
import { createRouter, RENDER_MODE } from '@anchorlib/react/router';

const router = createRouter<ReactNode>({
  renderMode: RENDER_MODE.IMMEDIATE,
});
```

```tsx
.render((state) => {
  if (state.status === 'pending') return <Skeleton />;
  if (state.status === 'error') return <ErrorDisplay error={state.error} />;

  return <h1>{state.data?.profile?.name}</h1>;
})
```

**What it solves:**
- **UI Blocking:** Fast-rendering static layout being held hostage because one non-critical data provider is slow to respond.

## Retry

Failed providers can be configured to retry failed network requests automatically before throwing an error to the UI.

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

Once providers resolve, the returned objects are merged into the route state by their explicitly defined keys (e.g., `.provide('posts', ...)`). 

Provider data appears in two places:
1. **`state.data`** — Top-level, flattened access to all resolved providers.
2. **`state.context.data`** — The exact same data, strictly scoped inside the full context object.

```tsx
.render((state) => {
  // Both work perfectly:
  const name = state.data?.profile?.name;
  const also = state.context?.data?.profile?.name;

  return <h1>{name}</h1>;
})
```
