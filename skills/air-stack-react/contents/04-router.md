## 4. Router (`@anchorlib/router`)
Anchor Router provides type-safe routing, out-of-band data fetching (providers), and access control (guards) in a single unified route chain.

### Router Instantiation
Create the router instance. The options object is entirely optional.

```tsx
// Basic Initialization
import { createRouter, UIRouter } from '@anchorlib/react';

export const router = createRouter();
```

```tsx
// Initialization with Options
import { createRouter, UIRouter, MAX_AGE } from '@anchorlib/react';

export const router = createRouter({ 
  maxAge: MAX_AGE.DAY,
  renderMode: 'immediate' // Renders UI instantly while providers load in the background
});

// Global Fallback Error Boundary (Optional)
router.catch(() => <h1>404 Not Found</h1>);
```

### Application Mounting
Mount the app to the DOM. The strategy depends on your application architecture.

**Client-Side Rendering (SPA Mount)**
Mounts the app directly in the browser.
```tsx
import { createRoot } from 'react-dom/client';
import { RootLayout } from './routes/layout.js';

createRoot(document.body).render(<UIRouter router={router} root={RootLayout} resetScroll />);
```

**Server-Side Rendering (SSR Hydration)**
Blocks hydration until `router.activate()` fully resolves the route to prevent server HTML mismatch.
```tsx
import { hydrateRoot } from 'react-dom/client';
import { RootLayout } from './routes/layout.js';

router.activate(window.location.href).then(() => {
  hydrateRoot(document.body, <UIRouter router={router} root={RootLayout} resetScroll />);
});
```

### Route Tree Nesting & Options
Routes are trees. Children import from parents to construct the full URL.

```typescript
// routes/route.ts (Root)
import { router } from '../lib/router.js';
export const rootRoute = router.route(); 

// routes/users/route.ts (Branch)
import { rootRoute } from '../route.js';
export const usersRoute = rootRoute.route('/users');

// routes/users/settings/route.ts (Basic Leaf)
import { usersRoute } from '../route.js';
export const settingsRoute = usersRoute.route('/settings');

// routes/users/[user_id]/route.ts (Configured Leaf)
import { usersRoute } from '../route.js';
export const profileRoute = usersRoute.route('/:user_id', {
  keepAlive: true,      // Preserve state when navigating away
  preloadMode: 'hover', // Preload data on <Link> hover
  maxRetries: 3         // Retry failed providers
});

// Route-Specific Error Boundary (Optional fallback for guard/provider rejections)
profileRoute.catch((error) => <div>Profile failed to load: {error.message}</div>);
```

### Route Chain (Guards & Providers)
URL paths, access control (`guard`), and data loaders (`provide`) live in the exact same fluent chain. Guards and Providers execute *before* the component renders.

```typescript
export const profileRoute = usersRoute
  .route('/:user_id')
  .guard(() => {
    // Rejects navigation out-of-band before rendering
    if (!isAuthenticated()) throw redirect(loginRoute);
  })
  .provide('profile', ({ params }) => {
    return getUserProfile(params.user_id);
  })
  .provide('notifications', ({ params }) => {
    // Providers are chainable and run in sequence
    return getUserNotifications(params.user_id);
  });
```

### Parallel & Reactive Guards
Multiple `.guard()` calls on a single route execute in parallel. Just like providers, guards are inherently reactive. If a guard reads from any reactive state, it automatically re-evaluates when that state changes, ejecting the user immediately if access is revoked in the background.

```tsx
import { mutable } from '@anchorlib/react';
import { checkRole } from '../services/auth.js';

export const systemState = mutable({ inMaintenance: false });

export const ProtectedRoutes = Route.group({
  path: '/dashboard',
  guards: [
    // Reactive Guard: Auto-ejects user if maintenance mode is toggled on globally
    () => {
      if (globalState.maintenance) throw redirect('/maintenance');
    },
    // Parallel Guard: Runs concurrently with other guards
    async () => {
      const user = await checkRole();
      if (user.role !== 'admin') throw redirect(loginRoute);
    }
  ]
});
```

### Redirects & Guard Errors
To bounce a user, throw `redirect()`. It accepts route objects or page components. If you throw a standard `Error` instead, navigation halts and the error surfaces to `state.error` for in-place rendering.

```tsx
import { redirect } from '@anchorlib/react';

export const settingsRoute = dashboardRoute
  .route('/settings')
  .guard(() => {
    // Redirect to a static route component
    if (!isLoggedIn) throw redirect(SignInPage);

    // Redirect to a dynamic route with type-safe params
    if (!hasProfile) throw redirect(profileRoute, { user_id: '42' });

    // Throwing an Error exposes it to state.error instead of redirecting
    if (!hasBilling) throw new Error('Billing access restricted.');
  });
```

When a guard throws a standard `Error`, you can render it cleanly inside the layout instead of relying on a fallback error boundary:

```tsx
export const SettingsLayout = page(settingsRoute).render(({ state, children }) => render(() => {
  // If the guard threw an Error, render the error barrier directly
  if (state.error) {
    return <div className="error">Access Denied: {state.error.message}</div>;
  }

  // Otherwise render the authorized nested routes
  return <main>{children}</main>;
}));
```

### Dependent Providers
Providers run in sequence. Downstream providers can access the `data` resolved by upstream providers in the same chain.

```typescript
export const postsRoute = usersRoute
  .route('/:user_id/posts')
  .provide('user', async ({ params }) => {
    return fetchUser(params.user_id);
  })
  .provide('posts', async ({ params, data }) => {
    // `data.user` is fully resolved and type-safe here
    return fetchUserPosts(data.user.id);
  });
```

### Reactive Providers
Providers are inherently reactive. If the URL `params` or `query` changes (e.g., navigating from `?period=day` to `?period=week`), the provider automatically re-runs. Furthermore, if a provider reads *any* reactive state (such as an Anchor `mutable` or `derived`), it automatically re-fetches when that state changes—eliminating manual cache invalidation arrays.

```typescript
import { mutable } from '@anchorlib/react';
import { getAnalytics } from '../services/analytics.js';

export const dashboardState = mutable({ showMetrics: true });

export const ChartRoute = Route.define({
  path: '/chart',
  load: async (ctx) => {
    // Automatically re-runs if the URL `query` changes
    // Automatically re-runs if `dashboardState.showMetrics` mutates elsewhere
    return getAnalytics({ 
      period: query.period,
      metrics: dashboardState.showMetrics 
    });
  }
});
```

### Router: View Binding & Data Consumption
The `.render()` function binds the route to a UI component. Layouts receive `children`, while leaf pages consume the strongly-typed `state.data`.

```tsx
// routes/users/layout.tsx
import { page } from '@anchorlib/react';
import { usersRoute } from './route.js';

export const UsersLayout = page(usersRoute).render(({ children }) => (
  <div>
    <header>Users Layout</header>
    {/* Renders the active child route */}
    {children} 
  </div>
));
```

```tsx
// routes/users/[user_id]/page.tsx
import { page, Show } from '@anchorlib/react';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).render(({ state }) => (
  <>
    {/* Built-in pending status while providers fetch */}
    <Show when={() => state.status === 'pending'}>
      <div>Loading...</div>
    </Show>

    {/* Safely unwraps truthy data with perfect TypeScript inference */}
    <Show when={() => state.data.profile}>
      {({ name, email }) => (
        <div>
          <h1>{name}</h1>
          <p>{email}</p>
        </div>
      )}
    </Show>
  </>
));
```

### Declarative Navigation
Pass a route component or route object to `<Link>`. TypeScript enforces required arguments. When a link matches the active route, it automatically receives the `aria-current="page"` attribute for native CSS styling.

```tsx
import { Link } from '@anchorlib/react';
import { UsersPage } from './routes/users/page.js';
import { ProfilePage } from './routes/users/[user_id]/page.js';

export function Navigation() {
  return (
    <nav>
      {/* Basic static link. Automatically gets aria-current="page" when active */}
      <Link to={UsersPage}>All Users</Link>

      {/* Link with REQUIRED parameters derived from /:user_id */}
      <Link to={ProfilePage} params={{ user_id: '42' }}>
        View Profile
      </Link>

      {/* Link with OPTIONAL behaviors */}
      <Link 
        to={ProfilePage} 
        params={{ user_id: '42' }} 
        query={{ tab: 'settings' }} // Optional type-safe query string
        activeClass="active-link"   // Optional class applied when route is active (alongside aria-current)
        preload="hover"             // Optional background data fetching
        replace                     // Optional history replace
      >
        View Settings
      </Link>
    </nav>
  );
}
```

### Programmatic Navigation & URL Generation
Use `navigate()` in event handlers, or generate a raw URL string using `.url()`.

```tsx
import { navigate } from '@anchorlib/react';
import { profileRoute } from './routes/users/[user_id]/route.js';
import { ProfilePage } from './routes/users/[user_id]/page.js';

function handleSelect(userId: string) {
  // Basic Navigation (params required)
  navigate(ProfilePage, { params: { user_id: userId } });

  // Navigation with OPTIONAL overrides
  navigate(ProfilePage, { 
    params: { user_id: userId },
    query: { tab: 'settings' }, // Optional
    replace: true               // Optional
  });
}

function getShareUrl(userId: string) {
  // Generate a raw URL string without navigating
  return profileRoute.url({ user_id: userId }, { tab: 'settings' });
  // Returns: '/users/42?tab=settings'
}
```

### Global Loading Indicator
Observe the router's global `state` to build app-wide progress bars during navigation.

```tsx
import { Show } from '@anchorlib/react';
import { router } from '../lib/router.js';

export function GlobalProgress() {
  return (
    <Show when={() => router.state.activating}>
      {/* 
        Pass a function so the reactive reads (progress/steps) 
        execute safely inside the boundary! 
      */}
      {() => (
        <div 
          className="progress-fill" 
          style={{ width: `${(router.state.progress / router.state.steps) * 100}%` }}
        />
      )}
    </Show>
  );
}
```

### Index & Modal Routes
Index routes render when a parent path matches exactly. Modals render as an overlay floating above the current page, without unmounting the background layout.

```tsx
// Index Route
export const usersIndexRoute = usersRoute.route('/');
export const UsersIndexPage = page(usersIndexRoute).render(() => (
  <div>Default view for /users</div>
));

// Modal Route
import { modal } from '@anchorlib/react';

export const userInviteRoute = usersRoute.route('/invite');
export const UserInviteModal = modal(userInviteRoute).render(() => (
  <dialog open>Overlay Content</dialog>
));
```

### Subdirectory Hosting & Independent Trees
To host your app in a subdirectory, simply change the path of your root route. To create an entirely separate tree (like an isolated auth layout), use `router.append()`.

```typescript
// Subdirectory Hosting (everything shifts to /app)
export const rootRoute = router.route('/app');

// Independent Tree (does not inherit rootRoute layouts or providers)
export const authRoute = router.append('/auth');
export const signinRoute = authRoute.route('/signin');
```

### Route State vs Context
The `.render()` callback provides both `state` (local to this exact segment) and `context` (merged across the entire active tree). **⚠️ WARNING: `.render()` is not a reactive boundary.** You must wrap state reads in an observer (like `render()` or `<Show>`) to track mutations.

```tsx
import { page, render } from '@anchorlib/react';

export const ProfilePage = page(profileRoute).render(({ state, context, children }) => render(() => {
  // state.status: 'idle' | 'pending' | 'success' | 'error'
  if (state.status === 'pending') return <div>Loading...</div>;

  return (
    <div>
      {/* state.data ONLY has data provided by profileRoute */}
      <h1>{state.data.profile.name}</h1>
      
      {/* context.data merges all providers from rootRoute down to profileRoute */}
      <title>{context.data.meta.title}</title>

      {/* Layouts render nested child routes using children */}
      {children}
    </div>
  );
}));
```
