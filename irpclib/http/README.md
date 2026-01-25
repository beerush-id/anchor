# @irpclib/http

HTTP Transport for IRPC - Automatic batching, streaming, retry, and timeout support.

---

## Features

- Automatic batching of multiple calls into single HTTP requests
- Streaming responses for progressive result resolution
- Configurable retry logic with linear or exponential backoff
- Comprehensive timeout handling at both call and request levels
- Middleware support for authentication, logging, and rate limiting
- Request cancellation using AbortController

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
import { setContextProvider, getContext } from '@irpclib/irpc';
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

### Call Configuration (Available at All Levels)

Retry, timeout, and other call settings can be configured at **function**, **package**, or **transport** level:

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
  retryDelay: 1000,   // 1s delay
});
```

**Priority Order:** Function → Package → Transport

### HTTPTransport Options

```typescript
interface HTTPTransportConfig {
  // IRPC endpoint
  endpoint?: string;           // Default: '/irpc'
  headers?: Record<string, string>;  // Custom headers

  // Call configuration (can be overridden by package/function)
  timeout?: number;            // Request timeout in ms
  maxRetries?: number;         // Max retry attempts
  retryMode?: 'linear' | 'exponential';  // Retry strategy
  retryDelay?: number;         // Delay between retries in ms

  // Transport-specific
  debounce?: number;           // Batching delay in ms (default: 0)
}
```

### Middleware

```typescript
import { getContext, setContext } from '@irpclib/irpc';

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