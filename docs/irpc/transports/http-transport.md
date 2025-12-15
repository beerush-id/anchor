---
title: "HTTP Transport"
description: "Complete guide to configuring and using the HTTP transport for IRPC with automatic batching, streaming, retry logic, and middleware support."
keywords:
  - irpc
  - http transport
  - batching
  - streaming
  - middleware
  - retry
---

# HTTP Transport

The HTTP transport provides automatic batching, streaming responses, retry logic, and middleware support for IRPC over HTTP.

## Installation

```bash
npm install @irpclib/http
```

## Basic Setup

### Client Configuration

```typescript
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

const irpc = createPackage({ 
  name: 'my-api', 
  version: '1.0.0' 
});

const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
  timeout: 10000,
  debounce: 0,
});

irpc.use(transport);
```

### Server Configuration

```typescript
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

## HTTPTransport Configuration

```typescript
type HTTPTransportConfig = {
  baseURL?: string;              // Base URL for requests
  endpoint?: string;             // Endpoint path (default: '/irpc')
  headers?: Record<string, string>; // Custom headers
  timeout?: number;              // Request timeout in ms
  debounce?: number;             // Batching delay in ms (default: 0)
  maxRetries?: number;           // Max retry attempts (default: 0)
  retryMode?: 'linear' | 'exponential'; // Retry strategy
  retryDelay?: number;           // Delay between retries in ms (default: 1000)
};
```

### Configuration Options

#### endpoint

The URL path for IRPC requests.

```typescript
const transport = new HTTPTransport({
  endpoint: '/irpc/my-api/1.0.0',
});
```

Requests will be sent to `POST /irpc/my-api/1.0.0`.

#### baseURL

The base URL for all requests (useful for cross-origin calls).

```typescript
const transport = new HTTPTransport({
  baseURL: 'https://api.example.com',
  endpoint: '/irpc/my-api/1.0.0',
});
```

Requests will be sent to `https://api.example.com/irpc/my-api/1.0.0`.

#### headers

Custom headers to include in every request.

```typescript
const transport = new HTTPTransport({
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value',
  },
});
```

#### timeout

Default timeout for all requests (can be overridden per-function).

```typescript
const transport = new HTTPTransport({
  timeout: 10000, // 10 seconds
});
```

#### debounce

Delay before sending batched requests. Set to `0` for immediate batching.

```typescript
const transport = new HTTPTransport({
  debounce: 0, // Batch immediately
});
```

Higher values (10-50ms) can batch more calls but add latency.

#### maxRetries

Number of retry attempts for failed requests.

```typescript
const transport = new HTTPTransport({
  maxRetries: 3, // Retry up to 3 times
});
```

Only network errors are retried. Handler errors fail immediately.

#### retryMode

Retry strategy: `'linear'` or `'exponential'`.

```typescript
const transport = new HTTPTransport({
  retryMode: 'exponential', // 1s, 2s, 4s, 8s delays
});
```

- **Linear**: Fixed delay between retries
- **Exponential**: Exponentially increasing delays (2^n * retryDelay)

#### retryDelay

Base delay between retry attempts.

```typescript
const transport = new HTTPTransport({
  retryDelay: 1000, // 1 second
});
```

## HTTPRouter

The router handles incoming HTTP requests and routes them to IRPC handlers.

### Basic Usage

```typescript
const router = new HTTPRouter(irpc, transport);

Bun.serve({
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

### Middleware

Add middleware to process requests before handlers execute.

```typescript
router.use(async () => {
  const req = getContext<Request>('request');
  const userId = req.headers.get('x-user-id');
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  setContext('userId', userId);
});
```

Middleware can:
- Access request context via `getContext('request')`
- Set context for handlers via `setContext(key, value)`
- Throw errors to reject the request

### Multiple Middleware

Middleware executes in order. If any middleware throws, the request is rejected.

```typescript
router.use(async () => {
  // Authentication
  const token = getContext<Request>('request').headers.get('authorization');
  if (!token) throw new Error('Missing token');
  setContext('user', await verifyToken(token));
});

router.use(async () => {
  // Rate limiting
  const user = getContext('user');
  if (await isRateLimited(user.id)) {
    throw new Error('Rate limit exceeded');
  }
});

router.use(async () => {
  // Logging
  console.log('Request from:', getContext('user').id);
});
```

## Automatic Batching

The HTTP transport automatically batches multiple calls made simultaneously.

```typescript
// Client makes 10 calls
const [users, posts, stats, ...] = await Promise.all([
  getUsers(),
  getPosts(),
  getStats(),
  // ... 7 more
]);
```

This sends **1 HTTP request** instead of 10:

```http
POST /irpc/my-api/1.0.0
Content-Type: application/json

[
  { "id": "1", "name": "getUsers", "args": [] },
  { "id": "2", "name": "getPosts", "args": [] },
  { "id": "3", "name": "getStats", "args": [] },
  ...
]
```

### Batching Behavior

- Calls made within the `debounce` window are batched together
- Each call gets a unique ID for response correlation
- Responses stream back as handlers complete (not all at once)

## Streaming Responses

The server streams responses as they become available, not waiting for all to complete.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"id":"3","name":"getStats","result":{...}}
{"id":"1","name":"getUsers","result":[...]}
{"id":"2","name":"getPosts","result":[...]}
```

Each response resolves its corresponding Promise immediately, enabling parallel processing.

## Error Handling

### Network Errors

Network errors (connection failures, timeouts) are retried based on `maxRetries` configuration.

```typescript
const transport = new HTTPTransport({
  maxRetries: 3,
  retryMode: 'exponential',
  retryDelay: 1000,
});
```

After all retries are exhausted, the Promise rejects with the error.

### Handler Errors

Handler errors (thrown by your implementation) are returned immediately without retry.

```typescript
irpc.construct(getUser, async (id) => {
  if (!id) throw new Error('User ID required'); // Not retried
  return await db.users.findById(id);
});
```

### Middleware Errors

Middleware errors reject the entire request before handlers execute.

```typescript
router.use(async () => {
  if (!isAuthorized()) {
    throw new Error('Unauthorized'); // Rejects only this call
  }
});
```

## Context Management

Access request context in handlers using `getContext` and `setContext`.

### Setting Context in Middleware

```typescript
router.use(async () => {
  const req = getContext<Request>('request');
  const userId = req.headers.get('x-user-id');
  setContext('userId', userId);
});
```

### Accessing Context in Handlers

```typescript
irpc.construct(getProfile, async () => {
  const userId = getContext('userId');
  return await db.users.findById(userId);
});
```

### Built-in Context

The router automatically sets:
- `'request'` - The HTTP Request object
- `'headers'` - The request headers

```typescript
irpc.construct(logRequest, async () => {
  const req = getContext<Request>('request');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
});
```

## Performance

The HTTP transport achieves **6.96x faster** performance than traditional REST through:

1. **Automatic batching** - 10x fewer HTTP connections
2. **Streaming responses** - Progressive resolution, no waiting
3. **Connection reuse** - Single connection for multiple calls
4. **Minimal overhead** - Direct function calls, no routing logic

### Benchmark Results

**Scenario:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** 🚀 |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |

## Best Practices

### Set Appropriate Timeouts

Configure both transport-level and function-level timeouts.

```typescript
const transport = new HTTPTransport({
  timeout: 10000, // Default 10 seconds
});

const slowQuery = irpc.declare({
  name: 'slowQuery',
  timeout: 30000, // Override for this function
});
```

### Use Immediate Batching

Set `debounce: 0` to batch calls immediately without added latency.

```typescript
const transport = new HTTPTransport({
  debounce: 0, // Batch immediately
});
```

### Implement Retry Logic

Enable retries for resilience against transient network failures.

```typescript
const transport = new HTTPTransport({
  maxRetries: 3,
  retryMode: 'exponential',
  retryDelay: 1000,
});
```

### Use Middleware for Cross-Cutting Concerns

Implement authentication, logging, and rate limiting in middleware.

```typescript
router.use(authMiddleware);
router.use(rateLimitMiddleware);
router.use(loggingMiddleware);
```

### Stream Responses

The router automatically streams responses. Ensure your handlers complete as quickly as possible to enable progressive resolution.

## Next Steps

- [Transport Overview](/irpc/transports/index.html) - Understanding IRPC transports
- [Getting Started](/irpc/getting-started) - Complete setup guide
- [Specification](/irpc/specification) - Full protocol specification
