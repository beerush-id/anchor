# IRPC: Declarations and Handlers

IRPC separates the **signature** from the **implementation**. 

- **Stubs** (`index.ts` / `function.ts`): The universal callable function without logic.
- **Implementations** (`constructor.ts`): The logic for the function, safely isolated from the client.

## Declaring A Function Stub

To declare a universal callable function stub, use `irpc.declare()`:

```typescript
// index.ts (Universal Stub)
import { irpc } from '@irpclib/irpc';

export type GetUserFn = (id: string) => Promise<{ name: string, email: string }>;

// The seed guarantees the `user.data` shape is immediately available for consumers.
export const getUser = irpc.declare<GetUserFn>('getUser', () => ({ name: '', email: '' }), {
  maxAge: 60000,
  coalesce: true
});
```

The `irpc.declare()` takes:
```typescript
<F, I extends IRPCInputs = IRPCInputs, O extends IRPCOutput = IRPCOutput>(
  /** The unique wire identifier. */
  name: string, 
  
  /** 
   * The synchronous factory guaranteeing the reader data shape immediately. 
   * Can also be an object containing both the seed and configuration.
   */
  seedOrConfig: (() => IRPCReturnOf<F>) | (IRPCDeclareConfig<I, O> & IRPCInferInit<IRPCReturnOf<F>>),
  
  /** Optional behavior configuration. */
  config?: IRPCDeclareConfig<I, O>
)

type IRPCDeclareConfig<I, O> = IRPCCallConfig & {
  /** Optional description for the RPC */
  description?: string;
  /** Runtime validation schemas to guard inputs and outputs. */
  schema?: IRPCSchema<I, O>; 
  maxAge?: number; // Cache duration (ms).
  coalesce?: boolean; // Deduplicate concurrent calls into one execution.
  stream?: true; // If true, treats this RPC as a stream
  ttl?: number; // TTL for buffered binary data
}

type IRPCCallConfig = {
  timeout?: number; // Reject if execution exceeds N milliseconds.
  maxRetries?: number; // Maximum retry attempts.
  retryMode?: 'linear' | 'exponential'; // Backoff strategy.
  retryDelay?: number; // Base delay between retries.
  standalone?: boolean; // If true, bypasses transport multiplexing.
}

type IRPCSchema = {
  /** Array of runtime validators matching the function arguments (e.g. Zod, Valibot). */
  input?: IRPCInputs;
  
  /** The runtime validator for the return output. */
  output?: IRPCOutput;
}

type IRPCInputs = IRPCDataSchema[];
type IRPCOutput = IRPCDataSchema;

import type { ZodString, ZodNumber, ZodBoolean, ZodNull, ZodUndefined, ZodOptional, ZodCustom, ZodObject, ZodArray } from 'zod/v4';

type IRPCPrimitiveSchema = ZodString | ZodNumber | ZodBoolean | ZodNull | ZodUndefined | ZodOptional | ZodCustom;
type IRPCObjectSchema = ZodObject;
type IRPCArraySchema = ZodArray<IRPCPrimitiveSchema | IRPCObjectSchema>;

/** Union type of all possible Zod schema types used in IRPC for input/output validation. */
type IRPCDataSchema = IRPCPrimitiveSchema | IRPCObjectSchema | IRPCArraySchema;
```

The `irpc.declare()` returns:
```typescript
interface IRPCStub<F, A, R> {
  /** Static execution. */
  once(...args: A): IRPCReader<R>;
  
  /** Eager reactive execution. */
  with(args: () => A, debounce?: number): IRPCReader<R>;
  
  /** Lazy reactive execution. */
  when(args: () => A, debounce?: number): IRPCReader<R>;
  
  /** Imperative execution. */
  later(debounce?: number): IRPCReader<R> & { dispatch: (...args: A) => void };
  
  /** The raw generic signature. */
  stub: F;
}

/** 
 * A reactive state wrapper that implements the standard Promise interface.
 * It operates as a Promise for static execution, but exposes `.subscribe()` for reactive updates.
 */
class IRPCReader<T extends IRPCData> extends RemoteState<T> {
  /** The current data payload of the state. */
  public data: T;
  
  /** The current error encountered by the state, if any. */
  public error: Error | undefined;
  
  /** The current execution status. */
  public status: 'idle' | 'error' | 'pending' | 'success' | 'aborted';

  /** Subscribes to internal state mutations to react to data streams. */
  public subscribe(handler: (state: { data: T, status: string, error?: Error }, event: any) => void): () => void;

  /** Aborts the local request without notifying the server. */
  public abort(): void;
  
  /** Manually aborts the call and immediately triggers server cleanup. */
  public close(): void;
  
  /** Callback fired when the stream closes. */
  public onClose?: () => void;
}
```

## Implementing Function Stub

To implement the logic on the server, bind the stub using `irpc.construct()`:

```typescript
// constructor.ts (Server Implementation)
import { irpc } from '@irpclib/irpc';
import { getUser } from './index.js';

// The types of `id` and the return value are strictly inferred from the Stub.
irpc.construct(getUser, async (id) => {
  return db.users.find(id);
});
```

The `irpc.construct()` takes:
```typescript
<F, A extends unknown[], R extends IRPCData>(
  /** The declared stub instance. */
  stub: IRPCStub<F, A, R>, 
  
  /** The function implementation strictly matching the stub's generic signature. */
  handler: F
)
```


## Throwing Errors

To securely serialize failures back to the client, throw `IRPCError` subclasses:

```typescript
import { IRPCError, HandlerError } from '@irpclib/irpc';

irpc.construct(getUser, async (id) => {
  const user = db.users.find(id);
  if (!user) throw HandlerError.failed(`User ${id} not found`);
  return user;
});
```

The `IRPCError` base class definition:
```typescript
class IRPCError extends Error {
  public type: IRPCErrorType;
  public code: string;
  public cause?: Error;
}
```

The `HandlerError` constructor signature:
```typescript
type IRPCErrorType = 'stub' | 'hook' | 'call' | 'crud' | 'handler' | 'resolve' | 'transport';

(
  /** The string code to identify the error */
  code: string, 
  
  /** The human-readable message */
  message: string, 
  
  /** The optional underlying error that caused this failure */
  cause?: Error
)
```

The `ResolveError` returns:
```typescript
class ResolveError extends IRPCError {
  /** Throws a 404 Not Found error. */
  static notFound(name: string): ResolveError;

  /** Throws a 500 Internal Server error. */
  static failed(input: string | Error): ResolveError;
  
  /** Throws a 400 Bad Request error for invalid input. */
  static invalidInput(input: Error | string): ResolveError;

  /** Throws a 400 Bad Request error for invalid output. */
  static invalidOutput(input?: Error | string): ResolveError;
}
```

The `GuardError` returns:
```typescript
class GuardError extends IRPCError {
  /** Throws a custom guard rejection error. */
  static failed(input: string | Error): GuardError;
}
```

## Tree Composition & Barrel Exports

Group related APIs into folders to keep the architecture modular.

```typescript
// index.ts (Universal Stubs)
export * from './profile/index.js'; 
export * from './billing/index.js';
```

```typescript
// constructor.ts (Implementations)
import './profile/constructor.js'; 
import './billing/constructor.js'; 
```

## Function Composition

IRPC stubs extend `Promise`. Compose them directly on the server to execute them in the same thread and bypass the network transport entirely.

```typescript
import { irpc } from '@irpclib/irpc';
import { getUser, getPermissions } from './index.js';

export const verifyAccess = irpc.declare('verifyAccess', () => ({}));

irpc.construct(verifyAccess, async (userId) => {
  // Calls in the same thread bypass network overhead
  const [user, permissions] = await Promise.all([
    getUser(userId),
    getPermissions(userId)
  ]);

  return { user, permissions };
});
```

## Package Guards (Handler Boundary)

To protect an entire package or namespace from unauthorized access, register a Guard on the package instance. Guards evaluate requests sequentially and make an allow or block decision before any handlers are invoked.

```typescript
import { adminPackage } from './index.js';
import { GuardError } from '@irpclib/irpc';

// Guards must strictly live in the server environment (e.g., constructor.ts)
adminPackage.guard(async (req) => {
  const user = getContext<User>('user');
  
  if (!user || user.role !== 'admin') {
    // Throws a standardized rejection error to the client
    throw GuardError.failed('Forbidden: Admin access required');
  }
});
```

The `guard()` method takes:
```typescript
(
  /** The hook to execute before any handler in the package runs. */
  hook: (req: IRPCSubRequest) => void | Promise<void>
)
```

The `IRPCSubRequest` receives the raw context of the call:
```typescript
interface IRPCSubRequest {
  id: string;      // The unique call ID
  name: string;    // The specific stub wire name being called
  args: unknown[]; // Untyped arguments array
}
```

## Spec Hooks (Domain Boundary)

To intercept specific, strictly-typed calls (such as firing analytics, mutating arguments, or validating data isomorphically), bind a hook directly to the declared function stub using `irpc.hook()`.

```typescript
import { irpc } from '@irpclib/irpc';
import { getUser } from './index.js';

// Attaching to the shared declaration file guarantees it runs locally on the client 
// (before dispatch) and again on the server (before the handler).
irpc.hook(getUser, async (req) => {
  console.log(`[Audit] Accessing user: ${req.args[0]}`); // req.args is strictly typed!
});
```

The `irpc.hook()` takes:
```typescript
<F extends IRPCHandler>(
  /** The specific stub to intercept. */
  stub: F, 
  
  /** The hook to execute. */
  handler: IRPCSpecHook<F>
)
```

The `IRPCSpecHook` receives `IRPCHookArgs` which provides the typed invocation context:
```typescript
type IRPCSpecHook<F> = (req: IRPCHookArgs<F>) => void | Promise<void>;

type IRPCHookArgs<F> = F extends (...args: infer A) => unknown
  ? { name: string; args: A }
  : { name: string; args: unknown[] };
```

## Accessing Request State

To safely access request-scoped variables (like user sessions) across asynchronous boundaries without passing them as arguments, use `getContext` and `setContext`.

> **Note**: `import '@irpclib/irpc/server'` is required in the server entry point to enable the underlying `AsyncLocalStorage`.

```typescript
import { getContext, setContext, HandlerError } from '@irpclib/irpc';

// Hook: Sets context for downstream execution
irpc.hook(getUser, async (req) => {
  const isAudit = String(req.args[0]).startsWith('audit_');
  setContext('isAudit', isAudit);
});

// Handler: Reads context set by upstream hooks
irpc.construct(getUser, async (id) => {
  const isAudit = getContext<boolean>('isAudit');
  
  // Implementation...
});
```

The `getContext()` signature:
```typescript
<R>(
  /** The specific key of the context variable to retrieve. */
  key: string | symbol,
  
  /** An optional fallback value if the context is not set. */
  fallback?: R
): R | undefined
```

The `setContext()` signature:
```typescript
(
  /** The specific key of the context variable to set. */
  key: string | symbol,
  
  /** The value to bind to the current asynchronous execution context. */
  value: unknown
): void
```


