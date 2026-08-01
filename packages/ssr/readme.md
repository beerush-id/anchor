# @anchorlib/ssr

A framework-agnostic Server-Side Rendering core for the AIR stack. Part of the Anchor library ecosystem.

## Features

- **Unified Configuration** - Centralized SSR worker and UI orchestrator via `createApp`
- **Dependency Inverted UI** - Pure logic core entirely decoupled from React/Solid syntax
- **Generic Asset Resolution** - Resolves and serves assets across Bun, Node, Deno, and Cloudflare
- **IRPC Orchestration** - Seamlessly integrates with `@irpclib/http` routers via structural typing

## Installation

```bash
npm install @anchorlib/ssr
# or
bun add @anchorlib/ssr
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
