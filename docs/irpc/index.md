---
title: "IRPC Overview"
description: "Universal Reactive Pipeline - Call remote functions and connect to reactive data streams natively with automatic batching, type safety, and high performance."
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

**Stop thinking about the network. Just call functions.**

Every existing API pattern — REST, gRPC, GraphQL, tRPC — forces you to think about the network: routes, endpoints, serialization, polling, separate subscription infrastructure. You spend more time on transport plumbing than on your actual business logic.

IRPC eliminates that entirely. You declare a function, implement it on the server, and call it from the client. Standard calls and continuous reactive streams use the exact same signature. The transport handles everything else.

```typescript
// This is a remote function call. No fetch, no routes, no serialization.
const message = await hello('John');

// This is a live reactive stream. No WebSocket setup, no polling, no subscriptions.
const call = loadDashboard('user-123');
call.subscribe(state => console.log(state.data));
```

::: tip Language Agnostic
IRPC is a language-agnostic RPC pattern with a standard wire protocol. Any language can implement or consume it via HTTP or WebSocket. This is the TypeScript-first reference implementation.
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

The same pattern scales to continuous data streams. Instead of returning `Promise<T>`, return `RemoteState<T>` — and the client can `.subscribe()` to live mutations as the server progressively resolves data.

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
  return stream((data, resolve) => {
    // Execute queries concurrently — each mutation pushes to the client in real time
    const q1 = db.users.get(userId).then(res => data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => data.sales = res);
    const q3 = externalApi.fetchMetrics().then(res => data.telemetry = res);

    Promise.all([q1, q2, q3]).then(() => resolve());
  }, {});
});
```

```typescript
// Call (Client) — UI hydrates progressively as each query resolves
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

When you call multiple functions simultaneously, IRPC automatically batches them into a single HTTP request and streams the response chunks back as handlers complete.

## What You Get

- **Universal Streaming** — Yield continuous chunks over HTTP, WebSockets, or BroadcastChannels using the same function.
- **Automatic Batching** — Simultaneous calls are batched into a single request.
- **End-to-End Type Safety** — TypeScript types are the API contract.
- **Retry & Timeout** — Configurable per function, per package, or per transport.
- **Call Coalescing** — Duplicate simultaneous calls execute once, all callers receive the result.
- **NPM Distribution** — Publish stubs to NPM, keep handlers private on the server.

## Next Steps

- [Getting Started](/irpc/getting-started) — Set up your first IRPC project
- [Comparison](/irpc/comparison) — IRPC vs REST, gRPC, tRPC, GraphQL
- [Specification](/irpc/specification) — Full protocol specification
- [HTTP Transport](/irpc/transports/http-transport) — HTTP transport configuration
- [WebSocket Transport](/irpc/transports/ws-transport) — WebSocket transport for persistent connections