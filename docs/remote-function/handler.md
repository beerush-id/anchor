---
title: 'Handlers'
description: 'Deep-dive into IRPC handler implementation — constructing logic, streaming with the stream() factory, cleanup, context, hooks, and error handling.'
---

# Handlers

A **handler** is the implementation that fulfills a function's contract. While the [Functions](/remote-function/function) page covers the declaration, this page covers the **construction** — the actual logic that runs when a function is called.

Handlers typically live in `constructor.ts` files, alongside their declarations in `index.ts`. This separation means your declaration files stay lightweight and publishable, while implementation details like database queries and API secrets stay in their own files.

## Constructing a Handler

`irpc.construct()` binds a handler implementation to a declared function stub:

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, (name: string) => {
  return `Hello, ${name}! Welcome to Anchor!`;
});
```

The handler receives the **exact same typed arguments** as the declared function. If `HelloFn` is `(name: string) => Promise<string>`, the handler receives a `string` and must return a `string`. TypeScript enforces this at compile time — the types are inferred from the stub.

### Server-Side Setup

For server runtimes like Node or Bun, import `@irpclib/server` to enable `AsyncLocalStorage` for request context isolation. This prevents context from one user's request leaking into another's under concurrent load.

```typescript
// server.ts
import '@irpclib/server';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';

// Register all handlers
import './rpc/constructors.js';

const router = new HTTPRouter(irpc, transport);
```

Constructor files are imported for their **side effects** — the `irpc.construct()` call registers the handler at import time. The order of imports doesn't matter.

## Returning Values

A handler returns what its declaration specifies. If the function returns `Promise<T>`, the handler returns a value:

```typescript
irpc.construct(getUser, async (id: string) => {
  const user = await db.users.findById(id);
  if (!user) throw new Error('User not found');
  return user;
});
```

```typescript
irpc.construct(createUser, async (data: UserInput) => {
  const user = await db.users.create(data);
  await emailService.sendWelcome(user.email);
  return user;
});
```

Thrown errors propagate to the client as rejected Promises. The error `message` is preserved across the wire. Handler errors are **never retried** — only transport failures trigger retry logic.

## Returning Streams

If the function returns `RemoteState<T>`, the handler uses the `stream()` factory to yield continuous data back to the client:

```typescript
import { irpc, stream } from '@irpclib/irpc';
import { generatePoem } from './index.js';

irpc.construct(generatePoem, (prompt) => {
  return stream<string>(async (state, resolve, reject) => {
    const response = await ai.generate({ prompt, stream: true });
    
    for await (const chunk of response) {
      if (state.status !== 'pending') break;
      state.data += chunk.text;
    }
    
    resolve();
  });
});
```

### The `stream()` Factory

`stream(callback, initialData?)` creates a `RemoteState<T>` and passes it to your callback:

```typescript
stream<T>(
  (state: RemoteState<T>, resolve: () => void, reject: (error: Error) => void) => {
    // Your streaming logic
  },
  initialData?: T // Optional server-side initial data
)
```

| Parameter | Description |
|-----------|-------------|
| `state` | The reactive proxy. Any mutation on `state` is tracked and pushed to the client incrementally. |
| `resolve` | Call when the stream is complete. Closes the connection cleanly. |
| `reject` | Call on unrecoverable errors. Closes the connection with an error. |

The client's `IRPCReader` proxy mirrors these mutations in real time.

### Checking Stream Status

Always check `state.status` before mutating. If the client disconnected or the stream was aborted, continuing to mutate is wasteful:

```typescript
irpc.construct(streamLogs, (filter) => {
  return stream<string[]>(async (state, resolve) => {
    const cursor = db.logs.watch(filter);
    
    for await (const log of cursor) {
      if (state.status !== 'pending') break;
      state.data.push(log);
    }
    
    resolve();
  }, []);
});
```

### Progressive Data Hydration

The most powerful stream pattern is **progressive hydration** — executing multiple parallel queries and pushing each result as it arrives. This eliminates UI waterfalls:

```typescript
irpc.construct(getDashboard, (userId) => {
  return stream((state, resolve) => {
    const q1 = db.users.get(userId).then(res => state.data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => state.data.sales = res);
    const q3 = externalApi.fetchMetrics().then(res => state.data.telemetry = res);

    Promise.all([q1, q2, q3]).then(() => resolve());
  }, {} as DashboardData);
});
```

On the client, the `IRPCReader` populates each field independently. The UI skeleton can begin rendering immediately — the `user` card appears as soon as `q1` resolves, even if `q3` is still in flight:

::: code-group

```tsx [React]
export const DashboardWidget = setup(({ userId }) => {
  const dashboard = getDashboard(userId);
  onMount(() => dashboard.start());
  
  return render(() => (
    <div>
      <User data={dashboard.data.user} />
      <Sales data={dashboard.data.sales} />
      <Metrics data={dashboard.data.telemetry} />
    </div>
  ));
});
```

```tsx [SolidJS]
export const DashboardWidget = (props) => {
  const dashboard = getDashboard(props.userId);
  onMount(() => dashboard.start());
  
  return (
    <div>
      <User data={dashboard.data.user} />
      <Sales data={dashboard.data.sales} />
      <Metrics data={dashboard.data.telemetry} />
    </div>
  );
};
```

:::

## Cleanup Functions

For streams that manage persistent connections, event listeners, or external subscriptions, return a **cleanup function** from the `stream()` callback. The framework guarantees this cleanup runs under all lifecycle conditions:

```typescript
irpc.construct(watchPrices, (ticker) => {
  return stream(async (state) => {
    const connection = await redis.connect();
    
    connection.on('price_update', (price) => {
      state.data = price;
    });

    return () => {
      connection.close();
    };
  });
});
```

### When Cleanup Runs

The cleanup function is guaranteed to execute under **all** lifecycle conditions:

| Condition | Trigger |
|-----------|---------|
| **Successful completion** | `resolve()` is called by your code |
| **Error rejection** | `reject()` is called by your code |
| **Client disconnection** | The client calls `.close()` or the connection drops |
| **TTL timeout** | The router aborts because the stream exceeded its `ttl` |
| **Async hand-off** | If an abort fires during an `await` in your initialization, the cleanup still runs when the Promise resolves |

::: warning Unhandled Exceptions
The **only** exception is an unhandled throw *before* your cleanup function is returned. If your code throws a fatal exception before the `return () => {...}` line executes, the cleanup hook is never registered. Always wrap dangerous initializations in `try...catch`:

```typescript
irpc.construct(watchPrices, (ticker) => {
  return stream(async (state) => {
    let connection;
    try {
      connection = await redis.connect();
    } catch (e) {
      throw e;
    }
    
    connection.on('price_update', (price) => {
      state.data = price;
    });

    return () => {
      connection.close();
    };
  });
});
```
:::

## Manual Stream Construction

If you bypass the `stream()` utility, you can manually construct a `RemoteState` and wire teardown listeners yourself using `getAbortSignal()`:

```typescript
import { RemoteState, getAbortSignal } from '@irpclib/irpc';

irpc.construct(watchPrices, (ticker) => {
  const state = new RemoteState<number>();
  const signal = getAbortSignal();

  const handle = externalDataSource.subscribe(ticker, (price) => {
    state.data = price;
  });

  signal?.addEventListener('abort', () => {
    externalDataSource.unsubscribe(handle);
  });

  return state;
});
```

The client still receives an `IRPCReader<number>` — the handler's internal `RemoteState` is never exposed directly. This is an **advanced pattern**. The `stream()` factory is preferred because it handles the abort wiring automatically.

## Context

Every request carries an isolated context — a key-value store seeded by the router's `initContext` and accessible via `getContext()` and `setContext()`.

### Reading Context in Handlers

```typescript
import { getContext } from '@irpclib/irpc';

irpc.construct(getProfile, async () => {
  const user = getContext<User>('user');
  return await db.users.findById(user.id);
});
```

### Setting Context

Hooks typically set context for downstream handlers:

```typescript
import { getContext, setContext } from '@irpclib/irpc';

// Hook sets the user
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

// Handler reads it
irpc.construct(getProfile, async () => {
  const user = getContext<User>('user');
  return await db.users.findById(user.id);
});
```

Context is scoped to the individual request. On server runtimes, `AsyncLocalStorage` ensures concurrent requests from different users never share context.

## Hooks

IRPC has a **two-level hook system** for guarding and intercepting calls.

### Router Hooks (Global)

Router hooks run **before every request** processed by that router. They read from the context keys seeded by `initContext`.

```typescript
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});
```

Multiple router hooks execute in registration order. If any hook throws, the request is rejected before any handler executes:

```typescript
// 1. Authentication
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Missing token');
  setContext('user', await verifyToken(token));
});

// 2. Rate limiting
router.use(async () => {
  const user = getContext<User>('user');
  if (await isRateLimited(user.id)) {
    throw new Error('Rate limit exceeded');
  }
});

// 3. Logging
router.use(async () => {
  console.log('Request from:', getContext<User>('user').id);
});
```

### Spec Hooks (Per-Function)

Spec hooks guard **individual functions**. They receive the typed request arguments and run at the module level — right before the handler:

```typescript
irpc.hook(deleteUser, async (req) => {
  const user = getContext<User>('user');
  if (!user?.admin) throw new Error('Forbidden');
});
```

The `req` object contains `name` and `args`, typed from the function's signature:

```typescript
type DeleteUserFn = (userId: string) => Promise<void>;
const deleteUser = irpc.declare<DeleteUserFn>({ name: 'deleteUser' });

irpc.hook(deleteUser, (req) => {
  req.args[0]; // typed as string (userId)
});
```

### Execution Order

For every incoming call, the execution sequence is:

1. **Router hooks** — Global guards (auth, rate limiting, logging)
2. **Spec hooks** — Per-function guards (authorization, validation)
3. **Handler** — Business logic

If any hook throws, execution stops immediately. The error propagates to the client as a rejected Promise.

### Isomorphic Hooks

Spec hooks are **module-scoped**, not environment-scoped. When client and server share a module instance (e.g., during SSR), all registered hooks run at the call site.

## Error Handling

### Handler Errors

Thrown errors propagate to the client as rejected Promises with preserved error messages:

```typescript
irpc.construct(getUser, async (id) => {
  const user = await db.users.findById(id);
  if (!user) throw new Error('User not found');
  return user;
});
```

```typescript
// Client
try {
  const user = await getUser('invalid-id');
} catch (error) {
  console.error(error.message); // 'User not found'
}
```

### Handler Errors vs. Transport Errors

This distinction matters for retry behavior:

| Error Type | Retry? | Example |
|------------|--------|---------|
| **Handler error** | ❌ Never | `throw new Error('Not found')` |
| **Transport error** | ✅ If configured | Connection timeout, DNS failure |

Retrying a handler error would be incorrect — if your server says "User not found," sending the same request again won't change the answer. Transport errors are transient and may succeed on retry.

### Hook Errors

Hook errors reject the call **before** its handler executes. Other calls in the same batch are unaffected — a failed auth check on one function doesn't block a different function in the same batch.
