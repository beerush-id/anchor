# IRPC: Setup and Routing

IRPC fully abstracts the network transport. Your application logic remains untouched whether the backend runs on HTTP, WebSockets, or a local Web Worker.

## Creating a Package

To declare an API boundary, use `createPackage()`:

```typescript
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
```

The `createPackage()` takes:
```typescript
<K extends string = 'id'>(
  /** Optional configuration object for the package. */
  config?: Partial<IRPCPackageConfig> & { key?: K }
)
```

type IRPCPackageConfig = {
  /** The unique namespace used to mount this package's APIs. */
  name: string;
  
  /** The version string used for cache busting or routing. */
  version: string;
  
  /** Optional description for the API. */
  description?: string;
  
  /** Primary key field name for CRUD operations. Defaults to 'id'. */
  key?: string;
  
  /** Transport layer for network execution. */
  transport?: IRPCTransport;
  
  /** Global timeout for all requests in milliseconds. */
  timeout?: number;
  
  /** Global maximum retry attempts. */
  maxRetries?: number;
  
  /** Global backoff strategy. */
  retryMode?: 'linear' | 'exponential';
  
  /** Global base delay between retries. */
  retryDelay?: number;
  
  /** If true, the package behaves standalone and bypasses router bindings. */
  standalone?: boolean;
}

/** Base class for dispatching RPC calls. Subclassed by HTTPTransport, WebSocketTransport, etc. */
class IRPCTransport {
  constructor(public config?: TransportConfig);
  public sign(cred: IRPCCredentialsFactory): void;
  protected dispatch(calls: IRPCCall[], standalone?: boolean): Promise<void>;
}

type TransportConfig = {
  /** Global timeout for all requests in milliseconds. */
  timeout?: number;
  /** Global maximum retry attempts. */
  maxRetries?: number;
  /** Global backoff strategy. */
  retryMode?: 'linear' | 'exponential';
  /** Global base delay between retries. */
  retryDelay?: number;
  /** If true, the package behaves standalone and bypasses router bindings. */
  standalone?: boolean;
  /** Optional debounce delay for batching calls in milliseconds. Set to boolean to enable/disable batching. */
  debounce?: number | boolean;
};
```

The `createPackage()` returns:
```typescript
/** The initialized package instance that acts as the router/registry. */
IRPCPackage
```

## Client Transports

Define the network layer in your client entry point. 

### Standard HTTP

To communicate with standard REST/JSON endpoints, use `HTTPTransport`:

```typescript
import { HTTPTransport } from '@irpclib/http';

irpc.use(new HTTPTransport({ endpoint: `/irpc/${irpc.href}` }));
```

The `HTTPTransport` takes:
```typescript
(
  /** Configuration for the HTTP layer. */
  config: HTTPTransportConfig
)

type HTTPTransportConfig = TransportConfig & {
  /** The absolute base URL to the backend. */
  baseURL?: string;
  
  /** The relative path to the IRPC router. */
  endpoint?: string;
  
  /** Global headers to append to every fetch request. */
  headers?: Record<string, string>;
  
  /** Native fetch RequestInit options. */
  fetchOptions?: RequestInit;
}
```

### Persistent WebSockets (Real-time)

To stream real-time events efficiently, use `WebSocketTransport`:

```typescript
import { WebSocketTransport } from '@irpclib/ws';

irpc.use(new WebSocketTransport({ url: `ws://localhost:3000/ws` }));
```

The `WebSocketTransport` takes:
```typescript
(
  /** Configuration for the WebSocket layer. */
  config: WebSocketTransportConfig
)

type WebSocketTransportConfig = TransportConfig & {
  /** The full ws:// or wss:// URL to connect to. */
  url: string;
  
  /** Standard websocket protocols array. */
  protocols?: string[];
  
  /** Max auto-reconnection attempts before failing. */
  maxReconnectAttempts?: number;
  
  /** Base delay between connection attempts. */
  reconnectDelay?: number;
  
  /** Automatically attempt reconnection on drop. */
  autoReconnect?: boolean;
  
  /** Connection timeout in milliseconds. */
  connectionTimeout?: number;
  
  /** Custom headers to send during upgrade (if supported by environment). */
  headers?: Record<string, string>;
}
```

### Local Web Workers (Edge / Offline)

To communicate purely within the client without server costs, use `BroadcastTransport`:

```typescript
import { BroadcastTransport } from '@irpclib/broadcast';

irpc.use(new BroadcastTransport({ channel: irpc.href }));
```

The `BroadcastTransport` takes:
```typescript
(
  /** Configuration for the local broadcast layer. */
  config: BroadcastTransportConfig
)

type BroadcastTransportConfig = TransportConfig & {
  /** The unique channel name to broadcast on. */
  channel: string;
}
```

## Multi-Transport & Edge Distribution

You can swap transports at runtime or define multiple packages with different transports simultaneously.

```typescript
import { HTTPTransport } from '@irpclib/http';
import { BroadcastTransport } from '@irpclib/broadcast';

export const api = createPackage({ name: 'api', version: '1.0.0' });
// Cloud Server: for data access
api.use(new HTTPTransport({ endpoint: `/irpc/${api.href}` })); 

export const compute = createPackage({ name: 'compute', version: '1.0.0' });
// Local Web Worker: for heavy math/image processing
compute.use(new BroadcastTransport({ channel: compute.href })); 
```

## Server Routers & Context Seeding

The Router binds IRPC to your actual web server (e.g., Bun, Node). You **must** manually extract authentication tokens from the raw HTTP request/WebSocket upgrade and pass them as `initContext` tuples to `router.resolve()`.

```typescript
import '@irpclib/irpc/server'; // MUST import for AsyncLocalStorage (Hooks/Context)
import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { irpc, transport } from './lib/module.js';
import './rpc/constructors.js'; // Import all your handlers here

const httpRouter = new HTTPRouter(transport);
const wsRouter = new WebSocketRouter(transport);

Bun.serve({
  port: 3000,
  fetch(req, server) {
    // HTTP Routing
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      // Seed context! Global/Spec hooks can now read 'token' via getContext('token')
      return httpRouter.resolve(req, [
        ['token', req.headers.get('authorization')],
      ]);
    }
    
    // WebSocket Upgrade
    if (req.url.endsWith('/ws')) {
      // Extract auth token during upgrade to attach to ws.data
      const token = req.headers.get('authorization');
      if (server.upgrade(req, { data: { token } })) return;
    }
    
    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    async message(ws, message) {
      // Seed context from ws.data captured during upgrade
      await wsRouter.resolve(message.toString(), ws, [
        ['token', ws.data.token],
      ]);
    },
    close(ws) {
      wsRouter.disconnect(ws); // Abort all active streams for this connection
    },
  },
});
```

```typescript
type HTTPResponseBuilder = (body: BodyInit, init: ResponseInit) => Response;
```

The `HTTPRouter.resolve()` takes:
```typescript
(
  /** The native HTTP Request object. */
  request: Request, 
  
  /** Initial context values to seed into AsyncLocalStorage (like parsed auth tokens). */
  context?: [string | symbol, unknown][], 
  
  /** Custom response builder. */
  builder?: HTTPResponseBuilder
)
```

The `HTTPRouter.resolve()` returns:
```typescript
/** A native HTTP Response object to yield back to the server. */
Promise<Response>
```

The `WebSocketRouter.resolve()` takes:
```typescript
(
  /** The raw websocket message. */
  message: string | ArrayBuffer, 
  
  /** The native WebSocket instance. */
  ws: WebSocket, 
  
  /** Initial context values to seed into AsyncLocalStorage (like parsed auth tokens). */
  initContext?: [string | symbol, unknown][]
)
```

The `WebSocketRouter.resolve()` returns:
```typescript
/** A void promise resolving when the packet is processed. */
Promise<void>
```

## Webhooks

Translate standard REST webhooks into type-safe IRPC calls. Webhook stubs **must** accept exactly one argument.

```typescript
// 1. Declare the stub (Single argument required)
export const stripeWebhook = irpc.declare<(payload: any) => Promise<void>>('stripeWebhook', () => undefined);
```

```typescript
// 2. Intercept in Server (Bun / Edge Example)
import { stripeWebhook } from './index.js';

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/rest/') && req.method === 'POST') {
      const name = url.pathname.replace('/rest/', ''); // e.g. 'stripeWebhook'
      
      // router.resolveRest(Request, wireName, context, responseBuilder)
      return router.resolveRest(req, name, [], (body, init) => {
        return new Response('OK', { status: 200 }); // Custom Webhook ACK
      });
    }
  }
});
```

The `resolveRest()` takes:
```typescript
(
  /** The native HTTP Request. */
  req: Request, 
  
  /** The exact wire name of the stub to invoke. */
  name: string, 
  
  /** Context to seed into AsyncLocalStorage. */
  context?: [string | symbol, unknown][], 
  
  /** Custom builder to formulate the webhook ACK response. */
  builder?: HTTPResponseBuilder
)
```

The `resolveRest()` returns:
```typescript
/** A native HTTP Response object. */
Promise<Response>
```

## File Structure Convention

IRPC files should be strictly organized to separate the declaration (Stubs) from the implementation (Handlers). 

**File Naming Conventions:**

For **simple projects**, you can place everything in the root directory:
- `index.ts`: All declarations (stubs).
- `constructor.ts`: All implementations (handlers).

For **complex projects**, use tree composition to group related APIs into their own domain folders:
- `[domain]/index.ts`: Declarations for the specific domain.
- `[domain]/constructor.ts`: Implementations for the specific domain.
- `index.ts` (Root): Barrel exports all child domain stubs.
- `constructor.ts` (Root): Imports all child domain constructors for side-effects.

> [!NOTE]
> This is the convention for standalone IRPC APIs. If you are building in a full-stack context, the naming conventions may differ (e.g., using `function.ts` instead of `index.ts`). You must refer to the corresponding stack skill (like `air-stack-react` or `air-stack-solid`) for full-stack conventions.

**Complex Project Example:**

```typescript
// index.ts (Root Stubs)
export * from './profile/index.js'; // Barrel export profile stubs
export * from './billing/index.js'; // Barrel export billing stubs

// Declare root-level stubs if necessary
export const ping = irpc.declare('ping', () => 'pong');
```

```typescript
// constructor.ts (Root Implementations)
import './profile/constructor.js'; // Execute side-effects to register handlers
import './billing/constructor.js';

import { ping } from './index.js';
irpc.construct(ping, async () => 'pong');
```
