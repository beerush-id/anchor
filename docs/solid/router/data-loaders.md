---
title: "Data Loaders & Providers"
description: "Route-level data loading with providers, caching, and reactive re-evaluation in Anchor for Solid."
keywords:
  - anchor solid
  - data loaders
  - providers
  - route data
---

# Data Loaders & Providers

Providers attach data-loading logic directly to route definitions. They resolve outside the component lifecycle — before any component mounts — eliminating the need for `createResource` or `createEffect` boilerplate for route-level data.

## Basic Provider

Chain `.provide()` on a route to declare a named data loader:

```ts
// pages/users/route.ts
import { rootRoute } from '../route.js';

export const usersRoute = rootRoute
  .route('/users')
  .provide('users', async () => {
    const res = await fetch('/api/users');
    return res.json();
  });
```

The resolved data is available in the render callback via `state.data`:

```tsx
// pages/users/page.tsx
import { page } from '@anchorlib/solid';
import { usersRoute } from './route.js';

export const UsersPage = page(usersRoute.route('/')).render((state) => (
  <ul>
    {state.data.users?.map(user => <li>{user.name}</li>)}
  </ul>
));
```

## Chained Providers

Multiple providers execute in sequence. Each provider receives the resolved data from previous providers:

```ts
export const profileRoute = usersRoute
  .route('/:user_id')
  .provide('profile', async ({ params }) => {
    return getUserProfile(params.user_id);
  })
  .provide('notifications', async ({ params, data }) => {
    // data.profile is already resolved here
    return getUserNotifications(params.user_id);
  });
```

## Provider Arguments

The provider callback receives the route's activation context:

| Property | Type | Description |
|---|---|---|
| `params` | `InferParams` | Parsed URL parameters (e.g., `{ user_id: '42' }`) |
| `query` | `InferQuery` | Parsed query string parameters |
| `data` | `ProviderContext` | Data resolved by previous providers in the chain |
| `url` | `string` | The full matched URL |

## Reactive Re-evaluation

Providers run inside reactive observers. If a provider reads global reactive state, it re-fetches when that state changes:

```ts
import { mutable } from '@anchorlib/solid';

const filters = mutable({ department: 'engineering' });

usersRoute.provide('users', async () => {
  // Re-fetches when filters.department changes
  return fetchUsers({ department: filters.department });
});
```

## Accessing Data

Once providers resolve, the returned objects are mapped by their explicitly defined keys (e.g., `.provide('posts', ...)`).

You can access this data in two distinct ways, depending on what you need:

1. **`state.data` (Route-Local Data):** Contains *only* the data resolved by the providers attached directly to this specific route.
2. **`context.data` (Global Merged Data):** Contains the merged data from all providers across the entire active route tree (including parent layouts). Available via the second parameter of the `.render()` function.

```tsx
// page.tsx
export const ProfilePage = page(
  profileRoute.render((state, context) => (
    <div>
      {/* Accessing local provider data */}
      <h1>{state.data?.profile?.name}</h1>

      {/* Accessing global data provided by a parent layout */}
      <p>Current Theme: {context?.data?.theme}</p>
    </div>
  ))
);
```
