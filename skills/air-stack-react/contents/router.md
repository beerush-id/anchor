## 4. Router (`@anchorlib/router`)
Anchor Router provides type-safe routing, out-of-band data fetching (providers), and access control (guards) in a single unified route chain.

### Router: API Signatures
```tsx
import { createRouter, page, modal, Show, For, redirect, MAX_AGE } from '@anchorlib/react';
import { NotFoundError, GuardError, ProviderError } from '@anchorlib/react';

// Router creation
function createRouter(options?: RouterOptions): Router;
interface RouterOptions {
  maxAge?: number;           // Default provider cache duration (ms)
  renderMode?: 'deferred' | 'immediate'; // Deferred waits for providers, immediate renders instantly
}

// Sitemap Configuration
interface SitemapEntry {
  loc?: string;
  lastmod?: string | Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  nested?: boolean;
  hreflang?: string;
  alternates?: { hreflang: string; href: string }[];
}

interface SitemapConfig {
  baseUrl?: string;
  url?: string;
  exclude?: Route[];
}

// Route Options
interface RouteOptions {
  sitemap?: boolean | SitemapEntry | ((route: Route) => string | SitemapEntry | (string | SitemapEntry)[] | Promise<string | SitemapEntry | (string | SitemapEntry)[]>);
}

// Router instance
interface Router {
  route(path?: string, options?: RouteOptions): Route;
  append(path: string, options?: RouteOptions): Route;
  catch(renderer: (props: { error: RouteError }) => ReactNode): void;
  sitemap(options?: SitemapConfig): Promise<string>;
  state: RouterState;
}

// Global navigation state (reactive — reads inside reactive boundaries auto-track)
interface RouterState {
  activating: boolean;  // True while any route is being activated
  progress: number;     // Number of completed steps
  steps: number;        // Total steps in current activation
}

// Route chain
interface Route {
  route(path: string, options?: RouteOptions): Route;
  guard(fn: (ctx: { params, query }) => void | Promise<void>): Route;
  provide(name: string, fn: (ctx: { params, query, data, signal }) => unknown, options?: ProviderOptions): Route;
  provide(providers: Record<string, (ctx) => unknown>, options?: ProviderOptions): Route;
  render(renderer: (props: { state, context, children }) => ReactNode): Route;
  renderAsync(loader: () => Promise<(props: { state, context, children }) => ReactNode>, fallback?: (props: { state, context, children }) => ReactNode): Route;
  catch(renderer: (props: { error, state, context }) => ReactNode): void;
}

// ContextReader — the `state` prop passed to page renderers (reactive)
interface ContextReader {
  active: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  resolved: boolean;
  resolving: Set<string>;      // Names of providers currently resolving
  authenticated: boolean;
  authenticating: boolean;
  data: Record<string, unknown>;
  error?: RouteError;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
}

// Page and Modal component factories
function page(route: Route): RouteComponent;   // Standard page
function modal(route: Route): RouteComponent;  // Renders as overlay without unmounting background

// Conditional rendering
function Show<T>(props: { when: T | (() => T); children: ReactNode | ((value: T) => ReactNode); fallback?: () => ReactNode }): ReactNode;

// List rendering
function For<T>(props: { each: T[] | (() => T[]); children: (item: T, index: number) => ReactNode; fallback?: ReactNode }): ReactNode;

// Navigation
function redirect(route: Route, params?: object, query?: object): Redirect; // Throw from guards

// Cache duration constants (milliseconds)
const MAX_AGE = { SECOND: 1000, MINUTE: 60000, HOUR: 3600000, DAY: 86400000, WEEK: 604800000, MONTH: 2592000000, YEAR: 31536000000 };
```

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
// Catches any unhandled RouteError (NotFoundError, GuardError, ProviderError, etc.)
import { NotFoundError, GuardError } from '@anchorlib/react';

router.catch(({ error }) => {
  if (error instanceof NotFoundError) return <h1>404 - Page Not Found</h1>;
  if (error instanceof GuardError) return <h1>403 - Access Denied</h1>;
  
  return <h1>500 - Internal Server Error</h1>;
});
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
profileRoute.catch(({ error }) => {
  if (error instanceof GuardError) return <div>Access Denied: {error.message}</div>;
  return <div>Profile failed to load: {error.message}</div>;
});
```

### Route Chain (Guards & Providers)
URL paths, access control (`guard`), and data loaders (`provide`) live in the exact same fluent chain. Guards and Providers execute *before* the component renders.

Use `.provide({ ... })` to execute multiple data fetchers in parallel (preferred).

```typescript
export const profileRoute = usersRoute
  .route('/:user_id')
  .guard(() => {
    // Rejects navigation out-of-band before rendering
    if (!isAuthenticated()) throw redirect(loginRoute);
  })
  .provide({
    // Object syntax executes providers in PARALLEL
    profile: ({ params }) => getUserProfile(params.user_id),
    notifications: ({ params }) => getUserNotifications(params.user_id)
  });
```

### Abort Signals & Network Cancellation
The provider context includes a standard `AbortSignal`. The router automatically triggers this signal if a parallel sibling throws an error or if the user navigates away before the fetch completes. Pass it to native `fetch()` calls to prevent wasted bandwidth.

```typescript
export const searchRoute = rootRoute
  .route('/search')
  .provide('results', async ({ query, signal }) => {
    // Pass the signal down to native fetch to enable auto-cancellation
    const response = await fetch(`/api/search?q=${query.q}`, { signal });
    if (!response.ok) throw new ProviderError('Search failed');
    return response.json();
  });
```

### Parallel & Reactive Guards
Multiple `.guard()` calls on a single route execute in parallel. Guards are inherently reactive. If a guard reads from any reactive state, it automatically re-evaluates when that state changes, ejecting the user immediately if access is revoked in the background.

```tsx
import { mutable, redirect } from '@anchorlib/react';
import { checkRole } from '../services/auth.js';

export const systemState = mutable({ inMaintenance: false });

export const dashboardRoute = rootRoute
  .route('/dashboard')
  // Reactive Guard: Auto-ejects user if maintenance mode is toggled on globally
  .guard(() => {
    if (systemState.inMaintenance) throw redirect(maintenanceRoute);
  })
  // Parallel Guard: Runs concurrently with the guard above
  .guard(async () => {
    const user = await checkRole();
    if (user.role !== 'admin') throw redirect(loginRoute);
  });
```

### Redirects & Route Errors
To bounce a user, throw `redirect()`. It accepts route objects or page components. If you throw a standard `Error` (or specific `RouteError` like `GuardError` or `ProviderError`), navigation halts and the error surfaces to `state.error` for in-place rendering.

```tsx
import { redirect, GuardError } from '@anchorlib/react';

export const settingsRoute = dashboardRoute
  .route('/settings')
  .guard(() => {
    // Redirect to a static route component
    if (!isLoggedIn) throw redirect(SignInPage);

    // Redirect to a dynamic route with type-safe params
    if (!hasProfile) throw redirect(profileRoute, { user_id: '42' });

    // Throwing an Error halts navigation and exposes it to state.error
    if (!hasBilling) throw new GuardError('Billing access restricted.');
  });
```

When a guard or provider throws an error, you can render it cleanly inside the layout instead of relying on a fallback error boundary:

```tsx
export const SettingsLayout = page(settingsRoute).render(({ state, children }) => render(() => {
  // If the guard or provider threw an Error, render the error barrier directly
  if (state.error) {
    return <div className="error">Failed: {state.error.message}</div>;
  }

  // Otherwise render the authorized nested routes
  return <main>{children}</main>;
}));
```

### Authentication State & Exceptions
The router strictly enforces authentication state at the route level. The `Route` object exposes an `authenticated` getter (reading from `route.state.authenticated`). If a route is marked as unauthenticated (`route.authenticated === false`), the router will bypass the route's normal children and automatically render the `catch` component instead.

```tsx
export const ProtectedLayout = page(dashboardRoute)
  .render(({ children }) => <main>{children}</main>)
  .catch(() => (
    <div className="error-barrier">
      <h2>Please log in to continue</h2>
    </div>
  ));
```

### Sequential & Dependent Providers
Each `.provide()` call executes in sequence. Providers within the same `.provide({})` call execute in parallel. Downstream providers can access the `data` resolved by upstream `.provide()` calls in the chain.

Providers are inherently reactive. If the URL `params` or `query` changes, the provider automatically re-runs. If a provider reads any reactive state (such as a `mutable` or `derived`), it automatically re-runs when that state changes.

```typescript
export const postsRoute = usersRoute
  .route('/:user_id/posts')
  .provide('user', async ({ params }) => {
    return fetchUser(params.user_id);
  })
  .provide('posts', async ({ data }) => {
    // `data.user` is fully resolved and type-safe here
    return fetchUserPosts(data.user.id);
  });
```

### Data-Driven Skeletons
Instead of maintaining separate JSX markup for loading skeletons, a provider can synchronously return a local reactive `mutable` containing skeleton data. It can then safely mutate that same object in the background when the real fetch resolves. The View simply renders the data it's given and toggles CSS classes based on the skeleton flag.

```typescript
export const profileRoute = usersRoute
  .route('/:user_id')
  .provide('profile', (ctx) => {
    // 1. Create a local reactive object synchronously
    const profile = mutable({ isSkeleton: true, name: 'Loading...' });

    // 2. Fetch in the background and mutate the local object
    fetchUser(ctx.params.user_id).then(realUser => {
      Object.assign(profile, { ...realUser, isSkeleton: false });
    });

    // 3. Return the reactive object immediately to prevent router blocking
    return profile;
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
    {/* Global pending status (first-time load) */}
    <Show when={() => state.status === 'pending'}>
      <div>Loading full profile...</div>
    </Show>

    {/* Safely unwraps truthy data with perfect TypeScript inference */}
    <Show when={() => state.data.profile}>
      {({ name, email }) => (
        <div>
          <h1>{name}</h1>
          <p>{email}</p>

          {/* Granular, provider-specific loading indicator for background refetches */}
          <Show when={() => state.resolving.has('notifications')}>
            <span className="spinner">Updating notifications...</span>
          </Show>
        </div>
      )}
    </Show>
  </>
));
```

### Route-Level Code Splitting (Lazy Loading)
Use `.renderAsync()` to lazily load the component's JavaScript bundle. The router executes `.renderAsync()` in the background in parallel with data providers during route activation.

```tsx
// routes/users/[user_id]/page.tsx
import { page } from '@anchorlib/react';
import { profileRoute } from './route.js';

export const ProfilePage = page(profileRoute).renderAsync(
  async () => {
    // The router downloads this JS bundle at the exact same time
    // it starts fetching the route's provider data!
    const { ProfileComponent } = await import('./ProfileComponent.tsx');
    
    // Returns a standard renderer function, exactly like `.render()`.
    // Use $use() to maintain reactivity so the component updates if data changes.
    return ({ state }) => <ProfileComponent profile={$use(() => state.data.profile)} />;
  },
  // Optional Fallback: Displayed if `renderMode: 'immediate'` is used 
  // while the JavaScript bundle is still downloading. It receives the exact same context as `.render()`.
  ({ state }) => <div className="skeleton-ui">Loading profile for user {state.params.user_id}...</div>
);
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
      {/* Basic static link. Automatically gets aria-current="page" when active. 
          Index routes are exactly matched by default. Use fullMatch={false} to keep it active for children. */}
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

      {children}
    </div>
  );
}));
```

### Sitemap Generation
Anchor Router automatically intercepts `/sitemap.xml` in SSR and deeply collects all static routes.

- **Exclusion**: To globally exclude a route and its children, pass `{ sitemap: false }` to its route options: `root.route('/admin', { sitemap: false })`.
- **Custom Attributes**: Pass an object to set prioritization or change frequency: `root.route('/pricing', { sitemap: { priority: 0.9, changefreq: 'weekly' } })`.
- **Dynamic Routes**: You MUST provide a generator function for dynamic routes.
  - **CRITICAL**: The generator receives the route instance. You MUST use `route.url(params)` to generate the path.
  - **NEVER** hardcode the parent path strings inside the generator.
  ```tsx
  const postRoute = root.route('/posts/:id', {
    sitemap: async (route) => {
      const posts = await fetchPosts();
      // MUST use route.url() to generate context-aware paths
      return posts.map(post => route.url({ id: post.id }));
    }
  });
  ```
- **Language / Alternates**: To generate multi-lingual sitemaps with `<xhtml:link>` cross-linking, pass `{ nested: true, hreflang: 'en' }` from the language prefix route. This automatically propagates the alternate tags to all children.
  ```tsx
  const langRoute = root.route('/:lang', {
    sitemap: () => [
      { loc: '/en', nested: true, hreflang: 'en' },
      { loc: '/id', nested: true, hreflang: 'id' },
    ]
  });
  // langRoute.route('/about') automatically gets /en/about and /id/about with alternates!
  ```
- **Configuration**: To set the global absolute `baseUrl`, pass it directly to the `createSSR` configuration block (or Vite options).
