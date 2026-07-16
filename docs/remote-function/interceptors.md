---
title: 'Interceptors'
description: 'Deep-dive into IRPC interceptors — Router Hooks, Guards, Spec Hooks, lifecycle management, and error handling.'
---

# Interceptors

An **interceptor** allows you to tap into the lifecycle of a request before it reaches the core business logic. As your application grows, you will find yourself repeating the same logic across multiple handlers — checking if a user is logged in, validating UUIDs, or logging analytics. 

IRPC provides a three-layered interception pipeline designed to extract this shared logic. Each layer operates at a different boundary and possesses a different level of awareness about the incoming request.

This page goes deep into how to structure these boundaries, where they belong in your codebase, and how to manage their lifecycles.

## The Interception Pipeline

When a request is initiated, it travels through a precise sequence of boundaries. Understanding this execution order is critical for knowing where to place your logic.

1. **Spec Hook (Client)** — Before the request is serialized, the client-side Spec Hook executes. It has full typed access to the function arguments.
2. **Network Transport** — The request is serialized and sent to the server.
3. **Router Hooks** — The router receives the raw request. It parses HTTP headers and builds the global context (e.g., sessions).
4. **Guards** — The package evaluates the context to determine if the caller has permission to access the namespace.
5. **Spec Hook (Server)** — The exact same Spec Hook from step 1 runs again on the server to validate the arguments against tampering.
6. **Handler** — Finally, the core business logic executes.

If any step throws an error, the execution pipeline halts immediately and propagates the rejection back to the caller.

## Router Hooks

`router.use()` registers a hook at the **router boundary**. 

A Router Hook is entirely blind. It does not know which function is being called, what arguments were passed, or what package is being accessed. Its sole responsibility is parsing the initial raw environment to build a deeper, shared state for the downstream lifecycle.

### Establishing Context

Because Router Hooks handle global infrastructure, they belong at the absolute root of your backend, typically in the file where your router is instantiated (such as your main server entry point):

```typescript
// e.g., server.ts
import { HTTPRouter } from '@irpclib/http/router';
import { transport } from './rpc/module.js';

const router = new HTTPRouter(transport);

router.use(async () => {
  // 1. Extract raw environment data
  const token = getContext<string>('authorization');
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  // 2. Build deeper context
  const user = await verifyJwtAndLoadUser(token);
  setContext('user', user);
});
```

By placing this in `server.ts` before the router starts listening, you guarantee that every single request entering your IRPC packages has a fully hydrated context. Downstream guards and handlers can safely assume `getContext('user')` is populated.

## Guards

`irpc.guard()` registers a guard at the **handler boundary**. 

While Router Hooks build the state, Guards evaluate it. They intercept requests at the package level to make allow or block decisions. A Guard knows the `name` and `args` of the incoming call, but relies entirely on the context to identify the caller.

### Package Protection

Because Guards protect your system from invalid execution and often interact with databases or secrets, they must strictly live in the server environment. You register them alongside your handler implementations:

```typescript
// rpc/admin/constructor.ts
import { adminPackage } from './index.js';

// Registers sequentially; you can attach multiple guards.
adminPackage.guard(async (req) => {
  // Safe to assume 'user' exists because the Router Hook ran first.
  const user = getContext<User>('user');
  
  if (user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
});
```

By keeping this in `constructor.ts`, you ensure your security logic never leaks into the client bundle. The `req` object provides `req.id`, `req.name`, and the raw `req.args`, allowing you to inspect the target of the call if necessary.

### Handling Errors

If a guard throws a standard `Error`, IRPC wraps it in an internal server error. To explicitly reject a request during the guard phase with a standardized, readable error code, use `GuardError`.

```typescript
// rpc/admin/constructor.ts
import { GuardError } from '@irpclib/irpc';
import { adminPackage } from './index.js';

adminPackage.guard(async (req) => {
  if (req.name === 'admin.deleteDatabase') {
    // Immediately halts the pipeline and sends a clean error to the client.
    throw GuardError.failed('Forbidden: Destructive action not allowed');
  }
});
```

### Lifecycle and Abortion

Network requests are volatile. A client might close their browser mid-request, or a React component might unmount. To prevent your server from executing expensive guard logic for a dead connection, Guards deeply integrate with the `AbortSignal` lifecycle.

```typescript
// rpc/admin/constructor.ts
import { GuardError, getAbortSignal } from '@irpclib/irpc';
import { adminPackage } from './index.js';

adminPackage.guard(async (req) => {
  const signal = getAbortSignal();
  const userId = getContext<string>('userId');
  
  // Pass the signal to your driver (e.g., fetch, Prisma, or custom DB wrapper).
  // If the client disconnects mid-request, the driver aborts the heavy query automatically,
  // preventing wasted database resources.
  const user = await db.users.findUnique({
    where: { id: userId },
    signal
  });
  
  if (!user || user.role !== 'admin') {
    throw GuardError.failed('Forbidden: Admin access required');
  }
});
```

If the request is aborted, the guard halts immediately. Downstream handlers are never executed, ensuring your server resources are instantly freed.

## Spec Hooks

`irpc.hook()` registers an interceptor isomorphically at the **domain boundary**. 

Unlike Guards, which protect an entire package, a Spec Hook is bound to a single, specific function declaration. It is completely blind to the environment or transport, focusing only on the data passing through that one function.

### Isomorphic Execution

Because Spec Hooks represent pure domain logic, you attach them directly to the shared declaration file:

```typescript
// rpc/users/index.ts
import { irpc } from '../../lib/module.js';

export type DeleteUserFn = (userId: string) => Promise<void>;
export const deleteUser = irpc.declare<DeleteUserFn>('deleteUser', () => undefined);

// This hook is bundled on BOTH the client and the server.
irpc.hook(deleteUser, (req) => {
  const userId = req.args[0];

  if (!isValidUUID(userId)) {
    throw new Error('Invalid User ID format');
  }
});
```

This placement is what makes Spec Hooks isomorphic:
1. **Client-Side Feedback**: When the user clicks "Delete", the hook runs immediately in the browser. If the UUID is invalid, it throws before a network request is even created, providing instant UI feedback.
2. **Server-Side Trust**: When the request reaches the server, the exact same hook runs again right before the handler, ensuring malicious clients cannot bypass the validation.

### Beyond Validation

While validation is the most common use case, Spec Hooks intercept the call itself, meaning they can be used for any domain-specific task that requires strict argument typing.

```typescript
// rpc/users/index.ts
irpc.hook(deleteUser, (req) => {
  // Fire analytics every time this specific function is called.
  console.log(`[Analytics] Attempting to delete user: ${req.args[0]}`);
});
```
