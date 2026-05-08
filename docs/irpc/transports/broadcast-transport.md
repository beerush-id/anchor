---
title: "BroadcastChannel Transport"
description: "Using the BroadcastChannel transport for IRPC to enable cross-context communication in browsers (tabs, windows, iframes, workers)."
keywords:
  - irpc
  - broadcastchannel
  - transport
  - cross-tab
  - web workers
  - browser
---

# BroadcastChannel Transport

The BroadcastChannel transport enables cross-context communication within the browser using the native BroadcastChannel API. Perfect for coordinating between tabs, windows, iframes, and Web Workers.

## Overview

BroadcastChannel transport leverages the browser's built-in BroadcastChannel API to enable seamless communication between different browsing contexts that share the same origin. This is ideal for building multi-tab applications, Web Worker coordination, and iframe communication without server infrastructure.

## Installation

```bash
npm install @irpclib/broadcast
```

## Basic Usage

### 1. Declare Functions (Shared)

```typescript
// rpc/data/index.ts
import { irpc } from '../lib/module.js';

export type ProcessDataFn = (data: string) => Promise<string>;
export const processData = irpc.declare<ProcessDataFn>({ name: 'processData' });
```

### 2. Implement Handlers (Worker)

```typescript
// rpc/data/constructor.ts
import { irpc } from '../lib/module.js';
import { processData } from './index.js';

irpc.construct(processData, async (data) => {
  return `Processed: ${data}`;
});
```

### 3. Setup Router (Worker)

```typescript
// worker.ts
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/data/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

### 4. Client Usage (Main Thread)

```typescript
// main.ts
import { processData } from './rpc/data/index.js';

const result = await processData('Hello from main thread');
console.log(result); // 'Processed: Hello from main thread'
```

## Configuration

### BroadcastTransportConfig

```typescript
type BroadcastTransportConfig = {
  // Channel configuration
  channel: string;

  // Timeouts
  timeout?: number;               // Request timeout (default: 30000ms)

  // Batching
  debounce?: number | boolean;    // Batching delay (inherited from base)

  // Retry
  maxRetries?: number;            // Maximum retry attempts (inherited from base)
  retryMode?: 'linear' | 'exponential'; // Retry strategy (inherited from base)
  retryDelay?: number;            // Base retry delay (inherited from base)
};
```

### Best Practice: Use Package Href

**Recommended:** Use `irpc.href` as the channel name to ensure consistency across all contexts:

```typescript
const irpc = createPackage({
  name: 'my-api',
  version: '1.0.0',
});

const transport = new BroadcastTransport({
  channel: irpc.href, // 'my-api/1.0.0'
});
```

**Benefits:**
- Automatic uniqueness per package
- Version-aware communication
- No manual channel name management
- Prevents accidental channel conflicts
- Consistent across main thread, workers, and tabs

## Use Cases

### 1. Web Worker Communication

Offload heavy processing to Web Workers without blocking the UI.

```typescript
// rpc/video/index.ts
export type GenerateVideoFn = (timeline: Timeline) => Promise<Blob>;
export const generateVideo = irpc.declare<GenerateVideoFn>({ name: 'generateVideo' });
```

```typescript
// rpc/video/constructor.ts
import { irpc } from '../lib/module.js';
import { generateVideo } from './index.js';

irpc.construct(generateVideo, async (timeline) => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  // ... processing
  return videoBlob;
});
```

```typescript
// worker.ts
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/video/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

```typescript
// main.ts
import { generateVideo } from './rpc/video/index.js';

const video = await generateVideo(timeline);
```

### 2. Multi-Tab Synchronization

Keep data synchronized across multiple tabs.

```typescript
// rpc/cart/index.ts
export type UpdateCartFn = (items: CartItem[]) => Promise<void>;
export const updateCart = irpc.declare<UpdateCartFn>({ name: 'updateCart' });
```

```typescript
// rpc/cart/constructor.ts
import { irpc } from '../lib/module.js';
import { updateCart } from './index.js';

irpc.construct(updateCart, async (items) => {
  cartStore.set(items);
});
```

**Tab 1 — Send updates:**
```typescript
import { updateCart } from './rpc/cart/index.js';
await updateCart(cartItems);
```

**Tab 2 — Receive updates:**
```typescript
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/cart/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

### 3. Iframe Communication

Communicate between parent and child iframes.

```typescript
// rpc/messaging/index.ts
export type SendMessageFn = (msg: string) => Promise<string>;
export const sendMessage = irpc.declare<SendMessageFn>({ name: 'sendMessage' });
```

```typescript
// rpc/messaging/constructor.ts
import { irpc } from '../lib/module.js';
import { sendMessage } from './index.js';

irpc.construct(sendMessage, async (msg) => {
  return `Iframe received: ${msg}`;
});
```

**Parent window:**
```typescript
import { sendMessage } from './rpc/messaging/index.js';
const response = await sendMessage('Hello iframe');
```

**Iframe:**
```typescript
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/messaging/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

### 4. Background Task Coordination

Coordinate background tasks across contexts.

```typescript
// rpc/sync/index.ts
export type StartSyncFn = () => Promise<void>;
export const startSync = irpc.declare<StartSyncFn>({ name: 'startSync' });
```

```typescript
// rpc/sync/constructor.ts
import { irpc } from '../lib/module.js';
import { startSync } from './index.js';

let isSyncing = false;

irpc.construct(startSync, async () => {
  if (isSyncing) return;
  isSyncing = true;
  
  try {
    await syncWithServer();
  } finally {
    isSyncing = false;
  }
});
```

**Tab 1 — Trigger sync:**
```typescript
import { startSync } from './rpc/sync/index.js';
await startSync();
```

**Tab 2 — Handle sync:**
```typescript
import { BroadcastRouter } from '@irpclib/broadcast';
import { irpc, transport } from './lib/module.js';
import './rpc/sync/constructor.js';

const router = new BroadcastRouter(irpc, transport);
```

## Performance Benefits

### Zero Network Overhead

- **No HTTP requests** - Communication happens entirely in the browser
- **No server required** - Eliminates infrastructure costs
- **Instant messaging** - Direct browser-to-browser communication

### Automatic Batching

Multiple simultaneous calls are batched into single BroadcastChannel messages:

```typescript
// These calls are batched into 1 message
const [result1, result2, result3] = await Promise.all([
  processTask1(),
  processTask2(),
  processTask3(),
]);
```

### Offline-First

Works completely offline since no server is required:

```typescript
// Works without internet connection
const result = await heavyComputation(data);
```

## Error Handling

### Network Errors

BroadcastChannel transport includes retry logic:

```typescript
const transport = new BroadcastTransport({
  channel: 'my-app',
  maxRetries: 3,
  retryMode: 'exponential', // 1s, 2s, 4s delays
  retryDelay: 1000,
});
```

### Channel Closed

Calls fail immediately if the channel is closed:

```typescript
try {
  await someFunction();
} catch (error) {
  if (error.message.includes('Invalid state')) {
    // Channel was closed
    console.error('BroadcastChannel is closed');
  }
}
```

## Advanced Usage

### Hooks

Unlike HTTP and WebSocket, BroadcastChannel has no incoming request object. The router injects only the internal `AbortController` by default. To supply the same standardized context keys used across other transports, pass `initContext` when calling `resolve()` directly.

```typescript
router.resolve(requests, [
  ['token', self.workerToken],
]);

router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});
```

### Custom Resolver

Provide a custom resolver for advanced request handling:

```typescript
const router = new BroadcastRouter(irpc, transport, {
  resolver: (req, module) => {
    // Custom resolution logic
    return new CustomResolver(req, module);
  },
});
```

### Multiple Channels

Use different channels for different purposes:

```typescript
// Data sync channel
const dataTransport = new BroadcastTransport({
  channel: 'data-sync'
});

// UI events channel
const uiTransport = new BroadcastTransport({
  channel: 'ui-events'
});

// Use different transports for different packages
dataPackage.use(dataTransport);
uiPackage.use(uiTransport);
```

## Comparison with Other Transports

| Feature | BroadcastChannel | WebSocket | HTTP |
|---------|------------------|-----------|------|
| Environment | Browser + Node.js Workers | Universal | Universal |
| Server Required | No | Yes | Yes |
| Cross-Tab | Yes | No | No |
| Web Workers | Yes | Yes | No |
| Latency | Lowest | Low | Medium |
| Offline | Yes | No | No |
| Setup Complexity | Simple | Medium | Simple |

Choose BroadcastChannel transport when:
- You're building browser applications with cross-tab communication
- You need to communicate with Web Workers (browser or Node.js)
- You want to coordinate between Node.js Worker Threads
- You want zero infrastructure costs
- You're building offline-first applications

Choose WebSocket transport when:
- You need server-side processing
- You're building real-time server communication
- You need cross-device synchronization

Choose HTTP transport when:
- You need maximum compatibility
- You're building REST-like APIs
- You have existing HTTP infrastructure

## Browser Support

BroadcastChannel is supported in all modern browsers:

- Chrome 54+
- Firefox 38+
- Safari 15.4+
- Edge 79+

Not supported in:
- Internet Explorer
- Safari < 15.4

Check compatibility:

```typescript
if ('BroadcastChannel' in window) {
  // BroadcastChannel is supported
  const transport = new BroadcastTransport({ channel: 'my-app' });
} else {
  // Fallback to HTTP or WebSocket
  const transport = new HttpTransport({ baseURL: '/api' });
}
```

## Troubleshooting

### Messages Not Received

**Problem:** Messages sent but not received in other contexts

**Solutions:**
- Ensure all contexts use the same channel name
- Verify all contexts are on the same origin
- Check that router is created in receiving context
- Confirm BroadcastChannel is supported in the browser

### Worker Communication Issues

**Problem:** Worker not receiving messages

**Solutions:**
- Verify worker script is loaded correctly
- Ensure BroadcastRouter is created in worker
- Check worker console for errors
- Confirm channel names match exactly

### Performance Issues

**Problem:** Slow message delivery

**Solutions:**
- Reduce message size (BroadcastChannel has size limits)
- Use batching for multiple calls
- Avoid sending large binary data
- Consider using SharedArrayBuffer for large data

## Security Considerations

### Same-Origin Policy

BroadcastChannel only works within the same origin:

```typescript
// These can communicate
// https://example.com/page1
// https://example.com/page2

// These cannot communicate
// https://example.com
// https://other.com
```

### Data Privacy

All messages are visible to any context on the same origin:

```typescript
// Don't send sensitive data without encryption
const transport = new BroadcastTransport({
  channel: 'public-channel' // Visible to all tabs
});

// Encrypt sensitive data before sending
const encryptedData = await encrypt(sensitiveData);
await sendData(encryptedData);
```

## Next Steps

- [Getting Started](/irpc/getting-started) - Set up IRPC with BroadcastChannel transport
- [WebSocket Transport](/irpc/transports/ws-transport) - Server-based alternative
- [HTTP Transport](/irpc/transports/http-transport) - REST-like alternative
- [Specification](/irpc/specification) - Full protocol details
