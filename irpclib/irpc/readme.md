# @irpclib/irpc

**Stop thinking about the network. Just call functions.**

IRPC makes remote function calls and reactive streaming look and feel like local functions. Declare once, implement on the server, call from the client — no routes, no endpoints, no WebSocket configuration.

```typescript
const message = await hello('John');

const call = loadDashboard('user-123');
call.subscribe(state => console.log(state.data));
```

---

## Performance

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |
| Elysia | 36,993ms | 1,000,000 | 0.68x |

**1 million API calls in 3.6 seconds with 10x fewer HTTP connections.**

---

## Features

- 6.96x faster than traditional REST APIs
- 10x fewer HTTP connections through automatic batching
- Native continuous reactive streaming via `RemoteState`
- End-to-end type safety with TypeScript
- Zero boilerplate — no routes or endpoints
- Transport agnostic (HTTP, WebSocket, BroadcastChannel)
- Built-in caching configurable per function
- Automatic retry and timeout handling

---

## Quick Start

```bash
npx degit beerush/anchor/templates/irpc-bun-app my-api
cd my-api
bun install
bun run serve
```

Server runs on `http://localhost:3000`

---

## Manual Setup

### Installation

```bash
npm install @irpclib/irpc @irpclib/http
```

### 1. Create Package

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

### 2. Declare Functions

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;
export const hello = irpc.declare<HelloFn>({ name: 'hello' });
```

```typescript
// rpc/dashboard/index.ts
import { irpc } from '../lib/module.js';
import type { RemoteState } from '@irpclib/irpc';

export type LoadDashboardFn = (userId: string) => RemoteState<DashboardData>;
export const loadDashboard = irpc.declare<LoadDashboardFn>({
  name: 'loadDashboard',
  init: () => ({} as DashboardData), // Initial client-side state before server data arrives
});
```

### 3. Implement Handlers (Server)

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, async (name) => {
  return `Hello ${name}`;
});
```

```typescript
// rpc/dashboard/constructor.ts
import { irpc } from '../lib/module.js';
import { loadDashboard } from './index.js';
import { stream } from '@irpclib/irpc';

irpc.construct(loadDashboard, (userId) => {
  return stream(({ data }, resolve) => {
    const q1 = db.users.get(userId).then(res => data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => data.sales = res);
    
    Promise.all([q1, q2]).then(() => resolve());
  }, {});
});
```

### 4. Setup Server

The integration point extracts application-level values from transport-specific objects and injects them as standardized context via `initContext`. This keeps middleware and handlers transport-agnostic.

```typescript
// server.ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';
import './rpc/hello/constructor.js';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  routes: {
    [transport.endpoint]: {
      POST: (req) => router.resolve(req, [
        ['token', req.headers.get('authorization')],
        ['locale', req.headers.get('accept-language')],
      ]),
    }
  },
});
```

### 5. Use on Client

```typescript
// client.ts
import { hello } from './rpc/hello/index.js';
import { loadDashboard } from './rpc/dashboard/index.js';

// Standard execution
const message = await hello('John');
console.log(message); // "Hello John"

// Stream subscription
const call = loadDashboard('user-123');
call.subscribe(state => console.log('Hydration state:', state.data));
```

---

## Advanced Features

### Call Configuration (Available at All Levels)

Configure retry, timeout, and other call behaviors at **function**, **package**, or **transport** level:

```typescript
// Function-level (highest priority)
const criticalFn = irpc.declare({
  name: 'processPayment',
  timeout: 30000,     // 30s timeout
  maxRetries: 5,      // 5 retry attempts
  retryMode: 'exponential',
});

// Package-level (medium priority)
const irpc = createPackage({
  name: 'my-api',
  timeout: 10000,     // 10s default
  maxRetries: 3,      // 3 retry attempts
  retryMode: 'linear',
});

// Transport-level (lowest priority)
const transport = new HTTPTransport({
  endpoint: '/api',
  timeout: 5000,      // 5s fallback
  maxRetries: 1,      // 1 retry attempt
});
```

**Priority Order:** Function → Package → Transport

### Caching

```typescript
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  maxAge: 60000, // Cache for 60 seconds
});
```

### Coalesce

Combine multiple calls with identical arguments:

```typescript
export const expensiveQuery = irpc.declare<ExpensiveQueryFn>({
  name: 'expensiveQuery',
  coalesce: true,
});
```

### Cache Invalidation

```typescript
// Invalidate specific cache entry
irpc.invalidate(getUser, 'user-123');

// Invalidate all cache for a function
irpc.invalidate(getUser);
```

### Validation (Optional Zod)

```typescript
import { z } from 'zod';

export const createUser = irpc.declare({
  name: 'createUser',
  input: [z.object({
    name: z.string(),
    email: z.string().email(),
  })],
  output: z.object({
    id: z.string(),
    name: z.string(),
  }),
});
```

---

## Documentation

For detailed documentation, visit [https://airlib.dev/irpc](https://airlib.dev/irpc)

## License

MIT
