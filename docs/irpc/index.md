---
title: "IRPC Overview"
description: "Isomorphic Remote Procedure Call - Call remote functions like local functions with automatic batching, type safety, and 6.96x performance improvement."
keywords:
  - irpc
  - rpc
  - remote procedure call
  - isomorphic
  - type-safe
  - batching
---

# IRPC Overview

**Isomorphic Remote Procedure Call** - Call remote functions like local functions.

```typescript
// Instead of this:
const response = await fetch('/api/hello');
const data = await response.json();

// Just do this:
const message = await hello('John');
```

## What is IRPC?

IRPC is a pattern that makes remote function calls look and feel exactly like local function calls. You declare a function once, implement it on the server, and call it from the client—no routes, no endpoints, no manual serialization.

The same function signature works everywhere:

```typescript
// Declare once
type HelloFn = (name: string) => Promise<string>;
const hello = irpc.declare<HelloFn>({ name: 'hello' });

// Implement on server
irpc.construct(hello, async (name) => `Hello ${name}`);

// Call from client
const message = await hello('John'); // "Hello John"
```

## The Problem

Traditional API patterns force you to think about the network:

**REST** requires you to:
- Define routes and HTTP verbs
- Manually serialize/deserialize data
- Handle status codes and errors
- Write separate client code for each endpoint
- Manage type safety manually

**gRPC** requires you to:
- Write proto files
- Generate code
- Set up complex tooling
- Deal with browser compatibility issues

**GraphQL** requires you to:
- Learn a query language
- Define schemas and resolvers
- Manage normalized caches
- Handle N+1 problems

All of these add cognitive overhead—you're constantly thinking about the network layer instead of your business logic.

## The Solution

IRPC eliminates the network abstraction:

1. **Declare** a function signature (TypeScript type)
2. **Implement** the handler on the server
3. **Call** it from the client like any async function

The transport handles everything else:
- Automatic batching (10x fewer HTTP requests)
- Type safety (end-to-end TypeScript)
- Error handling (automatic retry & timeout)
- Serialization (transparent)
- Distribution (publish stubs to NPM, keep handlers private)

## Performance

IRPC achieves **6.96x faster** performance than traditional REST through automatic batching.

**Benchmark:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** 🚀 |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |

When you call multiple functions simultaneously, IRPC automatically batches them into a single HTTP request. Responses stream back as they complete—no waiting for all to finish.

## Next Steps

- [Getting Started](/irpc/getting-started) - Set up your first IRPC project
- [Comparison](/irpc/comparison) - IRPC vs REST, gRPC, tRPC, GraphQL
- [Specification](/irpc/specification) - Full protocol specification
- [HTTP Transport](/irpc/transports/http-transport) - Transport configuration