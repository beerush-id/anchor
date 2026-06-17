# IRPC: CRUD and Adapters

Instead of writing `get`, `create`, `update`, and `delete` functions for every entity, IRPC abstracts this with `irpc.crud()` and an Adapter/Driver pattern.

## Generating CRUD Stubs

To generate four typed standard IRPC stubs simultaneously, use `irpc.crud()`:

```typescript
import { irpc } from './module.js';

type User = { id: string; name: string; email: string };

export const users = irpc.crud<User>('users', () => ({ id: '', name: '', email: '' }), {
  maxAge: 5000, 
  coalesce: true,
  schema: { create: { input: [UserSchema] } } // Per-method validation
});

// users.get(id)
// users.create(data)
// users.update(id, data)
// users.delete(id)
```

The `irpc.crud()` takes:
```typescript
<T extends IRPCObject, I extends IRPCObject = T, U extends IRPCObject = T, CK extends string = 'id'>(
  /** The base wire identifier for these stubs (e.g., 'users' becomes 'users.get', 'users.create'). */
  name: string, 
  
  /** The synchronous factory guaranteeing the entity data shape immediately. */
  seed: () => T, 
  
  /** Optional behavior configuration for the CRUD suite. */
  options?: IRPCCrudOptions
)

type IRPCCrudOptions = {
  /** Optional descriptions for the generated stubs. */
  description?: IRPCCrudField<string>;
  
  /** Specific validation schemas per CRUD method. */
  schema?: {
    get?: IRPCSchema<IRPCInputs, IRPCOutput>;
    create?: IRPCSchema<IRPCInputs, IRPCOutput>;
    update?: IRPCSchema<IRPCInputs, IRPCOutput>;
    delete?: IRPCSchema<IRPCInputs, IRPCOutput>;
  };
  
  maxAge?: number; // Cache max age — only applied to get.
  coalesce?: boolean;
  
  // IRPCCallConfig
  timeout?: number;
  maxRetries?: number;
  retryMode?: 'linear' | 'exponential';
  retryDelay?: number;
  standalone?: boolean;
}

type IRPCCrudField<T> = T | {
  get?: T;
  create?: T;
  update?: T;
  delete?: T;
};

type IRPCSchema<I extends IRPCInputs, O extends IRPCOutput> = {
  /** Optional input validation schemas */
  input?: I;
  /** Optional output validation schema */
  output?: O;
};

type IRPCInputs = IRPCDataSchema[];
type IRPCOutput = IRPCDataSchema;

import { z, type ZodTypeAny } from 'zod';

type IRPCDataSchema = ZodTypeAny | ReturnType<typeof z.object> | ReturnType<typeof z.array> | ReturnType<typeof z.string>;
```

The `irpc.crud()` returns:
```typescript
/** A suite of universal stubs for standard data operations. */
type IRPCCrudStubs<
  T extends IRPCObject,
  K extends string,
  I extends IRPCObject = T,
  U extends IRPCObject = T,
> = {
  get: IRPCFunction<(id: IRPCEntityId<T, K>) => Promise<T> | RemoteState<T>>;
  create: IRPCFunction<(data: I) => Promise<T> | RemoteState<T>>;
  update: IRPCFunction<(id: IRPCEntityId<T, K>, data: U) => Promise<T> | RemoteState<T>>;
  delete: IRPCFunction<(id: IRPCEntityId<T, K>) => Promise<T> | RemoteState<T>>;
};

type IRPCObject = Record<string, unknown>;
type IRPCEntityId<T, K extends string> = K extends keyof T ? T[K] : string;
```

## Excluding CRUD Methods

To remove methods you don't need from the generated suite, use `irpc.exclude()`:

```typescript
// Read-only entity
export const auditLogs = irpc.exclude(
  irpc.crud<AuditLog>('auditLogs', () => ({ id: '', action: '' })),
  ['create', 'update', 'delete']
);
```

The `irpc.exclude()` takes:
```typescript
<S extends object, E extends IRPCCrudMethod>(
  /** The generated suite of CRUD stubs or any object. */
  stubs: S, 
  
  /** Array of method names to unregister and remove. */
  keys: E[]
)
```

The `irpc.exclude()` returns:
```typescript
/** The original object with the specified methods omitted. */
Omit<S, E>
```

## Drivers and Adapters

To bind logic to CRUD stubs, write a generic **Driver** once. The **Adapter** routes the CRUD calls to it dynamically.

```typescript
import { IRPCCrudDriver, IRPCCrudAdapter, type IRPCCrudMeta } from '@irpclib/irpc';
import { users } from './users/index.js';

// 1. The Driver
export class PostgresCrudDriver extends IRPCCrudDriver {
  async get(meta: IRPCCrudMeta, id: string) {
    return db.query(`SELECT * FROM ${meta.name} WHERE ${meta.key} = $1`, [id]);
  }
  // ... create, update, delete
}

// 2. The Adapter
const adapter = new IRPCCrudAdapter(irpc);
adapter.use(new PostgresCrudDriver());

// Maps get, create, update, delete automatically
adapter.attach(users); 
```

The `IRPCCrudDriver` requires implementation of these base methods:
```typescript
abstract class IRPCCrudDriver {
  get?(meta: IRPCCrudMeta, id: string): Promise<IRPCData> | IRPCData;
  create?(meta: IRPCCrudMeta, data: IRPCData): Promise<IRPCData> | IRPCData;
  update?(meta: IRPCCrudMeta, id: string, data: IRPCData): Promise<IRPCData> | IRPCData;
  delete?(meta: IRPCCrudMeta, id: string): Promise<IRPCData> | IRPCData;
}
```

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

type IRPCCrudMeta = IRPCMeta;
```

The `IRPCCrudAdapter` takes:
```typescript
(
  /** The package router to register the handlers on. */
  module: IRPCPackage
)
```

The `IRPCCrudAdapter.attach()` takes:
The `IRPCCrudAdapter` inherits `attach()` directly from `IRPCAdapter`, mapping the `IRPCCrudStubs` object keys directly to the adapter methods.
The `IRPCCrudAdapter.use()` takes:
```typescript
(
  /** The driver to add to the Chain of Responsibility pipeline. */
  driver: IRPCCrudDriver
)
```

## Chain of Responsibility

Register multiple drivers using `adapter.use()`. A driver can either fulfill the request or throw `IRPCCrudAdapter.next()` to cascade execution down the chain.

```typescript
class CacheDriver extends IRPCCrudDriver {
  async get(meta, id) {
    const cached = await redis.get(`${meta.name}:${id}`);
    if (cached) return JSON.parse(cached);
    
    // Cache miss! Pass to the next driver.
    throw IRPCCrudAdapter.next(); 
  }
}

const adapter = new IRPCCrudAdapter(irpc);

// Order matters:
adapter.use(new CacheDriver());     // 1. Checks Cache
adapter.use(new DatabaseDriver());  // 2. Fallback to Database

adapter.attach(users);
```

The `IRPCCrudAdapter.next()` returns:
```typescript
/** A special internal Error caught by the adapter to trigger cascade to the next driver. */
Error
```

## Extending Adapters

To add custom generic methods (like `list`), add the method to the Driver, map it in the Adapter, and declare it explicitly.

```typescript
class ExtendedAdapter extends IRPCCrudAdapter {
  async list(meta, filters) {
    return this.dispatch('list', meta, filters); // Maps to driver.list()
  }
}

class PostgresDriver implements IRPCDriver<ExtendedAdapter> {
  async list(meta, filters) {
    return db.query(`SELECT * FROM ${meta.name} WHERE status = $1`, [filters.status]);
  }
  // ... get, create, update, delete
}

export const users = {
  ...irpc.crud<User>('users', () => ({})),
  // Explicitly declare the new method alongside standard CRUD
  list: irpc.declare<(filters: Record<string, unknown>) => Promise<User[]>>('users.list', () => [])
};

const adapter = new ExtendedAdapter(irpc);
adapter.use(new PostgresDriver());

adapter.attach(users);              // Wires standard get, create, update, delete
adapter.attach(users.list, 'list'); // Manually wires the new custom method
```

The `IRPCDriver<T>` takes:
```typescript
/** Strips internal adapter methods so the Driver interface only requires business logic implementation. */
type IRPCDriver<T extends IRPCAdapter> = Partial<Omit<T, 'attach' | 'dispatch' | 'use' | 'drivers' | 'module'>>;

class IRPCAdapter {
  protected drivers: Set<IRPCDriver<this>>;
  protected module: IRPCPackage;

  public use(driver: IRPCDriver<this>): void;
  public attach<F, A extends unknown[], R extends IRPCData>(stub: IRPCStub<F, A, R>, method: AttachableMethod<this>): this;
  public attach<F, A extends unknown[], R extends IRPCData>(stubs: Partial<Record<AttachableMethod<this>, IRPCStub<F, A, R>>>): this;
  protected dispatch<O>(method: string, meta: IRPCMeta, ...args: unknown[]): Promise<O> | O;
}

type AttachableMethod<T> = string & keyof Omit<T, 'attach' | 'use' | 'dispatch' | 'drivers' | 'module'>;
```
