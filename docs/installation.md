# Installation

To get started with Anchor, you'll need to install the appropriate packages for your project. Anchor is distributed as a
collection of modular packages, allowing you to only install what you need.

## Prerequisites

Before installing Anchor, ensure your environment meets these requirements:

- **JS Runtime**: **Node.js** v18 or higher, **Bun** v1.0 or higher, **Deno** v1.33 or higher, etc.
- **Package Manager**: [npm](https://www.npmjs.com/), [Yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/),
  or [Bun](https://bun.sh/)
- **ESM Support**: Anchor is ESM-only, so your project must support ECMAScript Modules

## Core Package

The core package contains the essential state management functionality including the DSV model, true immutability, and
fine-grained reactivity.

::: code-group

```sh [Bun]
bun add @anchor/core
```

```sh [NPM]
npm install @anchor/core
```

```sh [Yarn]
yarn add @anchor/core
```

```sh [PNPM]
pnpm add @anchor/core
```

:::

## TypeScript Support

Anchor is written in TypeScript and comes with comprehensive type definitions. No additional setup is required for
TypeScript support.

## Tree Shaking

Anchor fully supports tree shaking. Unused exports will be automatically removed during the build process, resulting in
smaller bundle sizes.

## Caveats

1. **ESM Only**: Anchor is distributed exclusively as ECMAScript Modules. CommonJS is not supported.

2. **Modern JavaScript Required**: Anchor requires modern JavaScript features like Proxy, WeakMap, and WeakSet. It's
   compatible with modern browsers and Node.js 18+.

3. **Framework Versions**: Ensure your framework version is compatible with the respective Anchor binding:

- React: 16.8 or higher (hooks required)
- Vue: 3.0 or higher
- Svelte: 3.0 or higher

4. **Bundle Size**: While Anchor is optimized for tree shaking, including multiple packages can increase your bundle
   size. Only install packages you actually need.

5. **TypeScript**: While TypeScript is supported out of the box, using the latest TypeScript version is recommended for
   the best experience.
