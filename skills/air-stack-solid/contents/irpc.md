## 1. Isomorphic RPC (IRPC)
IRPC entirely divorces *what* a function does from *where* it executes.
- **Stubs** (`index.ts` / `function.ts`): The callable function without any logic, runs everywhere.
- **Implementations** (`constructor.ts`): The logic for the function, runs wherever it needs to run.
- **Transports**: The layer that dynamically routes the stub to the implementation at runtime.

### IRPC: API Signatures
```typescript
interface FunctionConfig<Fn> {
  name: string;          // Required. The wire identifier.
  maxAge?: number;       // Cache duration (ms). Subsequent identical calls return cached result until expiry.
  coalesce?: boolean;    // Deduplicate concurrent identical calls. Multiple callers share one execution.
  timeout?: number;      // Reject if execution exceeds N milliseconds
  maxRetries?: number;   // Maximum retry attempts on failure
  retryMode?: 'linear' | 'exponential'; // Backoff strategy between retries
  retryDelay?: number;   // Base delay between retries (ms)
  seed?: () => unknown;  // Sync factory. Guarantees reader data shape before resolution. Required when return type is always defined.
  schema?: {             // Runtime validation (Zod, Valibot, etc.)
    input?: unknown[];
    output?: unknown;
  };
}

interface IRPCPackage {
  // Declare the universal stub
  declare<Fn>(name: string, seed: () => ReturnOf<Fn>, config?: FunctionConfig): IRPCStub<Fn>;
  declare<Fn>(name: string, config: FunctionConfig & InferSeed<Fn>): IRPCStub<Fn>;
  declare<Fn>(config: FunctionConfig<Fn>): IRPCStub<Fn>;
  
  // Bind the environment-specific logic to the stub
  construct<Fn>(stub: IRPCStub<Fn>, handler: Fn): void;
  
  // Attach a package-level guard to protect the entire namespace
  guard(hook: (req: { id: string; name: string; args: unknown[] }) => Promise<void> | void): void;

  // Attach a call-specific isomorphic interceptor to a single stub
  hook<Fn>(stub: IRPCStub<Fn>, hook: (req: { name: string; args: Parameters<Fn> }) => Promise<void> | void): void;
  // Attach isomorphic interceptors to all stubs in a group (e.g., CRUD)
  hook(stubs: Record<string, IRPCStub<any>>, hook: (req: { name: string; args: unknown[] }) => Promise<void> | void): void;
  
  // Force cache invalidation across the system
  invalidate(stub: IRPCStub<any>, ...args: any[]): void;

  // Declare four typed CRUD stubs (get, create, update, delete) for an entity
  crud<T>(name: string, seed: () => T, options?: IRPCCrudOptions): IRPCCrudStubs<T>;
  
  // Remove specific methods from a CRUD stubs object
  exclude<S, E>(stubs: S, keys: E[]): Omit<S, E>;
}

interface IRPCStub<Fn extends (...args: any[]) => any> {
  // Acts as a standard async function anywhere JavaScript runs
  (...args: Parameters<Fn>): ReturnType<Fn>;

  // UI Bindings (Reactive context tracking)
  once(...args: Parameters<Fn>): IRPCReader<ReturnType<Fn>>;
  with(factory: () => Parameters<Fn>, debounce?: number): IRPCReader<ReturnType<Fn>>;
  when(factory: () => Parameters<Fn>, debounce?: number): IRPCReader<ReturnType<Fn>>;
  later(debounce?: number): IRPCReader<ReturnType<Fn>> & { dispatch: (...args: Parameters<Fn>) => void };
}

interface IRPCReader<Data> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: Data;    // Immediately guaranteed by config.seed()
  error?: IRPCError;
  close(): void; // Manually abort the call and trigger server cleanup
}

// Store: global observable for active IRPC calls (DevTools, logging, health checks).
type IRPCStoreEvent =
  | { type: 'queue' | 'dequeue'; data: { name: string; id: string; status: string } }
  | { type: 'register'; data: IRPCPackage }
  | { type: 'error'; error: Error; data?: unknown[] };
const IRPC_STORE: { subscribe(handler: (event: IRPCStoreEvent) => void): () => void };
```

### IRPC: Declare and Construct
**File Naming Conventions:**
- **Backend API**: `index.ts` (Stub) + `constructor.ts` (Implementation)
- **Full Stack**: `function.ts` (Stub) + `constructor.ts` (Implementation)

### IRPC: Tree Composition & Barrel Exports
Files can mix local logic with tree composition.
```typescript
// index.ts or function.ts (Universal Stubs)
export * from './profile/index.js'; // Barrel export child stubs

type UserListFn = () => Promise<User[]>;
export const getUserList = irpc.declare<UserListFn>('getUserList', () => []);
```

```typescript
// constructor.ts (Implementations)
import './profile/constructor.js'; // Import child constructors for side-effects

import { getUserList } from './index.js';

irpc.construct(getUserList, async () => {
  return [];
});
```

### IRPC: Execution Context Examples
```typescript
// index.ts or function.ts (Universal Stub)
import { irpc } from '@irpclib/irpc';

type GetUserFn = (id: string) => Promise<User>;
// seed guarantees `user.data` shape is immediately available for ALL consumers before resolution
export const getUser = irpc.declare<GetUserFn>('getUser', () => ({ name: '', email: '' }));
```

```typescript
// constructor.ts (Server Implementation)
// Safely accesses private databases and secrets.
import { irpc } from '@irpclib/irpc';
import { getUser } from './index.js'; // or ./function.js

irpc.construct(getUser, async (id) => {
  return db.users.find(id);
});
```

```typescript
// constructor.ts (Browser/Worker Implementation)
// Executes entirely in the client using local APIs via BroadcastChannel.
import { irpc } from '@irpclib/irpc';
import { getOfflineUser } from './index.js'; // or ./function.js

irpc.construct(getOfflineUser, async (id) => {
  return indexedDB.get('users', id);
});
```

```typescript
// constructor.ts (Universal Implementation)
// Pure logic (computation, formatting, validation) that safely runs in ANY environment.
import { irpc } from '@irpclib/irpc';
import { calculateTaxes } from './index.js'; // or ./function.js

irpc.construct(calculateTaxes, async (cart) => {
  return cart.items.reduce((total, item) => total + (item.price * 1.2), 0);
});
```

### IRPC: Function Composition
Because IRPC stubs extend `Promise`, you can compose them directly. If the called function lives in the same thread/package, IRPC executes it directly, bypassing the network transport entirely.
```typescript
import { irpc } from '@irpclib/irpc';
import { getUser, getPermissions } from './index.js';

export const verifyAccess = irpc.declare('verifyAccess', () => ({}));

irpc.construct(verifyAccess, async (userId) => {
  // Calls in the same thread bypass network overhead
  const [user, permissions] = await Promise.all([
    getUser(userId),
    getPermissions(userId)
  ]);

  return { user, permissions };
});
```

### IRPC: Execution in UI (Client)
```tsx
export const UserCard = setup<{ id: string }>((props) => {
  // .once() takes arguments directly. .with() and .when() take an arguments factory (() => args).
  const user = getUser.once(props.id);

  return (
    <div>
      <Show when={user.status === 'pending'}>Loading...</Show>
      {/* Safe to access directly because `seed: () => {}` seeded the shape */}
      <h1>{user.data.name}</h1>
    </div>
  );
});
```

### IRPC: Promise vs RemoteState
When wrapping 3rd-party APIs that expose separate endpoints for static and streaming responses (e.g., `/chat` and `/stream`), **do not create separate IRPC functions** for them. Choose `Promise<T>` only for strictly static operations. If the underlying data has any concept of streaming or progress, expose only a single `RemoteState<T>` function.

If the connection drops mid-stream, the `IRPCReader` status transitions to `'error'`. Retry behavior follows the `FunctionConfig` settings (`maxRetries`, `retryMode`, `retryDelay`).

```typescript
// index.ts (Stub)
// DECLARE ONE function returning RemoteState, avoiding separate chat vs chatStream.
type ChatFn = (prompt: string) => RemoteState<{ text: string }>;
export const chat = irpc.declare<ChatFn>('chat', () => ({ text: '' }));
```

```typescript
// constructor.ts (Handler)
// IMPLEMENT using stream() by consuming ONLY the 3rd-party STREAMING API.
// IRPC automatically fulfills both `await chat()` and `chat.once()` from this single implementation.
irpc.construct(chat, (prompt) => {
  return stream(async (state, resolve, reject) => {
    const controller = new AbortController();
    
    try {
      // We consume the 3rd-party stream API
      const response = await fetch('https://api.thirdparty.com/chat/stream', {
        signal: controller.signal,
      });
      
      const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        state.data.text += value; // Client sees live updates
      }
      
      resolve(); // Client using `await chat()` resolves here with the final accumulated state
    } catch (err) {
      reject(err);
    }
    
    return () => controller.abort();
  });
});
```

### IRPC: Streaming (Handler)
```typescript
import { stream } from '@irpclib/irpc';

type WatchPriceFn = (symbol: string) => RemoteState<{ symbol: string, price: number }>;
const watchPrice = irpc.declare<WatchPriceFn>('watchPrice', () => ({ symbol: '', price: 0 }));

irpc.construct(watchPrice, (symbol) => {
  // stream((state, resolve, reject) => void, initialData)
  return stream((state, resolve, reject) => {
    state.data = { symbol, price: 50 }; // Initial mutation

    const interval = setInterval(() => {
      // Modifying nested property sends surgical delta updates
      state.data.price += 1; 
    }, 100);

    // Return cleanup function (guaranteed on abort/disconnect)
    return () => clearInterval(interval);
  });
});
```


### IRPC: Component Execution APIs
```tsx
export const UserProfile = setup<{ id: string }>((props) => {
  const state = mutable({ query: '' });

  // .once(args) - Static. Runs immediately. No tracking.
  const config = getAppConfig.once('web');

  // .with(() => args) - Eager reactive. Tracks the returned arguments and re-runs when they change.
  const user = getUser.with(() => [props.id]);

  // .when(() => args, debounce?) - Lazy reactive. Skips initial execution. Runs only after arguments change.
  const search = searchUsers.when(() => [state.query], 300); // 300ms debounce

  // .later(debounce?) - Imperative manual execution.
  const uploader = uploadAvatar.later(200);

  return (
    <div>
      {user.data?.name}
      <button onClick={() => uploader.dispatch(props.id, 'file')}>Upload</button>
    </div>
  );
});
```

### IRPC: Cache Invalidation
```typescript
// Clear all cached results
irpc.invalidate(createUser);

// Clear specific arguments
irpc.invalidate(getUser, 'user-123');
```

### IRPC: Progressive Hydration (Handler)
```typescript
import { irpc, stream } from '@irpclib/irpc';

irpc.construct(getDashboard, (userId) => {
  return stream((state, resolve) => {
    // Fire parallel queries. Mutate the specific property as each resolves.
    const q1 = db.users.get(userId).then(res => state.data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => state.data.sales = res);
    
    // Resolve stream only when all queries complete
    Promise.all([q1, q2]).then(() => resolve());
  }, {} as DashboardData); // <-- initial state required
});
```

### IRPC: Stream Piping
When you need to pass the stream directly to the caller instead of awaiting it, `return reader.pipe()`.

```typescript
irpc.construct(sendMessage, async (propmt) => {
  const message = createMessage();
  const reader = getChatResponse(prompt);

  reader.then(() => {
    message.text = reader.data;
    saveMessage(message.id);
  });

  return reader.pipe(); // Pass the live stream through
});
```

### IRPC: File Uploading
Wrap native file objects in `IRPCFile` to natively transmit them to the server.

```typescript
import { irpc, IRPCFile } from '@irpclib/irpc';

export const uploadAvatar = irpc.declare<(file: IRPCFile) => Promise<void>>('uploadAvatar', () => undefined);

// Server: Access metadata and save the raw Blob buffer
irpc.construct(uploadAvatar, async (file) => {
  const buffer = await file.data.arrayBuffer();
  await saveToDisk(`/uploads/${file.meta.name}`, buffer);
});

// Client: Wrap the file and pass it as an argument
const file = fileInput.files[0];
const avatar = new IRPCFile({ name: file.name, size: file.size, type: file.type }, file);
await uploadAvatar(avatar);
```

### IRPC: File Downloading & Streaming
Use `IRPCBlob` to return secure file references (like S3 signed URLs) from the server without immediately transferring the file data.

```typescript
import { irpc, IRPCBlob } from '@irpclib/irpc';

export const getReport = irpc.declare<(reportId: string) => Promise<IRPCBlob>>('getReport', () => new IRPCBlob(''));

irpc.construct(getReport, async (reportId) => {
  const report = await db.reports.find(reportId);
  const signedUrl = await s3.getSignedUrl(report.fileKey);
  return new IRPCBlob(signedUrl, { type: 'application/pdf' });
});
```

#### Consumption: Imperative
In standard async functions, `await` unwraps the `IRPCBlob` to yield the native `Blob` directly.
```typescript
const blob = await getReport('report-123'); 
```

#### Consumption: Reactive
In UI components, use `.later()` to defer the call. Fetch the reference via `.dispatch()`, then trigger `.load()` manually.
```tsx
const report = getReport.later();

<button onClick={async () => {
  await report.dispatch(props.reportId); 
  report.data?.load();                   
}}>
  Download
</button>

<span>Downloaded: {report.data?.downloaded} bytes</span>
```

### IRPC: Hooks and Context (Handler Environment)
Execution Order: Router Hooks -> Guards -> Spec Hooks -> Handler. Request context is safely isolated via `AsyncLocalStorage`.
```typescript
 // MUST import to enable AsyncLocalStorage
import { getContext, setContext, getAbortSignal, GuardError } from '@irpclib/irpc';

// Global Router Hook (Optional) - Intercepts every call on the router
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

// Package Guard (Server Only) - Protects the entire package namespace
irpc.guard(async (req) => {
  const user = getContext<User>('user');
  if (!user?.admin) throw GuardError.failed('Forbidden: Admin access required');

  const signal = getAbortSignal();
  signal?.addEventListener('abort', () => console.log('Client aborted'));
});

// Spec Hook (Isomorphic) - Intercepts a specific domain call
irpc.hook(getUser, async (req) => {
  console.log(`[Audit] User ${req.args[0]} accessed.`);
});

// Group Hook — Attach an interceptor to all stubs in a CRUD group at once
const users = irpc.crud<User>('users', () => ({ id: '', name: '', email: '' }));
irpc.hook(users, async (req) => {
  console.log(`[CRUD] Action: ${req.name}`);
});

// Handler - Fulfills the call, safely reading context seeded by hooks
irpc.construct(deleteUser, async (userId) => {
  const user = getContext<User>('user');
  await db.users.delete(userId);
});
```

### IRPC: Client Transports
Define the network layer. Functions remain 100% untouched regardless of transport.

```typescript
// HTTP Configuration - Standard cloud routing
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
irpc.use(new HTTPTransport({ endpoint: `/irpc/${irpc.href}` }));
```

```typescript
// WebSocket Configuration - Persistent connection for real-time apps
import { createPackage } from '@irpclib/irpc';
import { WebSocketTransport } from '@irpclib/ws';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
irpc.use(new WebSocketTransport({ url: `ws://localhost:3000/ws` }));
```

```typescript
// Dynamic Edge Distribution - Runtime backend swapping based on business logic
import { HTTPTransport } from '@irpclib/http';
import { BroadcastTransport } from '@irpclib/broadcast';

export async function configureTransport(plan: 'free' | 'paid') {
  if (plan === 'paid') {
    // Paid: Execute securely on remote cloud servers
    irpc.use(new HTTPTransport({ endpoint: `/irpc/${irpc.href}` }));
  } else {
    // Free: Execute locally in a Web Worker to save server costs
    // ARCHITECTURE NOTE: If paid users are the majority, dynamically import the worker
    // here so paid users don't pay the bundle size penalty of downloading local handlers.
    // await import('./worker.js'); // Spawns worker and starts BroadcastRouter
    irpc.use(new BroadcastTransport({ channel: irpc.href }));
  }
}
```

```typescript
// Multi-Transport Architecture - Simultaneous backends
// e.g., Route standard API calls to the cloud, but force heavy computation to a local worker.
import { HTTPTransport } from '@irpclib/http';
import { BroadcastTransport } from '@irpclib/broadcast';

export const api = createPackage({ name: 'api', version: '1.0.0' });
api.use(new HTTPTransport({ endpoint: `/irpc/${api.href}` })); // Cloud Server

export const compute = createPackage({ name: 'compute', version: '1.0.0' });
compute.use(new BroadcastTransport({ channel: compute.href })); // Local Web Worker
```

### IRPC: Credentials (`.sign()` / `credential()`)
For cross-domain or 3rd-party IRPC communication where standard web mechanisms (like cookies or HTTP headers) are inaccessible or unsupported, use `.sign()` to attach custom key-value credentials directly to the IRPC protocol.

> [!WARNING]
> In AIR Stack, "Client" means the *caller*, not necessarily the browser. Never expose private API keys in browser bundles. Use private keys for Server-to-Server calls, and user-specific tokens for Browser-to-Server calls.

```typescript
// Caller (Server): Safely attach private 3rd-party API keys
transport.sign({ API_KEY: process.env.STRIPE_SECRET_KEY });

// Caller (Browser): Attach user-specific auth tokens (Never secret keys)
transport.sign(() => ({ AUTH_TOKEN: getSessionToken() }));

// Handler: Read the credentials
irpc.construct(getProfile, async () => {
  const token = credential<string>('AUTH_TOKEN');
  const user = await verifyAuthToken(token);
  return db.users.find(user.id);
});
```

### IRPC: Routers & Context Seeding
The Router binds IRPC to the actual web server. You MUST manually extract auth tokens from the raw request and pass them as `initContext` tuples to `router.resolve()`.
```typescript

import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { irpc, transport } from './lib/module.js';
import './rpc/constructors.js'; // Import all handlers

const httpRouter = new HTTPRouter(transport);
const wsRouter = new WebSocketRouter(transport);

Bun.serve({
  port: 3000,
  fetch(req, server) {
    // 1. HTTP Routing
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      // Seed context! Global/Spec hooks will read 'token' via getContext('token')
      return httpRouter.resolve(req, [
        ['token', req.headers.get('authorization')],
      ]);
    }
    
    // 2. WebSocket Upgrade
    if (req.url.endsWith('/ws')) {
      // Extract auth token during upgrade to attach to ws.data
      const token = req.headers.get('authorization');
      if (server.upgrade(req, { data: { token } })) return;
    }
    
    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    async message(ws, message) {
      // Seed context from ws.data captured during upgrade
      await wsRouter.resolve(message.toString(), ws, [
        ['token', ws.data.token],
      ]);
    },
    close(ws) {
      wsRouter.disconnect(ws); // Abort all active streams for this connection
    },
  },
});
```

### IRPC: Store Subscription
```typescript
import { IRPC_STORE } from '@irpclib/irpc';

const unsubscribe = IRPC_STORE.subscribe((event) => {
  if (event.type === 'queue') {
    console.log(`[IRPC] Call started: ${event.data.name}`);
  }
  if (event.type === 'dequeue') {
    console.log(`[IRPC] Call completed: ${event.data.name}`);
  }
});
```

### IRPC: CRUD Declaration
Batch-declare four typed stubs (`get`, `create`, `update`, `delete`) for an entity. Each stub is a standard IRPC function — supports `.once()`, `.with()`, caching, hooks, and all other IRPC features.
```typescript
// index.ts (Universal Stubs)
import { irpc } from './module.js';

type User = { id: string; name: string; email: string };

export const users = irpc.crud<User>('users', () => ({ id: '', name: '', email: '' }), {
  maxAge: 5000,                                // Cache duration for get
  coalesce: true,                              // Deduplicate concurrent identical calls
  description: { get: 'Fetch user by ID', create: 'Create new user' },
  schema: { create: { input: [UserSchema] } }, // Per-method validation
});

// Each property is a full IRPCStub:
// users.get(id)       → IRPCReader<User>
// users.create(data)  → IRPCReader<User>
// users.update(id, d) → IRPCReader<User>
// users.delete(id)    → IRPCReader<User>
```

### IRPC: CRUD Exclusion
Remove methods from a CRUD stubs object before export. Excluded methods are fully unregistered from the package.
```typescript
// Read-only entity — no create, update, or delete
export const auditLogs = irpc.exclude(
  irpc.crud<AuditLog>('auditLogs', () => ({ id: '', action: '', timestamp: 0 })),
  ['create', 'update', 'delete']
);
// auditLogs.get exists, the rest are removed and unregistered
```

### IRPC: Adapter & Drivers
Extend `IRPCAdapter` and `IRPCDriver` to build custom routing pipelines.

```typescript
import { promises as fs } from 'node:fs';
import { IRPCAdapter, IRPCDriver } from '@irpclib/irpc';
import { irpc } from './module.js';

export const readFile = irpc.declare<(path: string) => Promise<Buffer>>('readFile', () => Buffer.from(''));

class StorageAdapter extends IRPCAdapter {
  async read(meta, path) {
    return this.dispatch('read', meta, path); 
  }
}

class FsDriver implements IRPCDriver<StorageAdapter> {
  async read(meta, path) {
    return fs.readFile(`/storage/${meta.name}/${path}`);
  }
}

const adapter = new StorageAdapter(irpc);
adapter.use(new FsDriver());
adapter.attach(readFile, 'read');
```

### IRPC: CRUD Adapter
Use `IRPCCrudAdapter` and `IRPCCrudDriver` to route generated `irpc.crud()` stubs automatically.

```typescript
import { IRPCCrudAdapter, IRPCCrudDriver } from '@irpclib/irpc';

class PostgresCrudDriver extends IRPCCrudDriver {
  async get(meta, id) {
    return db.query(`SELECT * FROM ${meta.name} WHERE ${meta.key} = $1`, [id]);
  }
  async create(meta, data) {
    return db.insert(meta.name, data);
  }
  async update(meta, id, data) {
    return db.update(meta.name, id, data);
  }
  async delete(meta, id) {
    return db.delete(meta.name, id);
  }
}

const adapter = new IRPCCrudAdapter(irpc);
adapter.use(new PostgresCrudDriver());
adapter.attach(users); 
```

### IRPC: Adapter Chain of Responsibility
Register multiple drivers to build a chain. Throw `IRPCAdapter.next()` to cascade execution to the next driver.

```typescript
import { IRPCAdapter } from '@irpclib/irpc';

class CacheDriver extends IRPCCrudDriver {
  get(meta, id) {
    const cached = cache.get(`${meta.name}:${id}`);
    if (cached) return cached;
    
    throw IRPCAdapter.next();
  }
}

class DatabaseDriver extends IRPCCrudDriver {
  async get(meta, id) {
    return db.query(`SELECT * FROM ${meta.name} WHERE ${meta.key} = $1`, [id]);
  }
}

const adapter = new IRPCCrudAdapter(irpc);
adapter.use(new CacheDriver()); 
adapter.use(new DatabaseDriver()); 
adapter.attach(users);
```

### IRPC: Adapter Extension
Extend `IRPCCrudAdapter` and `IRPCDriver` to attach custom operations to standard pipelines.

```typescript
import { IRPCCrudAdapter, IRPCDriver } from '@irpclib/irpc';

class ExtendedAdapter extends IRPCCrudAdapter {
  async list(meta, filters) {
    return this.dispatch('list', meta, filters);
  }
}

class PostgresDriver implements IRPCDriver<ExtendedAdapter> {
  async get(meta, id) {
    return db.query(`SELECT * FROM ${meta.name} WHERE ${meta.key} = $1`, [id]);
  }
  async list(meta, filters) {
    return db.query(`SELECT * FROM ${meta.name} WHERE status = $1`, [filters.status]);
  }
}

export const users = {
  ...irpc.crud<User>('users', () => ({})),
  list: irpc.declare<(filters: { status: string }) => Promise<User[]>>('users.list', () => [])
};

const adapter = new ExtendedAdapter(irpc);
adapter.use(new PostgresDriver());
adapter.attach(users);              // Attaches standard CRUD operations
adapter.attach(users.list, 'list'); // Manually attaches the extension operation
```

### IRPC: Error Hierarchy
All IRPC errors extend `IRPCError` (which extends `Error`). Each domain has a dedicated subclass and companion const for codes.

**Wire format** (serialized via `.json()`):
```typescript
interface IRPCPacketError {
  type: string;    // Domain: 'resolve', 'transport', 'handler', 'hook', 'call', 'stub'
  code: string;    // Machine-readable: 'not_found', 'invalid_input', 'error', etc.
  message: string; // Human-readable
}
```

**Error classes and factories**:
```typescript
import {
  IRPCError,         // Base class
  ResolveError,      // Server-side resolution failures
  TransportError,    // Network/connection failures
  HandlerError,      // Handler execution failures
  HookError,         // Middleware/hook failures
  CallError,         // Client-side call failures (timeout, retries)
  StubError,         // Declaration/registration failures
  CrudError,         // CRUD adapter failures
  RESOLVE_ERROR,     // { NOT_FOUND, INVALID_INPUT, INVALID_OUTPUT, ERROR }
  TRANSPORT_ERROR,   // { NOT_CONNECTED, CLOSED, INVALID_BODY, ERROR, ... }
  HANDLER_ERROR,     // { INVALID, MISSING, ERROR }
  HOOK_ERROR,        // { ERROR }
  CALL_ERROR,        // { TIMEOUT, MAX_RETRIES, STREAM_ERROR }
  STUB_ERROR,        // { DUPLICATE, INVALID, NOT_FOUND, ... }
  CRUD_ERROR,        // { NOT_FOUND, NOT_IMPLEMENTED }
} from '@irpclib/irpc';
```

**Write side** (server/transport — serialize to wire):
```typescript
// Factory methods create typed errors; .json() serializes to wire format
error: ResolveError.notFound(name).json()
error: TransportError.failed(error).json()
error: HandlerError.failed(error).json()
```

**Read side** (client — reconstruct from wire):
```typescript
// IRPCReader.error is now an IRPCError instance (not plain Error)
const reader = getUser.once('123');
if (reader.error instanceof ResolveError) {
  console.log(reader.error.code); // 'not_found'
}

// Programmatic matching via companion const
if (reader.error?.code === RESOLVE_ERROR.NOT_FOUND) {
  // Handle 404
}

// Manual reconstruction from any wire packet
const err = IRPCError.from(packetError); // Returns correct subclass
err instanceof TransportError; // true if type === 'transport'
```

### IRPC: Webhooks
Translate standard REST webhooks into type-safe IRPC calls. Webhook stubs **must** accept exactly one argument.
```typescript
// index.ts or function.ts (Universal Stub)
// 1. Declare the stub (Single argument required)
export const stripeWebhook = irpc.declare<(payload: any) => Promise<void>>('stripeWebhook', () => undefined);
```

```typescript
// server.ts (Server-Only Router Entry)
// 2. Intercept in Server (Bun / Edge Example)
import { stripeWebhook } from './index.js';

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/rest/') && req.method === 'POST') {
      const name = url.pathname.replace('/rest/', ''); // e.g. 'stripeWebhook'
      
      // router.resolveRest(Request, wireName, context, responseBuilder)
      return router.resolveRest(req, name, [], (body, init) => {
        return new Response('OK', { status: 200 }); // Custom Webhook ACK
      });
    }
  }
});
```
