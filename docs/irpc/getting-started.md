---
title: "Getting Started with IRPC"
description: "Learn how to set up IRPC in your project, create your first remote function, and start making type-safe remote calls."
keywords:
  - irpc
  - getting started
  - tutorial
  - setup
  - installation
---

# Getting Started

This guide will walk you through setting up IRPC in your project and creating your first remote function.

## Quick Start

The fastest way to get started is using the IRPC Bun starter template:

```bash
npx degit beerush-id/anchor/templates/irpc-bun-starter my-api
cd my-api
bun install
bun run serve
```

Server runs on `http://localhost:3000`

The template includes:
- Pre-configured IRPC package and HTTP transport
- Example IRPC functions
- Server setup with middleware
- TypeScript configuration
- Docker support


## Manual Setup

### Installation

Install the core library alongside your preferred transport:

```bash
npm install @irpclib/irpc @irpclib/http
```

IRPC supports multiple transports, and allows you to create your own:
- **@irpclib/http**: HTTP transport with zero-latency batching and SSE streaming.
- **@irpclib/ws**: WebSocket transport for persistent low-latency real-time states.
- **@irpclib/broadcast**: BroadcastChannel transport for zero-server, cross-tab & Web Worker execution.

### Project Structure

```
my-api/
├── lib/
│   └── module.ts          # Package and transport configuration
├── rpc/
│   └── hello/
│       ├── index.ts       # Function declaration
│       └── constructor.ts # Handler implementation
├── server.ts              # Server setup
└── client.ts              # Client usage
```

### Step 1: Create Package

Start by defining an IRPC package. Packages group and version your remote functions, allowing you to run multiple APIs on a single server without route collisions, and making it extremely easy to publish your client-side type stubs directly to NPM.

```typescript
// lib/module.ts
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const irpc = createPackage({ 
  name: 'my-api', 
  version: '1.0.0' 
});

export const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
});

irpc.use(transport);
```

The package structurally bounds your function signature types to a unique identifier (`my-api/1.0.0`), ensuring that execution payloads never cross breaking versions. The attached transport then resolves the network transmission for all functions bound to the package.

### Microservice Distribution

Because each package accepts its own transport instance, you can distribute your architecture across microservices without needing an API Gateway or meddling with URL route configurations on the client. You simply wire the packages to different transport destinations:

```typescript
// Define isolated packages
export const userService = createPackage({ name: 'users', version: '1.0.0' });
export const projectService = createPackage({ name: 'projects', version: '1.0.0' });

// Wire packages to completely different physical servers
userService.use(new HTTPTransport({ endpoint: 'https://server-a.internal/users/1.0.0' }));
projectService.use(new HTTPTransport({ endpoint: 'https://server-b.internal/projects/1.0.0' }));
```

From the client's perspective, they just call `await getUser()` and `await getProject()` normally. The packages securely direct the execution payloads to their respective server microservices behind the scenes.

### Choosing a Transport

IRPC supports multiple robust transport protocols out of the box, and you can easily write your own Custom Transports for edge protocols.

**HTTP Transport** (recommended for most use cases):
```typescript
import { HTTPTransport } from '@irpclib/http';

const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
  timeout: 10000,
  maxRetries: 3,
});
```

**WebSocket Transport** (for sustained persistent connections):
```typescript
import { WebSocketTransport } from '@irpclib/ws';

const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  autoReconnect: true,
  maxReconnectAttempts: 5,
});
```

**BroadcastChannel Transport** (for Web Workers & multi-tab coordination without a server):
```typescript
import { BroadcastTransport } from '@irpclib/broadcast';

const transport = new BroadcastTransport({
  channel: irpc.href, // 'my-api/1.0.0'
});
```

### Step 2: Declare Functions

Declare the function signatures that both client and server will use. 

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;
export const hello = irpc.declare<HelloFn>({ name: 'hello' });
```

You can declare reactive streams using the exact same signature syntax:

```typescript
// rpc/poem/index.ts
import { irpc } from '../lib/module.js';
import type { RemoteState } from '@irpclib/irpc';

export type GeneratePoemFn = (prompt: string) => RemoteState<string>;
export const generatePoem = irpc.declare<GeneratePoemFn>({
  name: 'generatePoem',
  init: () => '', // Initial client-side state before server data arrives
});
```

::: warning Important!
When declaring a function that returns `RemoteState<T>`, `irpc.declare()` requires an `init` factory in its options. On the client, when the stub is called, a `RemoteState` is instantiated immediately — before any data arrives from the server. The `init` factory seeds the initial value of `state.data` so UI frameworks can bind to the reactive proxy right away and render as server mutations arrive.
:::

`RemoteState<T>` is IRPC's core reactive primitive. It extends a standard native `Promise<T>`, meaning it can be standardly `await`-ed. But its massive architectural advantage is that it operates as an autonomous reactive proxy; UI frameworks can actively bind to its temporal data mutations from the server over the wire without writing a single event listener or blocking the execution thread.

Because it exposes `state.data`, `state.status`, and `state.error`, you can use `RemoteState` to:
- Hydrate UI frameworks (React, Vue, Svelte) as data arrives without writing WebSocket hooks.
- Monitor the exact execution status (`PENDING`, `SUCCESS`, or `ERROR`).
- Handle mid-stream pipeline errors directly via `state.error`.

The function signature is isomorphic—it works perfectly across the client and server.

### Step 3: Implement Handlers (Server)

Implement the actual logic on the server. Handlers can return standard promises or continuous streams.

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, async (name: string) => {
  return `Hello, ${name}! Welcome to Anchor!`;
});
```

To implement a reactive pipeline, use the `stream` factory to yield continuous data back to the client:

```typescript
// rpc/poem/constructor.ts
import { irpc } from '../lib/module.js';
import { generatePoem } from './index.js';
import { stream } from '@irpclib/irpc';

irpc.construct(generatePoem, (prompt) => {
  return stream<string>(async (state, resolve, reject) => {
    const response = await ai.generate({ prompt, stream: true });
    
    for await (const chunk of response) {
      if (state.status !== 'pending') break;
      state.data = (state.data || '') + chunk.text;
    }
    
    resolve();
  });
});
```

The handler receives the exact same typed arguments as the declared function.

### File Uploads

IRPC supports file uploads natively through the `IRPCFile` class. Files can be passed as top-level arguments or nested deeply within object payloads. The transport automatically extracts and reconstructs the binaries alongside the JSON payload.

```typescript
// Shared Interface
import { irpc, type IRPCFile } from '@irpclib/irpc';

export type UserProfile = {
  username: string;
  avatar: IRPCFile;
  settings: { theme: string };
};

export type UpdateProfileFn = (profile: UserProfile) => Promise<string>;
export const updateProfile = irpc.declare<UpdateProfileFn>({ name: 'updateProfile' });

// Client Usage
import { IRPCFile } from '@irpclib/irpc';

const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// Wrap standard browser files/blobs in an IRPCFile
const avatar = new IRPCFile({ name: file.name, size: file.size, type: file.type }, file);

// IRPC recursively scans and extracts files from anywhere in the payload
await updateProfile({
  username: 'john_doe',
  avatar,
  settings: { theme: 'dark' }
});

// Server Implementation
irpc.construct(updateProfile, async (profile) => {
  // `profile.avatar` arrives fully reconstructed. 
  // The base IRPCFile type natively exposes `.data` (Blob) and `.meta`.
  const buffer = await profile.avatar.data.arrayBuffer();
  
  await storage.save(profile.avatar.meta.name, buffer);
  await db.users.update({ username: profile.username });
  
  return 'Success';
});
```

::: tip Transport Recommendation
While WebSocket transport supports binary framing for files, sending large files over a single-threaded WebSocket connection will block other real-time messages from resolving until the entire binary finishes transferring.

For applications handling significant file uploads, **HTTP Transport** is heavily recommended because the browser natively offloads HTTP file uploads to a background thread, preventing UI blocking and keeping the main WebSocket connection free for snappy real-time interactions.
:::

### Step 4: Setup Server

Configure the server to handle IRPC requests.

The server requires `AsyncLocalStorage` to isolate context across concurrent requests. Without it, context from one user's request could leak into another's.

The router's `resolve` method accepts the HTTP request and an optional `initContext` — an array of `[key, value]` tuples that seed the request context. Extract application-level values (tokens, locale, tenant ID) at the integration point. Middleware and handlers then consume these values through `getContext()` without knowing which transport delivered the request.

```typescript
// server.ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';
import './rpc/hello/constructor.js';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req, [
        ['token', req.headers.get('authorization')],
      ]);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

### Step 5: Execute & Stream on Client

Call the function like any local async function, or bind it directly to UI components to react to continuous network state changes.

```typescript
// client.ts
import { hello } from './rpc/hello/index.js';
import { generatePoem } from './rpc/poem/index.js';

// Standard isolated execution
const message = await hello('John');

// Reactive UI binding over the network
const PoemWidget = setup(() => {
  // Generates the call stream.
  const poem = generatePoem('Space');
  
  // Renders based on `state.data` mutations from the remote server.
  return render(() => <div>{poem.data}</div>);
});
```

No fetch calls, manual serialization, or separate WebSocket connections required.

## Advanced Features

### Stream Subscriptions & Cleanup

For streams that manage persistent open connections or event listeners, return a cleanup function. The underlying architecture supports `async` initialization workflows:

**1. Shared Interface (`src/shared/rpc.ts`)**
```typescript
import { irpc } from '@irpclib/irpc';
import type { RemoteState } from '@irpclib/irpc';

export type WatchPricesFn = (ticker: string) => RemoteState<number>;

export const watchPrices = irpc.declare<WatchPricesFn>({ 
  name: 'watchPrices',
  init: () => 0
});
```

**2. Backend Implementation (`src/server/rpc.ts`)**
```typescript
import { irpc } from '../lib/module.js';
import { watchPrices } from '../shared/rpc.js';
import { stream } from '@irpclib/irpc';

irpc.construct(watchPrices, (ticker) => {
  return stream(async (state) => {
    // 1. Asynchronous initialization
    const connection = await redis.connect();
    
    // 2. Real-time mutations
    connection.on('price_update', (price) => {
      state.data = price;
    });

    // 3. Guaranteed cleanup execution
    return () => {
      connection.close();
    };
  });
});
```

Because the `stream` wrapper hooks into the transport's `AbortController` (which identically drops across all terminal boundaries), it guarantees the cleanup runs universally under **all** standard lifecycle conditions:
1. **Successful Completion**: When `resolve()` is explicitly called by your code, the transport closes the reader and safely fires the abort sequence tearing down the hook.
2. **Error Rejection**: When `reject()` is called, identical cleanup occurs.
3. **Client Disconnection**: When the remote client explicitly drops the websocket or calls `call.close()`.
4. **Timeouts**: When a router forcibly aborts the pipeline because its execution exceeded the specified `ttl` bounds limit.
5. **Asynchronous Hand-offs**: If an abort drops *during* an `await redis.connect()` initialization, the framework guarantees the returned cleanup hook will still fire synchronously exactly when the initialization wrapper Promise resolves.

> [!WARNING]
> The single exception to the universal teardown rule is **unhandled asynchronous exceptions**. If your code throws a fatal exception *before* returning the cleanup hook block to the framework (e.g., throwing inside an `async` stream before the `return` statement), the hook is never physically registered, meaning your setup components (like open DB connections) won't be caught by the teardown. Always wrap dangerous initializations in `try...catch` blocks to ensure execution physically registers the cleanup accurately!

### Manual RemoteState Operations

If you bypass the `stream()` utility and manually construct and return a `new RemoteState()`, you are responsible for wiring teardown listeners securely yourself by invoking `getAbortSignal()`:

```typescript
import { RemoteState, getAbortSignal } from '@irpclib/irpc';

irpc.construct(watchPrices, (ticker) => {
  const state = new RemoteState<number>();
  const signal = getAbortSignal();

  const handle = externalDataSource.subscribe(ticker, (price) => {
    state.data = price;
  });

  // Listen explicitly for lifecycle teardown events without the stream wrapper
  signal?.addEventListener('abort', () => {
    externalDataSource.unsubscribe(handle);
  });

  return state;
});
```

### Progressive Data Hydration (Dashboard Streams)

Solve the N+1 problem and avoid UI waterfalls by yielding multiple parallel data aggregations through a single stream request.

**1. Shared Interface (`src/shared/rpc.ts`)**
```typescript
import { irpc } from '@irpclib/irpc';

export const getDashboard = irpc.declare<GetDashboardFn>({
  name: 'getDashboard',
  init: () => ({ user: null, sales: null, telemetry: null })
});
```

**2. Backend Implementation (`src/server/rpc.ts`)**
```typescript
import { irpc } from '../lib/module.js';
import { getDashboard } from '../shared/rpc.js';
import { stream } from '@irpclib/irpc';

irpc.construct(getDashboard, (userId) => {
  return stream((state, resolve) => {
    // Execute queries concurrently and mutate the reactive state.data directly
    const q1 = db.users.get(userId).then(res => state.data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => state.data.sales = res);
    const q3 = externalApi.fetchMetrics().then(res => state.data.telemetry = res);

    // Conclude the stream when all continuous queries complete
    Promise.all([q1, q2, q3]).then(() => resolve());
  }, {} as DashboardData);
});
```

On the client, the UI skeleton can begin rendering as the stream fields populate over time.

```typescript
const DashboardWidget = setup(({ user }) => {
  const dashboard = getDashboard(user.id);
  
  return render(() => (
    <div>
      <Metrics block={dashboard.data.telemetry} />
      <Sales volume={dashboard.data.sales} />
      <User target={dashboard.data.user} />
    </div>
  ));
});
```

### Caching

Cache responses to reduce network calls.

```typescript
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  maxAge: 60000, // Cache for 60 seconds
});
```

Subsequent calls with the same arguments return cached data.

### Timeout

Set per-function timeouts.

```typescript
export const slowQuery = irpc.declare<SlowQueryFn>({
  name: 'slowQuery',
  timeout: 30000, // 30 second timeout
});
```

Calls exceeding the timeout will reject with an error.

### Retry Configuration

Configure retry behavior per function, package, or transport level.

```typescript
// Function-level (highest priority)
export const criticalFunction = irpc.declare<CriticalFn>({
  name: 'processPayment',
  maxRetries: 5,        // 5 retry attempts
  retryMode: 'exponential', // 1s, 2s, 4s, 8s, 16s delays
  retryDelay: 1000,     // 1 second base delay
});

// Package-level (medium priority)
const irpc = createPackage({
  name: 'my-api',
  maxRetries: 3,        // Default for all functions
  retryMode: 'linear',  // Fixed delays
});

// Transport-level (lowest priority)
const transport = new HTTPTransport({
  endpoint: '/api',
  maxRetries: 1,        // Fallback for functions without config
});
```

**Priority Order:** Function → Package → Transport

Network errors trigger automatic retries. Handler errors fail immediately without retry.

### Coalesce

Combine multiple calls with the same arguments to avoid duplicate executions.

```typescript
export const expensiveQuery = irpc.declare<ExpensiveQueryFn>({
  name: 'expensiveQuery',
  coalesce: true, // Enable coalescing
});
```

When multiple calls with identical arguments are made simultaneously, only one execution occurs. All callers receive the same result.

### Cache Invalidation

Manually clear cached responses when data becomes stale.

```typescript
// Invalidate specific cache entry
irpc.invalidate(getUser, 'user-123');

// Invalidate all cache entries for a function
irpc.invalidate(getUser);
```

Use this when you know cached data is no longer valid, such as after mutations.

### Validation (Optional)

Use Zod for runtime validation.

```typescript
import { z } from 'zod';

export const createUser = irpc.declare({
  name: 'createUser',
  schema: {
    input: [z.object({
      name: z.string(),
      email: z.string().email(),
    })],
    output: z.object({
      id: z.string(),
      name: z.string(),
    }),
  },
});
```

Invalid inputs or outputs will throw validation errors.

### Context

Every router's `resolve` method accepts an `initContext` parameter — an array of `[key, value]` tuples that seed the request context. Middleware and handlers access these values via `getContext()` and can add more via `setContext()`.

The router itself only manages the internal `AbortController`. All other context is the caller's responsibility. This is the key architectural constraint: the integration point extracts application-level values from whatever transport object it has, and injects them as standardized keys. Middleware and handlers never reference `Request`, `WebSocket`, or `BroadcastChannel`.

Define your application's context contract once. Each transport maps its specific objects into the same keys. The middleware stays identical:

```typescript
import { getContext, setContext } from '@irpclib/irpc';

// HTTP
router.resolve(req, [['token', req.headers.get('authorization')]]);
// WebSocket
router.resolve(msg, ws, [['token', ws.data.token]]);
// Broadcast
router.resolve(requests, [['token', self.workerToken]]);

router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

irpc.construct(getProfile, async () => {
  const user = getContext<User>('user');
  return await db.users.findById(user.id);
});
```

Context is scoped to each request.

## Multiple Functions

Create multiple functions in the same package.

```typescript
// rpc/users/index.ts
export const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
export const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });
export const updateUser = irpc.declare<UpdateUserFn>({ name: 'updateUser' });

// rpc/users/constructor.ts
irpc.construct(getUser, async (id) => { /* ... */ });
irpc.construct(createUser, async (data) => { /* ... */ });
irpc.construct(updateUser, async (id, data) => { /* ... */ });
```

All functions share the same transport and batching.

## Automatic Batching

When you call multiple functions simultaneously, they're batched.

```typescript
const [user, posts, stats] = await Promise.all([
  getUser('123'),
  getPosts('123'),
  getStats('123'),
]);
```

This sends **1 HTTP request** instead of 3, with responses streaming back as they complete.

## Distribution

IRPC supports publishing your function stubs to NPM while keeping handlers private on the server.

### Publishing to NPM

Configure your `package.json` to publish only the `dist/` directory:

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./*": "./dist/rpc/*"
  },
  "files": ["dist"]
}
```

### Excluding Server Code

Use `.npmignore` to exclude server-side code:

```
# Source code (keep only dist/)
src

# Server files
**/constructor.ts
**/constructor.js

# Environment
.env
.env.example
```

### Build and Publish

```bash
# Build client stubs
npm run build

# Publish to NPM
npm publish
```

### Client Usage

Clients install your package and use the stubs:

```bash
npm install my-api
```

```typescript
import { getUser, createUser } from 'my-api/user';

const user = await getUser('123');
```

The stubs connect to your server endpoint. Handlers remain private on your server.

## Next Steps

- [Comparison](/irpc/comparison) - See how IRPC compares to alternatives
- [HTTP Transport](/irpc/transports/http-transport) - Configure transport options
- [Specification](/irpc/specification) - Full protocol details
