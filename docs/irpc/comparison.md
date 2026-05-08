---
title: "IRPC Comparison"
description: "Compare IRPC with REST, gRPC, tRPC, and GraphQL to understand when and why to use IRPC for your project."
keywords:
  - irpc
  - comparison
  - rest
  - grpc
  - trpc
  - graphql
  - rpc
---

# IRPC Comparison

This page compares IRPC with other popular API patterns to help you choose the right tool for your project.

## IRPC vs REST

| Aspect | IRPC | REST |
|--------|------|------|
| **Boilerplate** | Zero - just declare functions | High - routes, controllers, serialization |
| **Type Safety** | End-to-end TypeScript | Manual type definitions |
| **Performance** | 6.96x faster (batching) | 1x baseline |
| **HTTP Requests** | 10x fewer (automatic batching) | One per call |
| **Learning Curve** | Minimal - just functions | Moderate - HTTP verbs, status codes |
| **Caching** | Built-in per-function | Manual implementation |
| **Error Handling** | Automatic retry & timeout (configurable per function) | Manual implementation |

### REST Example

```typescript
// Define route
app.post('/api/users', async (req, res) => {
  const data = req.body;
  const user = await db.users.create(data);
  res.json(user);
});

// Client call
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});
const user = await response.json();
```

### IRPC Example

```typescript
// 1. Shared (Client & Server)
// src/shared/rpc.ts
export const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });
```

```typescript
// 2. Server Implementation
// src/server/rpc.ts
import { createUser } from '../shared/rpc.js';

irpc.construct(createUser, async (data) => {
  return await db.users.create(data);
});
```

```typescript
// 3. Client Usage
// src/client/app.ts
import { createUser } from '../shared/rpc.js';

const user = await createUser({ name: 'John', email: 'john@example.com' });
```

**Result:** IRPC eliminates routes, manual serialization, and HTTP boilerplate.

## IRPC vs gRPC

| Aspect | IRPC | gRPC |
|--------|------|------|
| **Setup Complexity** | Simple - no code generation | Complex - protobuf compilation |
| **JavaScript Ergonomics** | Native - just TypeScript | Foreign - proto files |
| **Browser Support** | Native fetch API | Requires gRPC-web proxy |
| **Type Safety** | TypeScript native | Generated types |
| **Performance** | 6.96x faster than REST | Similar to IRPC |
| **Streaming** | Integrated Streams (HTTP/SSE, WebSocket, Broadcast) | Bidirectional streaming |
| **Batching** | Automatic | Manual |

### gRPC Example

```protobuf
// user.proto
syntax = "proto3";

service UserService {
  rpc CreateUser (CreateUserRequest) returns (User);
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}
```

```typescript
// Generated code required
const client = new UserServiceClient('localhost:50051');
const user = await client.createUser({ name: 'John', email: 'john@example.com' });
```

### IRPC Example

```typescript
// 1. Shared (Client & Server)
export const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });

// 2. Client Usage
// No proto files, no code generation
const user = await createUser({ name: 'John', email: 'john@example.com' });
```

**Result:** IRPC provides gRPC-like performance without the complexity.

## IRPC vs tRPC

| Aspect | IRPC | tRPC |
|--------|------|------|
| **Execution Model** | Unified function calls | Fragmented (Queries, Mutations, Subscriptions) |
| **Transport Flexibility** | Any transport (HTTP, WebSocket, Broadcast) | HTTP, WebSocket (via separate subscriptions) |
| **Batching** | Automatic | Opt-in |
| **Setup** | Package + transport | Router + client |
| **Streaming / Subscriptions**| Identical signature, identical transport | Separate procedure, dedicated WS transport |
| **Hooks** | Two-level (router + per-function) | Procedure-level |
| **Caching** | Built-in per-function | Client-side (manual or via React Query) |

tRPC maps closely to REST and HTTP verbs, forcing you to classify every endpoint as a `.query()`, `.mutation()`, or `.subscription()`. IRPC treats the network purely as a remote execution layer — you don't classify HTTP intents, you just call standard isomorphic functions.

### tRPC Example

```typescript
// Define router (Forces classification)
const appRouter = router({
  getUser: procedure
    .input(z.string())
    .query(async ({ input }) => { ... }),
  createUser: procedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ input }) => { ... }),
});

// Client call (Requires matching route execution type)
const user = await trpc.getUser.query('123');
const newUser = await trpc.createUser.mutate({ 
  name: 'John', 
  email: 'john@example.com' 
});
```

### IRPC Example

```typescript
// Declare unified functions
const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });

// Client call (Identical invocation regardless of read/write classification)
const user = await getUser('123');
const newUser = await createUser({ name: 'John', email: 'john@example.com' });
```

### Streaming Comparison

**tRPC** separates subscriptions from standard procedures:
```typescript
// tRPC Backend: Different mental model for subscriptions
const appRouter = router({
  onDashboard: subscription(({ input }) => {
    return observable((emit) => {
      // Completely different API from queries/mutations
    });
  }),
});

// tRPC Frontend: Requires explicit event listener hooks and manual state management.
// Cleanup is hidden but tightly coupled strictly to React's hook lifecycle.
function DashboardWidget({ userId }) {
  const [data, setData] = useState(null);
  
  trpc.onDashboard.useSubscription(userId, {
    onData(event) {
      setData(event.data);
    },
    onError(err) {
      console.error(err);
    }
  });

  return <DashboardUI data={data} />;
}
```

**IRPC** uses the same function signature for both:
```typescript
// IRPC: Identical declare/construct syntax
const getDashboard = irpc.declare<GetDashboardFn>({ name: 'getDashboard' });

// Client: Binds to standard UI component proxies without WebSocket logic.
// The network stream is dropped automatically on unmount.
// This identical logic works in React, Vue, Svelte, or Solid.
const DashboardWidget = setup(({ userId }) => {
  const dashboard = getDashboard(userId);

  return render(() => <DashboardUI data={dashboard.data} />);
});
```

## IRPC vs GraphQL

| Aspect | IRPC | GraphQL |
|--------|------|------|
| **Query Complexity** | Simple function calls | Complex query language |
| **Type Generation** | Native TypeScript | Code generation required |
| **Caching** | Per-function, simple | Normalized cache, complex |
| **Over-fetching** | No - exact function returns | No - query what you need |
| **Under-fetching** | Batching handles multiple calls | Single query for nested data |
| **Subscriptions** | Built-in via identical signature (HTTP/SSE or WS) | Requires separate WebSocket infrastructure |
| **Learning Curve** | Minimal - just functions | Steep - schema, resolvers, queries |
| **Performance** | 6.96x faster than REST | Similar to REST |
| **N+1 Problem** | No - batching | Requires DataLoader |

### GraphQL Example

```graphql
# Schema definition
type User {
  id: ID!
  name: String!
  email: String!
}

type Mutation {
  createUser(name: String!, email: String!): User!
}
```

```typescript
// Resolver implementation
const resolvers = {
  Mutation: {
    createUser: async (_, { name, email }) => {
      return await db.users.create({ name, email });
    },
  },
};

// Client call
const { data } = await client.mutate({
  mutation: gql`
    mutation CreateUser($name: String!, $email: String!) {
      createUser(name: $name, email: $email) {
        id
        name
        email
      }
    }
  `,
  variables: { name: 'John', email: 'john@example.com' },
});
```

### IRPC Example

```typescript
// Declare function
const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });

// Client call
const user = await createUser({ name: 'John', email: 'john@example.com' });
```

**Result:** IRPC provides the same data aggregation capabilities as GraphQL without learning a query language. For real-time data, IRPC streams over any transport — GraphQL requires separate WebSocket infrastructure and a completely different `subscription` schema definition.

### Streaming Comparison

**GraphQL** forces you to define a separate subscription schema, configure a distinct WebSocket link on the client, and use separate hooks:
```graphql
# GraphQL Schema: Separate subscription root
type Subscription {
  dashboardUpdated(userId: ID!): DashboardData!
}
```
```typescript
// GraphQL Client: Requires separate WS Link and dedicated hook.
// Cleanup is hidden but permanently couples the architecture to React Apollo.
import { useSubscription } from '@apollo/client';

function DashboardWidget({ userId }) {
  const { data, loading } = useSubscription(DASHBOARD_SUBSCRIPTION, {
    variables: { userId }
  });

  if (loading) return <Loading />;
  return <DashboardUI data={data.dashboardUpdated} />;
}
```

**IRPC** treats streams exactly identically to standard asynchronous functions:
```typescript
// IRPC: Identical declare/construct syntax
const getDashboard = irpc.declare<GetDashboardFn>({ name: 'getDashboard' });

// Client: Binds to standard UI component proxies without WebSocket logic.
// Because the proxy is framework-agnostic, the network stream is dropped automatically on unmount.
// This identical logic works in React, Vue, Svelte, or Solid.
const DashboardWidget = setup(({ userId }) => {
  const dashboard = getDashboard(userId);

  return render(() => <DashboardUI data={dashboard.data} />);
});
```

## Performance Benchmark

**Scenario:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** |
| Bun Native | 25,180ms | 1,000,000 | 1.00x |
| Hono | 18,004ms | 1,000,000 | 1.40x |
| Elysia | 36,993ms | 1,000,000 | 0.68x |

IRPC's automatic batching reduces HTTP overhead by 10x, resulting in 6.96x faster performance.

## When to Use IRPC

### Choose IRPC when:

- ✅ You want type-safe remote calls without boilerplate
- ✅ You need high performance with automatic batching
- ✅ You prefer simple function calls over complex query languages
- ✅ You want transport flexibility (HTTP, WebSocket, custom)
- ✅ You're building a TypeScript/JavaScript application
- ✅ You want built-in caching, retry, and timeout (configurable per function)

### Choose REST when:

- You need broad client compatibility (non-JavaScript)
- You're building a public API with strict HTTP semantics
- You have existing REST infrastructure

### Choose gRPC when:

- You need bidirectional streaming
- You're in a polyglot microservices environment
- You have strict performance requirements for internal services

### Choose tRPC when:

- You're building a React application with React Query
- You want type safety without transport flexibility
- You're okay with framework coupling

### Choose GraphQL when:

- You need flexible, client-driven queries
- You have complex, nested data relationships
- You want to expose a single endpoint for multiple clients

## Migration Path

### From REST to IRPC

1. Replace route definitions with IRPC function declarations
2. Convert controllers to handlers
3. Remove manual serialization logic
4. Update client fetch calls to function calls

### From gRPC to IRPC

1. Replace proto files with TypeScript types
2. Convert service definitions to IRPC declarations
3. Keep existing handler logic
4. Remove protobuf compilation step

### From tRPC to IRPC

1. Replace router procedures with IRPC declarations
2. Remove React Query dependency (if desired)
3. Keep existing handler logic
4. Update client calls to direct function calls

### From GraphQL to IRPC

1. Replace schema definitions with TypeScript types
2. Convert resolvers to IRPC handlers
3. Replace queries/mutations with function calls
4. Remove GraphQL client dependency

## Summary

IRPC combines the best of all worlds:

- **Simplicity** of REST
- **Performance** of gRPC
- **Type safety** of tRPC
- **Flexibility** without GraphQL complexity
- **Unified streaming** without separate subscription infrastructure

Choose IRPC when you want high-performance, type-safe remote calls without the complexity of other solutions.
