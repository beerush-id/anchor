## Library Authoring with AIR Stack

> **Core IRPC patterns** (Adapters, Drivers, Context-based library config, Client SDKs, Export Maps) are covered in `skills/air-irpc/contents/library-authoring.md`. This file covers React-specific library authoring: bundling UI components, JSX compilation, peer dependencies, and package configuration.

Building a reusable library using the AIR Stack (Anchor, IRPC, Router) requires specific configurations to ensure your library is consumable by both client and server applications, preserves reactivity, and bundles correctly.

### Core Architecture
Libraries in the AIR Stack are typically built using standard ESM modules. They export:
- Reactive primitives (e.g., `mutable`, `computed`, `headless factories`, etc.)
- Workflows and specialized state coordinators
- IRPC Declarations (Stubs) for type-safe API boundaries
- UI Views and Components

### Isolating Side Effects

When authoring libraries, side-effects (like `irpc.construct()`) must never run accidentally when a client imports a type or a stub.

- **Stubs (`index.ts`)**: Export your IRPC `declare` stubs here. Clients import this file for type-safe API boundaries.
- **Implementations (`server.ts` or `constructor.ts`)**: Keep `irpc.construct()` handlers here.

This ensures the client bundler never pulls in server-only dependencies (like databases or secrets).

### Package Files
Make sure every package has a single entry point, which is the `index.ts` file, that exports all the public APIs of the package. The bare minimum publishable package has the following files:

```
- src/
  - index.ts
- test/
  - index.spec.ts
- .gitignore
- .npmignore
- biome.json
- package.json
- README.md
- tsconfig.json
- tsdown.config.ts
- vitest.config.ts
```

### Bundling and Distribution
We typically use `tsdown` or `tsup` for bundling.

**Best Practices:**
1. **Preserve JSX/Directives**: If your library contains UI components, ensure you compile JSX/TSX appropriately or distribute raw files for the consumer's bundler to process.
2. **Export Maps**: Use `exports` in your `package.json` to clearly define public entry points (e.g., separating client components from server-only logic).
3. **Peer Dependencies**: List `@airlib/core` or `@airlib/react` as `peerDependencies` instead of `dependencies` to prevent multiple versions of reactivity engines from running simultaneously in the consumer's app.

### Example `package.json` setup for a Library
```json
{
  "name": "@namespace/library-name",
  "description": "A short description of what this package does",
  "author": "Your Name <[EMAIL_ADDRESS]>",
  "keywords": [],
  "license": "ISC",
  "version": "1.0.0",
  "type": "module",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./adapter": {
      "types": "./dist/adapter.d.ts",
      "import": "./dist/adapter.js"
    },
    "./drivers/*": {
      "types": "./dist/drivers/*/index.d.ts",
      "import": "./dist/drivers/*/index.js"
    },
    "./constructor": {
      "types": "./dist/constructor.d.ts",
      "import": "./dist/constructor.js"
    }
  },
  "peerDependencies": {
    "@airlib/react": "^1.0.0",
    "@irpclib/irpc": "^1.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "catalog:",
    "@types/bun": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "@vitest/ui": "catalog:",
    "publint": "catalog:",
    "rimraf": "catalog:",
    "tsdown": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:"
  },
  "scripts": {
    "dev": "rimraf dist && tsdown --watch ./src",
    "clean": "rimraf dist",
    "build": "rimraf dist && tsdown && publint",
    "test": "rimraf coverage && vitest --run",
    "test:preview": "rimraf coverage && vitest --run && vite preview --outDir coverage",
    "prepublish": "tsdown && publint",
    "format": "biome format --write"
  }
}
```

### Example `tsconfig.json` for a Library
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "./src",
    "outDir": "./dist",
    "allowImportingTsExtensions": true,
    "allowJs": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "lib": ["ESNext", "DOM"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "nodenext",
    "noEmit": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tsdown.config.ts"]
}
```

### Example `tsdown.config.ts` for a Library
```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  dts: true,
  clean: false,
  target: false,
  minify: false,
  format: ['esm'],
  unbundle: true,
  platform: 'node',
});
```

### Example `vitest.config.ts` for a Library
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    setupFiles: ['./test/setup.ts'],
    reporters: ['default', 'html'],
    outputFile: './coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
```
