---
title: "Navigation"
description: "Link component, programmatic navigation, active state, and URL generation in Anchor."
keywords:
  - anchor
  - navigation
  - link
  - navigate
---

# Navigation

Two ways to navigate: `<Link>` in view templates, and `navigate()` in code.

## Link Component

::: code-group

```tsx [React]
import { Link } from '@anchorlib/react';
import { UsersPage } from './routes/users/page.js';
import { ProfilePage } from './routes/users/[user_id]/page.js';
```

```tsx [SolidJS]
import { Link } from '@anchorlib/solid';
import { UsersPage } from './routes/users/page.js';
import { ProfilePage } from './routes/users/[user_id]/page.js';
```

:::

### Route object binding

Pass a route component to `to`. The link href is derived from the route's path:

```tsx
<Link to={UsersPage}>Users</Link>
{/* renders: <a href="/users">Users</a> */}
```

For routes with parameters, pass `params`:

```tsx
<Link to={ProfilePage} params={{ user_id: '42' }}>
  View Profile
</Link>
{/* renders: <a href="/users/42">View Profile</a> */}
```

This is the primary way to link. If you rename `/users` to `/people` in your route definition, every `<Link to={UsersPage}>` updates. Nothing breaks.

`params` and `query` requirements are statically enforced via `InferParams` and `InferQuery` generics derived from the route configuration. Missing required params will produce a compile-time error.

### String href

For static paths or external links, use `href`:

```tsx
<Link href="/about">About</Link>
```

### Query parameters

```tsx
<Link to={UsersPage} query={{ page: 2, sort: 'name' }}>
  Page 2
</Link>
{/* renders: <a href="/users?page=2&sort=name">Page 2</a> */}
```

### Active state

When a route is active, its `<Link>` gets `aria-current="page"` and an active class:

```tsx
<Link to={UsersPage} className="nav-link" activeClass="active">
  Users
</Link>
{/* when on /users: <a href="/users" class="nav-link active" aria-current="page"> */}
```

The active state is hierarchical. If the user is on `/users/42`, the link to `UsersPage` (`/users`) is also active because `/users` is a parent segment of the current route.

For index routes (created with `.route('/')`), the link is only active when the route exactly matches the current URL.

If you want the index link to stay active as long as the parent is active (for example, when a sibling child route like `/:user_id` is matched, which is common for navigation tabs), you can disable strict matching by setting `fullMatch={false}`:

```tsx
<Link to={UsersIndexPage} fullMatch={false}>
  Users
</Link>
```

### Preloading

Start loading a route's data before the user clicks:

```tsx
<Link to={ProfilePage} params={{ user_id: '42' }} preload="hover">
  View Profile
</Link>
```

On hover, the router runs the route's guards and providers in the background. By the time the user clicks, the data is already cached and the transition is instant.

You can also set preloading at the route level:

```ts
const profile = usersRoute.route('/:user_id', { preloadMode: 'hover' });
```

When `preloadMode` is set on the route, any `<Link>` pointing to it will preload on hover without needing the `preload` prop.

### History replacement

Replace the current history entry instead of pushing a new one:

```tsx
<Link href="/login" replace>Sign In</Link>
```

### Modifier keys and external targets

`<Link>` respects standard browser behavior. Cmd+Click (Mac) or Ctrl+Click (Windows) opens in a new tab. Links with `target="_blank"` work as expected — the router doesn't intercept them.

## Programmatic Navigation

Use `navigate()` from event handlers, form submissions, or any non-JSX context:

::: code-group

```tsx [React]
import { navigate } from '@anchorlib/react';
import { ProfilePage } from './routes/users/[user_id]/page.js';

function handleUserSelect(userId: string) {
  navigate(ProfilePage, {
    params: { user_id: userId },
  });
}
```

```tsx [SolidJS]
import { navigate } from '@anchorlib/solid';
import { ProfilePage } from './routes/users/[user_id]/page.js';

function handleUserSelect(userId: string) {
  navigate(ProfilePage, {
    params: { user_id: userId },
  });
}
```

:::

### Overloads

```ts
// Navigate to a route component
navigate(ProfilePage, { params: { user_id: '42' } });

// Navigate to a route object
navigate(profileRoute, { params: { user_id: '42' } });

// Navigate to a string path
navigate('/users/42');

// With query parameters
navigate(UsersPage, { query: { page: 2 } });

// Replace history entry
navigate(ProfilePage, { params: { user_id: '42' }, replace: true });
```

`navigate()` pushes a new entry to `history.pushState` and dispatches a `popstate` event, which the router picks up. With `replace: true`, it uses `history.replaceState` instead.

## Route URL generation

If you need the URL string without navigating (for copying, logging, or external use), call `.url()` on the route object:

```ts
import { profileRoute } from './routes/users/[user_id]/route.js';

const url = profileRoute.url(
  { user_id: '42' },
  { tab: 'settings' }
);
// → '/users/42?tab=settings'
```

## Global Loading Indicator

When a navigation occurs, the router automatically calculates the number of providers and guards it needs to resolve and pushes progression steps. You can use this to build a global loading indicator (like a top-level progress bar) by observing the `router.state` object.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { router } from '../lib/router.js';

export function GlobalProgress() {
  return (
    <Show when={() => router.state.activating}>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ 
            width: `${(router.state.progress / router.state.steps) * 100}%` 
          }}
        />
      </div>
    </Show>
  );
}
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { router } from '../lib/router.js';

export function GlobalProgress() {
  return (
    <Show when={router.state.activating}>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          style={{ 
            width: `${(router.state.progress / router.state.steps) * 100}%` 
          }}
        />
      </div>
    </Show>
  );
}
```

:::

- `router.state.activating`: A boolean indicating whether a navigation is actively resolving.
- `router.state.steps`: The total number of asynchronous steps (providers, guards) required to finish the navigation.
- `router.state.progress`: The current number of steps that have successfully completed.
