---
title: 'IRPC vs. Hono'
description: 'Comparing Isomorphic RPC with Hono and its RPC client. See the difference between Edge-first Web Standards and pure function execution.'
sidebar: false
prev: false
next: false
---

# IRPC vs. Hono

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`Hono`** **`hono/client`** **`RPC`**

[Hono](https://hono.dev/) is a lightweight, ultrafast web framework built on Web Standards. It's famous for running anywhere (Cloudflare Workers, Deno, Bun) and provides end-to-end type safety using its `hono/client` RPC client. Your frontend automatically infers the types of your backend endpoints without code generation.

IRPC (part of the AIR Stack) achieves end-to-end type safety without relying on HTTP routing semantics. Instead of inferring types from URL paths and HTTP verbs, you explicitly declare pure function signatures. 

Here is an unfiltered look at how you accomplish the same tasks in both frameworks, without hiding the boilerplate.

## Framework comparison

While both provide end-to-end type safety, their architectural decisions affect how you organize and scale your codebase.

| Aspect | Hono | IRPC |
|---|---|---|
| **Paradigm** | Edge-first Web Standard Router | Isomorphic Remote Functions |
| **Transport** | Strictly HTTP/WebSocket | Abstracted (HTTP, WS, BroadcastChannel, etc.) |
| **Client Integration** | `hc` RPC fetch client | Direct stub invocation |
| **Reactivity** | Manual (requires TanStack Query/Signals) | Native (tightly integrated with UI graph) |
| **Validation** | Zod validator middleware (`@hono/zod-validator`) | Native Zod schema attachment |

## Getting started

Both frameworks require initializing a backend server and exposing it to the client.

### Hono Setup

In Hono, you initialize an application instance and chain your routing configuration to it. It heavily utilizes standard Web APIs.

```typescript
// server/index.ts
import { Hono } from 'hono';
import { appRouter } from './router.js';

export const app = new Hono()
  .route('/', appRouter);

// Export the Type of the router for the hc client to infer
export type App = typeof app;
```

**Setup Client Providers**

Because Hono's RPC client (`hc`) only provides a fetch client, if you want reactivity in a React app, you must wire it into TanStack Query and provide the context.

```typescript
// client/query.ts
import { QueryClient } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { App } from '../server/index.js';

export const client = hc<App>('http://localhost:3000');
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

import { HTTPRouter } from '@irpclib/http/router';
import { transport } from '../lib/module.js';

const router = new HTTPRouter(transport);

// You can even run IRPC using Hono as the underlying server!
import { Hono } from 'hono';
const app = new Hono();

app.post(`${transport.endpoint}/*`, (c) => router.resolve(c.req.raw, []));

export default app;
```

**Setup Global Adapter**

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

This is where the divergence is clearest. Hono combines the routing definition and execution logic into a single chained method call on the HTTP router. IRPC separates them entirely into independent function signatures.

### Hono Procedures

In Hono, you define endpoints using HTTP verbs (`.get`, `.post`), URL paths (`/hello`), and you write the implementation directly inside the route handler. For validation, Hono heavily relies on middleware like `@hono/zod-validator`.

```typescript
// server/routers/hello.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const helloRouter = new Hono()
  .get('/hello', zValidator('query', z.object({ name: z.string() })), (c) => {
    const { name } = c.req.valid('query');
    return c.json({ greeting: `Hello, ${name}!` });
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

Fetching data on the client is where the cost of the architecture becomes obvious. Hono requires bridging fetch logic into UI state, while IRPC binds to the UI natively.

### Calling Hono APIs

To consume Hono's RPC client (`hc`) in a reactive UI, you must manually bridge the fetch client into TanStack Query.

```tsx
import { useQuery } from '@tanstack/react-query';
import { client } from './query.js';

export function Greeting({ name }: { name: string }) {
  // Manual wiring of the query key and the fetch promise
  const query = useQuery({
    queryKey: ['hello', name],
    queryFn: async () => {
      const res = await client.hello.$get({ query: { name } });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
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

### Hono Validation

Hono typically uses the official `@hono/zod-validator` middleware to validate inputs and coerce types at the HTTP request boundary.

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const authRouter = new Hono()
  .post('/login', zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })), async (c) => {
    const { email, password } = c.req.valid('json');
    const user = await db.users.find(email);
    if (!user) return c.json({ error: 'User not found' }, 404);
    
    return c.json({ token: 'xyz' });
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

How you manage dependencies (like database connections or caches) defines how testable your codebase is. Hono injects context via the HTTP request pipeline, while IRPC uses the global adapter.

### Hono Variables

Hono uses context variables (`c.set` and `c.get`) and middleware to inject dependencies into the HTTP request pipeline.

```typescript
// server/middleware/db.ts
import { createMiddleware } from 'hono/factory';
import { DatabaseDriver } from '../../lib/db.js';

export const dbMiddleware = createMiddleware(async (c, next) => {
  c.set('db', new DatabaseDriver());
  await next();
});
```

```typescript
// server/routers/users.ts
import { Hono } from 'hono';
import { dbMiddleware } from '../middleware/db.js';

type Variables = { db: DatabaseDriver };

export const usersRouter = new Hono<{ Variables: Variables }>()
  .use('*', dbMiddleware)
  .get('/users/:id', async (c) => {
    // The db instance is accessed from the HTTP context variables
    const db = c.get('db');
    const id = c.req.param('id');
    return c.json(await db.users.findById(id));
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

### Hono WebSockets

Hono supports WebSockets, especially using its Node.js or Cloudflare/Bun native helpers (e.g., `@hono/node-ws`). You explicitly define a WebSocket route and manually manage the connection lifecycle.

```typescript
// server/routers/chat.ts
import { Hono } from 'hono';
import { createNodeWebSocket } from '@hono/node-ws';
import { redis } from '../../lib/redis.js';

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: new Hono() });

export const chatRouter = new Hono()
  .get('/chat', upgradeWebSocket((c) => {
    let sub: any;
    return {
      onOpen(event, ws) {
        // Must manually bind the external subscription to the connection
        sub = redis.subscribe('global-chat', (msg) => {
          ws.send(msg);
        });
      },
      onClose() {
        // Must manually track and destroy the subscription on disconnect
        sub?.unsubscribe();
      }
    }
  }));
```

**Client-side Usage**
Hono's RPC client (`hc`) doesn't natively handle WebSockets out-of-the-box via fetch. You must manually instantiate the WebSocket in the frontend.

```tsx
import { useState, useEffect } from 'react';

export function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  
  useEffect(() => {
    // Manually instantiate and manage the WS connection
    const ws = new WebSocket('ws://localhost:3000/chat');
    
    ws.onmessage = (event) => {
      setMessages(prev => [...prev, event.data]);
    };
    
    return () => ws.close(); // Cleanup
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

### Hono CRUD Procedures

In Hono, you manually build HTTP routes for every entity, handling your database logic and cache invalidation inside each route handler.

```typescript
// server/routers/users.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { cache } from '../lib/cache.js';

export const usersRouter = new Hono()
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const cached = await cache.get(`user:${id}`);
    if (cached) return c.json(cached);
    
    const user = await db.users.findById(id);
    if (user) await cache.set(`user:${id}`, user);
    return c.json(user);
  })
  .post('/', zValidator('json', z.object({ name: z.string(), email: z.string() })), async (c) => {
    const body = c.req.valid('json');
    const user = await db.users.create(body);
    await cache.set(`user:${user.id}`, user);
    return c.json(user);
  })
  .put('/:id', zValidator('json', z.object({ name: z.string().optional(), email: z.string().optional() })), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const updated = await db.users.update(id, body);
    await cache.set(`user:${id}`, updated);
    return c.json(updated);
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db.users.delete(id);
    await cache.delete(`user:${id}`);
    return c.json(true);
  });
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

Both frameworks deliver excellent end-to-end type safety, but they cater to very different mental models.

**Choose Hono if:** You want a versatile, Web Standard-compliant router that can run anywhere. You prefer designing standard RESTful APIs and utilizing the HTTP request/response cycle, while still enjoying the benefits of an RPC client (`hc`) for type inference.

**Choose IRPC if:** You want to break free from the mental model of HTTP requests entirely. If you prefer decentralized modularity where signatures are independent contracts, and you want native UI reactivity without relying on external state management libraries, IRPC provides a cleaner, truly isomorphic experience.
