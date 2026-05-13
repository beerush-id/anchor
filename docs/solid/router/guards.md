---
title: "Guards & Authentication"
description: "Route guards, redirect handling, and authentication patterns in Anchor for Solid."
keywords:
  - anchor solid
  - guards
  - authentication
  - redirect
---

# Guards & Authentication

Guards guarantee that your components never mount in an invalid state. By evaluating conditions outside the component lifecycle, they decouple domain validation—like authentication, feature flags, user roles, and subscriptions—from your UI layer. If a guard throws a redirect or returns false, the navigation halts before the route ever commits.

```ts
// route.ts
import { redirect } from '@anchorlib/solid';
import { rootRoute } from '../route.js';

export const dashboardRoute = rootRoute
  .route('/dashboard')
  .guard(async () => {
    const features = await getFeatureFlags();
    if (!features.showNewDashboard) throw redirect(legacyDashboardRoute);
  })
  .guard(async () => {
    const sub = await checkSubscription();
    if (sub.tier !== 'enterprise') throw new Error('Requires Enterprise tier.');
  });
```

```tsx
// layout.tsx
import { page } from '@anchorlib/solid';
import { dashboardRoute } from './route.js';

export const DashboardLayout = page(dashboardRoute).render((_state, _ctx, children) => (
  <main>{children}</main>
));
```

## Parallel Execution

Multiple `.guard()` calls on a single route execute in parallel via `Promise.all()`. If any guard throws, navigation stops.

```ts
dashboardRoute
  .guard(checkUserRole)
  .guard(checkActiveSubscription)
  .guard(checkMaintenanceMode);
```

## Hierarchical Protection

Guards evaluate on their attached route. A guard attached to a parent route blocks all descendant routes if it fails.

```ts
betaRoute.guard(async () => {
  if (!await isBetaEnabled()) {
    throw redirect(homeRoute);
  }
});
```

The router resolves from the root downward. If a parent guard throws, child routes do not activate.

## Reactive Interception

Guards run inside reactive observers. If a guard reads global reactive state (an Anchor `mutable`), it re-evaluates when that state changes.

```ts
import { mutable } from '@anchorlib/solid';

export const systemState = mutable({ activeRole: 'admin', inMaintenance: false });

adminRoute.guard(() => {
  if (systemState.inMaintenance) throw redirect(offlineRoute);
  if (systemState.activeRole !== 'admin') throw redirect(forbiddenRoute);
});
```

## Redirects

To halt navigation and route the user elsewhere, throw `redirect()`. It accepts route objects or route components instead of string paths.

```ts
import { redirect } from '@anchorlib/solid';

// Redirect to a static route
throw redirect(loginRoute);

// Redirect to a route component
throw redirect(SignInPage);

// Redirect to a dynamic route with params
throw redirect(profileRoute, { user_id: '42' });
```

`redirect()` executes synchronously.

## Guard Errors

If a guard throws a standard `Error` instead of a `Redirect`, the error is surfaced to `state.error`.

```tsx
// layout.tsx
import { page } from '@anchorlib/solid';
import { dashboardRoute } from './route.js';

export const DashboardLayout = page(dashboardRoute).render((state, _ctx, children) => {
  return state.error
    ? (
      <div class="error-barrier">
        <h2>Access Denied</h2>
        <p>{state.error.message}</p>
      </div>
    )
    : <main>{children}</main>;
});
```
