## Library Authoring with AIR Stack

Building a reusable library using the AIR Stack (Anchor, IRPC, Router) requires specific configurations to ensure your library is consumable by both client and server applications, preserves reactivity, and bundles correctly.

### Core Architecture
Libraries in the AIR Stack are typically built using standard ESM modules. They export:
- Reactive primitives (e.g., `mutable`, `computed`, `headless factories`, etc.)
- Workflows and specialized state coordinators
- IRPC Declarations (Stubs) for type-safe API boundaries
- UI Views and Components

### Isolating Side Effects
When authoring libraries, ensure side-effects (like `irpc.construct()`) are explicit and don't automatically execute just by importing a type or a stub.

- **Stubs vs Implementations**: Export your IRPC `declare` stubs in `index.ts` so clients can import them safely, but keep `irpc.construct()` handlers in a separate `server.ts` or `constructor.ts` file. This ensures the client bundler never accidentally pulls in server-only dependencies (like databases or secrets).

### Architecture
When building a reusable library, always attempt to use a **pluggable** architecture where consumers can swap the underlying logic without refactoring their application logic. A library typically focuses on a single concern and does it well.

- **Adapter** - An Adapter acts as an orchestrator. It abstracts the underlying operations, manages the injected providers, and routes calls between them.
- **Provider** - A Provider contains the actual implementation. It is autonomous and determines for itself whether it can answer a call or skip it (e.g., yielding to the next provider if it lacks the required credentials).
- **Public Interface** - The Public Interface represents the consumable class instances or functions that will be used by the consumer.

```ts
// types.ts
export abstract class LLMProvider {
  abstract chat(messages: Message[], options?: ChatOptions): Promise<Message[] | undefined>;
}
```

```ts
// adapter.ts
export class LLMService implements LLMProvider {
  #providers = new Set<LLMProvider>();

  public async chat(messages: Message[], options?: ChatOptions) {
    for (const provider of this.#providers) {
      try {
        const result = await provider.chat(messages, options);
        if (result) return result;
      } catch (error) {
        console.error("Provider error", error);
      }
    }

    throw new Error("No provider available");
  }

  public use(provider: LLMProvider) {
    this.#providers.add(provider);
    return this;
  }
}
```

```ts
// provider.ts
export class GeminiProvider implements LLMProvider {
  constructor(private predicate?: (messages: Message[]) => boolean | Promise<boolean>) {}

  public async chat(messages: Message[], options?: ChatOptions) {
    // 1. Check credentials (fast, self-determining capability).
    const myApiKey = getContext('GEMINI_API_KEY');
    if (!myApiKey) return;

    // 2. Determine if this provider should handle the call based on custom routing logic.
    if (this.predicate && !(await this.predicate(messages))) return;

    // 3. Execution logic...
  }
}
```

```ts
// service.ts
// Initialize the adapter to get a callable interface to be exported.
export const service = new LLMService();

// Self plug predefined providers if your library prefers to ship ready-to-use APIs.
service
  .use(new GeminiProvider())
  .use(new ClaudeProvider());
```

```ts
// index.ts
export const chat = irpc.declare<typeof service.chat>('llm.chat', () => []);
```

```ts
// constructor.ts
irpc.construct(chat, (messages, options) => {
  return service.chat(messages, options);
});

// Re-export the service if you want to allow users to plug their own providers.
// export { service } from './service.js';
// export * from './provider.js';
```

**Consumer Side**

```ts
// server.ts
import { GeminiProvider, ClaudeProvider, service } from '@myorg/llm/constructor';

// Priority Routing: The .use() chain dictates the exact fallback order.
// Conditional Routing: Providers can accept predicate functions to determine if they should execute.
service
  .use(
    new GeminiProvider((messages) => {
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.content?.includes('?') ?? false;
    })
  ) // 1. Fast model for simple questions
  .use(new ClaudeProvider()); // 2. Heavy model for complex logic
```

```ts
// client.tsx
import { chat } from '@myorg/llm';

const handleEnter = () => {
  chat(messages).then(console.log);
};
```

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
3. **Peer Dependencies**: List `@anchorlib/core` or `@anchorlib/react` as `peerDependencies` instead of `dependencies` to prevent multiple versions of reactivity engines from running simultaneously in the consumer's app.

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
    "./constructor": {
      "types": "./dist/constructor.d.ts",
      "import": "./dist/constructor.js"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    }
  },
  "peerDependencies": {
    "@anchorlib/react": "^1.0.0",
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
