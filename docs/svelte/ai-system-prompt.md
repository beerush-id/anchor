# Anchor for Svelte - AI System Prompt

You are building Svelte applications using Anchor, a state management library that enables direct mutation with reactivity. Follow these directives.

---

## Core Directives

### 1. State Creation

**ALWAYS** choose state type based on scope and mutability:

```svelte
<script>
import { mutable, immutable, writable, derived, form } from '@anchorlib/svelte';

// Local mutable state - DEFAULT choice
const state = mutable({ count: 0 });
state.count++; // Direct mutation works

// Primitives - use .value
const count = mutable(0);
count.value++;

// Shared state - use immutable + writable pattern
export const state = immutable({ user: null, theme: 'dark', count: 0 });

// Full write access - can modify all properties
export const fullControl = writable(state);
fullControl.user = { name: 'John' }; // ✅ Works
fullControl.theme = 'light'; // ✅ Works

// Limited write access - ONLY specific keys
export const themeControl = writable(state, ['theme']); // Second param = allowed keys
themeControl.theme = 'light'; // ✅ Works
themeControl.user = { name: 'Jane' }; // ❌ Error! Not in allowed keys

// Computed (same object) - use getters
const cart = mutable({
  price: 10,
  qty: 2,
  get total() { return this.price * this.qty; }
});

// Computed (cross-object) - use derived()
const total = derived(() => count1.value + count2.value);

// Forms with validation - use form()
const [state, errors] = form(schema, { email: '', password: '' });
</script>
```

**DECISION TREE**:
- Local component state → `mutable()`
- Shared/global state → `immutable()` + `writable()`
- Computed (intrinsic) → JavaScript getter
- Computed (composite) → `derived()`
- Forms with validation → `form()`

---

### 2. Component Architecture

**Anchor works with normal Svelte components - NO special wrappers required.**

```svelte
<script>
import { mutable } from '@anchorlib/svelte';

// ✅ Normal component - just use mutable() directly
const state = mutable({ count: 0 });
</script>

<button onclick={() => state.count++}>{state.count}</button>
```

**RULES**:
- Standard components: NO wrapper needed
- Direct mutation in event handlers works
- Reactive statements (`$:`) work with Anchor state

---

### 3. Async Operations

**ALWAYS** use the appropriate async primitive:

```svelte
<script>
import { query, fetchState, streamState } from '@anchorlib/svelte';

// General async - query()
const user = query(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  { name: '' } // ALWAYS provide initial data
);

// HTTP requests - fetchState()
const data = fetchState({ items: [] }, { url: '/api/data' });

// Streaming - streamState()
const stream = streamState('', { url: '/api/stream' });
</script>

<!-- Status handling -->
{#if user.status === 'pending'}
  <p>Loading...</p>
{:else if user.status === 'error'}
  <p>Error: {user.error?.message}</p>
{:else if user.status === 'success'}
  <p>Hello, {user.data.name}!</p>
{/if}
```

**DECISION TREE**:
- General async → `query()`
- HTTP requests → `fetchState()`
- Streaming → `streamState()`

**CRITICAL**: ALWAYS provide initial data to avoid undefined states.

---

### 4. Reactivity

**CRITICAL DISTINCTION**:
- `effect()` - ONLY tracks Anchor state (mutable, immutable, derived)
- Svelte reactive statements (`$:`) - Track Svelte stores and Anchor state

```svelte
<script>
import { mutable, effect } from '@anchorlib/svelte';
import { writable } from 'svelte/store';

const anchorState = mutable({ count: 0 });
const svelteStore = writable(0);

// ✅ Anchor state - use effect()
effect(() => {
  console.log('Anchor count:', anchorState.count); // Tracks correctly
});

// ✅ Svelte stores - use reactive statements
$: console.log('Store:', $svelteStore); // Tracks correctly

// ❌ NEVER use effect() with Svelte stores
effect(() => {
  console.log('Store:', $svelteStore); // Will NOT track!
});
</script>
```

**RULES**:
- Anchor state side effects → `effect()`
- Svelte store side effects → `$:` reactive statements
- Read without tracking → `untrack()`
- Deep clone → `snapshot()`

---

### 5. Control Flow

**ALWAYS** use Svelte control flow directives:

```svelte
<!-- Conditional -->
{#if user.isLoggedIn}
  <Dashboard />
{:else}
  <Login />
{/if}

<!-- Lists -->
{#each todos as todo}
  <TodoItem {todo} />
{/each}

<!-- Multiple conditions -->
{#if status === 'loading'}
  <Spinner />
{:else if status === 'error'}
  <Error />
{:else if status === 'success'}
  <Content />
{/if}
```

**Use Svelte's native control flow** - `{#if}`, `{#each}`, `{#await}`.

---

### 6. Forms

**ALWAYS** use `form()` for validated forms:

```svelte
<script>
import { form } from '@anchorlib/svelte';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
});

const [state, errors] = form(schema, { email: '', password: '' });
</script>

<form>
  <input 
    bind:value={state.email}
  />
  {#if errors.email}
    <span>{errors.email.message}</span>
  {/if}
  
  <input 
    type="password"
    bind:value={state.password}
  />
  {#if errors.password}
    <span>{errors.password.message}</span>
  {/if}
</form>
```

**RULES**:
- Define Zod schema first
- Use `form()` to create state + errors
- Use `bind:value` for two-way binding
- Use `{#if}` for error display

---

### 7. Imports

```svelte
<script>
// Core state
import { 
  mutable, immutable, writable, derived,
  query, fetchState, streamState,
  form,
  effect, untrack, snapshot, subscribe,
  undoable
} from '@anchorlib/svelte';

// Storage (separate)
import { persistent, session } from '@anchorlib/svelte/storage';

// Utils (separate)
import { stringify } from '@anchorlib/core';

// Types
import type { Bindable, BindableProp } from '@anchorlib/svelte';
</script>
```

---

## Pattern Templates

### Todo App Pattern

```svelte
<script>
import { mutable } from '@anchorlib/svelte';

const state = mutable({
  todos: [],
  newText: '',
  
  addTodo() {
    this.todos.push({ id: Date.now(), text: this.newText, done: false });
    this.newText = '';
  },
  
  removeTodo(id) {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx !== -1) this.todos.splice(idx, 1);
  },
  
  get completedCount() {
    return this.todos.filter(t => t.done).length;
  }
});
</script>

<div>
  <input bind:value={state.newText} />
  <button onclick={() => state.addTodo()}>Add</button>
  
  {#each state.todos as todo}
    <div>
      <input 
        type="checkbox"
        bind:checked={todo.done}
      />
      {todo.text}
      <button onclick={() => state.removeTodo(todo.id)}>Delete</button>
    </div>
  {/each}
  
  <p>Completed: {state.completedCount}</p>
</div>
```

### Form Pattern

```svelte
<script>
import { form } from '@anchorlib/svelte';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const [state, errors] = form(schema, { email: '', password: '' });

const submit = (e) => {
  e.preventDefault();
  const result = schema.safeParse(state);
  if (result.success) api.signup(result.data);
};
</script>

<form onsubmit={submit}>
  <input bind:value={state.email} />
  {#if errors.email}<span>{errors.email.message}</span>{/if}
  
  <input type="password" bind:value={state.password} />
  {#if errors.password}<span>{errors.password.message}</span>{/if}
  
  <button type="submit">Sign Up</button>
</form>
```

### Async Data Pattern

```svelte
<script>
import { query } from '@anchorlib/svelte';

const user = query(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  { name: '', email: '' } // Initial data
);
</script>

{#if user.status === 'pending'}
  <Spinner />
{:else if user.status === 'error'}
  <Error error={user.error} />
{:else if user.status === 'success'}
  <div>
    <h1>{user.data.name}</h1>
    <p>{user.data.email}</p>
  </div>
{/if}
```

### Global State Pattern

```ts
// store.ts
import { immutable, writable } from '@anchorlib/svelte';

export const userState = immutable({ 
  name: '', 
  email: '', 
  isLoggedIn: false 
});

export const userControl = writable(userState);
```

```svelte
<!-- Profile.svelte -->
<script>
import { userState, userControl } from './store';
</script>

<div>
  <h1>{userState.name}</h1>
  <button onclick={() => userControl.isLoggedIn = false}>Logout</button>
</div>
```

---

## Critical Rules

1. **NEVER** use `effect()` with Svelte stores - use `$:` reactive statements
2. **ALWAYS** provide initial data for `query()`, `fetchState()`, `streamState()`
3. **ALWAYS** use `bind:value` for form inputs with Anchor state
4. **NEVER** use JSON.stringify on reactive state - use `stringify()` from `@anchorlib/core`
5. **ALWAYS** use Svelte control flow (`{#if}`, `{#each}`, `{#await}`)
6. **ALWAYS** use `immutable()` + `writable()` for shared/global state
7. **ALWAYS** use getters for computed properties within same object
8. **ALWAYS** use `derived()` for computed values across multiple objects
9. **NEVER** use module-level state in SSR - use Svelte context
10. **ALWAYS** use `bind:` directive for two-way binding in Svelte

---

## Quick Decision Matrix

| Need | Use |
|------|-----|
| Local state | `mutable()` |
| Shared state | `immutable()` + `writable()` |
| Computed (same object) | JavaScript getter |
| Computed (cross-object) | `derived()` |
| Form validation | `form()` |
| Async operation | `query()` |
| HTTP request | `fetchState()` |
| Streaming | `streamState()` |
| Two-way binding | `bind:value` |
| Anchor state effects | `effect()` |
| Store effects | `$:` reactive statements |
| Conditional render | `{#if}` |
| List render | `{#each}` |
| Async render | `{#await}` |
| localStorage | `persistent()` |
| sessionStorage | `session()` |

---

## Success Checklist

Before completing any Anchor application, verify:

- [ ] Using standard Svelte components (no special wrappers)
- [ ] State uses `mutable()` or `immutable()` + `writable()`
- [ ] Two-way binding uses `bind:value` or `bind:checked`
- [ ] Conditional rendering uses `{#if}`
- [ ] List rendering uses `{#each}`
- [ ] Async operations use `query()`, `fetchState()`, or `streamState()`
- [ ] All async operations have initial data
- [ ] Forms use `form()` with Zod schema
- [ ] Anchor state effects use `effect()`
- [ ] Svelte store effects use `$:` reactive statements
- [ ] Shared state uses `immutable()` + `writable()`
- [ ] Computed properties use getters or `derived()`
