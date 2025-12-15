# @irpclib/http

HTTP Transport for IRPC - Automatic batching, streaming, retry, and timeout support.

---

## Features

- ✅ **Automatic batching** - Multiple calls in one HTTP request
- ✅ **Streaming responses** - Progressive resolution
- ✅ **Retry logic** - Linear or exponential backoff
- ✅ **Timeout handling** - Per-call and request-level
- ✅ **Middleware support** - Authentication, logging, rate limiting
- ✅ **AbortController** - Cancel requests in-flight

---

## Installation

```bash
npm install @irpclib/http @irpclib/irpc
```

---

## Quick Start

### Client Setup

```typescript
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

const irpc = createPackage({ 
  name: 'my-api', 
  version: '1.0.0' 
});

const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
  timeout: 10000,        // 10 second default timeout
  debounce: 0,           // Batch immediately
  maxRetries: 3,         // Retry failed requests
  retryMode: 'linear',   // or 'exponential'
  retryDelay: 1000,      // 1 second between retries
});

irpc.use(transport);
```

### Server Setup

```typescript
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

// Add middleware
router.use(async () => {
  const userId = getContext('userId');
  if (!userId) {
    throw new Error('Unauthorized');
  }
});

Bun.serve({
  port: 3000,
  routes: {
    [transport.endpoint]: {
      POST: (req) => router.resolve(req),
    }
  },
});
```

---

## Configuration

### HTTPTransport Options

```typescript
{
  endpoint: string;           // IRPC endpoint path (default: '/irpc')
  headers?: Record<string, string>;  // Custom headers
  timeout?: number;           // Request timeout in ms
  debounce?: number;          // Batching delay in ms (default: 0)
  maxRetries?: number;        // Max retry attempts (default: 0)
  retryMode?: 'linear' | 'exponential';  // Retry strategy
  retryDelay?: number;        // Delay between retries in ms
}
```

### Middleware

```typescript
router.use(async () => {
  // Access context
  const req = getContext<Request>('request');
  const userId = req.headers.get('x-user-id');
  
  // Set context for handlers
  setContext('userId', userId);
  
  // Throw to reject request
  if (!userId) {
    throw new Error('Unauthorized');
  }
});
```

---

## How It Works

### Automatic Batching

```typescript
// Client makes 10 calls
const [users, posts, stats, ...] = await Promise.all([
  getUsers(),
  getPosts(),
  getStats(),
  // ... 7 more
]);

// IRPC batches into 1 HTTP request:
POST /irpc/my-api/1.0.0
[
  { "id": "1", "name": "getUsers", "args": [] },
  { "id": "2", "name": "getPosts", "args": [] },
  { "id": "3", "name": "getStats", "args": [] },
  // ... 7 more
]

// Server streams responses as they complete:
{"id":"3","result":{...}}  // Stats (fastest)
{"id":"1","result":[...]}  // Users
{"id":"2","result":[...]}  // Posts
// ...
```

**Result:** 10x fewer HTTP connections, 6.96x faster performance.

---

## Advanced Features

### Per-Call Timeout

```typescript
export const slowQuery = irpc.declare({
  name: 'slowQuery',
  timeout: 30000,  // 30 second timeout for this call
});
```

### Retry on Network Errors

```typescript
const transport = new HTTPTransport({
  maxRetries: 3,
  retryMode: 'exponential',  // 1s, 2s, 4s delays
  retryDelay: 1000,
});
```

Only network errors are retried. Handler errors fail immediately.

---

## Documentation

For detailed documentation, visit [https://anchorlib.dev/docs/irpc/http](https://anchorlib.dev/docs/irpc)

## License

MIT