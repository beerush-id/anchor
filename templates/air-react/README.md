# my-air-react

AirLib for React — **Vite SSR + IRPC Starter**

## What's Included

- **Anchor** — fine-grained reactive state management
- **IRPC** — isomorphic RPC with HTTP + WebSocket transport
- **Router** — file-based routing with MDX support
- **Vite** — fast HMR and production builds

## Scripts

```bash
bun run dev       # Start dev server
bun run build     # Build for production
bun run start     # Run production worker (Bun)
bun run start:node  # Run with Node.js
bun run start:bun   # Run with Bun
bun run start:deno  # Run with Deno
```

## Project Structure

```
src/
  app.tsx          # App entry (UIRouter)
  router.ts        # Router instance
  api.ts           # IRPC transport setup
  client.tsx       # Client-side hydration
  worker.ts        # Server worker with IRPC routers
  app.css          # Global styles
  components/      # Reusable components
  pages/           # File-based routes
```

## Learn More

- [AirLib](https://airlib.dev/)
- [Vite](https://vite.dev/)
- [React](https://react.dev/)