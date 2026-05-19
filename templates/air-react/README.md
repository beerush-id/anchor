# Anchor for React — Vite SSR Starter

A production-ready starter for React applications powered by [Anchor](https://airlib.dev)'s reactive runtime, with Vite SSR out of the box.

Anchor is a logic-first reactive system. You write business logic — define data, mutate state, declare what depends on what — and the UI updates itself. No hooks, no dependency arrays, no re-render optimization. You spend your time solving the problem, not managing the framework.

## Quick Start

```bash
bun install
bun run dev
# → http://localhost:5173
```

## Project Structure

```
├── server.ts                # Express + Vite SSR dev server
├── index.html               # HTML shell with SSR outlet
├── src/
│   ├── entry-client.tsx     # Client hydration — @anchorlib/react/client init
│   ├── entry-server.tsx     # SSR render — isolation, lifecycle, headless routing
│   ├── lib/
│   │   └── router.ts        # Router instance
│   ├── pages/
│   │   ├── route.ts          # Route tree (root + index)
│   │   ├── layout.tsx        # Root layout — Header + main + Footer
│   │   ├── page.tsx          # Home page — Counter demo
│   │   └── about/
│   │       ├── route.ts      # /about route
│   │       ├── page.tsx      # About page
│   │       └── index.ts      # Barrel export
│   ├── components/
│   │   ├── Header.tsx        # App header with navigation
│   │   └── Footer.tsx        # App footer
│   ├── assets/               # SVG logos
│   └── styles/
│       └── styles.css        # TailwindCSS + design system
├── vite.config.ts            # React + Tailwind plugins, SSR build config
├── biome.json                # Linter + formatter
└── tsconfig.json             # TypeScript project references
```

## Key Patterns

### Reactive State

```tsx
import { setup, render, mutable } from '@anchorlib/react';

const Counter = setup(() => {
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  return render(() => (
    <button onClick={increment}>count is {state.count}</button>
  ));
}, 'Counter');
```

`setup()` runs once — it's a constructor, not a render function. `mutable()` creates a reactive proxy. Mutate it directly; the `render()` fragment tracks state reads and re-evaluates only when those specific values change.

### Views

```tsx
import { template } from '@anchorlib/react';

const Footer = template(() => (
  <footer>Built with Anchor + Vite + React</footer>
), 'Footer');
```

`template()` creates a reactive boundary for views that don't own state. It tracks any reactive reads in its body and re-renders when they change — but it doesn't create its own `mutable()`, `effect()`, or lifecycle scope.

### SSR Routing

Routes are defined in `route.ts` files, views in `page.tsx` / `layout.tsx`:

```tsx
// pages/route.ts
export const rootRoute = router.route();
export const indexRoute = rootRoute.route('/');

// pages/page.tsx
export const HomePage = page(indexRoute).render(() => <Home />);
```

Navigation uses type-safe `<Link>` components:

```tsx
<Link to={AboutPage}>About</Link>
```

## Adding IRPC (Full-Stack)

To add type-safe remote functions with automatic batching, caching, and streaming:

```bash
bun add @irpclib/irpc @irpclib/http
```

See the [AIR Stack documentation](https://docs.airlib.dev) for the full Anchor + IRPC + React architecture.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start SSR dev server with HMR |
| `bun run build` | Build client + server bundles |
| `bun run preview` | Preview production build |

## Links

- [AIR Stack](https://airlib.dev)
- [Documentation](https://docs.airlib.dev)
- [GitHub](https://github.com/beerush-id/anchor)
