# IRPC: Library Authoring

Building a reusable library using IRPC requires specific configurations to ensure your library is consumable safely by both client and server applications.

## Isolating Side Effects

When authoring libraries, side-effects (like `irpc.construct()`) must never run accidentally when a client imports a type or a stub.

- **Stubs (`index.ts`)**: Export your IRPC `declare` stubs here. Clients import this file for type-safe API boundaries.
- **Implementations (`server.ts` or `constructor.ts`)**: Keep `irpc.construct()` handlers here. 

This ensures the client bundler never pulls in server-only dependencies (like databases or secrets).

## Pluggable Architecture (Adapters & Drivers)

When building an IRPC library, you should orchestrate operations without forcing specific vendor implementations onto the consumer. IRPC provides standard `IRPCAdapter` and `IRPCDriver` base classes for exactly this purpose.

```typescript
// src/adapter.ts
import { IRPCAdapter, type IRPCDriver, type IRPCMeta } from '@irpclib/irpc';

export class LLMAdapter extends IRPCAdapter {
  public async chat(meta: IRPCMeta, messages: string[]): Promise<string> {
    return this.dispatch('chat', meta, messages);
  }
}

// Provide a clean contract so consumers don't have to interact with underlying IRPC generics.
export type LLMDriver = IRPCDriver<LLMAdapter>;
```

```typescript
// src/index.ts (Universal API exported to clients)
import { createPackage } from '@irpclib/irpc';

export const llmModule = createPackage({ name: 'llm', version: '1.0.0' });

export const llm = {
  chat: llmModule.declare<(messages: string[]) => Promise<string>>({
    name: 'llm.chat',
    seed: () => ''
  })
};
```

The `createPackage()` takes:
```typescript
<K extends string = 'id'>(
  /** Optional configuration object for the package. */
  config?: Partial<IRPCPackageConfig> & { key?: K }
)
```

type IRPCPackageConfig = {
  /** The unique namespace identifier for the package. */
  name: string;
  /** The semantic version of the package APIs. */
  version: string;
  /** Optional description for the API. */
  description?: string;
  /** Primary key field name for CRUD operations. Defaults to 'id'. */
  key?: string;
  /** Transport layer for network execution. */
  transport?: IRPCTransport;
  /** Global timeout for all requests in milliseconds. */
  timeout?: number;
  /** Global maximum retry attempts. */
  maxRetries?: number;
  /** Global backoff strategy. */
  retryMode?: 'linear' | 'exponential';
  /** Global base delay between retries. */
  retryDelay?: number;
  /** If true, the package behaves standalone and bypasses router bindings. */
  standalone?: boolean;
}
```

The `createPackage()` returns:
```typescript
/** The isolated package instance (IRPCPackage). */
IRPCPackage
```

The `module.declare()` object overload takes:
```typescript
<F, A extends unknown[], R extends IRPCData>(
  /** The initialization object containing the stub configuration. */
  options: IRPCDeclareInit<R>
)

type IRPCDeclareInit<R> = {
  /** The unique wire identifier. */
  name: string;
  /** The synchronous factory guaranteeing the data shape immediately. */
  seed: () => R;
  /** Optional description of the RPC function */
  description?: string;
  /** Optional schema for input/output validation */
  schema?: IRPCSchema<IRPCInputs, IRPCOutput>;
  /** Optional maximum age of a call in milliseconds */
  maxAge?: number;
  /** Whether to coalesce multiple calls to the same RPC function */
  coalesce?: boolean;
  
  // IRPCCallConfig
  timeout?: number;
  maxRetries?: number;
  retryMode?: 'linear' | 'exponential';
  retryDelay?: number;
  standalone?: boolean;
}
```

```typescript
// src/constructor.ts (Server handler)
import { LLMAdapter } from './adapter.js';
import { llmModule, llm } from './index.js';

export const llmAdapter = new LLMAdapter(llmModule);
llmAdapter.attach(llm);
```

The `IRPCAdapter` base class signature:
```typescript
class IRPCAdapter {
  /** Register a driver into the adapter's Chain of Responsibility. */
  public use(driver: IRPCDriver<this>): void;
  
  /** Attaches a single stub to a specific method on this adapter. */
  public attach<F, A extends unknown[], R extends IRPCData>(stub: IRPCStub<F, A, R>, method: AttachableMethod<this>): this;
  
  /** Attaches stubs to this adapter by matching object keys to adapter methods. */
  public attach<F, A extends unknown[], R extends IRPCData>(stubs: Partial<Record<AttachableMethod<this>, IRPCStub<F, A, R>>>): this;
  
  /** Dispatch the call down the chain to the registered drivers. */
  protected dispatch<O>(method: string, meta: IRPCMeta, ...args: unknown[]): Promise<O> | O;
}

type AttachableMethod<T> = string & keyof Omit<T, 'attach' | 'use' | 'dispatch'>;
```

The `IRPCDriver<T>` base type signature:
```typescript
/** Strips internal adapter methods so the Driver interface only requires business logic implementation. */
type IRPCDriver<T extends IRPCAdapter> = Partial<Omit<T, 'attach' | 'dispatch' | 'use'>>;
```

The `IRPCMeta` context payload:
```typescript
type IRPCMeta = {
  /** Entity/table name. */
  name: string;
  /** Primary key field name. */
  key: string;
  /** Resolved description for this method. */
  description?: string;
  maxAge?: number;
  coalesce?: boolean;
  
  // IRPCCallConfig
  timeout?: number;
  maxRetries?: number;
  retryMode?: 'linear' | 'exponential';
  retryDelay?: number;
  standalone?: boolean;
  
  /** Resolved schema for this method. */
  schema?: IRPCSchema<IRPCInputs, IRPCOutput>;
};

type IRPCSchema<I extends IRPCInputs, O extends IRPCOutput> = {
  input?: I;
  output?: O;
};

type IRPCInputs = IRPCDataSchema[];
type IRPCOutput = IRPCDataSchema;

import { z, type ZodTypeAny } from 'zod';
type IRPCDataSchema = ZodTypeAny | ReturnType<typeof z.object> | ReturnType<typeof z.array> | ReturnType<typeof z.string>;
```

### Writing Drivers

You can ship official drivers within the same package by exporting them via subpaths (e.g., `./drivers/*`), or allow the community to build separate driver packages. They simply implement the driver interface generated by your adapter.

```typescript
// src/drivers/openai/index.ts
import type { IRPCMeta } from '@irpclib/irpc';
import type { LLMDriver } from '../../adapter.js';

export class OpenAiDriver implements LLMDriver {
  constructor(private apiKey: string) {}

  async chat(meta: IRPCMeta, messages: string[]): Promise<string> {
    return "...";
  }
}
```

### Documenting Usage

When authoring the library, document the consumer integration in the `README.md` to show how the user will plug an official driver into the adapter on the server, how they can implement their own custom driver, and how they call the API from the client.

```typescript
// README.md (Server Setup)
import { llmAdapter } from '@myorg/llm/constructor';
import { OpenAiDriver } from '@myorg/llm/drivers/openai';

llmAdapter.use(new OpenAiDriver(process.env.OPENAI_KEY));
```

```typescript
// README.md (Custom Driver Implementation)
import type { IRPCMeta } from '@irpclib/irpc';
import type { LLMDriver } from '@myorg/llm/adapter';

export class CustomDriver implements LLMDriver {
  async chat(meta: IRPCMeta, messages: string[]): Promise<string> {
    return "...";
  }
}
```

```typescript
// README.md (Client Usage)
import { llm } from '@myorg/llm';

const response = await llm.chat(['Hello!']);
```

## Configurable Libraries

When a library requires global configuration (such as read-only modes or base paths), manage this state using Context. This allows the `Adapter` to intercept requests and enforce library-level rules before routing them to the `Driver`.

```typescript
// src/context.ts
import { getContext, setContext } from '@irpclib/irpc';

export interface FSConfig {
  readOnly?: boolean;
}

const FS_CONFIG = Symbol('FS_CONFIG');

export function setFSConfig(config: FSConfig) {
  setContext(FS_CONFIG, config);
}

export function getFSConfig(): FSConfig {
  return getContext<FSConfig>(FS_CONFIG) || {};
}
```

```typescript
// src/adapter.ts
import { IRPCAdapter, type IRPCDriver, type IRPCMeta } from '@irpclib/irpc';
import { getFSConfig } from './context.js';

export class FSAdapter extends IRPCAdapter {
  public async remove(meta: IRPCMeta, path: string): Promise<boolean> {
    const config = getFSConfig();
    if (config.readOnly) throw new Error('File system is read-only');
    
    return this.dispatch('remove', meta, path);
  }
}

// Provide a clean contract so consumers don't have to interact with underlying IRPC generics.
export type FSDriver = IRPCDriver<FSAdapter>;
```

```typescript
// src/constructor.ts (Server handler)
import { FSAdapter } from './adapter.js';
import { fsModule, fs } from './index.js';

export { type FSConfig, setFSConfig, getFSConfig } from './context.js';

export const fsAdapter = new FSAdapter(fsModule);

fsAdapter.attach(fs);
```

By exporting `setFSConfig` from the server constructor, library consumers can configure the adapter's behavior independently of the chosen driver.

## Client SDKs (SaaS APIs)

To build a client SDK for a remote SaaS API (e.g., Stripe, Resend), export only the Universal API stubs and pre-configure the transport to point to the remote server. The library does not include a `constructor.ts` because the server implementation is hosted by the provider.

```typescript
// src/index.ts (Published as @myorg/api)
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const llmModule = createPackage({ name: 'llm', version: '1.0.0' });

// Hardcode the transport so consumers don't need to configure routing themselves.
llmModule.use(new HTTPTransport({ endpoint: 'https://api.myorg.com/irpc' }));

export const llm = {
  chat: llmModule.declare<(messages: string[]) => Promise<string>>({
    name: 'llm.chat',
    seed: () => ''
  })
};
```

When authoring the library, document the consumer integration in the `README.md` to show how the user will securely call the remote server.

```typescript
// README.md example usage
import { llmModule, llm } from '@myorg/api';

llmModule.sign(() => ({ Authorization: `Bearer ${process.env.MYORG_API_KEY}` }));

const response = await llm.chat(['Hello!']);
```

## Package Export Maps

Use `exports` in your `package.json` to clearly define public entry points, keeping the universal `.ts` logic separate from server-only logic. Make sure to export your adapters, drivers, and any standalone servers.

```json
{
  "name": "@myorg/llm",
  "version": "1.0.0",
  "type": "module",
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
    "@irpclib/irpc": "^1.0.0"
  }
}
```
