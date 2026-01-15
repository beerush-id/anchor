# Anchor for Svelte - AI Knowledge Base

Reference for AI assistants to build robust Svelte applications using Anchor.

## Core Concepts

### What is Anchor for Svelte?

Anchor is a state management library for Svelte 5 that provides:
- **Direct Mutation**: Mutate state directly while maintaining reactivity (like runes)
- **Schema Validation**: Runtime validation with Zod for data integrity
- **Async State Management**: Built-in `query()`, `fetchState()`, `streamState()` with status tracking
- **Form Handling**: `form()` with automatic validation and error tracking
- **Immutability Patterns**: `immutable()` + `writable()` for controlled shared state access
- **Advanced Patterns**: `persistent()`, `session()`, `undoable()`, `snapshot()`
- **Portability**: Business logic written with `@anchorlib/core` is framework-agnostic and can be shared across React, SolidJS, Svelte, or vanilla JS

While Svelte 5 runes (`$state()`) provide direct mutation for reactive state, Anchor adds validation, async handling, advanced state management patterns, and portability. Use runes for simple reactive state, use Anchor when you need more or when building reusable business logic that might be used in other frameworks.

### Integration with Svelte

- Works with standard Svelte components
- Proper cleanup when components are destroyed
- No additional providers or setup required
- Full compatibility with Svelte's component lifecycle
- Integrates seamlessly with Svelte's `bind:` directives

## State Management

### 1. Mutable State

**Use for**: Local component state, direct mutations

```svelte
<script>
import { mutable } from '@anchorlib/svelte';

// Objects
const user = mutable({ name: 'John', age: 30 });
user.age++; // Direct mutation triggers updates

// Arrays
const todos = mutable([]);
todos.push({ text: 'New', done: false }); // Works perfectly

// Primitives (use .value)
const count = mutable(0);
count.value++;

// With methods (encapsulation)
const cart = mutable({
  items: [],
  add(product) { this.items.push(product); },
  get total() { return this.items.reduce((sum, i) => sum + i.price, 0); }
});
</script>
```

**Configuration**:
```svelte
<script>
import { z } from 'zod';

const state = mutable({ ... }, {
  schema: z.object({ ... }), // Zod validation
  recursive: true // true (default) | false | 'flat'
});
</script>
```

**Computed Properties** (using getters):
```svelte
<script>
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});

console.log(cart.total); // 20
cart.price = 20;
console.log(cart.total); // 40
</script>
```

### 2. Immutable State

**Use for**: Shared/global state, controlled access

```ts
// store.ts
import { immutable, writable } from '@anchorlib/svelte';

// Public: Read-only
export const userState = immutable({ name: 'John', role: 'Admin' });

// Private: Full write access
export const userControl = writable(userState);
userControl.name = 'Jane'; // Works

// Restricted: Only specific keys
export const themeControl = writable(userState, ['theme']);
themeControl.theme = 'dark'; // Works
themeControl.name = 'X'; // Error!
```

**Best Practice**: Always prefer `immutable` + `writable` for shared state to enforce clear contracts.

### 3. Derived State

**Use for**: Computed values across multiple reactive sources

```svelte
<script>
import { mutable, derived } from '@anchorlib/svelte';

const count = mutable(1);
const count2 = mutable(5);
const counter = mutable({ count: 3 });

// Derived state that automatically updates when dependencies change
const total = derived(() => count.value + count2.value + counter.count);

console.log(total.value); // 9
count.value++;
console.log(total.value); // 10
</script>
```

**Intrinsic (within object)** - Use getters:
```svelte
<script>
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
</script>
```

**Composite (across objects)** - Use `derived()`:
```svelte
<script>
const todos = mutable([...]);
const filter = mutable('all');

const visibleTodos = derived(() => {
  if (filter.value === 'completed') return todos.filter(t => t.done);
  return todos;
});
</script>
```

### 4. Form State with Validation

**Use for**: Forms with schema validation and automatic error tracking

```svelte
<script>
import { form } from '@anchorlib/svelte';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  age: z.number().min(18),
});

const [state, errors] = form(schema, {
  email: '',
  password: '',
  age: 0,
});

const submit = (e) => {
  e.preventDefault();
  const result = schema.safeParse(state);
  if (result.success) {
    api.signup(result.data);
  }
};
</script>

<form onsubmit={submit}>
  <input bind:value={state.email} />
  {#if errors.email}
    <span class="error">{errors.email.message}</span>
  {/if}
  
  <input type="password" bind:value={state.password} />
  {#if errors.password}
    <span class="error">{errors.password.message}</span>
  {/if}
  
  <button type="submit">Sign Up</button>
</form>
```

**Options:**
```svelte
<script>
const [state, errors] = form(schema, init, {
  onChange: (event) => console.log('Changed:', event),
  safeInit: false, // Show validation errors on initial render
});
</script>
```

## Component Architecture

### Standard Svelte Components

Anchor works with **standard Svelte components**. No special wrappers needed.

```svelte
<script>
import { mutable } from '@anchorlib/svelte';

const state = mutable({ count: 0 });
</script>

<div>
  <h1>Count: {state.count}</h1>
  <button onclick={() => state.count++}>Increment</button>
</div>
```

### Global State

State declared outside components is shared globally:

```ts
// store.ts
import { mutable } from '@anchorlib/svelte';

// Global state
export const counter = mutable({ count: 0 });
```

```svelte
<!-- Counter.svelte -->
<script>
import { counter } from './store';
</script>

<div>
  <h1>Counter: {counter.count}</h1>
  <button onclick={() => counter.count++}>Increment</button>
</div>
```

**⚠️ SSR Warning**: Module-level state is shared across all requests in SSR environments. Use Svelte context for request-scoped state.

### Headless State (Reusable Logic)

Separate business logic from UI using factory functions or classes:

**Factory Function**:
```ts
// stores/counter.ts
import { mutable } from '@anchorlib/svelte';

export function createCounter() {
  return mutable({
    count: 0,
    increment() { this.count++; },
    decrement() { this.count--; }
  });
}
```

```svelte
<!-- Usage -->
<script>
import { createCounter } from './stores/counter';

const counter = createCounter();
</script>

<button onclick={() => counter.increment()}>{counter.count}</button>
```

**Class Pattern**:
```ts
import { mutable } from '@anchorlib/svelte';

export class TabState {
  public active = 'home';
  
  setActive(tab: string) {
    this.active = tab;
  }
}

export function createTab(active?: string) {
  return mutable(new TabState(active));
}
```

## Two-Way Data Binding

### Using Svelte's Native Binding

Svelte's `bind:` directive works perfectly with Anchor state:

```svelte
<script>
import { mutable } from '@anchorlib/svelte';

const user = mutable({
  name: 'John',
  email: 'john@example.com',
  age: 30
});
</script>

<input bind:value={user.name} />
<input bind:value={user.email} />
<input type="number" bind:value={user.age} />

<p>Name: {user.name}</p>
<p>Email: {user.email}</p>
<p>Age: {user.age}</p>
```

### Binding to Nested Properties

```svelte
<script>
const state = mutable({
  user: {
    profile: {
      name: 'John'
    }
  }
});
</script>

<!-- Direct binding to nested properties -->
<input bind:value={state.user.profile.name} />
```

### Checkbox and Radio Bindings

```svelte
<script>
const todo = mutable({ done: false, text: 'Task 1' });
const settings = mutable({ theme: 'dark' });
</script>

<!-- Checkbox -->
<input type="checkbox" bind:checked={todo.done} />

<!-- Radio -->
<input type="radio" bind:group={settings.theme} value="light" />
<input type="radio" bind:group={settings.theme} value="dark" />
```

## Async Handling

### 1. Query State

**Use for**: General async operations with full control

```svelte
<script>
import { query } from '@anchorlib/svelte';

const user = query(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { name: 'Guest' }); // Initial data
</script>

{#if user.status === 'pending'}
  <p>Loading...</p>
{:else if user.status === 'error'}
  <p>Error: {user.error?.message}</p>
{:else if user.status === 'success'}
  <p>Hello, {user.data.name}!</p>
{/if}
```

**Features**:
- **Auto-Status**: `status` property ('idle' | 'pending' | 'success' | 'error')
- **Auto-Cancellation**: Aborts previous request if a new one starts
- **Manual Cancellation**: Call `.abort()` to cancel
- **Signal Passing**: Passes `AbortSignal` to async function

**Deferred Execution**:
```svelte
<script>
const userQuery = query(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  undefined,
  { deferred: true }
);

// Later, when ready
userQuery.start();
</script>
```

**Re-fetching**:
```svelte
<script>
const dataQuery = query(fetchData, []);

// Refresh the data
function refresh() {
  dataQuery.start(); // Cancels previous request automatically
}
</script>
```

### 2. Fetch State

**Use for**: HTTP requests with automatic response handling

```svelte
<script>
import { fetchState } from '@anchorlib/svelte';

const userState = fetchState(
  { name: '', email: '' },
  { url: '/api/user' }
);

// POST request
const createUser = fetchState(
  null,
  {
    url: '/api/users',
    method: 'POST',
    body: { name: 'John', email: 'john@example.com' }
  }
);

// Dynamic requests
const dataState = fetchState(
  null,
  { url: '/api/data', deferred: true }
);

dataState.fetch({
  url: '/api/data/123',
  headers: { 'Authorization': 'Bearer token' }
});
</script>
```

### 3. Stream State

**Use for**: Streaming responses that arrive in chunks

```svelte
<script>
import { streamState } from '@anchorlib/svelte';

const chatStream = streamState(
  '',
  { url: '/api/chat/stream' }
);

// Data updates incrementally as chunks arrive
console.log(chatStream.data);
</script>
```

**Transform Function**:
```svelte
<script>
const logStream = streamState(
  [],
  {
    url: '/api/logs/stream',
    transform: (current, chunk) => {
      return [...current, chunk];
    }
  }
);
</script>
```

### Promise Integration

All async state functions expose a `.promise` property:

```svelte
<script>
const userQuery = query(fetchUser);
await userQuery.promise;
console.log('User loaded:', userQuery.data);
</script>
```

## Reactivity System

### Effects

**Use for**: Side effects that respond to Anchor state changes

**Important**: Anchor's `effect()` **only tracks Anchor state** (created with `mutable()`, `immutable()`, `derived()`, etc.). It **cannot track Svelte stores**. For Svelte stores, use `$:` reactive statements instead.

```svelte
<script>
import { mutable, effect } from '@anchorlib/svelte';
import { writable } from 'svelte/store';

const anchorState = mutable({ count: 0 });
const svelteStore = writable(0);

// ✅ Works: Tracks Anchor state
effect(() => {
  console.log('Anchor count:', anchorState.count);
});

// ❌ Won't work: Cannot track Svelte stores
effect(() => {
  console.log('Store:', $svelteStore); // Will NOT re-run when store changes
});

// ✅ Use Svelte reactive statements for stores
$: console.log('Store:', $svelteStore); // Works correctly
</script>
```

**Basic Usage**:
```svelte
<script>
const state = mutable({ count: 0 });

effect(() => {
  console.log('Count:', state.count); // Tracks state.count
  // Re-runs when state.count changes
});

// With cleanup
effect(() => {
  const id = setInterval(() => console.log('Tick'), state.delay);
  return () => clearInterval(id); // Cleanup on re-run or unmount
});
</script>
```

**Dynamic Tracking**:
```svelte
<script>
effect(() => {
  if (state.showDetails) {
    console.log(state.details); // Only tracks when showDetails is true
  }
});
</script>
```

**Untracking**:
```svelte
<script>
import { untrack } from '@anchorlib/svelte';

effect(() => {
  const content = doc.content; // Tracked
  const endpoint = untrack(() => settings.saveUrl); // Not tracked
  
  untrack(() => {
    fetch(endpoint, { body: content }); // No tracking inside
  });
});
</script>
```

**Snapshots**:
```svelte
<script>
import { snapshot } from '@anchorlib/svelte';

effect(() => {
  if (state.query) {
    const copy = snapshot(state); // Deep clone, not reactive
    const json = JSON.stringify(copy); // Safe
  }
});
</script>
```

### Subscribe (Global Observability)

**Use for**: Listening to any change in an object

```svelte
<script>
import { subscribe } from '@anchorlib/svelte';

subscribe(user, (val, event) => {
  console.log('Changed:', event);
}, true); // recursive = true (default)
</script>
```

## Lifecycle

### onMount

**Use for**: DOM access, 3rd-party libs, animations

```svelte
<script>
import { onMount } from 'svelte';

let inputRef;

onMount(() => {
  inputRef?.focus();
});
</script>

<input bind:this={inputRef} />
```

### onDestroy

**Use for**: Cleanup when component unmounts

```svelte
<script>
import { onDestroy } from 'svelte';

const handleResize = () => console.log('Resized');

window.addEventListener('resize', handleResize);

onDestroy(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<div>Component</div>
```

## Advanced Patterns

### State Persistence

**Use for**: Syncing state with localStorage or sessionStorage

```svelte
<script>
import { persistent, session } from '@anchorlib/svelte/storage';

// Persists to localStorage (survives restart)
const settings = persistent('app-settings', { 
  theme: 'dark' 
});

// Persists to sessionStorage (tab session only)
const draft = session('form-draft', { 
  title: '' 
});
</script>
```

### State Serialization

**Use for**: Safely serializing reactive state

```svelte
<script>
import { stringify } from '@anchorlib/core';

const state = mutable({
  user: { name: 'John', age: 30 },
  todos: [{ text: 'Task 1', done: false }],
});

// ❌ Don't use JSON.stringify() - subscribes to all properties
// const json = JSON.stringify(state);

// ✅ Use stringify() - reads without subscribing
const json = stringify(state);

// Save to localStorage safely
localStorage.setItem('app-state', stringify(state));
</script>
```

### Optimistic UI

**Use for**: UI updates that can be undone

```svelte
<script>
import { undoable } from '@anchorlib/svelte';

const handleClick = () => {
  const [rollback, settled] = undoable(() => {
    props.liked = !props.liked;
  });
  
  updateLike(props.liked).then(settled).catch(rollback);
};
</script>

<button onclick={handleClick}>
  {props.liked ? 'Unlike' : 'Like'}
</button>
```

## Svelte Integration

### Control Flow

Use Svelte's built-in control flow for conditional rendering and lists:

**Conditional rendering**:
```svelte
{#if user.isLoggedIn}
  <Dashboard {user} />
{:else}
  <Login />
{/if}
```

**List rendering**:
```svelte
<script>
const todos = mutable([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: true },
]);
</script>

<ul>
  {#each todos as todo}
    <li>
      <input
        type="checkbox"
        bind:checked={todo.done}
      />
      {todo.text}
    </li>
  {/each}
</ul>
```

**Multiple conditions**:
```svelte
{#if status === 'loading'}
  <Spinner />
{:else if status === 'error'}
  <Error />
{:else if status === 'success'}
  <Content />
{/if}
```

**Await blocks**:
```svelte
{#await user.promise}
  <Loading />
{:then data}
  <p>Hello, {data.name}!</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

## TypeScript

```svelte
<script lang="ts">
import type { Bindable, BindableProp } from '@anchorlib/svelte';

// Component with props
interface Props {
  value: number;
  onChange?: (val: number) => void;
}

const { value, onChange }: Props = $props();

// Mutable with type
const state = mutable<{ count: number }>({ count: 0 });

// Query with type
interface User {
  name: string;
  email: string;
}

const userQuery = query<User>(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { name: '', email: '' });
</script>
```

## Best Practices

### 1. Encapsulate Logic with Data

Group related data and behavior together in objects:

```svelte
<script>
const todoApp = mutable({
  newText: '',
  todos: [],
  addTodo() {
    this.todos.push({ text: this.newText });
    this.newText = '';
  }
});
</script>
```

### 2. Direct Mutations

Direct property updates:

```svelte
<script>
// ✅ Logic-Driven
user.age++;
todos.push(newItem);
</script>
```

### 3. Automatic Dependency Tracking

Effects automatically track dependencies - no manual arrays needed:

```svelte
<script>
effect(() => {
  fetchUser(state.userId).then(d => state.data = d);
}); // Automatically tracks state.userId
</script>
```

### 4. Use bind: for Forms

```svelte
<script>
const state = mutable({
  email: '',
  password: '',
});
</script>

<form>
  <input bind:value={state.email} />
  <input type="password" bind:value={state.password} />
  <button type="submit">Sign Up</button>
</form>
```

### 5. Computed Properties with Getters

Use JavaScript getters for derived values within objects:

```svelte
<script>
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
</script>
```

### 6. Prefer Immutable for Shared State

Use `immutable()` + `writable()` for controlled access to shared state:

```ts
// Public: Read-only
export const state = immutable({ count: 0 });

// Private: Write contract
export const stateControl = writable(state);
```

## Common Pitfalls

### ❌ Using Module-Level State in SSR

```ts
// ⚠️ SSR Risk: Shared across all requests!
export const appState = mutable({ theme: 'dark' });
```

**Fix**: Use Svelte context for request-scoped state in SSR.

### ❌ Not Using Initial Data for Queries

```svelte
<script>
// ❌ Requires defensive checks
const user = query(fetchUser);
console.log(user.data?.name); // Need optional chaining

// ✅ Safe to access immediately
const user = query(fetchUser, { name: '', email: '' });
console.log(user.data.name); // Always works
</script>
```

### ❌ Using effect() with Svelte Stores

```svelte
<script>
import { effect } from '@anchorlib/svelte';
import { writable } from 'svelte/store';

const count = writable(0);

// ❌ Won't work: effect() cannot track Svelte stores
effect(() => {
  console.log($count); // Will NOT re-run when store changes
});

// ✅ Use Svelte reactive statements for stores
$: console.log($count); // Works correctly

// ✅ Use Anchor effect only for Anchor state
const anchorState = mutable({ count: 0 });
effect(() => {
  console.log(anchorState.count); // Works correctly
});
</script>
```

### ❌ Using JSON.stringify() on Reactive State

```svelte
<script>
// ❌ Subscribes to all properties
const json = JSON.stringify(state);

// ✅ Use stringify() instead
import { stringify } from '@anchorlib/core';
const json = stringify(state);
</script>
```

## Quick Reference

### Imports

```svelte
<script>
import {
  // State
  mutable, immutable, writable, derived,
  
  // Async
  query, fetchState, streamState,
  
  // Form
  form,
  
  // Reactivity
  effect, untrack, snapshot, subscribe,
  
  // Utils
  undoable
} from '@anchorlib/svelte';

// Storage (separate)
import { persistent, session } from '@anchorlib/svelte/storage';

// Utils (separate)
import { stringify } from '@anchorlib/core';

// Types
import type { Bindable, BindableProp } from '@anchorlib/svelte';

// Svelte
import { onMount, onDestroy } from 'svelte';
import { writable } from 'svelte/store';
</script>
```

### Decision Trees

**State Type**:
- Local component state → `mutable()`
- Shared state → `immutable()` + `writable()`
- Computed value (same object) → getter
- Computed value (cross-object) → `derived()`
- Form with validation → `form()`

**Async Operations**:
- General async → `query()`
- HTTP requests → `fetchState()`
- Streaming → `streamState()`

**When to Use**:
- `effect()` → Side effects for Anchor state only (use `$:` for Svelte stores)
- `onMount` → DOM access after mount (Svelte)
- `onDestroy` → Cleanup on unmount (Svelte)
- `bind:value` → Two-way binding
- `untrack` → Read without subscribing
- `persistent()` → localStorage sync
- `session()` → sessionStorage sync

## Performance Optimization

1. **Use `derived()` for cross-object computations** - Auto-cached
2. **Use getters for derived state within objects** - Auto-cached
3. **Use `untrack` for expensive reads** - Avoid over-subscription
4. **Use Svelte control flow** - `{#if}`, `{#each}`, `{#await}`
5. **Provide initial data for queries** - Avoid undefined states
6. **Use `bind:` for forms** - Native Svelte two-way binding

## Key Principles for AI

1. **Use standard Svelte components** - No special wrappers needed
2. **Use `bind:` for two-way binding** - Svelte's native binding works with Anchor
3. **Use Svelte control flow** - `{#if}`, `{#each}`, `{#await}`
4. **Use `mutable()` for local state** - Direct mutation works
5. **Use `immutable()` + `writable()` for shared state** - Enforce contracts
6. **Use getters for computed properties** - Within same object
7. **Use `derived()` for cross-object computations** - Across multiple sources
8. **Use `query()` for async operations** - Built-in status tracking
9. **Use `form()` for forms with validation** - Automatic error tracking
10. **Provide initial data for queries** - Avoid undefined states
11. **Use `effect()` for Anchor state side effects** - Only tracks Anchor state, not Svelte stores
12. **Use `$:` for Svelte stores** - Anchor's `effect()` cannot track stores

## Success Checklist

- [ ] Using standard Svelte components
- [ ] State uses `mutable()` or `immutable()`
- [ ] Two-way binding uses `bind:value` or `bind:checked`
- [ ] Conditional rendering uses `{#if}`
- [ ] List rendering uses `{#each}`
- [ ] Async operations use `query()`, `fetchState()`, or `streamState()`
- [ ] Forms use `form()` with Zod schema
- [ ] Effects use `effect()` for automatic tracking
- [ ] Shared state uses `immutable()` + `writable()`
- [ ] Computed properties use getters or `derived()`
