# @irpclib/broadcast

BroadcastChannel transport implementation for IRPC library.

## Features

- **Zero network overhead** - Messages stay in the browser, no HTTP/WebSocket connections
- **Cross-context communication** - Works across tabs, windows, iframes, and workers
- **Same-origin only** - Secure communication within the same origin
- **Automatic namespacing** - Channel names prefixed with `irpc://` to avoid conflicts
- **Isomorphic transport** - Same configuration works on both client and server sides
- **Full TypeScript support** - Proper type interfaces
- **Comprehensive error handling** - Timeout and error recovery

## Installation

```bash
npm install @irpclib/broadcast
```

## Basic Usage

### Shared Module

Create a shared module that all contexts will use:

```typescript
// lib/module.ts
import { BroadcastTransport } from '@irpclib/broadcast';
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({
  name: 'my-api',
  version: '1.0.0',
});

export const transport = new BroadcastTransport({
  channel: irpc.href, // 'my-api/1.0.0'
});

irpc.use(transport);

// Declare functions
export const processData = irpc.declare<(data: string) => Promise<string>>({
  name: 'processData'
});
```

### Client (Main Thread or Tab)

```typescript
import { processData } from './lib/module.js';

// Call function (handled by worker or another tab)
const result = await processData('Hello from main thread');
console.log(result); // 'Processed: Hello from main thread'
```

### Server (Web Worker or Another Tab)

```typescript
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport, processData } from './lib/module.js';

// Implement handler
irpc.construct(processData, async (data) => {
  return `Processed: ${data}`;
});

// Create router to handle incoming requests
const router = new BroadcastRouter(irpc, transport);
```

## Use Cases

### Cross-Tab Communication

Perfect for applications that need to sync state across multiple tabs:

```typescript
// Tab 1: Server
const router = new BroadcastRouter(irpc, transport);
irpc.construct(syncState, async (state) => {
  // Update local state
  return { success: true };
});

// Tab 2: Client
await syncState({ user: "John", theme: "dark" });
```

### Worker Communication

Communicate with Web Workers seamlessly:

```typescript
// Main thread: Server
const router = new BroadcastRouter(irpc, transport);
irpc.construct(processData, async (data) => {
  return heavyComputation(data);
});

// Worker thread: Client
const result = await processData(largeDataset);
```

### iframe Communication

Same-origin iframe communication without postMessage complexity:

```typescript
// Parent window: Server
const router = new BroadcastRouter(irpc, transport);

// iframe: Client
const data = await fetchData();
```

## Configuration

### BroadcastTransportConfig

```typescript
interface BroadcastTransportConfig {
  // Channel name (will be prefixed with 'irpc://')
  channel: string;

  // Call configuration (can be overridden by package/function)
  timeout?: number;            // Request timeout in ms
  maxRetries?: number;         // Max retry attempts
  retryMode?: 'linear' | 'exponential';  // Retry strategy
  retryDelay?: number;         // Delay between retries in ms
}
```

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
const transport = new BroadcastTransport({
  channel: 'my-api',
  timeout: 5000,      // 5s fallback
  maxRetries: 1,      // 1 retry attempt
  retryDelay: 1000,   // 1s delay
});
```

**Priority Order:** Function → Package → Transport

## API Reference

### BroadcastTransport

#### Properties

- `endpoint: string` - The namespaced channel name (e.g., `irpc://my-api`)

#### Methods

- `close(): void` - Close the BroadcastChannel connection

### BroadcastRouter

#### Methods

- `use(middleware: BroadcastMiddleware): this` - Add middleware
- `close(): void` - Close the router and cleanup

## When to Use BroadcastChannel vs WebSocket vs HTTP

| Feature | BroadcastChannel | WebSocket | HTTP |
|---------|-----------------|-----------|------|
| **Network** | None (in-browser) | TCP connection | HTTP requests |
| **Latency** | Lowest | Low | Medium |
| **Cross-origin** | ❌ Same-origin only | ✅ Yes | ✅ Yes |
| **Cross-tab** | ✅ Yes | ❌ No | ❌ No |
| **Server required** | ❌ No | ✅ Yes | ✅ Yes |
| **Use case** | Tab/Worker sync | Real-time updates | Traditional API |

**Use BroadcastChannel when:**
- Communicating between tabs/windows of the same origin
- Communicating with Web Workers
- No server-side processing needed
- Want zero network overhead

**Use WebSocket when:**
- Need server-side processing
- Real-time server-to-client updates
- Cross-origin communication needed

**Use HTTP when:**
- Traditional request-response pattern
- RESTful APIs
- Server-side processing with no real-time requirements

## Browser Support

BroadcastChannel is supported in all modern browsers:
- Chrome 54+
- Firefox 38+
- Safari 15.4+
- Edge 79+

For older browsers, consider using a polyfill or fallback to WebSocket/HTTP transport.

## License

MIT
