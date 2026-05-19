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

The AIR Stack is modular. You only install the layers you need for your application.

## Core Packages

The core packages contain the state engine, routing engine, and network transport. They are entirely framework-agnostic.

::: code-group

```bash [Bun]
bun add @anchorlib/core @anchorlib/router @irpclib/irpc
```

```bash [NPM]
npm install @anchorlib/core @anchorlib/router @irpclib/irpc
```

```bash [Yarn]
yarn add @anchorlib/core @anchorlib/router @irpclib/irpc
```

```bash [PNPM]
pnpm add @anchorlib/core @anchorlib/router @irpclib/irpc
```

:::

## View Integrations

To bind the reactive graph to the DOM, install the integration package for your view framework.

### React

::: code-group

```bash [Bun]
bun add @anchorlib/react
```

```bash [NPM]
npm install @anchorlib/react
```

```bash [Yarn]
yarn add @anchorlib/react
```

```bash [PNPM]
pnpm add @anchorlib/react
```

:::

### SolidJS

::: code-group

```bash [Bun]
bun add @anchorlib/solid
```

```bash [NPM]
npm install @anchorlib/solid
```

```bash [Yarn]
yarn add @anchorlib/solid
```

```bash [PNPM]
pnpm add @anchorlib/solid
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
2. Open an issue on [GitHub](https://github.com/beerush-id/anchor/issues)
3. Join our community Discord for real-time support
