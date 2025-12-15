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
| **Error Handling** | Automatic retry & timeout | Manual implementation |

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
// Declare function
const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });

// Implement handler
irpc.construct(createUser, async (data) => {
  return await db.users.create(data);
});

// Client call
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
| **Streaming** | HTTP streaming | Bidirectional streaming |
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
// No proto files, no code generation
const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });
const user = await createUser({ name: 'John', email: 'john@example.com' });
```

**Result:** IRPC provides gRPC-like performance without the complexity.

## IRPC vs tRPC

| Aspect | IRPC | tRPC |
|--------|------|------|
| **Transport Flexibility** | Any transport (HTTP, WebSocket, custom) | HTTP, WebSocket (via subscriptions) |
| **Batching** | Automatic, configurable | Automatic (via links) |
| **Setup** | Package + transport | Router + client |
| **Type Safety** | TypeScript native | TypeScript native |
| **Performance** | 6.96x faster than REST | Similar to IRPC |
| **Middleware** | Transport-level | Procedure-level |
| **Caching** | Built-in per-function | Client-side (manual or via React Query) |

### tRPC Example

```typescript
// Define router
const appRouter = router({
  createUser: procedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      return await db.users.create(input);
    }),
});

// Client call (vanilla)
const user = await trpc.createUser.mutate({ 
  name: 'John', 
  email: 'john@example.com' 
});
```

### IRPC Example

```typescript
// Declare function
const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });

// Client call
const user = await createUser({ name: 'John', email: 'john@example.com' });
```

**Result:** Both are type-safe and framework-agnostic. Both have built-in validation (IRPC opt-in, tRPC integrated). IRPC has simpler function-based API, tRPC has router-based API.

## IRPC vs GraphQL

| Aspect | IRPC | GraphQL |
|--------|------|------|
| **Query Complexity** | Simple function calls | Complex query language |
| **Type Generation** | Native TypeScript | Code generation required |
| **Caching** | Per-function, simple | Normalized cache, complex |
| **Over-fetching** | No - exact function returns | No - query what you need |
| **Under-fetching** | Batching handles multiple calls | Single query for nested data |
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

**Result:** IRPC is simpler and doesn't require learning GraphQL query language.

## Performance Benchmark

**Scenario:** 100,000 users, 10 calls each (1,000,000 total calls)

| Framework | Total Time | HTTP Requests | Speedup |
|-----------|------------|---------------|---------|
| **IRPC** | **3,617ms** | **100,000** | **6.96x** 🚀 |
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
- ✅ You want built-in caching, retry, and timeout

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

Choose IRPC when you want high-performance, type-safe remote calls without the complexity of other solutions.
