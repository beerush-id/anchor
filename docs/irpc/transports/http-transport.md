---
title: "HTTP Transport"
description: "Complete guide to configuring and using the HTTP transport for IRPC with automatic batching, streaming, retry logic, and hook support."
keywords:
  - irpc
  - http transport
  - batching
  - streaming
  - hooks
  - retry
---

# HTTP Transport

The HTTP transport provides automatic batching, streaming responses, retry logic, and hook support for IRPC over HTTP.

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

`import '@irpclib/server'` sets up `AsyncLocalStorage` for request isolation.

The router's `resolve` method accepts the HTTP request and an `initContext` array — `[key, value]` tuples that seed the request context. Hooks and handlers read these keys via `getContext()`, never touching the raw `Request` object.

```typescript
import '@irpclib/server';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';

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

## HTTPTransport Configuration

```typescript
type HTTPTransportConfig = {
  baseURL?: string;              // Base URL for requests
  endpoint?: string;             // Endpoint path (default: '/irpc')
  headers?: Record<string, string>; // Custom headers
  fetchOptions?: RequestInit;    // Custom fetch options
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

#### fetchOptions

Custom `fetch` options to be merged into every request. This is useful for passing credentials, caching rules, or other standard `RequestInit` parameters.

```typescript
const transport = new HTTPTransport({
  fetchOptions: {
    credentials: 'include', // Automatically send cookies
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

`router.resolve()` takes the HTTP request as its first argument and an `initContext` array as its second. The context entries become available to all hooks and handlers for that request.

```typescript
const router = new HTTPRouter(irpc, transport);

Bun.serve({
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

### Custom Response Builder

By default, the router constructs and returns a standard HTTP `Response`. If you need to intercept the response creation — such as dynamically appending HTTP headers after hooks run or based on custom server state — you can pass a custom response builder as the third argument to `router.resolve()`.

```typescript
Bun.serve({
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req, [], async (body, init) => {
        // Yield to microtasks if you need handlers/hooks to flush side-effects
        await Promise.resolve();

        const headers = new Headers(init.headers);
        
        // Example: Append a custom header dynamically
        headers.set('x-processed-by', 'anchor-router');

        return new Response(body, { ...init, headers });
      });
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

### Hooks

Hooks run before handlers execute. They read from the standardized context keys seeded by `initContext` — they never reference transport-specific types like `Request` or `Headers`.

This decoupling means you can extract hooks into a shared library and reuse them across HTTP, WebSocket, and BroadcastChannel routers without modification.

```typescript
router.use(async () => {
  const token = getContext<string>('token');
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  setContext('user', await verifyToken(token));
});
```

Hooks can:
- Read standardized context via `getContext(key)`
- Set additional context for handlers via `setContext(key, value)`
- Throw errors to reject the request

### Multiple Hooks

Hooks execute in order. If any hook throws, the request is rejected.

```typescript
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Missing token');
  setContext('user', await verifyToken(token));
});

router.use(async () => {
  const user = getContext<User>('user');
  if (await isRateLimited(user.id)) {
    throw new Error('Rate limit exceeded');
  }
});

router.use(async () => {
  console.log('Request from:', getContext<User>('user').id);
});
```

## Automatic Batching

The HTTP transport batches multiple calls made simultaneously.

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

The server pushes sequential `IRPCPacketStream` chunks over HTTP Server-Sent Events. You do not have to wait for large arrays to complete, nor do you need to configure WebSockets for simple server-push configurations.

```http
HTTP/1.1 200 OK
Content-Type: application/json
Transfer-Encoding: chunked

{"id":"3","name":"llamaModel","status":2,"data":"Deep"}
{"id":"1","name":"getPosts","status":1,"data":[...]}
{"id":"3","name":"llamaModel","status":2,"data":"Deep in the void"}
{"id":"3","name":"llamaModel","status":1,"data":"Deep in the void!"}
```

The HTTP Transport layer automatically uses a `TextDecoderStream` to parse these JSON lines, resolving standard Promises or populating the reactive client Proxies in real-time.

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

### Hook Errors

Hook errors reject the call before its handler executes. Other calls in the same batch are unaffected.

```typescript
router.use(async () => {
  if (!isAuthorized()) {
    throw new Error('Unauthorized'); // Rejects only this call
  }
});
```

### Stream Cancellation

Clients can cancel individual streams by calling `.close()` on the `RemoteState`. The transport aborts the underlying HTTP request for that batch:

```typescript
const prices = watchPrices('AAPL');
prices.start();

// Later — cancel this specific stream
prices.close();
```

### Read Error Termination

If the HTTP response stream encounters a reading error (e.g., network interruption), all pending calls within that batch are terminated with error packets, preventing dangling unresolved promises on the client.

## Context Management

The router's `resolve` method accepts an `initContext` parameter — an array of `[key, value]` tuples that seed the request context. The router only manages the internal `AbortController`.

The integration point extracts application-level values from transport-specific objects and injects them as standardized keys. Hooks and handlers never reference transport types — they consume the same standardized context contract regardless of which transport delivered the call.

### Standardizing Context Across Transports

Define your application's context contract once. Each transport maps its specific objects into the same keys:

```typescript
// HTTP
router.resolve(req, [
  ['token', req.headers.get('authorization')],
  ['locale', req.headers.get('accept-language')],
]);

// WebSocket
router.resolve(msg, ws, [
  ['token', ws.data.token],
  ['locale', ws.data.locale],
]);

// Broadcast
router.resolve(requests, [
  ['token', self.workerToken],
  ['locale', self.workerLocale],
]);
```

Hooks and handlers see the same `'token'` and `'locale'` keys everywhere. No transport awareness required.

### Reading Context in Hooks

```typescript
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});
```

### Reading Context in Handlers

```typescript
irpc.construct(getProfile, async () => {
  const user = getContext<User>('user');
  return await db.users.findById(user.id);
});
```

## Performance

The HTTP transport achieves **high performance** compared to traditional REST through:

1. **Automatic batching** - Reduces HTTP connection overhead
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

export type SlowQueryFn = () => Promise<void>;

const slowQuery = irpc.declare<SlowQueryFn>({
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

### Use Hooks for Cross-Cutting Concerns

Implement authentication, logging, and rate limiting in hooks.

```typescript
router.use(authHook);
router.use(rateLimitHook);
router.use(loggingHook);
```

### Stream Responses

The router streams responses. Ensure your handlers complete as quickly as possible to enable continuous execution.

## Next Steps

- [Transport Overview](/irpc/transports/index.html) - Understanding IRPC transports
- [Getting Started](/irpc/getting-started) - Complete setup guide
- [Specification](/irpc/specification) - Full protocol specification
