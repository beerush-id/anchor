---
title: "Router"
description: "Anchor Router for Solid — type-safe routing with page factories, guards, providers, and SSR support."
keywords:
  - anchor solid
  - router
  - routing
  - page factory
---

# Router

Anchor Router is a **strongly-typed** application router that builds routing, data loading, access control, and state management into a single, fully-typed route chain. Guards run before rendering, providers resolve data outside the component lifecycle, and navigation is type-safe through route objects.

```tsx
// route.ts
export const profileRoute = usersRoute
  .route('/:user_id')
  .guard(() => {
    if (!isAuthenticated()) throw redirect(loginRoute);
  })
  .provide('profile', ({ params }) => {
    return getUserProfile(params.user_id);
  });
```

```tsx
// page.tsx
import { page } from '@anchorlib/solid';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render((state) => (
  <div>
    <h1>{state.data.profile?.name}</h1>
    <p>{state.data.profile?.email}</p>
  </div>
));
```

Guards run before rendering, providers resolve data outside the component lifecycle, and navigation is type-safe through route objects — no string paths, no manual fetch boilerplate.

## Getting started

Create a router and mount it:

```ts
// lib/router.ts
import { createRouter } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export const router = createRouter<JSX.Element>();
```

```tsx
// entry-client.tsx
import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  render(
    () => <UIRouter router={router} root={RootLayout} resetScroll />,
    document.getElementById('root')!
  );
});
```

## Route tree

Each file exports a route segment. Children import from parents:

```ts
// pages/route.ts
import { router } from '../lib/router.js';
export const rootRoute = router.route();
export const indexRoute = rootRoute.route('/');

// pages/about/route.ts
import { rootRoute } from '../route.js';
export const aboutRoute = rootRoute.route('/about');

// pages/users/route.ts
import { rootRoute } from '../route.js';
export const usersRoute = rootRoute.route('/users');

// pages/users/[user_id]/route.ts
import { usersRoute } from '../route.js';
export const profileRoute = usersRoute.route('/:user_id');
```

Layout routes receive `children` as the third argument to `.render()`:

```tsx
// pages/layout.tsx
import { page } from '@anchorlib/solid';
import { rootRoute } from './route.js';

export const RootLayout = page(rootRoute).render((_state, _ctx, children) => {
  return (
    <div>
      <header>App Header</header>
      <main>{children}</main>
    </div>
  );
});
```

## Learn more

- [Routes & Layouts](./routes-layouts) — route tree, index routes, render API, independent routes, modals, error boundaries
- [Navigation](./navigation) — `<Link>`, `navigate()`, active state, and URL generation
- [Guards & Authentication](./guards) — `.guard()`, `redirect()`, error handling, and route protection
- [Data Loaders & Providers](./data-loaders) — `.provide()`, caching, and reactive re-evaluation
