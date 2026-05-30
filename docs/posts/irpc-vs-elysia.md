---
title: 'IRPC vs. Elysia'
description: 'Comparing Isomorphic RPC with Elysia and Eden. See the difference between HTTP-driven type inference and pure function execution.'
sidebar: false
prev: false
next: false
---

# IRPC vs. Elysia

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`Elysia`** **`Eden`** **`RPC`**

[Elysia](https://elysiajs.com/) (and similar frameworks like Hono) have popularized a fantastic pattern for the modern edge/Bun ecosystem: end-to-end type safety derived directly from your HTTP router. Using Elysia's Eden client, your frontend automatically infers the types of your backend endpoints.

IRPC (part of the AIR Stack) achieves end-to-end type safety without relying on HTTP semantics at all. Instead of inferring types from URL paths and HTTP verbs, you explicitly declare pure function signatures. 

Here is an unfiltered look at how you accomplish the same tasks in both frameworks, without hiding the boilerplate.

## Framework comparison

While both provide end-to-end type safety, their architectural decisions affect how you organize and scale your codebase.

| Aspect | Elysia | IRPC |
|---|---|---|
| **Paradigm** | HTTP Router with inferred types | Isomorphic Remote Functions |
| **Transport** | Strictly HTTP/WebSocket | Abstracted (HTTP, WS, BroadcastChannel, etc.) |
| **Client Integration** | `edenTreaty` proxy fetch client | Direct stub invocation |
| **Reactivity** | Manual (requires TanStack Query/Signals) | Native (tightly integrated with UI graph) |
| **Real-time** | Manual WebSocket endpoints | Native Reactive Streaming |

## Getting started

Both frameworks require initializing a backend server and exposing it to the client.

### Elysia Setup

In Elysia, you initialize an application instance and chain your routing configuration to it.

```typescript
// server/index.ts
import { Elysia } from 'elysia';
import { appRouter } from './router.js';

export const app = new Elysia()
  .use(appRouter)
  .listen(3000);

// Export the Type of the router for the Eden client to infer
export type App = typeof app;
```

**Setup Client Providers**

Because Eden only provides a fetch client, if you want reactivity in a React app, you must wire it into TanStack Query and provide the context.

```typescript
// client/query.ts
import { QueryClient } from '@tanstack/react-query';
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../server/index.js';

export const client = edenTreaty<App>('http://localhost:3000');
export const queryClient = new QueryClient();
```

```tsx
// client/App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query.js';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootComponent />
    </QueryClientProvider>
  );
}
```

### IRPC Setup

IRPC separates the package definition, the transport layer, and the adapter initialization.

**Initialize IRPC Package**
```typescript
// lib/module.ts
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
export const transport = new HTTPTransport({ endpoint: `/irpc/${irpc.href}` });

irpc.use(transport);
```

**Setup Server Transport**
```typescript
// server/index.ts
import '@irpclib/irpc/server';
import { HTTPRouter } from '@irpclib/http/router';
import { irpc, transport } from '../lib/module.js';

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req, []);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

**Setup Global Adapter**
Setup handler adapter for standard operations such as database CRUD.

```typescript
// server/adapter.ts
import { irpc } from '../lib/module.js';
import { IRPCAdapter } from '@irpclib/irpc';
import { DatabaseDriver } from '../lib/db.js';
import { RedisCacheDriver } from '../lib/cache.js';

export const adapter = new IRPCAdapter(irpc);
adapter.use(new RedisCacheDriver());
adapter.use(new DatabaseDriver());
```

This adapter is configured once and exported for feature modules to consume.

**Setup Client Providers**

Notice what is missing here? **Nothing is required**. Because the `irpc` instance in `lib/module.ts` already has the transport attached, the frontend simply imports the stubs it needs. There are no `<IRPCProvider>` components or context wrappers required anywhere in your React tree.

## Defining Contracts and Implementations

This is where the divergence is clearest. Elysia combines the routing definition and execution logic into a single chained method call on the HTTP router. IRPC separates them entirely into independent function signatures.

### Elysia Procedures

In Elysia, you define endpoints using HTTP verbs (`.get`, `.post`), URL paths (`/hello`), and you write the implementation directly inside the route handler.

```typescript
// server/routers/hello.ts
import { Elysia, t } from 'elysia';

export const helloRouter = new Elysia()
  .get('/hello', async ({ query }) => {
    return { greeting: `Hello, ${query.name}!` };
  }, {
    query: t.Object({ name: t.String() })
  });
```

### IRPC Stubs and Constructors

IRPC decouples the contract from the HTTP route completely. You declare a function signature, and you construct the implementation separately.

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';
import { z } from 'zod';

type HelloFn = (name: string) => Promise<{ greeting: string }>;

export const sayHello = irpc.declare<HelloFn>({
  name: 'sayHello',
  schema: {
    input: [z.string()],
  }
});
```

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { sayHello } from './index.js';

irpc.construct(sayHello, async (name) => {
  return { greeting: `Hello, ${name}!` };
});
```

## Data Fetching and Reactivity

Fetching data on the client is where the cost of the architecture becomes obvious. Elysia requires bridging fetch logic into UI state, while IRPC binds to the UI natively.

### Calling Elysia APIs

To consume Elysia in a reactive UI, you must manually bridge the Eden fetch client into TanStack Query.

```tsx
import { useQuery } from '@tanstack/react-query';
import { client } from './query.js';

export function Greeting({ name }: { name: string }) {
  // Manual wiring of the query key and the fetch promise
  const query = useQuery({
    queryKey: ['hello', name],
    queryFn: async () => {
      const res = await client.hello.get({ query: { name } });
      if (res.error) throw res.error;
      return res.data;
    },
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error: {query.error.message}</div>;

  return <div>{query.data?.greeting}</div>;
}
```

### Calling IRPC Stubs

You don't make explicit network requests. You bind the stub to your reactive UI, and the AIR Stack handles the loading state, caching, and reactivity natively.

```tsx
import { setup, render } from '@airstack/react';
import { sayHello } from '../rpc/hello/index.js';

export const Greeting = setup<{ name: string }>((props) => {
  // Reactively binds the function execution.
  // Will automatically restart if props.name changes.
  const query = sayHello.with(() => [props.name]);

  return render(() => {
    if (query.status === 'pending') return <div>Loading...</div>;
    if (query.status === 'error') return <div>Error: {query.error?.message}</div>;
    
    return <div>{query.data?.greeting}</div>;
  });
});
```

## Validation and Error Handling

Input validation is essential for type safety. Both frameworks provide robust schema validation, but they apply it at different layers of the execution tree.

### Elysia Validation

Elysia uses TypeBox (exposed as `t`) directly in the route schema to validate inputs and coerce types.

```typescript
import { Elysia, t } from 'elysia';

export const authRouter = new Elysia()
  .post('/login', async ({ body, error }) => {
    const user = await db.users.find(body.email);
    if (!user) return error(404, 'User not found');
    
    return { token: 'xyz' };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 })
    })
  });
```

### IRPC Schema Validation

IRPC attaches standard Zod schemas directly to the independent stub. This ensures the contract is validated universally before the execution reaches the transport layer.

```typescript
// rpc/auth/index.ts
import { irpc } from '../lib/module.js';
import { z } from 'zod';

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFn = (credentials: z.infer<typeof loginInput>) => Promise<{ token: string }>;

export const login = irpc.declare<LoginFn>({
  name: 'login',
  schema: { input: [loginInput] },
});
```

```typescript
// rpc/auth/constructor.ts
irpc.construct(login, async (credentials) => {
  const user = await db.users.find(credentials.email);
  if (!user) throw new Error('User not found');
  
  return { token: 'xyz' };
});
```

## Context and Modularity

How you manage dependencies (like database connections or caches) defines how testable your codebase is. Elysia injects context via the HTTP request pipeline, while IRPC uses the global adapter.

### Elysia Plugins

Elysia uses a plugin system (`.use()`) and decorators (`.decorate()`, `.derive()`) to inject dependencies into the HTTP request context.

```typescript
// server/plugins/db.ts
import { Elysia } from 'elysia';
import { DatabaseDriver } from '../../lib/db.js';

export const dbPlugin = new Elysia({ name: 'db' })
  .decorate('db', new DatabaseDriver());
```

```typescript
// server/routers/users.ts
import { Elysia } from 'elysia';
import { dbPlugin } from '../plugins/db.js';

export const usersRouter = new Elysia()
  .use(dbPlugin)
  .get('/users/:id', async ({ db, params }) => {
    // The db instance is accessed from the derived HTTP context
    return await db.users.findById(params.id);
  });
```

### IRPC Context and Composition

IRPC doesn't rely on HTTP request contexts to inject dependencies. Instead, it relies purely on standard JavaScript module closures or function composition.

```typescript
// rpc/users/constructor.ts
import { irpc } from '../lib/module.js';
import { getUser } from './index.js';
import { db } from '../../lib/db.js';

irpc.construct(getUser, async (id) => {
  // The database is accessed naturally via closure
  return await db.users.findById(id);
});
```

## Real-time and Streaming

Real-time data often forces developers to abandon standard HTTP procedures and manage manual WebSocket connections. Here's how both frameworks handle streaming.

### Elysia WebSockets

Elysia supports WebSockets via the `@elysiajs/ws` plugin. You explicitly define a `.ws()` route and manually manage the connection lifecycle and messaging protocols.

```typescript
// server/routers/chat.ts
import { Elysia, t } from 'elysia';
import { redis } from '../../lib/redis.js';

export const chatRouter = new Elysia()
  .ws('/chat', {
    body: t.String(),
    open(ws) {
      // Must manually bind the external subscription to the connection
      ws.data.sub = redis.subscribe('global-chat', (msg) => {
        ws.send(msg);
      });
    },
    close(ws) {
      // Must manually track and destroy the subscription on disconnect
      ws.data.sub?.unsubscribe();
    }
  });
```

**Client-side Usage**
Eden treats WebSockets as a separate client connection. In React, you must manually wire the WebSocket lifecycle to a `useEffect`.

```tsx
import { useState, useEffect } from 'react';
import { client } from './query.js';

export function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  
  useEffect(() => {
    // Manually instantiate and manage the WS connection
    const chat = client.chat.subscribe();
    
    chat.on('message', (event) => {
      setMessages(prev => [...prev, event.data]);
    });
    
    return () => chat.close(); // Cleanup
  }, []);

  return <div>{messages.join('\n')}</div>;
}
```

### IRPC Reactive Streaming

IRPC abstracts the transport entirely. You yield reactive states from your function, and IRPC handles the underlying HTTP streams or WebSockets automatically.

```typescript
// rpc/chat/index.ts
import { irpc } from '../lib/module.js';

type WatchChatFn = () => RemoteState<string[]>;

export const watchChat = irpc.declare<WatchChatFn>('watchChat', () => []);
```

```typescript
// rpc/chat/constructor.ts
import { irpc } from '../lib/module.js';
import { stream } from '@irpclib/irpc';
import { watchChat } from './index.js';
import { redis } from '../../lib/redis.js';

irpc.construct(watchChat, () => stream((state) => {
  const sub = redis.subscribe('global-chat', (msg) => {
    state.data.push(msg);
  });
  
  return () => sub.unsubscribe();
}));
```

**Client-side Usage**
You bind the stream exactly like a standard query. The component automatically unmounts the stream, cleans up the connection, and maintains the state without a single `useEffect`.

```tsx
export const Chat = setup(() => {
  // Subscribes to the stream and handles cleanup automatically
  const chat = watchChat.once();

  return render(() => (
    <div>
      {chat.data?.join('\n') || 'Listening...'}
    </div>
  ));
});
```

## Database and CRUD

Defining basic Create, Read, Update, and Delete operations often leads to immense boilerplate, especially when introducing caching layers and database drivers.

### Elysia CRUD Procedures

In Elysia, you manually build HTTP routes for every entity, handling your database logic and cache invalidation inside each route handler.

```typescript
// server/routers/users.ts
import { Elysia, t } from 'elysia';
import { db } from '../lib/db.js';
import { cache } from '../lib/cache.js';

export const usersRouter = new Elysia({ prefix: '/users' })
  .get('/:id', async ({ params }) => {
    const cached = await cache.get(`user:${params.id}`);
    if (cached) return cached;
    
    const user = await db.users.findById(params.id);
    if (user) await cache.set(`user:${params.id}`, user);
    return user;
  }, { params: t.Object({ id: t.String() }) })

  .post('/', async ({ body }) => {
    const user = await db.users.create(body);
    await cache.set(`user:${user.id}`, user);
    return user;
  }, { body: t.Object({ name: t.String(), email: t.String() }) })

  .put('/:id', async ({ params, body }) => {
    const updated = await db.users.update(params.id, body);
    await cache.set(`user:${params.id}`, updated);
    return updated;
  }, { 
    params: t.Object({ id: t.String() }),
    body: t.Object({ name: t.String({ optional: true }), email: t.String({ optional: true }) }) 
  })

  .delete('/:id', async ({ params }) => {
    await db.users.delete(params.id);
    await cache.delete(`user:${params.id}`);
    return true;
  }, { params: t.Object({ id: t.String() }) });
```

### IRPC Standardized CRUD

IRPC provides a `crud()` utility to batch-declare these operations.

**Declare CRUD Stubs**
```typescript
// rpc/users/index.ts
import { irpc } from '../lib/module.js';

type User = { id: string; name: string; email: string };
export const users = irpc.crud<User>('users', () => ({ id: '', name: '', email: '' }));
```

**Attach Stubs to Adapter**
```typescript
// rpc/users/constructor.ts
import { adapter } from '../../server/adapter.js';
import { users } from './index.js';

// The feature attaches itself to the global adapter
adapter.attach(users);
```

Instead of manually constructing HTTP handlers for each endpoint and writing hit/miss cache logic, you attach the stubs to the global `IRPCAdapter` (which we configured in the **Setup** section). The adapter routes requests to generic driver implementations. This completely eliminates redundant database and caching boilerplate.

## Final thoughts

Both frameworks deliver excellent end-to-end type safety, but they force you to think about architecture completely differently.

**Choose Elysia/Hono if:** You want to build a traditional, explicit REST API that can be consumed by external parties, or you simply prefer mapping your application logic directly to HTTP verbs and URL structures.

**Choose IRPC if:** You want to break free from the mental model of HTTP requests entirely. If you prefer decentralized modularity where signatures are independent contracts, and you want native UI reactivity without relying on external state management libraries, IRPC provides a cleaner, truly isomorphic experience.
