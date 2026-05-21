## 3. State Management
The reactivity system uses transparent Proxies. You read and mutate properties directly like standard JavaScript objects without cloning or `setState` boilerplate.

### State: API Signatures
Configuration and signatures for defining mutable state.

```typescript
import { mutable, immutable, writable } from '@anchorlib/core';

// Options for configuring reactivity behavior
export interface MutableOptions<T> {
  // Enforce runtime data integrity (e.g., Zod)
  schema?: any;
  // Tune reactivity depth:
  // true = Deep reactivity (default)
  // false = Shallow reactivity
  // 'flat' = Array structure tracking only
  recursive?: boolean | 'flat';
}

// Upgrades a standard object or primitive into a reactive proxy
export function mutable<T>(initialState: T, options?: MutableOptions<T>): T;

// Creates a read-only reactive proxy (Public Interface)
export function immutable<T>(initialState: T): Readonly<T>;

// Creates a write contract for an immutable state (Private Interface)
// If allowedKeys is provided, creates a Least Privilege contract
export function writable<T>(state: T, allowedKeys?: Array<keyof T>): T;

// Creates a read-only computed primitive from independent sources
export function derived<T>(compute: () => T): { readonly value: T };

// Creates a reactive, read-only sorted view of an array without mutating the source
export function ordered<T>(source: T[], sortFn: (a: T, b: T) => number): { readonly value: T[] } | ReadonlyArray<T>;

import { form, $bind } from '@anchorlib/react';

// Creates a reactive form state and a reactive errors map from a Zod schema
export function form<T>(
  schema: any, // ZodSchema<T>
  initialState: T, 
  options?: { safeInit?: boolean; onChange?: (event: any) => void }
): [T, Record<keyof T, { message: string } | undefined>];

// Creates a 2-way data binding reference for an input element
export function $bind<T, K extends keyof T>(state: T, key: K): any;



// Reactive effect that tracks dependencies automatically
export function effect(fn: () => void | (() => void)): void;
effect.client = function(fn: () => void | (() => void)): void; // Browser only
effect.async = function(fn: () => Promise<void>): void;

// Restores tracking context across await gaps inside effect.async
export function awaited<T>(promise: Promise<T>): Promise<T>;

// Executes code without subscribing to reactive properties read within
export function untrack<T>(fn: () => T): T;

// Safely creates a non-reactive clone / safely stringifies without triggering getters
export function snapshot<T>(state: T, deep?: boolean): T;
export function stringify(state: any, replacer?: any, space?: any): string;

// Globally subscribes to all changes on an entire state tree
export function subscribe<T>(state: T, handler: (val: T, event: any) => void): () => void;

// Creates a reactive async operation container with built-in status and cancellation tracking
export function query<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  initialData: T,
  options?: { deferred?: boolean }
): {
  data: T;
  status: 'idle' | 'pending' | 'success' | 'error';
  error: Error | undefined;
  readonly promise: Promise<T>;
  start(initialDataOverride?: Partial<T>): void;
  abort(reason?: any): void;
};
```

### State: Supported Data Structures
The reactivity system supports standard JavaScript primitives and complex data structures natively. Primitives use a `.value` reference, while Objects, Arrays, Sets, and Maps are wrapped in transparent proxies that intercept standard JavaScript methods.

```tsx
import { mutable } from '@anchorlib/react';

// Primitives
const count = mutable(0);
count.value++; // Mutate primitive via .value

// Objects
const state = mutable({ user: { theme: 'dark' } });
state.user.theme = 'light'; // Mutate directly. No spread operators.

// Arrays
const list = mutable([1, 2, 3]);
list.push(4); // Native array methods trigger reactive updates

// Sets
const tags = mutable(new Set(['api']));
tags.add('ui'); // Native Set methods trigger reactive updates

// Maps
const cache = mutable(new Map());
cache.set('key', 'value'); // Native Map methods trigger reactive updates
```

### State: Computed Properties (Getters)
Derived logic is written natively using standard JavaScript Getters. The proxy automatically tracks dependencies and re-evaluates only when underlying data changes.

```typescript
import { mutable } from '@anchorlib/core';

export const cart = mutable({
  price: 10,
  quantity: 2,
  
  // Natively reactive computed property
  get total() {
    return this.price * this.quantity;
  }
});

console.log(cart.total); // 20
cart.price = 20; // Automatically invalidates and updates 'total'
```

### State: Composite Computation (Derived)
When a computed value depends on multiple *independent* state sources that do not share a common parent object, use `derived()`.

```typescript
import { mutable, derived } from '@anchorlib/core';

const todos = mutable([{ text: 'Buy milk', done: false }]);
const filter = mutable('SHOW_COMPLETED');

// The function is automatically tracked and re-evaluates when dependencies change
export const visibleTodos = derived(() => {
  if (filter.value === 'SHOW_COMPLETED') return todos.filter(t => t.done);
  return todos;
});

// Derived values are read-only primitives accessed via .value
console.log(visibleTodos.value);
```

### State: Reactive Sorting (`ordered`)
When maintaining sorted lists in a reactive system, calling `array.sort()` on every update triggers a full O(N log N) re-evaluation. The `ordered()` primitive solves this by maintaining a reactive sorted view using **binary search insertion**. When the source array updates, it computes the exact index to insert the new items in O(log N) time, preventing expensive full array re-sorts.

```typescript
import { mutable, ordered } from '@anchorlib/core';

const state = mutable({
  movies: [{ title: 'Zoolander' }, { title: 'Alien' }]
});

// Creates a reactive, read-only sorted view
// It automatically updates whenever the source array changes
const sortedMovies = ordered(state.movies, (a, b) => a.title.localeCompare(b.title));

console.log(sortedMovies); // [{ title: 'Alien' }, { title: 'Zoolander' }]
```

### State: Read/Write Segregation (Immutable)
When sharing fragile state (whether it is a global store or a parent passing state down to children), enforce a One-Way Data Flow by separating the read interface from the write interface. Use `immutable` for the public/shared state and `writable` for restricted mutations.

```typescript
import { immutable, writable } from '@anchorlib/core';

// Public Read-Only View
// Can be a global store OR a local state passed down to children
export const appState = immutable({
  status: 'idle',
  activeTasks: 0
});

// appState.status = 'busy'; // TS Error: Read-only. (Runtime: Framework safely ignores mutation)

// Least Privilege Write Contract
// Safely share a restricted writer that can ONLY modify 'status'
export const statusControl = writable(appState, ['status']);

// Direct Usage
statusControl.status = 'busy'; // Works natively
```

### State: Form Validation ($bind)
The `form` primitive combines deeply reactive state with zero-boilerplate Zod validation. The `$bind` utility safely wires the state directly to input fields for two-way data binding.

```tsx
import { setup, render, form, $use, $bind } from '@anchorlib/react';
import { z } from 'zod';
import { TextInput } from './ui.js'; // Reusable component accepting value/error props

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Too short'),
});

export const LoginForm = setup(() => {
  // state is deeply mutable. errors map updates automatically when state mutates.
  const [state, errors] = form(LoginSchema, { email: '', password: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (LoginSchema.safeParse(state).success) console.log("Valid!", state);
  };

  return render(() => (
    <form onSubmit={submit}>
      {/* 2-way binding automatically mutates state and triggers validation */}
      <TextInput 
        label="Email" 
        value={$bind(() => state, 'email')} 
        error={$use(() => errors.email)} 
      />
      <TextInput 
        label="Password" 
        type="password"
        value={$bind(() => state, 'password')} 
        error={$use(() => errors.password)} 
      />
      <button type="submit">Login</button>
    </form>
  ));
});
```


### State: Side Effects (`effect`)
Effects run immediately and automatically re-run whenever synchronously accessed state properties change. No dependency arrays are required.

**Standard Synchronous Effect**
```typescript
import { mutable, effect } from '@anchorlib/react';

const state = mutable({ count: 0 });

effect(() => {
  // Automatically tracks state.count
  console.log('Count changed:', state.count);
});
```

**Browser-Only Side Effects**
Effects that access browser APIs (`window`, `document`) require execution limits for SSR compatibility. Use `effect.client()` or gate a standard effect with `if (isBrowser)`.

```typescript
import { mutable, effect } from '@anchorlib/react';

const state = mutable({ query: '(max-width: 768px)', matches: false });

effect.client(() => {
  const media = window.matchMedia(state.query);
  state.matches = media.matches;

  const listener = (e: MediaQueryListEvent) => {
    state.matches = e.matches;
  };
  
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
});
```

```typescript
import { mutable, effect } from '@anchorlib/react';

const state = mutable({ query: '(max-width: 768px)', matches: false });

if (typeof window !== 'undefined') {
  effect(() => {
    const media = window.matchMedia(state.query);
    state.matches = media.matches;

    const listener = (e: MediaQueryListEvent) => {
      state.matches = e.matches;
    };
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  });
}
```

**Async Context Preservation**
Requires `awaited()` to preserve the reactive tracking context across asynchronous boundaries.
```typescript
import { mutable, effect, awaited } from '@anchorlib/react';

const state = mutable({ theme: 'dark', count: 0 });

effect(async () => {
  console.log(state.theme); // Tracked properly before the gap
  
  await awaited(fetch('https://3rd.api.com/status')); // Boundary preserved
  
  console.log(state.count); // Tracked properly after the gap
});
```

### State: Tracking Escapes (`untrack` & `stringify`)
Anchor tracks every property read inside an effect. Avoid over-subscribing when performing reads (like `JSON.stringify()`) that shouldn't trigger updates.

```tsx
import { effect, untrack, snapshot, stringify } from '@anchorlib/react';

effect(() => {
  const trigger = state.trigger; // Explicitly track this to trigger the effect

  // Execute code without subscribing to dependencies
  const hidden = untrack(() => state.hiddenValue);

  // snapshot() creates a non-reactive clone
  const safeJsonClone = JSON.stringify(snapshot(state));
  
  // stringify() serializes directly without tracking
  const safeJsonDirect = stringify(state);
});
```

### State: Global Observation (`subscribe`)
To monitor an entire state tree for any mutations (e.g., for global persistence or logging) without manually accessing every property, use `subscribe` instead of `effect`.

```typescript
import { subscribe } from '@anchorlib/core';

// Triggers on ANY change to 'user' or its nested children
subscribe(userState, (val, event) => {
  console.log('State mutated:', event);
});
```

### State: Async Operations (`query`)
The `query` primitive creates a reactive container for **any async operation** (e.g., 3rd-party SDKs, Web Workers, external fetch) with built-in status tracking and `AbortSignal` support.

```tsx
import { setup, render, query } from '@anchorlib/react';
import { stripe } from '../stripe.js'; // 3rd-party SDK

export const DashboardWidget = setup(() => {
  // Example A: 3rd-Party SDK (e.g., Stripe, Supabase, Firebase)
  const customer = query(
    async () => {
      return await stripe.customers.retrieve('cus_123');
    },
    { id: '', email: '' } 
  );

  // Example B: 3rd-Party REST call with AbortSignal (External)
  const weather = query(
    async (signal) => {
      const res = await fetch(`https://3rd.api.com/weather`, { signal });
      return res.json();
    },
    { temp: 0, conditions: '' }
  );

  return render(() => (
    <div>
      {/* Both render safely with no optional chaining needed! */}
      {customer.status === 'success' && <p>Customer: {customer.data.email}</p>}
      {weather.status === 'success' && <p>Weather: {weather.data.temp}°C</p>}
    </div>
  ));
});
```

### State: Deferred Execution (Mutations)
Queries executing side-effects or mutations should be deferred so they only run when explicitly triggered by an event.

```tsx
import { setup, render, mutable, query } from '@anchorlib/react';
import { stripe } from '../stripe.js'; // 3rd-party SDK

export const CreateUserForm = setup(() => {
  const formState = mutable({ email: 'john@example.com' });

  const submitMutation = query(
    async () => {
      // Wrap SDK mutations
      return await stripe.customers.create(formState);
    },
    { id: '' },
    { deferred: true } // Starts 'idle', prevents immediate execution
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.start(); // Trigger the mutation
  };

  return render(() => (
    <form onSubmit={handleSubmit}>
      <button disabled={submitMutation.status === 'pending'}>
        {submitMutation.status === 'pending' ? 'Saving...' : 'Create User'}
      </button>
      {submitMutation.status === 'success' && <span>Saved!</span>}
    </form>
  ));
});
```

### State: Promise Integration
Queries expose a `.promise` property that perfectly bridges the reactive system with standard async/await flows. This is essential for Server-Side Rendering (SSR) route loaders or IRPC handlers that must wait for data before responding.

```typescript
import { query } from '@anchorlib/core';

// E.g., inside a Route Provider or IRPC Handler
export async function loadUserData() {
  const user = query(
    async (signal) => {
      const res = await fetch('https://3rd.api.com/user', { signal });
      return res.json();
    },
    { name: '' }
    // Executes immediately (not deferred)
  );
  
  // Safely await the active operation before proceeding
  await user.promise; 
  
  // Return the resolved data for the server response
  return user.data;
}
```

### State: Advanced Scoping
Choosing the right scope aligns your state with the application lifecycle.

### Static Configuration
For read-only data that never changes, use plain JavaScript constants.

```typescript
export const appConfig = { version: '1.0', apiUrl: 'https://api.example.com' };
```

### CSR-Only Applications (SPAs)
For strictly Client-Side Rendered (CSR) applications without SSR capabilities, module-level state acts as a safe global singleton.

```typescript
import { mutable } from '@anchorlib/core';

export const uiState = mutable({ sidebarOpen: false });
```

### SSR-Capable Applications
For Server-Side Rendered (SSR) applications, state must be isolated per-request. Inject the state at the root layout and retrieve it where needed using the Context API.

```tsx
import { setContext, getContext, mutable } from '@anchorlib/react';

// Define the scope
export function createAppState() {
  return mutable({ theme: 'dark', user: null });
}

// Inject at root
export const RootLayout = setup(() => {
  setContext('appState', createAppState());
  return render(() => <div>...</div>);
});

// Consume in children
export const ThemeToggle = setup(() => {
  const state = getContext<ReturnType<typeof createAppState>>('appState');
  return render(() => <button onClick={() => state.theme = 'light'}>Toggle</button>);
});
```


### Local State (Component Scope)
State created inside a component `setup` is automatically garbage collected when the component's scope is disposed. It is natively SSR-safe and completely isolated.

```tsx
import { setup, render, mutable } from '@anchorlib/react';

export const LocalCounter = setup(() => {
  const local = mutable({ count: 0 });

  return render(() => (
    <button onClick={() => local.count++}>
      Count: {local.count}
    </button>
  ));
});
```
