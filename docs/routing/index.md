---
title: "Routing"
description: "Anchor Router — type-safe routing with page factories, guards, providers, and SSR support."
keywords:
  - anchor
  - router
  - routing
---

# Router

Anchor Router is a **strongly-typed** application router that doesn't ask you to install external routers for routing, fetchers for data fetching, stores for state management, and write custom `<PrivateRoute>` wrappers for access control. Instead of gluing multiple libraries together, it builds all of this into a single, fully-typed route object:

```ts
// route.ts
export const profileRoute = usersRoute
  .route('/:user_id')
  .guard(() => {
    if (!isAuthenticated()) throw redirect(loginRoute);
  })
  .provide('profile', ({ params }) => {
    return getUserProfile(params.user_id);
  })
  .provide('notifications', ({ params }) => {
    return getUserNotifications(params.user_id);
  });
```

::: code-group

```tsx [React]
// page.tsx
import { page, snippet, render } from '@anchorlib/react';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render(({ state }) => {
  const ProfileCard = snippet(() => (
    <div>
      <h1>{state.data?.profile?.name}</h1>
      <p>{state.data?.profile?.email}</p>
    </div>
  ));

  const Notifications = snippet(() => (
    <ul>
      {state.data?.notifications?.map((notification) => (
        <li key={notification.id}>{notification.message}</li>
      ))}
    </ul>
  ));

  return (
    <>
      <ProfileCard />
      <Notifications />
    </>
  );
});
```

```tsx [SolidJS]
// page.tsx
import { page } from '@anchorlib/solid';
import { For } from 'solid-js';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render(({ state }) => {
  const ProfileCard = () => (
    <div>
      <h1>{state.data?.profile?.name}</h1>
      <p>{state.data?.profile?.email}</p>
    </div>
  );

  const Notifications = () => (
    <ul>
      <For each={state.data?.notifications}>
        {(notification) => <li>{notification.message}</li>}
      </For>
    </ul>
  );

  return (
    <>
      <ProfileCard />
      <Notifications />
    </>
  );
});
```

:::

### What's happening here

#### Route Nesting

In Anchor, routes are trees. The profile route chains from `usersRoute` (which defines `/users`) and adds `/:user_id`, making the full URL `/users/:user_id`. The URL path, data loaders, access control, and the component view all live in the exact same chain.

**What it solves:**
- Disconnected route configs requiring you to jump between `router.ts` and `Profile.tsx` just to see the URL.
- Silent bugs during refactoring because you renamed a path segment but forgot to update child route configurations.
- Messy URL path concatenation for deeply nested routes.

#### Route Protection

Anchor handles route protection through guards. A guard is a function that determines whether a route is allowed to activate. Guards run out-of-band during the navigation phase—before the framework renders anything. If a guard rejects the navigation, the component never mounts and the providers never fetch. Guards can be used for any access check, such as authentication, feature flags, or subscription tiers.

**What it solves:**
- "Flashes" of unauthorized layout before an auth effect triggers and redirects.
- Component trees buried under five levels of `<RequireAuth>`, `<RequireFeature>`, and `<RequireRole>` wrappers.
- Mixing access control logic inside pure UI render functions.

#### Data Loading

Data loading is handled by providers, which also execute outside the component lifecycle. You can chain as many providers as you need. They execute in sequence, and each provider receives the resolved data from the previous ones. Because the providers resolve before rendering, the component receives the resulting `state.data.profile` and `state.data.notifications` upon mounting. Because providers run inside a reactive observer, reading global state inside a provider triggers a re-fetch when that state changes.

**What it solves:**
- The side-effect fetch boilerplate in every single route component.
- "Waterfall" dependency fetching where a child component can't start fetching until the parent finishes rendering.
- Prop drilling data from a high-level route component all the way down to a deeply nested child.
- Flashing loading spinners because data fetching starts *after* the UI renders.

#### View

Because Anchor resolves guards and providers outside the component lifecycle, the `.render()` function represents pure UI injection. It is a plain function, not a reactive block. Because the route is a single chain, TypeScript infers the exact shape of your data—giving you perfect autocomplete for `state.data.profile` and `state.data.notifications`. 

By wrapping your components natively or using `snippet()` (in React), you opt into **fine-grained reactivity**. The injected `state` is observable—when a specific piece of data updates in the background, only the specific DOM node reading that data re-renders, not the entire page.

#### Navigation

The resulting `Profile` export is both a renderable UI component and a deeply-typed link target. You pass the route object itself to `<Link>` instead of a path string:

```tsx
<Link to={ProfilePage} params={{ user_id: '42' }}>View Profile</Link>
```

Anchor resolves the final URL at runtime. If you change `/:user_id` to `/:id` in the route definition, the URL updates across every link in the app. TypeScript enforces that new `id` is provided in `params` at compile time.

**What it solves:**
- Hardcoded string-based `<Link to="/users/42">` that breaks silently when paths are restructured.
- Finding broken links in production instead of catching them at build time.
- Missing or mistyped URL parameters causing runtime 404s.

## Getting started

Create a router and mount it:

::: code-group

```ts [React]
// lib/router.ts
import { createRouter, MAX_AGE } from '@anchorlib/react';
import type { ReactNode } from 'react';

export const router = createRouter<ReactNode>({
  maxAge: MAX_AGE.DAY,
});
```

```ts [SolidJS]
// lib/router.ts
import { createRouter, MAX_AGE } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export const router = createRouter<JSX.Element>({
  maxAge: MAX_AGE.DAY,
});
```

:::

::: code-group

```tsx [React]
// main.tsx
import { UIRouter } from '@anchorlib/react';
import { createRoot } from 'react-dom/client';
import { router } from './lib/router.js';
import { RootLayout } from './routes/layout.js';

createRoot(document.body).render(
  <UIRouter router={router} root={RootLayout} resetScroll={true} />
);
```

```tsx [SolidJS]
// entry-client.tsx
import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './routes/layout.js';

router.activate(window.location.href).then(() => {
  render(
    () => <UIRouter router={router} root={RootLayout} resetScroll />,
    document.getElementById('root')!
  );
});
```

:::

`MAX_AGE.DAY` caches provider results for 24 hours so returning to a route skips the fetch. The `resetScroll` prop (default `false`) ensures the window scrolls to top on navigation, unless the destination is a modal route.

## Route tree

Each file exports a route segment. Children import from parents:

```ts
// routes/route.ts
import { router } from '../lib/router.js';
export const rootRoute = router.route(); // Getting the root route object.

// routes/users/route.ts
import { rootRoute } from '../route.js';
export const usersRoute = rootRoute
  .route('/users')
  .provide('meta', async () => ({ title: 'All Users' }));

// routes/users/[user_id]/route.ts
import { usersRoute } from '../route.js';
export const profileRoute = usersRoute.route('/:user_id');
```

Layout routes receive `children` as the third argument to `.render()`:

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
```

:::

When the URL is `/users`, `{children}` contains the index route. Navigate to `/users/42`, and only `{children}` swaps to the profile — the layout stays mounted.

## Learn more

- [Routes & Layouts](./routes-layouts) — route tree, index routes, render API, route state, and options
- [Navigation](./navigation) — `<Link>`, `navigate()`, active state, and preloading
- [Data Loaders](./data-loaders) — `.provide()`, caching, retry, and reactive re-evaluation
- [Guards](./guards) — `.guard()`, `redirect()`, error handling, and route protection
