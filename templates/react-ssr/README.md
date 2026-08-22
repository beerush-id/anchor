# my-anchor-app

AirLib for React — **Vite SSR Starter (SSR Only)**

## What's Included

- **Anchor** — fine-grained reactive state management
- **Router** — file-based routing with MDX support
- **Vite** — fast HMR and production builds

## Scripts

```bash
bun run dev       # Start dev server
bun run build     # Build for production
bun run start     # Run production worker (Bun)
bun run start:node  # Run with Node.js
bun run start:deno  # Run with Deno
```

## Project Structure

```
├── components/      # Reusable components
├── pages/           # File-based routes
│   ├── about/       # Nested route example
│   ├── layout.tsx   # Shared UI wrapper
│   ├── page.tsx     # Route UI component
│   └── route.ts     # Route config (meta, guards, etc.)
└── src/
    ├── app.css      # Global styles
    ├── app.tsx      # App entry (UIRouter)
    ├── client.tsx   # Client-side hydration
    ├── router.ts    # Router instance
    └── worker.ts    # Server worker (SSR only)
```

## Quick Guides

### Imports
Always use the `@/` path alias to import files relative to the project root.

```typescript
import { SomeComponent } from '@/components/SomeComponent.tsx';
```

### Route Configuration
Use `route.ts` to configure route metadata, guards, providers, or rewrites.

```typescript
// pages/route.ts
import router from '@/src/router.js';
const route = router.route();

export const rootRoute = route
  .guard(async () => {
    // Add authentication checks here
  })
  .provide({
    // Inject route-level dependencies here
    user: async (ctx) => getUser(),
  });

// Example of a rewrite (redirect)
route.route('/old-path').rewrite(rootRoute);
```

## Learn More

- [AirLib](https://airlib.dev/)
- [Vite](https://vite.dev/)
- [React](https://react.dev/)