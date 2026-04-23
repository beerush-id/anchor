# Navigation

Two ways to navigate: `<Link>` in JSX, `navigate()` in code.

## Link Component

```tsx
import { Link } from '@anchorlib/react';
import { UsersPage } from './routes/users/page.js';
import { ProfilePage } from './routes/users/[user_id]/page.js';
```

### Route object binding

Pass a route component to `to`. The link href is derived from the route's path:

```tsx
<Link to={UsersPage}>Users</Link>
<!-- renders: <a href="/users">Users</a> -->
```

For routes with parameters, pass `params`:

```tsx
<Link to={ProfilePage} params={{ user_id: '42' }}>
  View Profile
</Link>
<!-- renders: <a href="/users/42">View Profile</a> -->
```

This is the primary way to link. If you rename `/users` to `/people` in your route definition, every `<Link to={UsersPage}>` updates. Nothing breaks.

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
<!-- renders: <a href="/users?page=2&sort=name">Page 2</a> -->
```

### Active state

When a route is active, its `<Link>` gets `aria-current="page"` and an active class:

```tsx
<Link to={UsersPage} className="nav-link" activeClass="active">
  Users
</Link>
<!-- when on /users: <a href="/users" class="nav-link active" aria-current="page"> -->
```

The active state is hierarchical. If the user is on `/users/42`, the link to `UsersPage` (`/users`) is also active because `/users` is a parent segment of the current route.

For index routes (created with `.route('/')`), the link stays active as long as the parent is active — even when a sibling child route like `/:user_id` is matched. This is the expected behavior for navigation tabs.

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

```tsx
import { navigate } from '@anchorlib/react';
import { ProfilePage } from './routes/users/[user_id]/page.js';

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

// Navigate to a string path
navigate('/users/42');

// With query parameters
navigate(UsersPage, { query: { page: 2 } });

// Replace history entry
navigate(ProfilePage, { params: { user_id: '42' }, replace: true });
```

`navigate()` pushes a new entry to `history.pushState` and dispatches a `popstate` event, which the router picks up. With `replace: true`, it uses `history.replaceState` instead.

### Route URL generation

If you need the URL string without navigating (for copying, logging, or external use), call `.url()` on the route object:

```ts
import { profileRoute } from './routes/users/[user_id]/route.js';

const url = profileRoute.url(
  { user_id: '42' },
  { tab: 'settings' }
);
// → '/users/42?tab=settings'
```
