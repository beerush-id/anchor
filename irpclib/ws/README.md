# @irpclib/ws

WebSocket transport implementation for IRPC library.

## Features

- ⚡ **Lower latency** - Persistent WebSocket connection eliminates HTTP handshake overhead per request
- 🔄 **Persistent connection** - Single connection handles multiple calls without reconnection overhead
- 📦 **Automatic batching** - Multiple calls batched into single WebSocket message automatically
- 🔁 **Retry logic** - Configurable retry attempts with linear/exponential backoff for network failures
- 🛡️ **Type safety** - Full TypeScript support with proper interfaces
- 📊 **Connection state tracking** - Real-time connection health monitoring (CONNECTING/OPEN/CLOSING/CLOSED)
- 🎯 **Error handling** - Comprehensive timeout and connection failure recovery with auto-reconnection

## Installation

```bash
npm install @irpclib/ws
```

## Usage

### Client-side

```typescript
import { WebSocketTransport } from "@irpclib/ws";
import { createPackage } from "@irpclib/irpc";

// Create WebSocket transport
const transport = new WebSocketTransport({
  url: "ws://localhost:8080",
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  connectionTimeout: 10000,
});

// Create IRPC client package
const irpc = createPackage({
  name: "my-api",
  version: "1.0.0",
}).use(transport);

// Declare function types and functions
type MyMethodFn = (arg1: string, arg2: string) => Promise<string>;
export const myMethod = irpc.declare<MyMethodFn>({ name: "myMethod" });

// Use the client
const result = await myMethod("arg1", "arg2");
```

### Server-side

```typescript
import { WebSocketRouter } from "@irpclib/ws";
import { createPackage } from "@irpclib/irpc";

// Create IRPC package
const irpc = createPackage({
  name: "my-api",
  version: "1.0.0",
});

// Create WebSocket transport
const transport = new WebSocketTransport({
  url: "ws://localhost:8080",
});

irpc.use(transport);

// Declare function types and functions
type MyMethodFn = (arg1: string, arg2: string) => Promise<string>;
export const myMethod = irpc.declare<MyMethodFn>({ name: "myMethod" });

// Implement handlers
irpc.construct(myMethod, async (arg1: string, arg2: string) => {
  return `Hello ${arg1} and ${arg2}!`;
});

// Create WebSocket transport
const transport = new WebSocketTransport({
  url: "ws://localhost:8080",
});

irpc.use(transport);

// Create router
const router = new WebSocketRouter(irpc, transport);

// Add middleware
router.use(() => {
  console.log("Request received");
});

// Handle WebSocket messages
const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) return undefined;
    return new Response("WebSocket server running");
  },
  websocket: {
    async message(ws, message) {
      await router.resolve(message.toString(), ws);
    },
  },
});
```

## Performance

The WebSocket transport provides **lower latency** than HTTP through:

1. **Persistent connection** - No TCP handshake overhead per request
2. **Immediate messaging** - Messages sent without HTTP request/response cycle
3. **Connection reuse** - Same WebSocket connection for multiple calls
4. **Minimal overhead** - Direct function calls, no HTTP headers/parsing

### Connection Management

WebSocket provides built-in connection state tracking:

```typescript
// Check connection state
if (transport.isOpen) {
  await someMethod();
}

// Monitor connection
console.log("Connection state:", transport.state); // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
```

### Auto-Reconnection

WebSocket automatically handles connection failures:

```typescript
const transport = new WebSocketTransport({
  url: "ws://localhost:3000",
  maxReconnectAttempts: 5, // Try 5 times before giving up
  reconnectDelay: 1000, // Wait 1 second between attempts
  autoReconnect: true, // Enable auto-reconnection
});

// Force manual reconnection
await transport.reconnect();
```

## Configuration

### WebSocketTransportConfig

```typescript
interface WebSocketTransportConfig {
  // Base transport config
  timeout?: number;
  debounce?: number | boolean;

  // WebSocket specific
  url: string;
  protocols?: string[];
  maxReconnectAttempts?: number; // Default: 5
  reconnectDelay?: number; // Default: 1000ms
  autoReconnect?: boolean; // Default: true
  connectionTimeout?: number; // Default: 10000ms
  headers?: Record<string, string>;

  // Retry logic
  maxRetries?: number; // Default: 0
  retryMode?: "linear" | "exponential"; // Default: 'linear'
  retryDelay?: number; // Default: 1000ms
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

WebSocket transport includes retry capabilities for network failures:

```typescript
const transport = new WebSocketTransport({
  url: "ws://localhost:3000",
  maxRetries: 3, // Retry up to 3 times
  retryMode: "exponential", // 1s, 2s, 4s delays
  retryDelay: 1000, // 1 second base delay
});
```

- **Network errors only** - retry on connection failures, not handler errors
- **Backoff strategies** - 'linear' (fixed) or 'exponential' (2^n \* delay)
- **Configurable** - enable/disable retries as needed

## License

MIT
