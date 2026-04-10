# Guards & Authentication

Guards guarantee that your React components never mount in an invalid state. By evaluating conditions entirely outside the React lifecycle, they completely decouple domain validation—like authentication, feature flags, user roles, and subscriptions—from your UI layer. This ensures your render functions remain pure, synchronous, and free of complex redirection logic.

If a guard throws a redirect or returns false, the navigation halts before the route ever commits. There is no flash of unauthorized content because the UI component never mounts.

```tsx
import { redirect } from '@anchorlib/router';
import { route } from '@anchorlib/react/router';

export const DashboardRoute = route(
  dashboardRoute
    .guard(async () => {
      const features = await getFeatureFlags();
      if (!features.showNewDashboard) throw redirect(legacyDashboardRoute);
    })
    .guard(async () => {
      const sub = await checkSubscription();
      if (sub.tier !== 'enterprise') throw new Error('Requires Enterprise tier.');
    })
    .render((_state, _ctx, children) => (
      <main>{children}</main>
    ))
);
```

**What it solves:**
- Component trees buried under nested `<RequireAuth>` and `<RequireRole>` wrappers.
- Components briefly rendering unauthorized content because access logic ran inside `useEffect`.
- Mixing domain redirection logic directly inside pure UI render functions.

## Parallel Execution

Multiple `.guard()` calls on a single route execute in parallel via `Promise.all()`. If any guard throws, navigation stops immediately.

```tsx
dashboardRoute
  .guard(checkUserRole)
  .guard(checkActiveSubscription)
  .guard(checkMaintenanceMode);
```

**What it solves:**
- Network waterfalls caused by sequentially mounted React wrapper components.

## Hierarchical Protection

Guards evaluate explicitly on their attached route. However, a guard attached to a parent route automatically blocks all descendant routes if it fails.

```ts
betaRoute.guard(async () => {
  if (!await isBetaEnabled()) {
    throw redirect(homeRoute);
  }
});
```

The router resolves from the root downward. If a parent guard throws, child routes do not activate.

**What it solves:**
- Leaking secure sub-routes because a developer forgot to explicitly protect the child component.

## Reactive Interception

Guards run inside reactive observers. If a guard reads global reactive state (an Anchor `mutable`), it re-evaluates automatically when that state changes.

```ts
import { mutable } from '@anchorlib/react';

export const systemState = mutable({ activeRole: 'admin', inMaintenance: false });

adminRoute.guard(() => {
  if (systemState.inMaintenance) throw redirect(offlineRoute);
  if (systemState.activeRole !== 'admin') throw redirect(forbiddenRoute);
});
```

**What it solves:**
- Polling via `setInterval` or global `useEffect` listeners to eject a user when background access changes.

## Redirects

To halt navigation and route the user elsewhere, throw `redirect()`. It accepts route objects instead of string paths.

```ts
import { redirect } from '@anchorlib/router';

// Redirect to a static route
throw redirect(loginRoute);

// Redirect to a dynamic route
throw redirect(profileRoute, { user_id: '42' });
```

**What it solves:**
- Broken production links caused by string typos (e.g., `navigate('/dahsboard')`).

## Guard Errors

If a guard throws a standard `Error` instead of a `Redirect`, the error is surfaced to `state.error`.

```tsx
.render((state, _ctx, children) => {
  if (state.error) {
    return (
      <div className="error-barrier">
        <h2>Access Denied</h2>
        <p>{state.error.message}</p>
      </div>
    );
  }

  return <main>{children}</main>;
})
```
