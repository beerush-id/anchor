---
title: "Navigation"
description: "Link component, programmatic navigation, active state, and URL generation in Anchor for Solid."
keywords:
  - anchor solid
  - navigation
  - link
  - navigate
---

# Navigation

## Link Component

The `<Link>` component navigates to route components. Pass the route's page component as the `to` prop:

```tsx
import { Link } from '@anchorlib/solid';
import { AboutPage } from '../pages/about/index.js';
import { RootPage } from '../pages/page.js';

<Link to={RootPage}>Home</Link>
<Link to={AboutPage} activeClass="nav-active">About</Link>
```

`activeClass` is applied when the link's target matches the current URL.

### Dynamic Parameters

For routes with parameters, provide `params`:

```tsx
import { Link } from '@anchorlib/solid';
import { ProfilePage } from '../pages/users/[user_id]/page.js';

<Link to={ProfilePage} params={{ user_id: '42' }}>View Profile</Link>
```

`params` and `query` requirements are statically enforced via `InferParams` and `InferQuery` generics. Missing required params will produce a compile-time error.

### Replace History

Use `replace` to replace the current history entry instead of pushing a new one:

```tsx
<Link to={SignInPage} replace>Sign In</Link>
```

### Modifier keys and external targets

`<Link>` respects standard browser behavior. Cmd+Click (Mac) or Ctrl+Click (Windows) opens in a new tab. Links with `target="_blank"` work as expected — the router doesn't intercept them.

## Programmatic Navigation

Use `navigate()` from event handlers, form submissions, or any non-JSX context:

```tsx
import { navigate } from '@anchorlib/solid';
import { ProfilePage } from './pages/users/[user_id]/page.js';

function handleUserSelect(userId: string) {
  navigate(ProfilePage, {
    params: { user_id: userId },
  });
}
```

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
import { profileRoute } from './pages/users/[user_id]/route.js';

const url = profileRoute.url(
  { user_id: '42' },
  { tab: 'settings' }
);
// → '/users/42?tab=settings'
```
