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

The transport automatically handles batching—when multiple calls are made simultaneously, they're queued and sent together.

## Routing

Transports include routing functionality that:

- Maps incoming requests by `name` to registered handlers
- Validates request format and parameters
- Handles error propagation
- Supports request/response correlation

The routing happens server-side within the transport layer, eliminating the need for separate routing middleware.

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
- Streaming responses (progressive resolution)
- Retry logic (linear or exponential backoff)
- Timeout handling
- Middleware support

[Learn more about HTTP Transport →](/irpc/transports/http-transport)

### WebSocket Transport (Coming Soon)

WebSocket transport will provide bidirectional streaming for real-time applications.

### Custom Transports

You can create custom transports for any protocol by extending `IRPCTransport`.

## Creating Custom Transports

To create a custom transport, extend the `IRPCTransport` class and implement the required methods:

```typescript
import { IRPCTransport, type IRPCCall, type IRPCSpec, type IRPCData } from '@irpclib/irpc';

class CustomTransport extends IRPCTransport {
  constructor(config: CustomTransportConfig) {
    super(config);
  }

  // Implement the dispatch method
  protected async dispatch(calls: IRPCCall[]) {
    // 1. Serialize calls to your protocol format
    const requests = calls.map(({ id, payload }) => ({
      id,
      name: payload.name,
      args: payload.args,
    }));

    // 2. Send via your transport mechanism
    const responses = await this.sendViaCustomProtocol(requests);

    // 3. Resolve each call with its response
    responses.forEach((response) => {
      const call = calls.find(c => c.id === response.id);
      if (call) {
        if (response.error) {
          call.reject(new Error(response.error.message));
        } else {
          call.resolve(response.result);
        }
      }
    });
  }

  private async sendViaCustomProtocol(requests: any[]) {
    // Your custom protocol implementation
    // ...
  }
}
```

### Transport Requirements

Custom transports MUST:

1. **Handle batching** - Accept arrays of calls and send them efficiently
2. **Preserve correlation** - Match responses to requests using IDs
3. **Handle errors** - Properly reject calls on network or handler errors
4. **Support timeouts** - Respect timeout configuration
5. **Implement routing** - Map request names to handlers (server-side)

### Server-Side Routing

Implement a router for your custom transport:

```typescript
class CustomRouter {
  constructor(
    private module: IRPCPackage,
    private transport: CustomTransport
  ) {}

  async resolve(request: CustomRequest) {
    const requests = await this.parseRequests(request);
    
    const responses = await Promise.allSettled(
      requests.map(async (req) => {
        try {
          const result = await this.module.resolve(req);
          return { id: req.id, name: req.name, result };
        } catch (error) {
          return { 
            id: req.id, 
            name: req.name, 
            error: { 
              code: 'HANDLER_ERROR', 
              message: error.message 
            } 
          };
        }
      })
    );

    return this.formatResponse(responses);
  }
}
```

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
const slowQuery = irpc.declare({
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
// Server streams responses progressively
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
- [Getting Started](/irpc/getting-started) - Set up your first IRPC project
- [Specification](/irpc/specification) - Full protocol specification
