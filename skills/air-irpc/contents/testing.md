# IRPC: Testing

Testing IRPC is straightforward because everything is fundamentally a function.

## Testing Your IRPC Functions

Import your stub AND your constructor into the test file. When both are loaded in the same process, calling the stub executes the handler directly — no network overhead, no transports.

```typescript
// test/greeting.test.ts
import { describe, expect, it, vi } from 'vitest';

// 1. Import stub + constructor to register the handler locally
import { greet } from '../src/api/greeting/index.js';
import '../src/api/greeting/constructor.js';

// 2. Mock your dependencies, NOT the IRPC framework!
vi.mock('../src/lib/db.js', () => ({
  db: {
    users: {
      findByName: vi.fn((name: string) => ({ displayName: name.toUpperCase() })),
    },
  },
}));

describe('greet', () => {
  it('should return formatted greeting', async () => {
    // 3. Call the stub normally
    const result = await greet('alice');
    expect(result).toEqual({ message: 'Hello ALICE' });
  });
});
```

## Testing with Context

When you import the constructor locally, the call bypasses the IRPC router. This means the router's context seeding mechanism (which normally extracts tokens from HTTP requests) never runs. If your handler or its dependencies rely on context, you must manually inject it using `withContext()`.

- **Setup Async Storage**: Import the server entry point at the **very top** of your test file (before any other imports) to initialize `AsyncLocalStorage`. Avoid putting this in a global setup file, as it will force all UI tests into a server environment.
- **Isolate Calls**: Wrap your local stub execution inside a `withContext()` scope so tests don't leak context across each other.
- **Context Wrappers**: Create helper functions to quickly inject required dependencies.

```typescript
// Setup async storage for this specific test file. MUST BE FIRST IMPORT.
import '@irpclib/irpc/server';

import { describe, expect, it } from 'vitest';
import { withContext } from '@irpclib/irpc';
import { getProfile } from '../src/api/profile/index.js';
import '../src/api/profile/constructor.js';

// Create a helper to quickly inject mock context for these specific tests
const withMockUser = <R>(fn: () => R) => {
  const ctx = new Map<string | symbol, unknown>([['USER_ID', 'user-123']]);
  return withContext(ctx, fn);
};

describe('getProfile', () => {
  it('should return profile for authenticated user', async () => {
    // The stub call executes locally inside the mock context scope
    const result = await withMockUser(() => getProfile());
    expect(result.id).toBe('user-123');
  });
});
```

The `withContext()` takes:
```typescript
<R>(
  /** A Map instance containing context key-value pairs to seed the async scope. */
  ctx: Map<string | symbol, unknown>,
  
  /** The callback to execute within the isolated context boundary. */
  fn: () => R
)
```

The `withContext()` returns:
```typescript
/** The result of the executed callback function. */
R
```

## Testing Streams

When an IRPC function returns `RemoteState`, the result exposes reactive `.data` and `.status`. Use fake timers to advance through the stream and assert progressive hydration.

```typescript
import { describe, expect, it, vi } from 'vitest';
import { chat } from '../src/api/chat/index.js';
import '../src/api/chat/constructor.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Chat stream', () => {
  it('should stream tokens progressively', () => {
    const result = chat('explain reactivity');

    // Initial state from seed()
    expect(result.data.text).toBe(''); 
    expect(result.status).toBe('pending');

    vi.advanceTimersByTime(100); // Advance timer to let constructor push data
    expect(result.data.text).toContain('reactivity');

    vi.advanceTimersByTime(500); // Advance to completion
    expect(result.status).toBe('success');
  });
});
```

## Error Hierarchy

All IRPC errors extend `IRPCError`. When catching errors on the client, you will receive concrete subclasses detailing exactly where the failure occurred.

- **`ResolveError`**: Server-side resolution failures (Not Found).
- **`TransportError`**: Network connection failures (Disconnected, Blocked).
- **`HandlerError`**: Exceptions thrown inside your `constructor` logic.
- **`HookError`**: Exceptions thrown inside a hook/middleware.
- **`CallError`**: Client-side call failures (Timeout, Max Retries Reached).
- **`StubError`**: Declaration/Registration errors.
- **`CrudError`**: CRUD adapter exceptions (Not Implemented).

```typescript
import { HANDLER_ERROR, HandlerError, TransportError } from '@irpclib/irpc';

// Throw specific errors in your handlers
irpc.construct(getUser, async (id) => {
  const user = await db.find(id);
  if (!user) throw HandlerError.failed(`User ${id} not found`);
  return user;
});

// Reconstruct and match errors cleanly on the client
const reader = getUser.once('123');

if (reader.error) {
  // Instance type checking
  if (reader.error instanceof TransportError) {
    console.error("Network disconnected.");
  }
  
  // Property matching via companion constants
  if (reader.error.code === HANDLER_ERROR.ERROR) {
    console.error("User does not exist or failed to load.");
  }
}
```

## Testing Libraries

When building libraries, you typically do not test the full IRPC chain. Instead, you unit test the individual Adapters, Drivers, and Providers. Because these components often rely heavily on Context (like API keys or user tokens), you apply the exact same `withContext()` pattern to isolate their execution.

```typescript
import { describe, expect, it } from 'vitest';
import { withContext } from '@irpclib/irpc';
import { OpenAiProvider } from '../src/providers/openai.js';

const withMockToken = <R>(fn: () => R) => {
  const ctx = new Map<string | symbol, unknown>([['OPENAI_API_KEY', 'mock-key-123']]);
  return withContext(ctx, fn);
};

describe('OpenAiProvider', () => {
  it('should authenticate and execute chat', async () => {
    const provider = new OpenAiProvider();
    
    // Execute the provider inside the isolated context wrapper
    const result = await withMockToken(async () => {
      // The provider internally calls getContext('OPENAI_API_KEY')
      return provider.chat(['Hello!']); 
    });

    expect(result).toBeDefined();
  });
});
```
