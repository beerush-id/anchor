# @irpclib/irpc

**Isomorphic Remote Procedure Call** - Call remote functions like local functions.

```typescript
// Instead of this:
const response = await fetch('/api/hello');
const data = await response.json();

// Just do this:
const message = await hello('John');
```

---

## Why IRPC?

**Beside the simplicity**, this is what you get:

### Benchmark Results
**Scenario:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** 🚀 |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |
| Elysia | 36,993ms | 1,000,000 | 0.68x |

**IRPC handled 1 million API calls in 3.6 seconds with 10x fewer HTTP connections.**

---

## Features

- ✅ **6.96x faster** than traditional REST
- ✅ **10x fewer HTTP connections** (automatic batching)
- ✅ **Type-safe** (end-to-end TypeScript)
- ✅ **Zero boilerplate** (no routes, no endpoints)
- ✅ **Transport agnostic** (HTTP, WebSocket, etc.)
- ✅ **Built-in caching** (configurable per-call)
- ✅ **Retry & timeout** (automatic error handling)

---

## Quick Start

### Create New Project

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

export const hello = irpc.declare<HelloFn>({
  name: 'hello'
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

### 4. Setup Server

```typescript
// server.ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';
import './rpc/hello/constructor.js'; // Import handlers

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  routes: {
    [transport.endpoint]: {
      POST: (req) => router.resolve(req),
    }
  },
});
```

### 5. Use on Client

```typescript
import { hello } from './rpc/hello/index.js';

const message = await hello('John');
console.log(message); // "Hello John"
```

---

## Advanced Features

### Caching

```typescript
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  maxAge: 60000, // Cache for 60 seconds
});
```

### Timeout

```typescript
export const slowQuery = irpc.declare<SlowQueryFn>({
  name: 'slowQuery',
  timeout: 30000, // 30 second timeout
});
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

For detailed documentation, visit [https://anchorlib.dev/docs/irpc](https://anchorlib.dev/docs/irpc)

## License

MIT
