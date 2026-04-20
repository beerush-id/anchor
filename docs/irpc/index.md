---
title: "IRPC Overview"
description: "Universal Reactive Pipeline - Call remote functions and connect to reactive data streams with batching, type safety, and high performance."
keywords:
  - irpc
  - rpc
  - remote procedure call
  - isomorphic
  - reactive streams
  - type-safe
  - batching
---

# IRPC

**The World's First Reactive Network Abstraction.**

Every existing API paradigm — REST, gRPC, GraphQL, tRPC — forces you to manually manage the network layer: handling endpoints, parsing binary chunks, mapping websocket events, and writing verbose serialization logic. You spend more time on transport plumbing than on your actual business logic.

IRPC completely dissolves the network, replacing it with a **Reactive Network Abstraction**. It binds the server execution state directly to the client's reactive memory proxy. You don't make HTTP requests; you just call isomorphic functions. The framework batches the calls, executes them globally, and yielded data mutates the connected UI hooks.

```typescript
// Assign state value on the server.
irpc.construct(watchPrice, (ticker) => {
  return stream((state) => {
    const sub = redis.subscribe(ticker, (price) => {
      // Assign new price on change.
      state.data = price;
    });
    
    // Guaranteed cleanup when the client disconnects.
    return () => sub.unsubscribe();
  }, 0);
});
```

```typescript
// Reactive binding on the UI component with single line of call.
const StockPrice = setup(({ stock }) => {
  // Call the function.
  const price = watchPrice(stock);
  
  // Close the stream on unmount.
  onCleanup(() => price.close());
  
  // Reactive render price change.
  return render(() => <span>${price.data}</span>);
});
```

::: tip Language Agnostic
IRPC is a language-agnostic RPC pattern with a standard wire protocol. Any language can implement or consume it via HTTP or WebSocket. This is the TypeScript-first reference implementation.
:::

::: warning Redefining "Client" and "Server"
IRPC abstracts physical hardware constraints. In this documentation:
- **"Server"** simply means the environment implementing the code (`irpc.construct`).
- **"Client"** simply means the environment executing the stub (calling the function).

A "Server" does not have to be a cloud backend. The implementation can live inside a Web Worker, routing calls via `BroadcastChannel`. It can even live in the **exact same thread** as the call itself, transforming your "remote" architecture into zero-latency local execution without changing a single line of function invocation code.
:::

## How It Works

Three steps. One pattern for both standard calls and streaming.

**1. Declare** a function signature (shared between client and server):

```typescript
type HelloFn = (name: string) => Promise<string>;

const hello = irpc.declare<HelloFn>({ name: 'hello' });
```

**2. Implement** the handler on the server:

```typescript
irpc.construct(hello, async (name) => `Hello ${name}`);
```

**3. Call** it from the client:

```typescript
const message = await hello('John'); // "Hello John"
```

That's it. No routes. No controllers. No manual serialization. The function signature is the contract.

## Reactive Streaming

The same pattern scales to continuous data streams. Instead of returning `Promise<T>`, return `RemoteState<T>` — and the client can blindly read from the `.data` proxy as the server injects mutations.

```typescript
// Declare (Shared)
type LoadDashboardFn = (userId: string) => RemoteState<DashboardData>;

const loadDashboard = irpc.declare<LoadDashboardFn>({
  name: 'loadDashboard',
  init: () => ({} as DashboardData), // Initial client-side state before server data arrives
});
```

```typescript
// Implement (Server)
irpc.construct(loadDashboard, (userId) => {
  return stream((state, resolve) => {
    // Execute queries concurrently — each mutation pushes to the client in real time
    const q1 = db.users.get(userId).then(res => state.data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => state.data.sales = res);
    const q3 = externalApi.fetchMetrics().then(res => state.data.telemetry = res);

    Promise.all([q1, q2, q3]).then(() => resolve());
  }, {});
});
```

```typescript
// Call (Client) — UI hydrates as each query resolves
const call = loadDashboard('user-123');
call.subscribe(state => renderDashboard(state.data));
```

No WebSocket configuration. No polling. No separate subscription endpoints. The same `declare` / `construct` / `call` pattern.

## Why Not X?

| Pain Point | REST | gRPC | GraphQL | tRPC | **IRPC** |
|------------|------|------|---------|------|----------|
| Routes / endpoints | Routes + verbs | Proto definitions | Schema + resolvers | Router procedures | **None** |
| Streaming / subscriptions | Manual | Manual | Manual | Manual | **Automatic** |
| Batching | Manual | Manual | N/A | Opt-in | **Automatic** |
| Type safety | Manual | Generated | Generated | Native | **Native** |
| Browser support | Universal | Requires proxy | Universal | Universal | **Universal** |

## Performance

IRPC achieves **6.96x faster** throughput compared to traditional REST through automatic batching and native chunk streaming.

**Benchmark:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |

When you call multiple functions simultaneously, IRPC batches them into a single HTTP request and streams the response chunks back as handlers complete.

## What You Get

### Swappable & Custom Transports
**The Problem:** Traditional architectures lock your business logic to a specific network protocol (e.g., REST for HTTP, Apollo for WebSockets). If you need to migrate to a new protocol or support offline workers later, you must rewrite your execution logic.
**The Solution:** IRPC abstracts the network entirely. You can swap between the built-in HTTP, WebSocket, and BroadcastChannel transports—or build completely custom transports for any protocol (like WebRTC or IPC)—without modifying a single line of your application logic.

### Dynamic Implementation Distribution (Edge vs. Server)
**The Problem:** Supporting cost-effective "Free Tiers" usually means duplicating your API logic to run entirely in the browser, creating unmaintainable branching architecture between your local code and your server code.
**The Solution:** Because IRPC separates the declaration from the transport, you can dynamically distribute implementations at runtime. For a paid user, configure an `HTTPTransport` to execute the logic on your robust cloud servers. For a free user, configure a `BroadcastTransport` pointing to a local Web Worker. **Your frontend component logic remains 100% identical**—the UI has no idea whether the function resolved on AWS or a local background thread.

### Universal Streaming
**The Problem:** Shipping progressive data (like AI streams or live dashboards) traditionally requires branching your architecture: setting up separate WebSockets, deploying complex GraphQL subscription servers, or writing notoriously difficult boilerplate to parse raw Server-Sent Event (SSE) text chunks in every client component.
**The Solution:** IRPC unifies standard calls and real-time streams into the identical architecture. It handles all chunk parsing and payload reconstruction for you. You yield continuous data chunks using the same `irpc.declare` pattern, and the client hydrates regardless of the underlying transport protocol.

### Automatic Batching & Coalescing
**The Problem:** Triggering 5 independent API calls on page-load creates massive HTTP overhead. Worse, if disconnected UI components request the identical data (e.g., `getCurrentUser`), it spams your database redundantly.
**The Solution:** IRPC intercepts simultaneous calls and batches them into a single network payload. If it detects exact duplicate calls, it coalesces them—executing a single central network request and distributing the result to all identical callers simultaneously.

### End-to-End Type Safety
**The Problem:** API contracts get out of sync. Client developers guess payload shapes, and backend engineers change responses, causing catastrophic runtime crashes in production. 
**The Solution:** The isomorphic TypeScript signature is the unbreakable API contract. Misspelled arguments or mismatched proxy states are caught instantly in your editor before the code ever compiles.

### Granular Retry & Timeout
**The Problem:** Managing retry loops and timeouts usually requires wrapping `fetch` with heavy custom interceptors manually applied to every single endpoint.
**The Solution:** IRPC handles resilience. You declaratively set `timeout`, `retryMode`, and `maxRetries` independently per-function at the `declare` level, or fallback globally at the transport layer.

### Secure NPM Distribution
**The Problem:** Sharing API interfaces with frontend teams often leaks sensitive database drivers, server logic, or environment variables into the client bundle by accident.
**The Solution:** Because IRPC strictly separates the `.declare()` (the boundary) from the `.construct()` (the resolution), you can safely package and distribute your declarations to NPM registries. Client teams install the package for perfect autocomplete, while your server retains absolute implementation secrecy.

## Next Steps

- [Getting Started](/irpc/getting-started) — Set up your first IRPC project
- [Comparison](/irpc/comparison) — IRPC vs REST, gRPC, tRPC, GraphQL
- [Specification](/irpc/specification) — Full protocol specification
- [HTTP Transport](/irpc/transports/http-transport) — HTTP transport configuration
- [WebSocket Transport](/irpc/transports/ws-transport) — WebSocket transport for persistent connections