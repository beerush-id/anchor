---
title: "Server-Side Rendering (SSR)"
description: "How SSR works with React — the app entry, client hydration, and why activation runs before hydrating."
keywords:
  - anchor react
  - ssr
  - server-side rendering
  - hydration
  - isomorphic
---

# Server-Side Rendering (SSR)

React renders the same components on the server and in the browser — no `'use client'` boundary, no separate component trees. The SSR pipeline itself — the `airPages()` dev server, the `createApp` worker, static generation, caching, and running on each runtime — is covered in [Universal SSR](/ssr). This page covers the React side: the two entry points and what happens between the server render and the browser.

## The App Entry

The app entry is a single component that receives the URL and renders the router. The same component is used for SSR and hydration — the server passes the requested URL, the client passes the browser's.

```tsx
// src/app.tsx
import { type AppEntry, UIRouter } from '@anchorlib/react';
import RootLayout from './pages/layout.tsx';
import router from './router.ts';

export default (({ url }) => (
  <UIRouter router={router} root={RootLayout} url={url} />
)) satisfies AppEntry;
```

The `satisfies AppEntry` check keeps the entry's shape honest — a component receiving `{ url }` and returning the rendered router.

## The Client Entry

The client entry activates the route before hydrating, then enables live browser states.

```tsx
// src/client.tsx
import '@anchorlib/react/client'; // must be the first import

import { hydrateRoot } from 'react-dom/client';
import App from './app.js';
import router from './router.js';
import { acceptInteractions } from '@anchorlib/react/browser';

router
  .activate(window.location.href)
  .then(() => hydrateRoot(document.getElementById('root')!, <App />))
  .then(() => acceptInteractions());
```

::: tip What we learn
- The server already sent a complete page — the user sees content before any client code runs.
- Activation runs before hydration so every guard and provider is re-checked against the current state. A page whose guard no longer passes, or whose provider now fails, is never hydrated — the router handles it instead.
- `acceptInteractions()` is optional and enables the live browser states (see [Browser Utilities](/ui/browser.md)).
:::

## Why No Data Transfer During Hydration?

Traditional SSR frameworks serialize the server's state into a JSON blob (`window.__INITIAL_STATE__`) so the client can skip re-fetching. AIR Stack doesn't do that — the router is a reactive graph of states and dependencies, and a reactive graph can't be serialized and rebuilt faithfully.

Instead, activation runs natively on the client before hydration:

1. **The reactive graph reconnects.** Providers, loaders, and state nodes re-establish their reactive links against the real runtime.
2. **Guards are re-validated.** A guard that passed on the server is checked again at hydration time — the HTML is only trusted after the route still passes.
3. **No injection surface.** Carrying state in HTML is an XSS and state-injection vector. With nothing to inject, there's nothing to attack.

This does mean the client re-resolves the same data the server resolved moments ago. That request is usually served instantly — the server just answered it — and in exchange the HTML stays pure markup, paints immediately, and never hydrates into stale state.
