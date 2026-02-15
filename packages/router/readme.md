# @anchorlib/router

A type-safe, reactive router for JavaScript and TypeScript applications. Part of the Anchor library ecosystem.

## Features

- **Type-Safe Routing** - Full TypeScript support with automatic type inference for route parameters and query strings
- **Nested Routes** - Build hierarchical route structures with parent-child relationships
- **Route Guards** - Protect routes with authentication and authorization checks
- **Data Providers** - Load data asynchronously when routes activate
- **Smart Caching** - LRU cache for URL matching with time-based expiration for provider data
- **Reactive** - Integrates with `@anchorlib/core` for reactive state management
- **Preloading** - Prefetch route data before navigation for instant transitions
- **Redirects** - Declarative redirect handling with guard integration

## Installation

```bash
npm install @anchorlib/router
# or
bun add @anchorlib/router
```

## Quick Start

```ts
import { createRouter, redirect } from '@anchorlib/router';

// Create a router instance
const router = createRouter({ baseUrl: 'https://example.com' });

// Define routes
const homeRoute = router.route('/');
const usersRoute = router.route('/users');
const userRoute = usersRoute.route('/:id');

// Add guards for authentication
userRoute.guard(async ({ params }) => {
  if (!await isAuthenticated()) {
    throw redirect(loginRoute);
  }
});

// Add data providers
userRoute.provide('user', async ({ params }) => {
  return await fetchUser(params.id);
});

// Activate a route
await router.activate('/users/123');

// Access active route data
console.log(router.data.user);
console.log(router.params.id);     // '123'
console.log(router.path);          // 'users/:id'
```

## API Reference

### Router

The main router class for managing routes and navigation.

```ts
import { Router, createRouter } from '@anchorlib/router';

// Create via constructor
const router = new Router({
  baseUrl: 'https://example.com',
  cacheSize: 100,
  maxAge: 60000
});

// Or use the factory function
const router = createRouter({ baseUrl: 'https://example.com' });
```

#### Router Methods

| Method | Description |
|--------|-------------|
| `route(path, options?)` | Creates a new route at the given path |
| `find(url)` | Finds a matching route for the given URL |
| `activate(url)` | Activates the route matching the URL |
| `deactivate()` | Deactivates all currently active routes |
| `preload(url)` | Preloads route data without activating |

#### Router Properties

| Property | Description |
|----------|-------------|
| `activeRoute` | The currently active route |
| `activeContext` | Shared context with params, query, and data |
| `activeSegments` | Array of active route segments |
| `path` | The active route's path |
| `data` | The active route's loaded data |
| `query` | The active route's query parameters |
| `params` | The active route's path parameters |

### Route

Represents a single route with guards, providers, and nested routes.

```ts
// Create nested routes
const usersRoute = router.route('/users');
const userRoute = usersRoute.route('/:id');
const postsRoute = userRoute.route('/posts');

// Index routes
const indexRoute = usersRoute.route('/'); // Matches '/users' exactly
```

#### Route Methods

| Method | Description |
|--------|-------------|
| `route(path, options?)` | Creates a child route |
| `guard(handler)` | Adds a navigation guard |
| `provide(name, provider, options?)` | Adds a data provider |
| `url(params?, query?)` | Generates a URL for this route |
| `preload(context)` | Preloads route data |
| `authenticate(context)` | Runs all guards |

#### Route Properties

| Property | Description |
|----------|-------------|
| `active` | Whether the route is currently active |
| `data` | Loaded data for this route |
| `params` | Route parameters (when active) |
| `query` | Query parameters (when active) |
| `path` | Full path including parent paths |
| `name` | Route segment name |
| `type` | Route type (static, dynamic, wildcard) |

### Route Types

Routes are automatically classified by their path pattern:

```ts
import { ROUTE_TYPE } from '@anchorlib/router';

// Static route - fixed path
router.route('/users'); // type: ROUTE_TYPE.STATIC

// Dynamic route - parameterized
router.route('/:id'); // type: ROUTE_TYPE.DYNAMIC

// Wildcard route - catches all remaining segments
router.route('/*'); // type: ROUTE_TYPE.WILDCARD
```

### Guards

Guards protect routes from unauthorized access. Throw a `Redirect` or `Error` to block navigation.

```ts
import { redirect } from '@anchorlib/router';

route.guard(async ({ params, query }) => {
  // Check authentication
  if (!await isAuthenticated()) {
    throw redirect(loginRoute, { returnTo: router.activeRoute?.path });
  }
  
  // Check authorization
  if (!hasPermission(params.id)) {
    throw new Error('Access denied');
  }
});
```

### Data Providers

Providers load data when routes activate. Data is available in the active context.

```ts
// Simple provider
route.provide('user', async ({ params }) => {
  return await fetchUser(params.id);
});

// With caching and retry options
route.provide('posts', async ({ params }) => {
  return await fetchPosts(params.id);
}, {
  maxAge: 30000,    // Cache for 30 seconds
  retries: 3,       // Retry 3 times on failure
  retryDelay: 1000  // Wait 1s between retries
});
```

### Redirects

Create redirects to navigate programmatically or from guards.

```ts
import { redirect, redirectUrl, setRedirectHandler } from '@anchorlib/router';

// Create a redirect
const r = redirect(loginRoute, { returnTo: '/dashboard' });

// Get the redirect URL
const url = redirectUrl(r); // '/login?returnTo=/dashboard'

// Set up redirect handling
setRedirectHandler((redirect) => {
  window.location.href = redirectUrl(redirect);
});

// Use in guards
route.guard(async () => {
  if (!isAuthenticated()) {
    throw redirect(loginRoute);
  }
});
```

### Caching

The router includes two caching mechanisms:

1. **URL Cache** - LRU cache for matched routes (configurable size)
2. **Provider Cache** - Time-based expiration for provider data

```ts
const router = createRouter({
  cacheSize: 100,  // Max 100 URLs cached
  maxAge: 60000    // Provider data cached for 60s
});
```

## Type Inference

The router provides full type inference for parameters:

```ts
// Path params are automatically typed
const userRoute = usersRoute.route('/:id');
// params: { id: string }

const postRoute = userRoute.route('/posts/:postId');
// params: { id: string, postId: string }

// Query params can be typed in the path
const searchRoute = router.route('/search?q(string)&page(number)');
// query: { q?: string, page?: number }

// Provider data is accumulated
userRoute.provide('user', async ({ params }) => {
  return { name: 'John', email: 'john@example.com' };
});
// data: { user: { name: string, email: string } }
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development mode with watch |
| `build` | Build for production |
| `test` | Run tests with Vitest |
| `test:preview` | Run tests and preview coverage |
| `format` | Format code with Biome |

## License

MIT
