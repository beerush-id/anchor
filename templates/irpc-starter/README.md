# my-irpc-api

Standalone **Isomorphic RPC (IRPC) API Starter**

## What's Included

- **IRPC** — isomorphic RPC with HTTP + WebSocket transport
- **TypeScript** — end-to-end type safety
- **tsdown** — fast library bundling

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
└── src/
    ├── api/           # IRPC domain handlers and stubs
    │   ├── constructor.ts # Main handlers export
    │   └── index.ts       # Main stubs export
    ├── lib/
    │   ├── index.ts       # Shared library exports
    │   └── module.ts      # IRPC package configuration
    ├── constructor.ts # Server entry point (Handlers)
    ├── index.ts       # Library entry point (Stubs)
    └── worker.ts      # Server worker with HTTP/WS transports
```

## Quick Guides

### The IRPC Mental Model
AirLib's Isomorphic RPC cleanly separates your public API signature from its secure implementation:

- **Stubs (`index.ts`)**: The public interface. These are your `irpc.declare()` signatures that define the shape of your API. The client only ever imports the stubs to get end-to-end type safety.
- **Handlers (`constructor.ts`)**: The secure backend implementation. These are your `irpc.construct()` functions that execute on the server.

### Module Configuration
The `lib/module.ts` file acts as the bridge. It configures the core transport (e.g. HTTP, WebSocket, dynamic env variables) used by the client when they call your stubs.

## Learn More

- [AirLib](https://airlib.dev/)
