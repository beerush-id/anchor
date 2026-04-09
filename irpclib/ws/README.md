# @irpclib/ws

WebSocket transport for IRPC — persistent connections with lower latency, automatic batching, and auto-reconnection.

## Features

- Persistent WebSocket connection — eliminates HTTP handshake overhead per request
- Automatic batching of multiple calls into single WebSocket messages
- Auto-reconnection with configurable retry logic
- Real-time connection state tracking (CONNECTING, OPEN, CLOSING, CLOSED)
- Configurable retry logic with linear or exponential backoff
- Native streaming via persistent socket for `RemoteState` subscriptions

## Installation

```bash
npm install @irpclib/ws @irpclib/irpc
```

## Usage

### 1. Create Package

```typescript
// lib/module.ts
import { createPackage } from "@irpclib/irpc";
import { WebSocketTransport } from "@irpclib/ws";

export const irpc = createPackage({ name: "my-api", version: "1.0.0" });

export const transport = new WebSocketTransport({
  url: "ws://localhost:8080",
  autoReconnect: true,
  maxReconnectAttempts: 5,
});

irpc.use(transport);
```

### 2. Declare Functions (Shared)

```typescript
// rpc/hello/index.ts
import { irpc } from "../lib/module.js";
import type { RemoteState } from "@irpclib/irpc";

export type MyMethodFn = (arg1: string, arg2: string) => Promise<string>;
export const myMethod = irpc.declare<MyMethodFn>({ name: "myMethod" });

export type StreamDataFn = () => RemoteState<string>;
export const streamData = irpc.declare<StreamDataFn>({
  name: "streamData",
  init: () => "", // Initial client-side state before server data arrives
});
```

### 3. Implement Handlers (Server)

```typescript
// rpc/hello/constructor.ts
import { irpc } from "../lib/module.js";
import { myMethod, streamData } from "./index.js";
import { stream } from "@irpclib/irpc";

irpc.construct(myMethod, async (arg1, arg2) => {
  return `Hello ${arg1} and ${arg2}!`;
});

irpc.construct(streamData, () => {
  return stream((data, resolve) => {
    data = "Part 1...";
    setTimeout(() => {
      data += " Part 2";
      resolve(data);
    }, 1000);
  }, "");
});
```

### 4. Server Setup

```typescript
// server.ts
import { WebSocketRouter } from "@irpclib/ws";
import { irpc, transport } from "./lib/module.js";
import "./rpc/hello/constructor.js";

const router = new WebSocketRouter(irpc, transport);

Bun.serve({
  port: 8080,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WebSocket server running");
  },
  websocket: {
    async message(ws, message) {
      await router.resolve(message.toString(), ws);
    },
  },
});
```

### 5. Client Usage

```typescript
// client.ts
import { myMethod, streamData } from "./rpc/hello/index.js";

const result = await myMethod("arg1", "arg2");

const call = streamData();
call.subscribe(state => console.log(state.data)); // "Part 1..." -> "Part 1... Part 2"
```

## Performance

The WebSocket transport provides **lower latency** than HTTP through:

1. **Persistent connection** - No TCP handshake overhead per request
2. **Immediate messaging** - Messages sent without HTTP request/response cycle
3. **Connection reuse** - Same WebSocket connection for multiple calls
4. **Minimal overhead** - Direct function calls, no HTTP headers/parsing

### Connection Management

```typescript
// Check connection state
if (transport.isOpen) {
  await someMethod();
}

console.log("Connection state:", transport.state); // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
```

### Auto-Reconnection

```typescript
const transport = new WebSocketTransport({
  url: "ws://localhost:3000",
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  autoReconnect: true,
});

// Force manual reconnection
await transport.reconnect();
```

## Configuration

### Call Configuration (Available at All Levels)

Retry, timeout, and other call settings can be configured at **function**, **package**, or **transport** level:

```typescript
// Function-level (highest priority)
const criticalFn = irpc.declare({
  name: 'processPayment',
  timeout: 30000,
  maxRetries: 5,
  retryMode: 'exponential',
});

// Package-level (medium priority)
const irpc = createPackage({
  name: 'my-api',
  timeout: 10000,
  maxRetries: 3,
  retryMode: 'linear',
});

// Transport-level (lowest priority)
const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  timeout: 5000,
  maxRetries: 1,
  retryDelay: 1000,
});
```

**Priority Order:** Function → Package → Transport

### WebSocketTransportConfig

```typescript
interface WebSocketTransportConfig {
  // WebSocket connection
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;

  // Connection management
  maxReconnectAttempts?: number; // Default: 5
  reconnectDelay?: number; // Default: 1000ms
  autoReconnect?: boolean; // Default: true
  connectionTimeout?: number; // Default: 10000ms

  // Call configuration (can be overridden by package/function)
  timeout?: number;
  maxRetries?: number;
  retryMode?: 'linear' | 'exponential';
  retryDelay?: number;

  // Transport-specific
  debounce?: number | boolean;
}
```

## API Reference

### WebSocketTransport

#### Properties

- `state: WebSocketState` - Current connection state
- `isOpen: boolean` - Whether the connection is open

#### Methods

- `close(): void` - Close the WebSocket connection
- `reconnect(): Promise<void>` - Force a reconnection

### WebSocketRouter

#### Methods

- `use(middleware: WebSocketMiddleware): this` - Add middleware
- `resolve(message: string, ws: WebSocket, request?: Request): Promise<void>` - Handle incoming messages and send responses
- `endpoint: string` (getter) - Get the WebSocket endpoint URL

### Retry Logic

```typescript
const transport = new WebSocketTransport({
  url: "ws://localhost:3000",
  maxRetries: 3,
  retryMode: "exponential", // 1s, 2s, 4s delays
  retryDelay: 1000,
});
```

- **Network errors only** - retry on connection failures, not handler errors
- **Backoff strategies** - 'linear' (fixed) or 'exponential' (2^n \* delay)
- **Configurable** - enable/disable retries as needed

## License

MIT
