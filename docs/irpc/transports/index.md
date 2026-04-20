---
title: "IRPC Transports"
description: "Understanding IRPC transports, the transport interface, routing, and how to create custom transports."
keywords:
  - irpc
  - transport
  - routing
  - custom transport
---

# IRPC Transports

Transports are the mechanism that carries IRPC requests and responses between client and server. They handle network-specific details while providing a protocol-agnostic interface.

## What are Transports?

A transport is responsible for:

- **Carrying requests and responses** - Serializing and transmitting data
- **Streaming** - Yielding continuous `IRPCPacketStream` chunks as data becomes available
- **Routing** - Mapping requests to handlers by function name
- **Batching** - Combining multiple requests into single transmissions
- **Error handling** - Managing network failures and timeouts
- **Connection management** - Maintaining network connections

## Transport Interface

All transports implement the `IRPCTransport` interface:

```typescript
abstract class IRPCTransport {
  // Call a single IRPC function
  abstract call(spec: IRPCSpec, args: IRPCData[], timeout?: number): Promise<IRPCData>;
  
  // Dispatch batched calls
  protected abstract dispatch(calls: IRPCCall[]): Promise<void>;
}
```

The transport handles batching—when multiple calls are made simultaneously, they're queued and sent together.

## Routing

Transports include routing functionality that:

- Maps incoming requests by `name` to registered handlers
- Validates request format and parameters
- Handles error propagation
- Supports request/response correlation

The routing happens server-side within the transport layer, eliminating the need for separate routing middleware.

## Stream Lifecycle

IRPC transports manage active streams through three cancellation boundaries:

1. **Client Cancellation**: Calling `call.close()` on the client sends a `CANCEL` packet to the router. The router invokes the call's bound `AbortController` and drops the stream.
2. **Context Signals**: The router injects an `AbortSignal` into `IRPC_BASE_CONTEXT.ABORT_CONTROLLER`. Handlers must listen to this signal and exit when aborted.
3. **TTL Timeouts**: If a function defines a `ttl` specification, the router aborts the stream when the timeout is reached.

## Available Transports

### HTTP Transport

The HTTP transport uses standard HTTP POST requests with automatic batching and streaming responses.

```typescript
import { HTTPTransport } from '@irpclib/http';

const transport = new HTTPTransport({
  endpoint: '/irpc/my-api/1.0.0',
  timeout: 10000,
  debounce: 0,
  maxRetries: 3,
});
```

**Features:**
- Automatic request batching
- Continuous streaming responses via `IRPCPacketStream` (progressive resolution)
- Retry logic (linear or exponential backoff)
- Timeout handling
- Middleware support

[Learn more about HTTP Transport →](/irpc/transports/http-transport)

### WebSocket Transport

The WebSocket transport provides persistent connections with lower latency and automatic reconnection.

```typescript
import { WebSocketTransport } from '@irpclib/ws';

const transport = new WebSocketTransport({
  url: 'ws://localhost:8080',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  connectionTimeout: 10000,
});
```

**Features:**
- Persistent WebSocket connections
- Lower latency (no HTTP handshake overhead)
- Automatic batching over WebSocket messages
- Real-time connection state monitoring
- Auto-reconnection on connection failures
- Native streaming via persistent socket for `RemoteState` subscriptions

[Learn more about WebSocket Transport →](/irpc/transports/ws-transport)

### BroadcastChannel Transport

The BroadcastChannel transport enables cross-context communication within the browser using the native BroadcastChannel API.

```typescript
import { BroadcastTransport } from '@irpclib/broadcast';

const irpc = createPackage({
  name: 'my-api',
  version: '1.0.0',
});

const transport = new BroadcastTransport({
  channel: irpc.href, // 'my-api/1.0.0'
  timeout: 30000,
});
```

**Features:**
- Cross-tab communication (same origin)
- Web Worker coordination
- Iframe communication
- Zero server infrastructure
- Offline-first by default
- Automatic channel namespacing (`irpc://`)
- Lowest latency (browser-native)

[Learn more about BroadcastChannel Transport →](/irpc/transports/broadcast-transport)

### Custom Transports

You can create custom transports for any protocol by extending `IRPCTransport`.

## Creating Custom Transports

To create a custom transport, extend `IRPCTransport` and override `dispatch()`. The base class handles batching and scheduling — your job is to serialize the calls, send them over the wire, and feed `IRPCPacketStream` packets back via `call.enqueue()`.

### Client-Side Transport

```typescript
import {
  IRPCTransport,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  ERROR_CODE,
  type IRPCCall,
  type IRPCData,
  type IRPCPacketStream,
  type IRPCRequest,
  type TransportConfig,
} from '@irpclib/irpc';

type CustomTransportConfig = TransportConfig & {
  url: string;
};

class CustomTransport extends IRPCTransport {
  constructor(public config: CustomTransportConfig) {
    super(config);
  }

  protected async dispatch(calls: IRPCCall[]) {
    try {
      // 1. Serialize calls into wire format
      const requests: IRPCRequest[] = calls.map(({ id, payload: { name, args } }) => ({
        id, name, args,
      }));

      // 2. Send via your protocol
      const response = await this.send(requests);

      // 3. Parse response packets and feed them back to each call
      for (const packet of response.packets) {
        const call = calls.find(c => c.id === packet.id);
        if (call) {
          call.enqueue(packet); // Drives IRPCReader → resolves/rejects the RemoteState
        }
      }
    } catch (error) {
      // On network failure, enqueue error packets so calls reject (and retry if configured)
      calls.forEach((call) => {
        call.enqueue({
          id: call.id,
          name: call.payload.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: (error as Error).message },
          createdAt: Date.now(),
        } as IRPCPacketStream<IRPCData>);
      });
    }
  }

  private async send(requests: IRPCRequest[]) {
    // Your custom protocol implementation
    // Must return IRPCPacketStream packets correlated by id
  }
}
```

**Key points:**
- `call.enqueue(packet)` is the only way to feed data back. It drives the internal `IRPCReader`, which resolves standard Promises or populates `RemoteState` subscriptions.
- For streaming responses, enqueue multiple packets with `status: IRPC_STATUS.PENDING` followed by a terminal packet with `status: IRPC_STATUS.SUCCESS` or `IRPC_STATUS.ERROR`.
- Error packets trigger the retry mechanism if `maxRetries` is configured.

### Server-Side Router

Use `IRPCResolver` to validate and execute requests, and `IRPCStream` to normalize outputs (both standard and streaming) into `IRPCPacketStream` packets.

```typescript
import {
  type IRPCPackage,
  type IRPCRequest,
  IRPCResolver,
  IRPCStream,
  createContext,
  withContext,
} from '@irpclib/irpc';

class CustomRouter {
  constructor(
    private module: IRPCPackage,
    private transport: CustomTransport,
  ) {}

  async resolve(rawMessage: string, initContext: [string | symbol, unknown][] = []) {
    const requests: IRPCRequest[] = JSON.parse(rawMessage);
    const packets: string[] = [];

    const promises = requests.map((irpcReq) => {
      const resolver = new IRPCResolver(irpcReq, this.module);
      const ctx = createContext<string | symbol, unknown>([...initContext]);

      return withContext(ctx, async () => {
        // IRPCStream wraps resolver.resolve() and normalizes both
        // standard responses and RemoteState into IRPCPacketStream packets
        const stream = new IRPCStream(irpcReq.id, irpcReq.name, () => resolver.resolve());

        stream.pipe((packet) => {
          // Send each packet over the wire as it arrives
          this.sendPacket(JSON.stringify(packet));
        });

        // Wait for the stream to fully close before moving on
        await new Promise<void>((done) => stream.close(done));
      });
    });

    await Promise.allSettled(promises);
  }

  private sendPacket(data: string) {
    // Your custom protocol send implementation
  }
}
```

**Key points:**
- `IRPCResolver` handles input validation, spec lookup, and handler execution.
- `IRPCStream` subscribes to `RemoteState` mutations and emits sequential `ANSWER` → `EVENT` → `CLOSE` packets. For standard Promise responses, it emits a single `ANSWER` packet.
- The router does not need to know whether a handler returns a Promise or a RemoteState — `IRPCStream` handles both transparently.

### Transport Requirements

Custom transports MUST:

1. **Override `dispatch()`** — Accept `IRPCCall[]` and serialize them for transmission
2. **Feed packets via `call.enqueue()`** — Match response packets to calls by `id`
3. **Handle errors** — Enqueue error packets on network failure so retry logic activates
4. **Implement a Router** — Use `IRPCResolver` + `IRPCStream` to execute and stream responses

## Transport Configuration

All transports support base configuration options:

```typescript
type TransportConfig = {
  timeout?: number;    // Request timeout in milliseconds
  debounce?: number;   // Batching delay in milliseconds
};
```

Individual transports may extend this with protocol-specific options.

## Best Practices

### Use Batching

Enable batching by setting a small debounce delay (0-10ms). This allows multiple calls to be combined into single network requests.

```typescript
const transport = new HTTPTransport({
  debounce: 0, // Batch immediately
});
```

### Configure Timeouts

Set appropriate timeouts at both transport and function levels:

```typescript
// Transport-level default
const transport = new HTTPTransport({
  timeout: 10000, // 10 seconds default
});

// Function-level override
export type SlowQueryFn = () => Promise<void>;

const slowQuery = irpc.declare<SlowQueryFn>({
  name: 'slowQuery',
  timeout: 30000, // 30 seconds for this function
});
```

### Handle Errors

Implement proper error handling in custom transports:

```typescript
protected async dispatch(calls: IRPCCall[]) {
  try {
    // Send requests
  } catch (error) {
    // Reject all calls on network error
    calls.forEach(call => call.reject(error));
  }
}
```

### Stream Responses

For HTTP-based transports, stream responses as they become available instead of waiting for all to complete:

```typescript
// Server streams responses
const stream = new ReadableStream({
  start(controller) {
    promises.forEach(async (promise) => {
      const response = await promise;
      controller.enqueue(JSON.stringify(response));
    });
  }
});
```

## Next Steps

- [HTTP Transport](/irpc/transports/http-transport) - Detailed HTTP transport documentation
- [WebSocket Transport](/irpc/transports/ws-transport) - WebSocket transport for persistent connections
- [BroadcastChannel Transport](/irpc/transports/broadcast-transport) - Browser cross-context communication
- [Getting Started](/irpc/getting-started) - Set up your first IRPC project
- [Specification](/irpc/specification) - Full protocol specification

