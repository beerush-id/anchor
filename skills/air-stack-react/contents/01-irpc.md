## 1. Isomorphic RPC (IRPC)
IRPC entirely divorces *what* a function does from *where* it executes.
- **Stubs** (`index.ts` / `function.ts`): The callable function without any logic, runs everywhere.
- **Implementations** (`constructor.ts`): The logic for the function, runs wherever it needs to run.
- **Transports**: The layer that dynamically routes the stub to the implementation at runtime.

### IRPC: API Signatures
```typescript
interface FunctionConfig<Fn> {
  name: string;          // Required. The wire identifier.
  maxAge?: number;       // Cache result for N milliseconds
  coalesce?: boolean;    // Deduplicate concurrent identical calls
  timeout?: number;      // Reject if execution exceeds N milliseconds
  init?: () => any;      // Sync factory. Guarantees UI state shape before resolution.
  schema?: {             // Runtime validation (Zod, Valibot, etc.)
    input?: any[];
    output?: any;
  };
}

interface Irpc {
  // Declare the universal stub
  declare<Fn>(config: FunctionConfig<Fn>): IrpcStub<Fn>;
  
  // Bind the environment-specific logic to the stub
  construct<Fn>(stub: IrpcStub<Fn>, handler: Fn): void;
  
  // Attach middleware guards (e.g., Auth checks)
  hook<Fn>(stub: IrpcStub<Fn>, hook: (req: IrpcRequest) => Promise<void>): void;
  
  // Force cache invalidation across the system
  invalidate(stub: IrpcStub<any>, ...args: any[]): void;
}

interface IrpcStub<Fn extends (...args: any[]) => any> {
  // Acts as a standard async function anywhere JavaScript runs
  (...args: Parameters<Fn>): ReturnType<Fn>;

  // UI Bindings (Reactive context tracking)
  once(...args: Parameters<Fn>): IrpcReader<ReturnType<Fn>>;
  with(factory: () => Parameters<Fn>, debounce?: number): IrpcReader<ReturnType<Fn>>;
  when(factory: () => Parameters<Fn>, debounce?: number): IrpcReader<ReturnType<Fn>>;
  later(debounce?: number): IrpcReader<ReturnType<Fn>> & { dispatch: (...args: Parameters<Fn>) => void };
}

interface IrpcReader<Data> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: Data;    // Immediately guaranteed by config.init()
  error?: Error;
  close(): void; // Manually abort the call and trigger server cleanup
}
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
export const getUserList = irpc.declare<UserListFn>({ name: 'getUserList' });
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
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  // Guarantees `user.data` shape is immediately available for ALL consumers before resolution
  init: () => ({ name: '', email: '' } as User)
});
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

export const verifyAccess = irpc.declare({ name: 'verifyAccess' });

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

  return render(() => (
    <div>
      <Show when={() => user.status === 'pending'}>Loading...</Show>
      {/* Safe to access directly because `init: () => {}` seeded the shape */}
      <h1>{user.data.name}</h1>
    </div>
  ));
});
```

### IRPC: Streaming (Handler)
```typescript
import { stream } from '@irpclib/irpc';

type WatchPriceFn = (symbol: string) => RemoteState<{ symbol: string, price: number }>;
const watchPrice = irpc.declare<WatchPriceFn>({
  name: 'watchPrice',
  init: () => ({ symbol: '', price: 0 }),
});

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

  return render(() => (
    <div>
      {user.data?.name}
      <button onClick={() => uploader.dispatch(props.id, 'file')}>Upload</button>
    </div>
  ));
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
Eliminates UI waterfalls by yielding partial data as parallel queries resolve.
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

### IRPC: Hooks and Context (Handler Environment)
Execution Order: Router Hooks -> Spec Hooks -> Handler. Request context is safely isolated via `AsyncLocalStorage`.
```typescript
import '@irpclib/irpc/server'; // MUST import to enable AsyncLocalStorage
import { getContext, setContext } from '@irpclib/irpc';

// Global Router Hook (Optional) - Intercepts every call on the router
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

// Spec Hook (Optional) - Inline pattern for single-use guards
irpc.hook(getUser, async (req) => {
  console.log(`[Audit] User ${req.args[0]} accessed.`);
});

// Spec Hook (Optional) - Re-usable pattern for shared guards
const requireAdmin = async (req) => {
  const user = getContext<User>('user');
  if (!user?.admin) throw new Error('Forbidden');
};

irpc.hook(deleteUser, requireAdmin);
irpc.hook(updateUser, requireAdmin);

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
Attach key-value credentials to a transport to send it with every request.

```typescript
// Client: attach auth token to outgoing calls
transport.sign({ MY_CUSTOM_KEY: '<insert-your-token-here>' });

// Client: or using factory function
transport.sign(() => ({ MY_CUSTOM_KEY: '<insert-your-token-here>' }))

// Server handler: read the caller's credentials
irpc.construct(getProfile, async () => {
  const token = credential<string>('MY_CUSTOM_KEY');
  const user = await verifyAPIKey(token);
  return db.users.find(user.id);
});
```

### IRPC: Routers & Context Seeding
The Router binds IRPC to the actual web server. You MUST manually extract auth tokens from the raw request and pass them as `initContext` tuples to `router.resolve()`.
```typescript
import '@irpclib/irpc/server';
import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { irpc, transport } from './lib/module.js';
import './rpc/constructors.js'; // Import all handlers

const httpRouter = new HTTPRouter(irpc, transport);
const wsRouter = new WebSocketRouter(irpc, transport);

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
Monitor active calls globally. Useful for DevTools, logging, or health checks.
```typescript
import { IRPC_STORE } from '@irpclib/irpc';

const unsubscribe = IRPC_STORE.subscribe((event) => {
  if (event.type === 'queue') {
    console.log(`[IRPC] Call started: ${event.detail.payload.name}`);
  }
  if (event.type === 'dequeue') {
    console.log(`[IRPC] Call completed: ${event.detail.payload.name}`);
  }
});
```

### IRPC: Webhooks
Translate standard REST webhooks into type-safe IRPC calls. Webhook stubs **must** accept exactly one argument.
```typescript
// index.ts or function.ts (Universal Stub)
// 1. Declare the stub (Single argument required)
export const stripeWebhook = irpc.declare<(payload: any) => Promise<void>>({ name: 'stripeWebhook' });
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
