# IRPC: Declarations and Handlers

IRPC separates the **signature** from the **implementation**. 

- **Stubs** (`index.ts` / `function.ts`): The universal callable function without logic.
- **Implementations** (`constructor.ts`): The logic for the function, safely isolated from the client.

## Declaring A Function Stub

To declare a universal callable function stub, use `irpc.declare()`:

```typescript
import { irpc } from '@irpclib/irpc';

// Pattern: Single (name, options?) signature
type GetUserFn = (id: string) => Promise<User>;
const getUser = irpc.declare<GetUserFn>('getUser', {
  seed: () => ({ name: '', email: '' }),
  maxAge: 60000,
  coalesce: true,
});
```

### Signature

```typescript
declare<Fn>(name: string, options?: IRPCDeclareConfig<Fn>): IRPCStub<Fn>;
```

| Parameter | Required | Description |
|---|---|---|
| `name` | Always | Unique wire identifier for the RPC. |
| `options.seed` | See below | Synchronous factory guaranteeing reader data shape before resolution. |
| `options.maxAge` | Optional | Cache duration in ms. Identical subsequent calls return cached result until expiry. |
| `options.coalesce` | Optional | Deduplicate concurrent identical calls. Multiple callers share one execution. |
| `options.timeout` | Optional | Reject if execution exceeds N milliseconds. |
| `options.maxRetries` | Optional | Maximum retry attempts on failure. |
| `options.retryMode` | Optional | Backoff strategy: `'linear'` or `'exponential'`. |
| `options.retryDelay` | Optional | Base delay between retries in ms. |
| `options.stream` | Optional | If `true`, treats this RPC as a stream returning `RemoteState`. |
| `options.schema` | Optional | Runtime validation schemas (Zod, Valibot, etc.) for inputs and outputs. |
| `options.description` | Optional | Human-readable description of the RPC. |
| `options.standalone` | Optional | If `true`, bypasses transport multiplexing. |
| `options.ttl` | Optional | TTL for buffered binary data. |

### The `seed` Inference Rule

Whether `seed` is required depends on the **TypeScript return type**, not on convention:

```typescript
// seed NOT needed: undefined is a valid initial state
type GetUserFn = (id: string) => Promise<User | undefined>;
const getUser = irpc.declare<GetUserFn>('getUser');
// user.data → User | undefined  → use ?. in UI

// seed REQUIRED: guarantee initial shape before resolution
type GetUserFn = (id: string) => Promise<User>;
const getUser = irpc.declare<GetUserFn>('getUser', {
  seed: () => ({ name: '', email: '' }),
});
// user.data → User  → safe to access directly
```

**Rule:** If the return type includes `| undefined`, `seed` is optional — `undefined` is already the valid "not ready" state. If the return type is guaranteed, `seed` is required to provide a valid initial shape for SSR and reactive reads.

The same `(name, options?)` pattern applies in both cases — just omit `seed` when it's not needed:

```typescript
// Both use the same call pattern — no overload switching
const a = irpc.declare<FnA>('name');                          // no seed
const b = irpc.declare<FnB>('name', { seed: () => ({}) });    // with seed
const c = irpc.declare<FnC>('name', { maxAge: 5000 });        // no seed, with config
const d = irpc.declare<FnD>('name', { seed: () => ({}), maxAge: 5000 }); // both
```

### Return Type: `IRPCStub`

```typescript
interface IRPCStub<Fn> {
  // Acts as a standard async function
  (...args: Parameters<Fn>): ReturnType<Fn>;

  // UI Bindings (Reactive context tracking)
  once(...args: Parameters<Fn>): IRPCReader<ReturnType<Fn>>;
  with(factory: () => Parameters<Fn>, debounce?: number): IRPCReader<ReturnType<Fn>>;
  when(factory: () => Parameters<Fn>, debounce?: number): IRPCReader<ReturnType<Fn>>;
  later(debounce?: number): IRPCReader<ReturnType<Fn>> & { dispatch: (...args: Parameters<Fn>) => void };
}
```

```typescript
interface IRPCReader<Data> {
  status: 'idle' | 'pending' | 'success' | 'error' | 'aborted';
  data: Data;    // Immediately guaranteed by seed, or undefined without seed
  error?: IRPCError;
  close(): void; // Manually abort the call and trigger server cleanup
}
```

## Implementing Function Stub

To implement the logic, bind the stub using `irpc.construct()`:

```typescript
// constructor.ts (Server Implementation)
import { irpc } from '@irpclib/irpc';
import { getUser } from './index.js';

// The types of `id` and the return value are strictly inferred from the Stub.
irpc.construct(getUser, async (id) => {
  return db.users.find(id);
});
```

### Signature

```typescript
construct<Fn>(stub: IRPCStub<Fn>, handler: Fn): void;
```

## Throwing Errors: `| undefined` vs `throw NotFound`

There are two patterns for handling "not found" cases. Choose based on whether the missing entity is a **normal state** or an **error condition**.

### Pattern A: `Promise<Entity | undefined>` (no seed)

Use when the entity may legitimately not exist and the UI handles that gracefully:

```typescript
type GetUserFn = (id: string) => Promise<User | undefined>;
const getUser = irpc.declare<GetUserFn>('getUser');

irpc.construct(getUser, async (id) => {
  return db.users.find(id); // Returns undefined if not found — no error
});
```

**Downside:** Every consumer must use `?.` or nullish checks:
```tsx
const user = getUser.once(id);
return render(() => <h1>{user.data?.name ?? 'Unknown'}</h1>);
```

### Pattern B: `Promise<Entity>` + `throw NotFound` (with seed)

Use when the entity should always exist and missing data is a genuine error:

```typescript
type GetUserFn = (id: string) => Promise<User>;
const getUser = irpc.declare<GetUserFn>('getUser', {
  seed: () => ({ name: '', email: '' }),
});

irpc.construct(getUser, async (id) => {
  const user = db.users.find(id);
  if (!user) throw ResolveError.notFound(`User ${id} not found`);
  return user;
});
```

**Downside:** Errors must be caught — by route error boundaries, `Show` fallbacks, or try/catch.

### Recommendation

**Default to Pattern B (`throw NotFound` + seed)** for most APIs:

1. **Simpler UI code** — no scattered nullish checks. `user.data.name` always works.
2. **Predictable SSR** — `seed` provides initial shape, no undefined guards needed during rendering.
3. **Clear error boundaries** — `ResolveError.notFound()` propagates to route error handlers or `catch()` boundaries.

Use **Pattern A (`| undefined`)** only for genuinely optional entities — e.g., optional profile sections, feature flags, config lookups that may not exist yet.

### Error Classes

```typescript
import { ResolveError, HandlerError, GuardError } from '@irpclib/irpc';

// 404 — Resource not found
throw ResolveError.notFound(`User ${id} not found`);

// 400 — Invalid input
throw ResolveError.invalidInput('Email is required');

// 500 — Handler execution failure
throw HandlerError.failed(error);

// 403 — Guard rejection
throw GuardError.failed('Admin access required');
```

The `ResolveError` API:
```typescript
class ResolveError extends IRPCError {
  static notFound(name: string): ResolveError;
  static failed(input: string | Error): ResolveError;
  static invalidInput(input: Error | string): ResolveError;
  static invalidOutput(input?: Error | string): ResolveError;
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

const verifyAccess = irpc.declare('verifyAccess', {
  seed: () => ({ allowed: false }),
});

irpc.construct(verifyAccess, async (userId) => {
  const [user, permissions] = await Promise.all([
    getUser(userId),
    getPermissions(userId),
  ]);

  return { user, permissions };
});
```

## Package Guards (Handler Boundary)

To protect an entire package or namespace from unauthorized access, register a Guard on the package instance:

```typescript
import { adminPackage } from './index.js';
import { GuardError } from '@irpclib/irpc';

adminPackage.guard(async (req) => {
  const user = getContext<User>('user');
  if (!user || user.role !== 'admin') {
    throw GuardError.failed('Forbidden: Admin access required');
  }
});
```

```typescript
guard(hook: (req: IRPCSubRequest) => void | Promise<void>): void;
```

Where `IRPCSubRequest` provides the raw call context:
```typescript
interface IRPCSubRequest {
  id: string;      // Unique call ID
  name: string;    // Stub wire name
  args: unknown[]; // Untyped arguments
}
```

## Spec Hooks (Domain Boundary)

To intercept specific typed calls (analytics, argument mutation, isomorphic validation), bind a hook directly to the declared stub:

```typescript
import { irpc } from '@irpclib/irpc';
import { getUser } from './index.js';

irpc.hook(getUser, async (req) => {
  console.log(`[Audit] Accessing user: ${req.args[0]}`);
});
```

```typescript
hook<Fn>(stub: IRPCStub<Fn>, handler: (req: { name: string; args: Parameters<Fn> }) => void | Promise<void>): void;
```

## Accessing Request State

To safely access request-scoped variables (user sessions, auth tokens) across async boundaries, use `getContext` and `setContext`:

```typescript
import { getContext, setContext } from '@irpclib/irpc';

// Hook: Set context for downstream execution
irpc.hook(getUser, async (req) => {
  const isAudit = String(req.args[0]).startsWith('audit_');
  setContext('isAudit', isAudit);
});

// Handler: Read context set by upstream hooks
irpc.construct(getUser, async (id) => {
  const isAudit = getContext<boolean>('isAudit');
  // Implementation...
});
```

```typescript
getContext<R>(key: string | symbol, fallback?: R): R | undefined;
setContext(key: string | symbol, value: unknown): void;
```

> **Note:** Context isolation is handled automatically. No explicit server import is required. To seed context values, pass them to `router.resolve(req, [['key', value]])` or use `withContext()` in tests.
