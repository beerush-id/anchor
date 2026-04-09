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

### 1. Declare Functions (Shared)

```typescript
// rpc/data.ts
import { BroadcastTransport } from '@irpclib/broadcast';
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
export const transport = new BroadcastTransport({ channel: irpc.href });
irpc.use(transport);

export type ProcessDataFn = (data: string) => Promise<string>;
export const processData = irpc.declare<ProcessDataFn>({ name: 'processData' });
```

### 2. Implement Handlers (Worker/Server Realm)

```typescript
// rpc/data.constructor.ts
import { irpc, processData } from './data.js';

irpc.construct(processData, async (data) => {
  return `Processed: ${data}`;
});
```

### 3. Setup Router (Worker/Server Realm)

The worker acts as the "Server" listening to the broadcast channel.

```typescript
// worker.ts
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './rpc/data.js';
import './rpc/data.constructor.js';

const router = new BroadcastRouter(irpc, transport);
console.log("Worker listening...");
```

### 4. Client Usage (Main Thread)

```typescript
// main.ts
import { processData } from './rpc/data.js';

const result = await processData('Hello from main thread');
console.log(result); // 'Processed: Hello from main thread'
```

## Use Cases

### Cross-Tab Communication

Sync state across multiple tabs:

```typescript
// rpc/sync/index.ts
export type SyncStateFn = (state: AppState) => Promise<{ success: boolean }>;
export const syncState = irpc.declare<SyncStateFn>({ name: 'syncState' });
```

```typescript
// rpc/sync/constructor.ts
import { irpc } from '../lib/module.js';
import { syncState } from './index.js';

irpc.construct(syncState, async (state) => {
  // Update local state
  return { success: true };
});
```

```typescript
// Tab 1 — sends update
import { syncState } from './rpc/sync/index.js';
await syncState({ user: "John", theme: "dark" });
```

### Worker Communication

Offload heavy computation to Web Workers:

```typescript
// rpc/data/index.ts
export type ProcessDataFn = (data: DataSet) => Promise<Result>;
export const processData = irpc.declare<ProcessDataFn>({ name: 'processData' });
```

```typescript
// worker.ts — implements and listens
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/data/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

```typescript
// main.ts — calls
import { processData } from './rpc/data/index.js';
const result = await processData(largeDataset);
```

### Iframe Communication

Same-origin iframe communication without postMessage complexity:

```typescript
// Parent calls, iframe handles
import { fetchData } from './rpc/data/index.js';
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
