---
title: 'Functions'
description: 'Deep-dive into IRPC function declarations — signatures, argument patterns, reactive streams, naming conventions, and per-function configuration.'
---

# Functions

A **function** is the atomic unit of the Remote Function architecture. Every remote operation — a database query, an AI generation, a file upload — starts as a function declaration that both the client and server share.

The [Overview](/remote-function/index.html) showed you the three-step pattern. This page goes deep into the **declaration** — how to structure signatures, how streams work at the proxy level, and how to organize your function modules.

## Declaring a Function

`irpc.declare()` registers a function signature into a package and returns a callable **stub**:

```typescript
// rpc/users/index.ts
import { irpc } from '../../lib/module.js';

export type GetUserFn = (id: string) => Promise<User>;
export const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
```

The generic `<GetUserFn>` enforces the exact parameter and return types across both the client call site and the server handler. Misspelled arguments or wrong return shapes are caught at compile time.

On the client, calling `getUser('123')` is all you ever do. The stub looks and behaves like a local async function — the network is invisible.

## Naming Conventions

### Wire Names

The `name` field inside `irpc.declare()` is the **wire identifier** — it's what the server uses to route each call to the correct handler. It must be unique within its package.

With a handful of functions this is trivial. With hundreds, collisions become real — you'll have a `list` for products, orders, invoices, and users. IRPC's `name` is a free-form string, so you can pick any strategy that scales with your codebase:

**Dotted namespacing** — Group by domain with a dot separator. Scales naturally and reads like a path:

```typescript
export const listProducts = irpc.declare<ListProductsFn>({ name: 'product.list' });
export const getProduct   = irpc.declare<GetProductFn>({ name: 'product.get' });
export const listOrders   = irpc.declare<ListOrdersFn>({ name: 'order.list' });
export const getOrder     = irpc.declare<GetOrderFn>({ name: 'order.get' });
```

**Verb-prefixed** — Prefix with the action. Simpler, works well for smaller packages:

```typescript
export const listProducts  = irpc.declare<ListProductsFn>({ name: 'listProducts' });
export const getProduct    = irpc.declare<GetProductFn>({ name: 'getProduct' });
export const createProduct = irpc.declare<CreateProductFn>({ name: 'createProduct' });
```

**Kebab-case** — If you prefer a REST-like feel:

```typescript
export const listProducts = irpc.declare<ListProductsFn>({ name: 'list-products' });
export const getProduct   = irpc.declare<GetProductFn>({ name: 'get-product' });
```

Pick one convention and stick with it across your package. The wire name doesn't need to match the export name — the export name is for your codebase, the wire name is for the protocol.

### Type Names

Type aliases follow `PascalCase` with a `Fn` suffix:

```typescript
export type GetUserFn = (id: string) => Promise<User>;
export type CreateUserFn = (data: UserInput) => Promise<User>;
export type WatchPricesFn = (ticker: string) => RemoteState<number>;
```

### File Structure

IRPC has no compiler and no file-based routing — you can organize your files however you like. You can even put declarations and implementations in the same file (though there's little reason to — you'd ship your server logic to the client for nothing).

A convention that works well is giving each domain its own directory with two files:

```
rpc/
├── users/
│   ├── index.ts        ← Declaration (shared, safe to publish)
│   └── constructor.ts  ← Implementation (typically server-only)
├── products/
│   ├── index.ts
│   └── constructor.ts
└── ai/
    ├── index.ts
    └── constructor.ts
```

- **`index.ts`** — Contains `irpc.declare()` calls, type exports, and shared types.
- **`constructor.ts`** — Contains `irpc.construct()` calls with the actual business logic.

You could just as easily put everything in a single `rpc.ts` file, or split by feature instead of by domain. IRPC doesn't care — it only looks at what you register via `irpc.declare()` and `irpc.construct()`.

## Export Patterns

IRPC stubs are just functions — how you expose them is up to you. Here are three patterns that work at different scales.

### Flat Exports

The simplest pattern. Each function is a named export. Works well when you have a few functions per domain:

```typescript
// rpc/users/index.ts
export const getUser    = irpc.declare<GetUserFn>({ name: 'user.get' });
export const createUser = irpc.declare<CreateUserFn>({ name: 'user.create' });
export const listUsers  = irpc.declare<ListUsersFn>({ name: 'user.list' });
```

```typescript
// Consumer
import { getUser, createUser } from './rpc/users/index.js';
```

### Namespace Objects

Group stubs into a single object. This avoids polluting the import namespace when you have many domains with overlapping verb names (`get`, `list`, `create`):

```typescript
// rpc/users/index.ts
const get    = irpc.declare<GetUserFn>({ name: 'user.get' });
const create = irpc.declare<CreateUserFn>({ name: 'user.create' });
const list   = irpc.declare<ListUsersFn>({ name: 'user.list' });
const remove = irpc.declare<DeleteUserFn>({ name: 'user.delete' });

export const users = { get, create, list, remove };
```

```typescript
// Consumer — no name collisions, self-documenting
import { users } from './rpc/users/index.js';

const user = await users.get('123');
const all  = await users.list();
```

This scales cleanly when you have `products.list`, `orders.list`, and `users.list` all in the same component.

### Barrel Re-exports

Aggregate multiple domains into a single entry point for convenience:

```typescript
// rpc/index.ts
export { users } from './users/index.js';
export { products } from './products/index.js';
export { orders } from './orders/index.js';
```

```typescript
// Consumer
import { users, products } from './rpc/index.js';

const user = await users.get('123');
const items = await products.list({ category: 'electronics' });
```

### Co-exporting Types

Always export your domain types alongside the stubs so consumers get full autocomplete:

```typescript
// rpc/users/index.ts
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
};

export type UserInput = { name: string; email: string };

export type GetUserFn = (id: string) => Promise<User>;
export const getUser = irpc.declare<GetUserFn>({ name: 'user.get' });
```

```typescript
import { getUser, type User } from './rpc/users/index.js';
```

## Argument Patterns

Function signatures support several argument patterns. The arguments are serialized to JSON over the wire, so they must be serializable.

### Single Argument

The simplest pattern — one value in, one value out:

```typescript
export type GetUserFn = (id: string) => Promise<User>;
export const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });

// Client
const user = await getUser('user-123');
```

### Multiple Arguments

Multiple positional arguments map directly to the function signature:

```typescript
export type UpdateUserFn = (id: string, data: Partial<UserInput>) => Promise<User>;
export const updateUser = irpc.declare<UpdateUserFn>({ name: 'updateUser' });

// Client
const user = await updateUser('user-123', { name: 'Jane' });
```

### Object Arguments

For complex inputs, use a single object parameter. This scales better than many positional arguments and makes call sites self-documenting:

```typescript
export type SearchUsersFn = (query: {
  term: string;
  role?: 'admin' | 'member';
  limit?: number;
  offset?: number;
}) => Promise<User[]>;

export const searchUsers = irpc.declare<SearchUsersFn>({ name: 'searchUsers' });

// Client
const users = await searchUsers({ term: 'john', role: 'admin', limit: 10 });
```

### No Arguments

Functions that take no arguments work just as well:

```typescript
export type GetCurrentUserFn = () => Promise<User>;
export const getCurrentUser = irpc.declare<GetCurrentUserFn>({ name: 'getCurrentUser' });

// Client
const me = await getCurrentUser();
```

### File Arguments

Files can be passed as direct arguments or nested inside objects. The transport extracts and reconstructs them automatically:

```typescript
import type { IRPCFile } from '@irpclib/irpc';

// Direct file argument
export type UploadAvatarFn = (file: IRPCFile) => Promise<string>;
export const uploadAvatar = irpc.declare<UploadAvatarFn>({ name: 'uploadAvatar' });

// Nested inside an object
export type UpdateProfileFn = (profile: {
  username: string;
  avatar: IRPCFile;
  documents: IRPCFile[];
}) => Promise<void>;
export const updateProfile = irpc.declare<UpdateProfileFn>({ name: 'updateProfile' });
```

On the client, wrap browser `File` or `Blob` objects in `IRPCFile`:

```typescript
import { IRPCFile } from '@irpclib/irpc';

const file = fileInput.files[0];
const avatar = new IRPCFile(
  { name: file.name, size: file.size, type: file.type },
  file
);

await uploadAvatar(avatar);
```

On the server, `file.data` gives you the `Blob` and `file.meta` gives you the metadata (name, size, type).

::: tip Use HTTP Transport for file uploads
The browser offloads HTTP uploads to a background thread. WebSocket transport supports binary framing, but large transfers block the persistent socket, delaying other RPC calls.
:::

## Return Types

You define your function's return type naturally — just like writing any TypeScript function. IRPC supports three patterns:

```typescript
// Return a plain value
export type GetNameFn = () => string;

// Return a Promise (most common)
export type GetUserFn = (id: string) => Promise<User>;

// Return a RemoteState for continuous streaming
export type WatchPricesFn = (ticker: string) => RemoteState<number>;
```

When the return type is `RemoteState<T>`, you must provide `{ stream: true }`:

```typescript
import type { RemoteState } from '@irpclib/irpc';

export type WatchPricesFn = (ticker: string) => RemoteState<number>;

export const watchPrices = irpc.declare<WatchPricesFn>({
  name: 'watchPrices',
  stream: true,
});
```

::: warning Always set `{ stream: true }` for streaming functions
Without `{ stream: true }`, the engine has no runtime signal that the call is a stream — TypeScript types are erased at runtime. The call will share a connection with other batched calls, which means it can't be independently cancelled and may lead to unexpected behavior.
:::

### Initial Data

Provide an `init` factory to seed `reader.data` before the server responds:

```typescript
// Stream with initial data
export const watchPrices = irpc.declare<WatchPricesFn>({
  name: 'watchPrices',
  stream: true,
  init: () => 0, // reader.data starts at 0 before server data arrives
});

// Standard call with initial data (useful for optimistic UI)
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  init: () => ({ id: '', name: 'Loading...', email: '', role: 'member' }),
});
```

Without `init`, `reader.data` is `undefined` until the server responds.

The handler implements its logic using the declared return type — returning a value, a Promise, or a `stream()`. See the [Handlers](/remote-function/handler) page for implementation details.

## IRPCReader

Every call returns an `IRPCReader<T>`, where `T` is the unwrapped data type:

| Declared Return Type | Call Returns | `T` |
|---------------------|-------------|-----|
| `string` | `IRPCReader<string>` | `string` |
| `Promise<User>` | `IRPCReader<User>` | `User` |
| `RemoteState<number>` | `IRPCReader<number>` | `number` |

`IRPCReader<T>` is a reactive proxy that extends `Promise<T>`. You can `await` it, `.then()` it, or bind directly to its live properties.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T` | The current payload — mutated by the server as data arrives |
| `status` | `'idle' \| 'pending' \| 'success' \| 'error'` | The execution lifecycle state |
| `error` | `{ code: number; message: string }` | Error details when `status` is `'error'` |

### Execution

A call is **never executed until consumed**. Calling the stub creates an `IRPCReader` but the call doesn't fire until you consume it — via `await`, `.then()`, or `.start()`:

```typescript
const reader = getUser('123');
// reader.status === 'idle'
// No call has been made.

const user = await reader;
// Now the call fires, resolves, and returns the User.
```

You can consume a call in three ways:

```typescript
// 1. await — fires the call and waits for the result
const user = await getUser('123');

// 2. .then() — fires the call and handles the result via callback
getUser('123').then(user => console.log(user));

// 3. .start() — fires the call without waiting for completion
const reader = getUser('123');
reader.start();
// reader.data will populate when the call resolves
```

### Deferred Execution

With `{ deferred: true }`, the call ignores `await` and `.then()` as triggers — only `.start()` can fire it. This is useful when you want to bind the reader to the UI immediately but control exactly when execution starts:

```typescript
export const watchPrices = irpc.declare<WatchPricesFn>({
  name: 'watchPrices',
  stream: true,
  deferred: true,
});
```

::: code-group

```tsx [React]
import { setup, render, onMount } from '@anchorlib/react';
import { watchPrices } from './rpc/prices/index.js';

export const PriceWidget = setup(({ ticker }) => {
  const prices = watchPrices(ticker);
  onMount(() => prices.start());

  return render(() => <span>${prices.data}</span>);
});
```

```tsx [SolidJS]
import { onMount } from 'solid-js';
import { watchPrices } from './rpc/prices/index.js';

export const PriceWidget = (props) => {
  const prices = watchPrices(props.ticker);
  onMount(() => prices.start());

  return <span>${prices.data}</span>;
};
```

:::

### Subscription

Subscribe to state changes programmatically:

```typescript
const prices = watchPrices('AAPL');

prices.subscribe((state) => {
  console.log('Price:', state.data);
  console.log('Status:', state.status);
});

prices.start();
```

### Cancellation

Close a call to abort the server handler and trigger cleanup:

```typescript
const prices = watchPrices('AAPL');
prices.start();

// Later
prices.close();
```

`.close()` sends a cancellation packet to the server. The server's `AbortController` fires, cleanup functions run, and the stream is dropped.

::: tip Automatic Cleanup
When a component unmounts, readers bound to that component are automatically closed. You don't need to call `.close()` manually.
:::

## Caching

Avoid redundant calls by caching responses:

```typescript
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  maxAge: 60000, // Cache for 60 seconds
});
```

Subsequent calls with **identical arguments** within the window return the cached result immediately — no extra request.

### Cache Invalidation

Clear stale entries manually after mutations:

```typescript
// Invalidate a specific entry (by arguments)
irpc.invalidate(getUser, 'user-123');

// Invalidate all entries for this function
irpc.invalidate(getUser);
```

## Coalescing

When multiple callers invoke the same function with identical arguments **simultaneously**, coalescing merges them into a single execution:

```typescript
export const getCurrentUser = irpc.declare<GetCurrentUserFn>({
  name: 'getCurrentUser',
  coalesce: true,
});
```

If three disconnected components all call `getCurrentUser()` at the same time, only one request fires. All three receive the same result.

Coalescing is distinct from caching: caching reuses past results **over time**; coalescing deduplicates concurrent **in-flight** requests.

## Timeout

Set a per-function timeout. If the call exceeds it, the Promise rejects:

```typescript
export const slowQuery = irpc.declare<SlowQueryFn>({
  name: 'slowQuery',
  timeout: 30000, // 30 seconds
});
```

## Retry

Configure retry behavior for transient transport failures:

```typescript
export const processPayment = irpc.declare<ProcessPaymentFn>({
  name: 'processPayment',
  maxRetries: 5,
  retryMode: 'exponential', // delays: 1s, 2s, 4s, 8s, 16s
  retryDelay: 1000,
});
```

**Only transport errors are retried.** Handler errors (thrown by your server logic) fail immediately — retrying a business logic error would be incorrect.

## TTL (Time-To-Live)

For streams, TTL caps the maximum lifetime. If the stream exceeds the duration, the router aborts it server-side:

```typescript
export const watchPrices = irpc.declare<WatchPricesFn>({
  name: 'watchPrices',
  stream: true,
  ttl: 300000, // 5-minute maximum
});
```

For one-shot calls, use `timeout` instead.

## Priority Cascade

All per-function options (`timeout`, `maxRetries`, `retryMode`, `retryDelay`) cascade from most specific to least specific:

```
Function → Package → Transport
```

A `timeout` set on the function overrides the package default, which overrides the transport fallback. Set sane defaults globally and override where needed:

```typescript
// Package-level defaults
const irpc = createPackage({
  name: 'my-api',
  version: '1.0.0',
  maxRetries: 3,
  retryMode: 'linear',
});

// Function-level override
export const criticalOp = irpc.declare<CriticalOpFn>({
  name: 'criticalOp',
  maxRetries: 10,
  retryMode: 'exponential',
});
```

## Validation

Attach Zod schemas for runtime input and output validation:

```typescript
import { z } from 'zod';

export const createUser = irpc.declare({
  name: 'createUser',
  schema: {
    input: [z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })],
    output: z.object({
      id: z.string(),
      name: z.string(),
    }),
  },
});
```

- **Input validation** runs before the handler — invalid arguments are rejected before your server code is reached.
- **Output validation** runs before the response is sent — catching handler bugs before they reach the client.

Validation is optional. TypeScript enforces types at compile time. Schemas add **runtime** enforcement for untrusted input boundaries.

## Automatic Batching

When multiple functions are called simultaneously, the transport batches them into a **single request**:

```typescript
const [user, posts, stats] = await Promise.all([
  getUser('123'),
  getPosts('123'),
  getStats('123'),
]);
// → ONE HTTP request. Responses stream back as each handler completes.
```

Batching is automatic and zero-configuration. Calls made in the same microtask are batched. The `debounce` option on the transport controls the batching window.
