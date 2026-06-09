---
title: 'AIR Stack: Installation'
description: 'Learn how to install the AIR Stack packages: Anchor, Router, and IRPC.'
keywords:
  - AIR Stack installation
  - Anchor installation
  - IRPC installation
  - Router installation
---

# Installation

The AIR Stack is modular. You can start with our official templates or install only the layers you need for your application.

## Starter Templates

The fastest way to get started is by using our official templates. We provide pre-configured templates for different architectures:

### 1. Full Stack Project
Combines both the frontend UI (SSR and Client Hydration) and the execution logic into a single unified repository.

::: code-group
```bash [Bun]
bunx degit beerush-id/airstack/templates/air-react my-air-app
```
```bash [NPX]
npx degit beerush-id/airstack/templates/air-react my-air-app
```
:::

### 2. Frontend Project with SSR
A strict SSR application. Used when your UI requires server-side rendering, but your core APIs and databases are handled externally.

::: code-group
```bash [Bun]
bunx degit beerush-id/airstack/templates/react-ssr my-ssr-app
```
```bash [NPX]
npx degit beerush-id/airstack/templates/react-ssr my-ssr-app
```
:::

### 3. Standalone API
A dedicated service providing universal IRPC endpoints for external clients to consume, completely independent of any UI layer.

::: code-group
```bash [Bun]
bunx degit beerush-id/airstack/templates/irpc-bun-starter my-api
```
```bash [NPX]
npx degit beerush-id/airstack/templates/irpc-bun-starter my-api
```
:::

## Project Structure & Conventions

When using the templates or building a full-stack AIR application, we recommend the following file and folder conventions to keep your codebase organized:

- `lib/views/`: View files that render state as is.
- `lib/components/`: Component files that own states, behaviors, or side effects.
- `lib/actions/`: Headless state factories, headless logic factories, and headless action references.
- `lib/module.ts`: IRPC package configuration, defining transports and environments.
- `lib/router.ts`: Router instance declaration.
- `pages/(**/)route.ts`: Configures the route path, including guards and/or providers when needed.
- `pages/(**/)function.ts`: Declares function signatures (stub), types, and/or schemas.
- `pages/(**/)constructor.ts`: Implements the execution logic that fulfills the stub.
- `pages/(**/)workflow.ts`: Defines complex multi-step operations.
- `styles/index.css`: Entry point for CSS imports.
- `styles/theme.css`: Design system and CSS variables.
- `styles/utilities.css`: Tailwind CSS custom utilities.

A feature directory (e.g., inside `pages/`) may contain all of these files, or only a subset (e.g., only `route.ts` and `page.tsx`).

## Manual Installation

The core packages contain the state engine, routing engine, and network transport. They are entirely framework-agnostic.

::: code-group

```bash [Bun]
bun add @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http
```

```bash [NPM]
npm install @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http
```

```bash [Yarn]
yarn add @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http
```

```bash [PNPM]
pnpm add @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http
```

:::

## View Integrations

To bind the reactive graph to the DOM, install the integration package for your view framework.

### React

::: code-group

```bash [Bun]
bun add @anchorlib/core @anchorlib/router @anchorlib/react
```

```bash [NPM]
npm install @anchorlib/core @anchorlib/router @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/core @anchorlib/router @anchorlib/react
```

```bash [PNPM]
pnpm add @anchorlib/core @anchorlib/router @anchorlib/react
```

:::

### SolidJS

::: code-group

```bash [Bun]
bun add @anchorlib/core @anchorlib/router @anchorlib/solid
```

```bash [NPM]
npm install @anchorlib/core @anchorlib/router @anchorlib/solid
```

```bash [Yarn]
yarn add @anchorlib/core @anchorlib/router @anchorlib/solid
```

```bash [PNPM]
pnpm add @anchorlib/core @anchorlib/router @anchorlib/solid
```

:::

## Next Steps

After installation, choose a module to begin integrating:

- [Getting Started](/getting-started) - Build your first application using the full AIR Stack.
- [Router](/routing/) - Set up your URL and state-driven routing.
- [IRPC](/irpc/) - Configure your isomorphic network transport.
- [React Guide](/react/getting-started) - Specific bindings for React.
- [Solid Guide](/solid/getting-started) - Specific bindings for SolidJS.

## Need Help?

If you encounter issues during installation:

1. Check the [FAQ](/faq) for common issues
2. Open an issue on [GitHub](https://github.com/beerush-id/airstack/issues)
3. Join our community Discord for real-time support
