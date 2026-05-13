---
title: "Guards & Authentication"
description: "Route guards, redirect handling, and authentication patterns in Anchor."
keywords:
  - anchor
  - guards
  - authentication
  - redirect
---

# Guards & Authentication

Guards guarantee that your UI components never mount in an invalid state. By evaluating conditions outside the component lifecycle, they decouple domain validation—like authentication, feature flags, user roles, and subscriptions—from your UI layer. This ensures your render functions remain pure, synchronous, and free of complex redirection logic.

If a guard throws a redirect or returns false, the navigation halts before the route ever commits. There is no flash of unauthorized content because the UI component never mounts.

::: code-group

```ts [React]
// route.ts
import { redirect } from '@anchorlib/react';
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

```ts [SolidJS]
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

:::

::: code-group

```tsx [React]
// layout.tsx
import { page } from '@anchorlib/react';
import { dashboardRoute } from './route.js';

export const DashboardLayout = page(dashboardRoute).render(({ children }) => (
  <main>{children}</main>
));
```

```tsx [SolidJS]
// layout.tsx
import { page } from '@anchorlib/solid';
import { dashboardRoute } from './route.js';

export const DashboardLayout = page(dashboardRoute).render(({ children }) => (
  <main>{children}</main>
));
```

:::

**What it solves:**
- Component trees buried under nested `<RequireAuth>` and `<RequireRole>` wrappers.
- Components briefly rendering unauthorized content because access logic ran inside side effects.
- Mixing domain redirection logic directly inside pure UI render functions.

## Parallel Execution

Multiple `.guard()` calls on a single route execute in parallel via `Promise.all()`. If any guard throws, navigation stops.

```tsx
dashboardRoute
  .guard(checkUserRole)
  .guard(checkActiveSubscription)
  .guard(checkMaintenanceMode);
```

**What it solves:**
- Network waterfalls caused by sequentially mounted UI wrapper components.

## Hierarchical Protection

Guards evaluate on their attached route. However, a guard attached to a parent route blocks all descendant routes if it fails.

```ts
betaRoute.guard(async () => {
  if (!await isBetaEnabled()) {
    throw redirect(homeRoute);
  }
});
```

The router resolves from the root downward. If a parent guard throws, child routes do not activate.

**What it solves:**
- Leaking secure sub-routes because a developer forgot to protect the child component.

## Reactive Interception

Guards run inside reactive observers. If a guard reads global reactive state (an Anchor `mutable`), it re-evaluates when that state changes.

::: code-group

```ts [React]
import { mutable, redirect } from '@anchorlib/react';

export const systemState = mutable({ activeRole: 'admin', inMaintenance: false });

adminRoute.guard(() => {
  if (systemState.inMaintenance) throw redirect(offlineRoute);
  if (systemState.activeRole !== 'admin') throw redirect(forbiddenRoute);
});
```

```ts [SolidJS]
import { mutable, redirect } from '@anchorlib/solid';

export const systemState = mutable({ activeRole: 'admin', inMaintenance: false });

adminRoute.guard(() => {
  if (systemState.inMaintenance) throw redirect(offlineRoute);
  if (systemState.activeRole !== 'admin') throw redirect(forbiddenRoute);
});
```

:::

**What it solves:**
- Polling via `setInterval` or global listeners to eject a user when background access changes.

## Redirects

To halt navigation and route the user elsewhere, throw `redirect()`. It accepts route objects or route components instead of string paths.

::: code-group

```ts [React]
import { redirect } from '@anchorlib/react';

// Redirect to a static route
throw redirect(loginRoute);

// Redirect to a route component
throw redirect(SignInPage);

// Redirect to a dynamic route with params
throw redirect(profileRoute, { user_id: '42' });
```

```ts [SolidJS]
import { redirect } from '@anchorlib/solid';

// Redirect to a static route
throw redirect(loginRoute);

// Redirect to a route component
throw redirect(SignInPage);

// Redirect to a dynamic route with params
throw redirect(profileRoute, { user_id: '42' });
```

:::

`redirect()` executes synchronously. Errors from the redirect handler throw immediately.

## Guard Errors

If a guard throws a standard `Error` instead of a `Redirect`, the error is surfaced to `state.error`.

::: code-group

```tsx [React]
// layout.tsx
import { page, snippet, render } from '@anchorlib/react';

export const DashboardLayout = page(dashboardRoute).render(({ state, children }) => {
  return render(() => {
    if (state.error) {
      return (
        <div className="error-barrier">
          <h2>Access Denied</h2>
          <p>{state.error.message}</p>
        </div>
      );
    }

    return <main>{children}</main>;
  });
});
```

```tsx [SolidJS]
// layout.tsx
import { page } from '@anchorlib/solid';
import { dashboardRoute } from './route.js';

export const DashboardLayout = page(dashboardRoute).render(({ state, children }) => {
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

:::
