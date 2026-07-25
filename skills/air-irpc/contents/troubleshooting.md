## Troubleshooting — Common IRPC Mistakes

### 1. Constructor Not Called (Silent No-Op)

**Symptom:** The server function runs fine when called directly, but returns `undefined` or `idle` status when called via IRPC.

**Cause:** The constructor file (`constructor.ts`) was not imported for its side effects. `irpc.construct()` must execute to register the handler — just defining it in a file isn't enough.

```typescript
// ❌ Wrong: Constructors are never loaded
// index.ts only exports stubs, never imports constructors

// ✅ Correct: Import constructor files for their side effects
import './domain/constructor.js'; // This runs irpc.construct() on import
```

**Check:** Does your server entry point or root barrel file include `import './path/to/constructor.js'`?

---

### 2. Missing `seed` on Guaranteed Return Type

**Symptom:** `reader.data` is `undefined` during SSR or before the first server response, causing crashes when accessing nested properties like `user.data.name`.

**Cause:** The function returns `Promise<User>` (no `| undefined`), but `seed` was omitted. The initial state has no shape to render.

```typescript
// ❌ Wrong: seed omitted on guaranteed return type
const getUser = irpc.declare<GetUserFn>('getUser');
// user.data is undefined until resolved

// ✅ Correct: seed provides initial shape
const getUser = irpc.declare<GetUserFn>('getUser', {
  seed: () => ({ name: '', email: '' }),
});
// user.data is { name: '', email: '' } immediately
```

**Rule:** If the return type does NOT include `| undefined`, `seed` is required. If it does include `| undefined`, `seed` is optional — `undefined` is the valid initial state.

---

### 3. Using `throw new Error()` Instead of Typed Errors

**Symptom:** The client receives a generic `Error` with no `type` or `code` properties. `reader.error instanceof ResolveError` returns `false`.

**Cause:** The handler threw a plain `Error` instead of an `IRPCError` subclass.

```typescript
// ❌ Wrong: Plain Error — client can't distinguish error type
irpc.construct(getUser, async (id) => {
  const user = db.users.find(id);
  if (!user) throw new Error('User not found');
});

// ✅ Correct: Typed error — client can match on type/code
irpc.construct(getUser, async (id) => {
  const user = db.users.find(id);
  if (!user) throw ResolveError.notFound(`User ${id} not found`);
});
```

**Rule:** Always use `ResolveError`, `HandlerError`, or `GuardError` subclasses. Never throw `new Error()` from an IRPC handler.

---

### 4. Context Not Seeded Before `router.resolve()`

**Symptom:** `getContext()` returns `undefined` even though `setContext()` was called earlier in the request chain.

**Cause:** Context isolation is automatic, but the context values must still be seeded via `router.resolve()` or `withContext()`. If you're running outside the router (e.g., in a test), wrap the call with `withContext()`:

```typescript
// ❌ Wrong: No context seeded — hooks can't access auth
export const handler = async () => {
  return httpRouter.resolve(req); // Context not seeded
};

// ✅ Correct: Seed context from request headers
return httpRouter.resolve(req, [
  ['token', req.headers.get('authorization')],
  ['user', await verifyToken(req.headers.get('authorization'))],
]);

// ✅ Correct (tests): Wrap calls with withContext()
const ctx = new Map([['USER_ID', 'user-123']]);
await withContext(ctx, () => getProfile());
```

**Check:** Is the context being seeded via `router.resolve(req, context)` or `withContext(Map, fn)`?

### 5. Stream Cleanup Not Returned

**Symptom:** Server resources (intervals, connections, file handles) leak when a client disconnects from a stream.

**Cause:** The `stream()` handler didn't return a cleanup function. IRPC calls the cleanup automatically when the client disconnects or aborts.

```typescript
// ❌ Wrong: Interval keeps running after client disconnects
irpc.construct(watchPrice, (symbol) => {
  return stream((state, resolve) => {
    const interval = setInterval(() => { state.data.price += 1; }, 100);
    // No cleanup returned — interval lives forever
  });
});

// ✅ Correct: Return cleanup — called on disconnect/abort
irpc.construct(watchPrice, (symbol) => {
  return stream((state, resolve) => {
    const interval = setInterval(() => { state.data.price += 1; }, 100);
    return () => clearInterval(interval); // Cleanup on disconnect
  });
});
```

**Rule:** Always return a cleanup function from `stream()` if you allocate resources (intervals, event listeners, connections).

---

### 6. Mixing `Promise<T>` and `RemoteState<T>` Return Types

**Symptom:** A streaming endpoint (`stream: true`) returns data all at once instead of incrementally, or a static endpoint (`await`) never resolves.

**Cause:** The handler returns `Promise<T>` when the stub declares `RemoteState<T>`, or vice versa.

```typescript
// ❌ Wrong: Stream handler returning a plain value
const chat = irpc.declare<ChatFn>('chat', { stream: true });
irpc.construct(chat, async (prompt) => {
  return await api.call(prompt); // Returns Promise — stream never sends chunks
});

// ✅ Correct: Stream handler returns stream() for incremental delivery
irpc.construct(chat, (prompt) => {
  return stream((state, resolve) => {
    // Send chunks as they arrive
    state.data.text = '';
    // ... incremental updates ...
    resolve();
  });
});
```

**Rule:** `{ stream: true }` stubs must use `stream()` in the handler. Non-stream stubs must return a value or `Promise`.

---

### 8. `IRPCError.from()` Not Used for Client Error Reconstruction

**Symptom:** Client-side error handling uses `error.message` string matching instead of `error.code` or `instanceof` checks.

**Cause:** The wire format is a plain object (`{ type, code, message }`), not an `IRPCError` instance. `IRPCError.from()` reconstructs the correct subclass.

```typescript
// ❌ Wrong: String matching on wire error
if (reader.error?.message.includes('not found')) { /* fragile */ }

// ✅ Correct: Reconstruct typed error
const err = IRPCError.from(reader.error);
if (err instanceof ResolveError && err.code === 'not_found') {
  // Handle 404
}
```

**Rule:** Always use `IRPCError.from()` to reconstruct errors from wire format before matching on type/code.
