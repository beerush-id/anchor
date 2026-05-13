---
title: "Routing"
description: "File-based routing with Anchor for Solid — page factories, navigation, guards, error boundaries, and head management."
keywords:
  - anchor solid
  - routing
  - page
  - navigation
  - guards
  - head management
---

# Routing

Anchor provides a full routing system for Solid applications. Routes are defined programmatically using factory functions, with type-safe navigation and SSR support.

## Router Setup

Create a router instance typed for Solid's JSX output:

```typescript
// lib/router.ts
import { createRouter } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export const router = createRouter<JSX.Element>();
```

## Defining Routes

Routes are defined by chaining `.route()` calls from the router or from a parent route:

```typescript
// pages/route.ts
import { router } from '../lib/router.js';

export const rootRoute = router.route();
export const indexRoute = rootRoute.route('/');
```

Nested routes inherit the parent's path prefix:

```typescript
// pages/about/route.ts
import { rootRoute } from '../route.js';

export const aboutRoute = rootRoute.route('/about');
```

### Independent Top-Level Routes

Use `router.append()` to create top-level routes that are not nested under the root index route. This is useful for routes that need their own layout tree (e.g., authentication flows):

```typescript
// pages/auth/route.ts
import { router } from '../../lib/router.js';

export const authRoute = router.append('/auth');
```

Routes created with `.append()` are matched independently from the root route tree.

## Pages

The `page()` factory binds a route definition to a renderable component. The `.render()` callback receives the route state, a context reader, and children (for layout routes):

```tsx
// pages/page.tsx
import { page, Title, Meta } from '@anchorlib/solid';
import { indexRoute } from './route.js';

export const RootPage = page(indexRoute).render(() => (
  <>
    <Title>Home</Title>
    <Meta name="description" content="Welcome to the application." />

    <h1>Home</h1>
    <p>Welcome.</p>
  </>
));
```

### Layout Routes

Layout routes wrap child routes. The third argument (`children`) renders the matched child route:

```tsx
// pages/layout.tsx
import { page } from '@anchorlib/solid';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { rootRoute } from './route.js';

export const RootLayout = page(rootRoute).render((_state, _ctx, children) => {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
});
```

### Render Callback Arguments

| Argument | Type | Description |
|---|---|---|
| `state` | Route state | The reactive state for this specific route segment. |
| `context` | Context | The shared `RouterContext` across the entire active route tree. |
| `children` | `JSX.Element` | The child route's rendered output (layout routes only). |

All arguments are optional — omit what you don't need:

```tsx
// Page with no state or context needed
page(route).render(() => <div>Static page</div>);

// Layout using context
page(route).render((_, ctx, children) => {
  const isSignIn = derived(() => ctx.url?.endsWith('/signin'));
  return <div>{children}</div>;
});
```

## Navigation

### Link Component

The `<Link>` component navigates to route components. Pass the route's page component as the `to` prop:

```tsx
import { Link } from '@anchorlib/solid';
import { AboutPage } from '../pages/about/index.js';
import { RootPage } from '../pages/page.js';

<Link to={RootPage}>Home</Link>
<Link to={AboutPage} activeClass="nav-active">About</Link>
```

`activeClass` is applied when the link's target matches the current URL.

### Programmatic Navigation

Use `navigate()` for imperative navigation:

```typescript
import { navigate } from '@anchorlib/solid';
import { AboutPage } from '../pages/about/index.js';

navigate(AboutPage);
```

## Guards

Guards run before a route activates. Throw `redirect()` to block navigation and redirect:

```typescript
import { redirect } from '@anchorlib/solid';
import { SignInPage } from './signin/index.js';

// Redirect the bare /auth path to /auth/signin
authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});
```

Guards can also perform async checks:

```typescript
aboutRoute.guard(async () => {
  const user = await getSession();
  if (!user) {
    throw redirect(SignInPage);
  }
});
```

## Error Boundaries

### Global Error Boundary

Use `router.catch()` to define a fallback renderer for unmatched routes or global errors:

```tsx
import { router } from '../lib/router.js';

router.catch(() => {
  return (
    <div class="error-page">
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
});
```

### Per-Route Error Boundary

Use `.catch()` on individual routes to define route-specific error renderers:

```tsx
aboutRoute.catch((error) => {
  return (
    <div class="error">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
});
```

## Head Management

Anchor provides SSR-safe document head components that inject into the DOM on the client and collect into a `headings()` map during server rendering.

```tsx
import { Title, Meta } from '@anchorlib/solid';

export const AboutPage = page(aboutRoute).render(() => (
  <>
    <Title>About — My App</Title>
    <Meta name="description" content="About page description." />

    <h1>About</h1>
  </>
));
```

Available head components:

| Component | Description |
|---|---|
| `<Title>` | Sets the document title. |
| `<Meta>` | Adds a `<meta>` tag. |
| `<HeadLink>` | Adds a `<link>` tag (stylesheets, favicons). |
| `<Style>` | Adds an inline `<style>` block. |

During SSR, these components register into `headings()`. The server entry renders them into the `<head>`:

```tsx
import { headings } from '@anchorlib/solid';

const head = renderToString(() =>
  [...headings().values()].map(({ Renderer }) => <Renderer />)
);
```

## Cookie State

Anchor provides reactive state backed by browser cookies, with full SSR support. Import cookie utilities from the main entry point:

```typescript
import { cookies, getContext, setContext } from '@anchorlib/solid';

export function createSettings() {
  const settings = cookies<AppSettings>('app-settings', {
    theme: 'light',
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
  });

  setContext(APP_SETTINGS_KEY, settings);
  return settings;
}
```

`cookies()` creates a `mutable()` state that automatically synchronizes with `document.cookie` on the client. During SSR, it reads from the `CookieJar` injected via `setCookieContext()`.

## Next Steps

- [**SSR**](/solid/ssr) — Server-side rendering setup for Solid
- [**Getting Started**](/solid/getting-started) — State management basics
- [**FAQ**](/solid/faq) — Common questions
