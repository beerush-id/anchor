---
title: "WebSocket Transport"
description: "Using the WebSocket transport for IRPC with persistent connections, lower latency, and automatic reconnection."
keywords:
  - irpc
  - websocket
  - transport
  - persistent connection
  - real-time
---

# WebSocket Transport

The WebSocket transport provides persistent connections for IRPC, offering lower latency and real-time capabilities compared to HTTP.

## Overview

WebSocket transport maintains a single persistent connection that handles multiple IRPC calls without reconnection overhead. This eliminates HTTP handshake latency and enables real-time communication patterns.

## Installation

```bash
npm install @irpclib/ws
```

## Basic Usage

### 1. Declare Functions (Shared)

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;
export const hello = irpc.declare<HelloFn>({ name: 'hello' });
```

### 2. Implement Handlers (Server)

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, async (name) => `Hello ${name}`);
```

### 3. Server Setup

The WebSocket upgrade happens at connection time, but IRPC messages arrive later during the session. Extract application-level values (e.g., auth tokens) from the upgrade request in `fetch`, attach them to `ws.data`, and forward them as `initContext` on each `resolve` call. This gives hooks the same standardized keys as the HTTP router.

```typescript
// server.ts
import { WebSocketRouter } from '@irpclib/ws/router';
import { irpc, transport } from './lib/module.js';
import './rpc/hello/constructor.js';

const router = new WebSocketRouter(irpc, transport, {
  fileBufferTTL: 30000, // Clean up orphaned binary frames after 30s (default)
});

Bun.serve({
  port: 8080,
  fetch(req, server) {
    const token = req.headers.get('authorization');
    if (server.upgrade(req, { data: { token } })) return;
    return new Response('WebSocket server running');
  },
  websocket: {
    async message(ws, message) {
      await router.resolve(message.toString(), ws, [
        ['token', ws.data.token],
      ]);
    },
    close(ws) {
      // Abort all active streams for this connection
      router.disconnect(ws);
    },
  },
});
```

### 4. Client Usage

```typescript
// client.ts
import { hello } from './rpc/hello/index.js';

const message = await hello('John');
console.log(message); // 'Hello John'
```

## Configuration

### WebSocketTransportConfig

```typescript
type WebSocketTransportConfig = {
  // WebSocket connection
  url: string;                    // WebSocket URL to connect to
  protocols?: string[];          // Sub-protocols for the connection

  // Reconnection
  autoReconnect?: boolean;        // Enable automatic reconnection (default: true)
  maxReconnectAttempts?: number;  // Maximum reconnection attempts (default: 5)
  reconnectDelay?: number;        // Delay between reconnection attempts (default: 1000ms)

  // Timeouts
  connectionTimeout?: number;     // Connection establishment timeout (default: 10000ms)
  timeout?: number;               // Request timeout (inherited from base)

  // Batching
  debounce?: number | boolean;    // Batching delay (inherited from base)

  // Retry
  maxRetries?: number;            // Maximum retry attempts (inherited from base)
  retryMode?: 'linear' | 'exponential'; // Retry strategy (inherited from base)
  retryDelay?: number;            // Base retry delay (inherited from base)

  // Headers (for WebSocket upgrade request)
  headers?: Record<string, string>;
};
```

## Connection Management

### Connection States

The transport provides real-time connection state monitoring:

```typescript
// Check current state
console.log(transport.state); // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED

// Check if connected
if (transport.isOpen) {
  await someFunction();
}
```

### Auto-Reconnection

WebSocket transport handles connection failures:

```typescript
const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000, // 1 second between attempts
});

// Manual reconnection
await transport.reconnect();
```

### Connection Events

Monitor connection lifecycle:

```typescript
// The transport handles reconnection internally
// Connection state can be checked via transport.state
// Calls are queued during reconnection
```

## Performance Benefits

### Lower Latency

- **No HTTP handshake** - Persistent connection eliminates TCP handshake overhead per request
- **Immediate messaging** - Messages sent without HTTP request/response cycle
- **Connection reuse** - Same WebSocket connection for multiple calls

### Automatic Batching

Multiple simultaneous calls are batched into single WebSocket messages:

```typescript
// These calls are batched into 1 WebSocket message
const [user, posts, stats] = await Promise.all([
  getUser('123'),
  getPosts('123'),
  getStats('123'),
]);
```

### Streaming Responses

Because the WebSocket channel persists, responses are yielded dynamically as continuous `IRPCPacketStream` chunks over the socket. This enables you to bind standard UI components directly to the network proxy without writing manual WebSocket `MessageEvent` listeners.

### File Upload Constraints

WebSocket transport fully supports `IRPCFile` uploads natively via length-prefixed binary framing. The router buffers incoming `ArrayBuffer` payloads and matches them to file pointers when the JSON payload arrives.

The `fileBufferTTL` option (default: 30000ms) controls how long orphaned binary frames are held in memory before being discarded. If the matching JSON payload never arrives within the TTL window, the buffered file data is automatically cleaned up.

> [!WARNING]
> Sending large files over a WebSocket connection will block the persistent socket pipeline until the binary transfer completes. This means other simultaneous small RPC calls won't reach the server until the file finishes uploading. For applications heavily reliant on file uploads alongside real-time interactions, **HTTP Transport** is the strongly recommended approach, as standard HTTP multi-part requests are offloaded to background browser processes, keeping the WebSocket connection responsive.

### Connection Disconnect

The router tracks `AbortController` instances for every active stream. When a WebSocket connection closes, call `router.disconnect(ws)` to abort all active streams for that connection:

```typescript
websocket: {
  close(ws) {
    router.disconnect(ws);
  },
}
```

### Stream Cancellation

Clients can cancel individual streams by calling `.close()` on the `RemoteState`. The transport sends a cancellation packet to the server, which aborts the stream's `AbortController` and triggers cleanup:

```typescript
// Client
const prices = watchPrices('AAPL');
prices.start();

// Later — cancel this specific stream
prices.close();
```

## Error Handling

### Network Errors

WebSocket transport includes retry logic for network failures:

```typescript
const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  maxRetries: 3,
  retryMode: 'exponential', // 1s, 2s, 4s delays
  retryDelay: 1000,
});
```

Network errors trigger automatic retries. Handler errors fail immediately without retry.

### Connection Failures

Connection failures trigger reconnection attempts. Pending calls are queued and sent once reconnected.

## Advanced Usage

### Custom Headers

Include headers in the WebSocket upgrade request:

```typescript
const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  headers: {
    'Authorization': 'Bearer token',
    'X-API-Key': 'key',
  },
});
```

### Hooks

Because the integration point injects the same standardized keys as HTTP (`'token'`, `'user'`, etc.), the exact same hook function works on both routers. No transport-specific imports, no conditional logic.

```typescript
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) {
    throw new Error('Unauthorized');
  }

  setContext('user', await verifyToken(token));
});
```

### Custom Protocols

Specify WebSocket sub-protocols:

```typescript
const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  protocols: ['irpc', 'json'],
});
```

## Comparison with HTTP Transport

| Feature | WebSocket | HTTP |
|---------|-----------|------|
| Connection Type | Persistent | Request/Response |
| Latency | Lower | Higher |
| Overhead | Minimal | HTTP headers |
| Real-time | Yes | No |
| Batching | Automatic | Automatic |
| Browser Support | Excellent | Universal |
| Setup Complexity | Medium | Simple |

Choose WebSocket transport when:
- You need persistent connections
- Lower latency is critical
- You're building real-time applications
- You want bidirectional communication

Choose HTTP transport when:
- You need maximum compatibility
- You're building REST-like APIs
- Simplicity is preferred
- You have existing HTTP infrastructure

## Troubleshooting

### Connection Issues

**Problem:** Connection fails to establish

**Solutions:**
- Check WebSocket URL format (`ws://` or `wss://`)
- Verify server is running and accepting WebSocket connections
- Check firewall/proxy settings
- Use browser dev tools to inspect WebSocket handshake

### Reconnection Problems

**Problem:** Auto-reconnection not working

**Solutions:**
- Ensure `autoReconnect: true` is set
- Check `maxReconnectAttempts` value
- Verify server accepts reconnections
- Monitor `transport.state` for connection status

### Performance Issues

**Problem:** High latency or slow responses

**Solutions:**
- Verify WebSocket connection is persistent
- Check for unnecessary reconnections
- Monitor batching efficiency
- Use appropriate timeout values

## Next Steps

- [Getting Started](/irpc/getting-started) - Set up IRPC with WebSocket transport
- [HTTP Transport](/irpc/transports/http-transport) - Alternative transport option
- [Specification](/irpc/specification) - Full protocol details