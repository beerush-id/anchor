# @airlib/vite

Vite plugin that handles SSR rendering and IRPC routing for AIR Stack applications.

## Features

- **SSR + IRPC** — Server-side rendering and RPC handling in one plugin
- **Zero Boilerplate** — No manual server entry or renderer wiring needed
- **Request Isolation** — Cookies, abort signals, and hooks scoped per request
- **Hot Module Replacement** — Edit handlers and components without restarting the server
- **Framework Agnostic** — Works with any renderer that exports `createSSR`

## Installation

```bash
npm install @airlib/vite
```

## Usage

```ts
// vite.config.ts
import { airSSR } from '@airlib/vite';

export default defineConfig({
  plugins: [
    react(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@airlib/react/ssr',
      irpc: {
        module: './src/lib/module.ts',
        handlers: ['./src/pages/constructor.ts'],
      },
    }),
  ],
});
```

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `router` | Yes | Path to the router module. Must `export default` a `Router` instance. |
| `layout` | Yes | Path to the root layout module. Must `export default` a `RouteComponent`. |
| `renderer` | Yes | Path to the renderer module (e.g., `'@airlib/react/ssr'`). Must export `createSSR`. |
| `irpc.module` | No | IRPC instance. String for default export, `{ path, name }` for named export. |
| `irpc.transport` | No | HTTP Transport instance. Same format as `module`. |
| `irpc.wsTransport` | No | WebSocket Transport instance. Same format as `module`. |
| `irpc.handlers` | No | Handler modules to load (e.g., `['./src/pages/constructor.ts']`). |
| `headTag` | No | Placeholder for rendered head. Defaults to `<!--ssr-head-->`. |
| `bodyTag` | No | Placeholder for rendered body. Defaults to `<!--ssr-outlet-->`. |

## License

MIT
