## 11. Testing

AirLib testing is straightforward. Your stubs are functions. Your state is objects. Your guards are functions. Import them, call them, assert.

### Test Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
```

```ts
// test/setup.ts
import { anchor } from '@airlib/solid';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Silences the warning when module-level effects are used in test isolation.
  // See docs/configuration.md for all anchor.configure() options.
  anchor.configure({ globalScopeWarning: false });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
```

### Testing Your IRPC Functions

Import your stub and your constructor. When both are loaded in the same process, calling the stub executes the handler directly — no transport, no network.

```ts
// src/api/greeting/index.ts (your stub)
export const greet = irpc.declare<(name: string) => Promise<{ message: string }>>('greet', () => ({ message: '' }));

// src/api/greeting/constructor.ts (your handler)
irpc.construct(greet, async (name) => {
  const user = await db.users.findByName(name);
  return { message: `Hello ${user.displayName}` };
});
```

```ts
// test/greeting.test.ts
import { describe, expect, it, vi } from 'vitest';

// Import stub + constructor so the handler is registered
import { greet } from '../src/api/greeting/index.js';
import '../src/api/greeting/constructor.js';

// Mock your dependencies, not the framework
vi.mock('../src/lib/db.js', () => ({
  db: {
    users: {
      findByName: vi.fn((name: string) => ({ displayName: name.toUpperCase() })),
    },
  },
}));

describe('greet', () => {
  it('should return formatted greeting', async () => {
    const result = await greet('alice');
    expect(result).toEqual({ message: 'Hello ALICE' });
  });
});
```

### Testing with Context

When you import the constructor locally, the call bypasses the IRPC router. This means the router's context seeding mechanism (which normally extracts tokens from HTTP requests) never runs. If your handler or its dependencies rely on context, you must manually inject it using `withContext()`.

> Context isolation is handled automatically. No explicit server import is needed to use `withContext()` in tests.

- **Isolate Calls**: Wrap your local stub execution inside a `withContext()` scope so tests don't leak context across each other.
- **Context Wrappers**: Create helper functions to quickly inject required dependencies.

```typescript
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

### Testing Your State

```ts
// src/state/cart.ts (your state)
import { mutable } from '@airlib/solid';

export function createCart() {
  return mutable({ 
    items: [] as { name: string; price: number }[],
    get count() { return this.items.length; },
    get total() { return this.items.reduce((sum, item) => sum + item.price, 0); }
  });
}
```

```ts
// test/cart.test.ts
import { describe, expect, it } from 'vitest';
import { createCart } from '../src/state/cart.js';

describe('Cart', () => {
  it('should compute totals when items change', () => {
    const cart = createCart();

    cart.items.push({ name: 'Shirt', price: 25 });
    expect(cart.count).toBe(1);
    expect(cart.total).toBe(25);

    cart.items.push({ name: 'Pants', price: 40 });
    expect(cart.count).toBe(2);
    expect(cart.total).toBe(65);
  });
});
```

### Testing Effects

Effects track reactive reads and re-run when those values change. State is synchronous — the effect fires immediately on mutation.

```ts
import { describe, expect, it, vi } from 'vitest';
import { mutable, effect } from '@airlib/solid';

describe('Effect tracking', () => {
  it('should re-run when tracked state changes', () => {
    const settings = mutable({ theme: 'dark', language: 'en' });
    const spy = vi.fn();

    effect(() => { spy(settings.theme); });

    expect(spy).toHaveBeenCalledWith('dark');

    settings.theme = 'light';
    expect(spy).toHaveBeenCalledWith('light');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should return cleanup function', () => {
    const state = mutable({ count: 0 });
    const spy = vi.fn();

    const cleanup = effect(() => { spy(state.count); });

    state.count = 1;
    expect(spy).toHaveBeenCalledTimes(2);

    cleanup(); // Stop tracking

    state.count = 2;
    expect(spy).toHaveBeenCalledTimes(2); // No longer fires
  });
});
```

### Testing Your Guards

Guards are plain functions. Call them directly or test through the route.

```ts
// src/routes/dashboard/route.ts (your guard)
import { cookies, redirect } from '@airlib/solid';
import { loginRoute } from '../auth/route.js';

export function requireAuth() {
  const auth = cookies('auth', { token: '' });
  if (!auth.token) throw redirect(loginRoute);
}
```

```ts
// test/guards.test.ts
import { describe, expect, it } from 'vitest';
import { Redirect } from '@airlib/router';
import { requireAuth } from '../src/routes/dashboard/route.js';

describe('requireAuth', () => {
  it('should throw redirect when no token', () => {
    expect(() => requireAuth()).toThrow(Redirect);
  });
});
```

### Testing Your Providers

Providers are functions that receive a context object. Call them with mock context.

```ts
// src/routes/users/route.ts (your provider)
export async function loadUsers({ query }: { query: { search?: string } }) {
  const response = await fetch(`/api/users?q=${query.search ?? ''}`);
  return response.json();
}
```

```ts
// test/providers.test.ts
import { describe, expect, it, vi } from 'vitest';
import { loadUsers } from '../src/routes/users/route.js';

describe('loadUsers provider', () => {
  it('should fetch with search query', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([{ id: 1, name: 'Alice' }]) })
    ) as any;

    const result = await loadUsers({ query: { search: 'alice' } });
    expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    expect(fetch).toHaveBeenCalledWith('/api/users?q=alice');
  });
});
```

### Testing Streams

When your IRPC function returns `RemoteState`, the result exposes reactive `.data` and `.status`. Use fake timers to advance through the stream.

```ts
import { describe, expect, it, vi } from 'vitest';
import { chat } from '../src/api/chat/index.js';
import '../src/api/chat/constructor.js';

describe('Chat stream', () => {
  it('should stream tokens then complete', () => {
    const result = chat('explain reactivity');

    expect(result.data.text).toBe(''); // seed() value
    expect(result.status).toBe('pending');

    vi.advanceTimersByTime(100); // Advance to where constructor pushes data
    expect(result.data.text).toContain('reactivity');

    vi.advanceTimersByTime(500); // Advance to completion
    expect(result.status).toBe('success');
  });
});
```

### Browser-Only APIs

Some APIs require a browser environment (`effect.client`, `.once()`, `.with()`). Stub `window` for these.

```ts
import { describe, expect, it, vi } from 'vitest';
import { effect } from '@airlib/solid';

describe('Browser-only', () => {
  it('should skip effect.client on server', () => {
    vi.stubGlobal('window', undefined);
    const spy = vi.fn();
    effect.client(spy);
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('should run effect.client in browser', () => {
    vi.stubGlobal('window', {});
    const spy = vi.fn();
    effect.client(spy);
    expect(spy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
```

### Testing with Cookies

Use `setCookieContext(decodeCookies(...))` to seed the cookie store. Wrap in `withIsolation()` so each test gets its own scope — without it, `cookies()` runs on the global scope and leaks between tests.

```ts
import { describe, expect, it } from 'vitest';
import { withIsolation } from '@airlib/solid';
import { decodeCookies, setCookieContext, cookies } from '@airlib/solid';
import { requireAuth } from '../src/routes/dashboard/route.js';
import { Redirect } from '@airlib/router';

describe('Auth guard with cookies', () => {
  it('should redirect when cookie has no token', async () => {
    await withIsolation(async () => {
      setCookieContext(decodeCookies(''));

      expect(() => requireAuth()).toThrow(Redirect);
    });
  });

  it('should pass when cookie has token', async () => {
    await withIsolation(async () => {
      // Seed a cookie with an existing token
      const encoded = `anchor-cookie://auth=${encodeURIComponent(JSON.stringify({ token: 'abc' }))}`;
      setCookieContext(decodeCookies(encoded));

      expect(() => requireAuth()).not.toThrow();
    });
  });
});
```

### Testing Components

Standard Solid Testing Library. Mount, act, assert.

```ts
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { Counter } from '../src/components/Counter.js';

describe('Counter', () => {
  it('should increment on click', () => {
    render(() => <Counter />);

    expect(screen.getByText('Count: 0')).toBeDefined();

    screen.getByRole('button').click();

    expect(screen.getByText('Count: 1')).toBeDefined();
  });
});
```
