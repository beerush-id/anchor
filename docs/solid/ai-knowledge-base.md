# Anchor for SolidJS - AI Knowledge Base

Reference for AI assistants to build robust SolidJS applications using Anchor.

## Core Concepts

### What is Anchor for SolidJS?

Anchor enhances SolidJS's reactivity system by providing:
- **Direct Mutation**: Mutate state directly while maintaining reactivity
- **True Immutability**: Controlled mutations with read/write contracts
- **Schema Validation**: Runtime validation with Zod
- **Data Integrity**: Ensure state maintains structure and types

### Integration with SolidJS

- Automatic tracking binding with Solid's reactivity system
- Proper cleanup when components are destroyed
- No additional providers or setup required
- Full compatibility with Solid's component lifecycle

## State Management

### 1. Mutable State

**Use for**: Local component state, direct mutations

```tsx
import { mutable } from '@anchorlib/solid';

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
```

**Configuration**:
```tsx
const state = mutable({ ... }, {
  schema: z.object({ ... }), // Zod validation
  recursive: true // true (default) | false | 'flat'
});
```

**Computed Properties** (using getters):
```tsx
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});

console.log(cart.total); // 20
cart.price = 20;
console.log(cart.total); // 40
```

### 2. Immutable State

**Use for**: Shared/global state, controlled access

```tsx
import { immutable, writable } from '@anchorlib/solid';

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

```tsx
import { mutable, derived } from '@anchorlib/solid';

const count = mutable(1);
const count2 = mutable(5);
const counter = mutable({ count: 3 });

// Derived state that automatically updates when dependencies change
const total = derived(() => count.value + count2.value + counter.count);

console.log(total.value); // 9
count.value++;
console.log(total.value); // 10
```

**Intrinsic (within object)** - Use getters:
```tsx
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
```

**Composite (across objects)** - Use `derived()`:
```tsx
const todos = mutable([...]);
const filter = mutable('all');

const visibleTodos = derived(() => {
  if (filter.value === 'completed') return todos.filter(t => t.done);
  return todos;
});
```

### 4. Form State with Validation

**Use for**: Forms with schema validation and automatic error tracking

```tsx
import { form } from '@anchorlib/solid';
import { z } from 'zod';
import { Show } from 'solid-js';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  age: z.number().min(18),
});

export const SignUpForm = () => {
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
  
  return (
    <form onSubmit={submit}>
      <input 
        value={state.email} 
        onInput={(e) => state.email = e.currentTarget.value} 
      />
      <Show when={errors.email}>
        <span class="error">{errors.email.message}</span>
      </Show>
      
      <input 
        type="password"
        value={state.password} 
        onInput={(e) => state.password = e.currentTarget.value} 
      />
      <Show when={errors.password}>
        <span class="error">{errors.password.message}</span>
      </Show>
      
      <button type="submit">Sign Up</button>
    </form>
  );
};
```

**Options:**
```tsx
form(schema, init, {
  onChange: (event) => console.log('Changed:', event),
  safeInit: false, // Show validation errors on initial render
});
```

## Component Architecture

### Standard SolidJS Components

Anchor works with **standard SolidJS function components**. No special wrappers needed for basic usage.

```tsx
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  const state = mutable({ count: 0 });
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
};
```

### Global State

State declared outside components is shared globally:

```tsx
import { mutable } from '@anchorlib/solid';

// Global state
const counter = mutable({ count: 0 });

const Counter = () => {
  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
    </div>
  );
};
```

**⚠️ SSR Warning**: Module-level state is shared across all requests in SSR environments. Use Solid Context for request-scoped state.

### Headless State (Reusable Logic)

Separate business logic from UI using factory functions or classes:

**Factory Function**:
```tsx
// stores/counter.ts
import { mutable } from '@anchorlib/solid';

export function createCounter() {
  return mutable({
    count: 0,
    increment() { this.count++; },
    decrement() { this.count--; }
  });
}

// Usage
const Counter = () => {
  const counter = createCounter();
  return <button onClick={() => counter.increment()}>{counter.count}</button>;
};
```

**Class Pattern**:
```tsx
import { mutable } from '@anchorlib/solid';

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

### Creating Bindable Components

Use the `bindable()` HOC to create components that accept bindable props:

```tsx
import { bindable, $bind } from '@anchorlib/solid';
import type { Bindable } from '@anchorlib/solid';

// Bindable input component
interface InputProps {
  value: Bindable<string>;
  label?: string;
}

const Input = bindable<InputProps>((props) => {
  return (
    <div>
      {props.label && <label>{props.label}</label>}
      <input
        type="text"
        value={props.value}
        onInput={(e) => (props.value = e.currentTarget.value)}
      />
    </div>
  );
});

// Usage with $bind()
const App = () => {
  const user = mutable({
    firstName: 'John',
    lastName: 'Doe',
  });

  return (
    <div>
      <Input label="First Name" value={$bind(user, 'firstName')} />
      <Input label="Last Name" value={$bind(user, 'lastName')} />
      
      <p>Full Name: {user.firstName} {user.lastName}</p>
    </div>
  );
};
```

### Binding to MutableRef

```tsx
const count = mutable(0);

// Bind to MutableRef - no key needed
<Counter value={$bind(count)} />
```

### Binding to Object Properties

```tsx
const state = mutable({ name: 'John', age: 30 });

// Bind to specific properties
<TextInput value={$bind(state, 'name')} />
<NumberInput value={$bind(state, 'age')} />
```

### Type Safety

**Important**: To use `$bind()`, the component prop **must be typed with `Bindable<T>`**:

```tsx
interface TextInputProps {
  value: Bindable<string>; // ← Required for $bind()
}

const TextInput = bindable<TextInputProps>((props) => {
  return <input value={props.value} onInput={...} />;
});

// ✅ Correct: Using $bind() with Bindable<string> prop
const state = mutable({ name: 'John' });
<TextInput value={$bind(state, 'name')} />

// ❌ Type Error: Cannot use $bind() with regular string prop
interface BadInputProps {
  value: string; // Not Bindable<string>
}
```

### Optional Bindable Props

Use `BindableProp<T>` for props that can accept both regular values and bindings:

```tsx
import type { BindableProp } from '@anchorlib/solid';

interface InputProps {
  value: BindableProp<string>; // Can be string OR Bindable<string>
}

const Input = bindable<InputProps>((props) => {
  return <input value={props.value} onInput={...} />;
});

// Can be used with or without binding
<Input value={$bind(state, 'name')} />
<Input value="Static value" />
```

### Props Filtering

Bindable components have access to `$omit()` and `$pick()` utility methods:

```tsx
interface MyComponentProps {
  value: Bindable<string>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}

const MyComponent = bindable<MyComponentProps>((props) => {
  // Omit specific props before spreading
  const inputProps = props.$omit(['label', 'class']);
  
  return (
    <div class={props.class}>
      {props.label && <label>{props.label}</label>}
      <input {...inputProps} />
    </div>
  );
});
```

## Async Handling

### 1. Query State

**Use for**: General async operations with full control

```tsx
import { query } from '@anchorlib/solid';
import { Switch, Match } from 'solid-js';

const UserProfile = () => {
  const user = query(async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  }, { name: 'Guest' }); // Initial data

  return (
    <Switch>
      <Match when={user.status === 'pending'}>
        <p>Loading...</p>
      </Match>
      <Match when={user.status === 'error'}>
        <p>Error: {user.error?.message}</p>
      </Match>
      <Match when={user.status === 'success'}>
        <p>Hello, {user.data.name}!</p>
      </Match>
    </Switch>
  );
};
```

**Features**:
- **Auto-Status**: `status` property ('idle' | 'pending' | 'success' | 'error')
- **Auto-Cancellation**: Aborts previous request if a new one starts
- **Manual Cancellation**: Call `.abort()` to cancel
- **Signal Passing**: Passes `AbortSignal` to async function

**Deferred Execution**:
```tsx
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
```

**Re-fetching**:
```tsx
const dataQuery = query(fetchData, []);

// Refresh the data
function refresh() {
  dataQuery.start(); // Cancels previous request automatically
}
```

### 2. Fetch State

**Use for**: HTTP requests with automatic response handling

```tsx
import { fetchState } from '@anchorlib/solid';

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
```

### 3. Stream State

**Use for**: Streaming responses that arrive in chunks

```tsx
import { streamState } from '@anchorlib/solid';

const chatStream = streamState(
  '',
  { url: '/api/chat/stream' }
);

// Data updates incrementally as chunks arrive
console.log(chatStream.data);
```

**Transform Function**:
```tsx
const logStream = streamState(
  [],
  {
    url: '/api/logs/stream',
    transform: (current, chunk) => {
      return [...current, chunk];
    }
  }
);
```

### Promise Integration

All async state functions expose a `.promise` property:

```tsx
const userQuery = query(fetchUser);
await userQuery.promise;
console.log('User loaded:', userQuery.data);
```

## Reactivity System

### Effects

**Use for**: Side effects that respond to Anchor state changes

**Important**: Anchor's `effect()` **only tracks Anchor state** (created with `mutable()`, `immutable()`, `derived()`, etc.). It **cannot track SolidJS signals** created with `createSignal()`. For SolidJS signals, use SolidJS's `createEffect()` instead.

```tsx
import { effect } from '@anchorlib/solid';
import { createSignal, createEffect } from 'solid-js';

const anchorState = mutable({ count: 0 });
const [solidSignal, setSolidSignal] = createSignal(0);

// ✅ Works: Tracks Anchor state
effect(() => {
  console.log('Anchor count:', anchorState.count);
});

// ❌ Won't work: Cannot track SolidJS signals
effect(() => {
  console.log('Signal:', solidSignal()); // Will NOT re-run when signal changes
});

// ✅ Use SolidJS createEffect for signals
createEffect(() => {
  console.log('Signal:', solidSignal()); // Works correctly
});
```

**Basic Usage**:
```tsx
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
```

**Dynamic Tracking**:
```tsx
effect(() => {
  if (state.showDetails) {
    console.log(state.details); // Only tracks when showDetails is true
  }
});
```

**Untracking**:
```tsx
import { untrack } from '@anchorlib/solid';

effect(() => {
  const content = doc.content; // Tracked
  const endpoint = untrack(() => settings.saveUrl); // Not tracked
  
  untrack(() => {
    fetch(endpoint, { body: content }); // No tracking inside
  });
});
```

**Snapshots**:
```tsx
import { snapshot } from '@anchorlib/solid';

effect(() => {
  if (state.query) {
    const copy = snapshot(state); // Deep clone, not reactive
    const json = JSON.stringify(copy); // Safe
  }
});
```

### Subscribe (Global Observability)

**Use for**: Listening to any change in an object

```tsx
import { subscribe } from '@anchorlib/solid';

subscribe(user, (val, event) => {
  console.log('Changed:', event);
}, true); // recursive = true (default)
```

## Lifecycle

### onMount

**Use for**: DOM access, 3rd-party libs, animations

```tsx
import { onMount } from 'solid-js';

const Component = () => {
  let inputRef;
  
  onMount(() => {
    inputRef?.focus();
  });
  
  return <input ref={inputRef} />;
};
```

### onCleanup

**Use for**: Cleanup when component unmounts

```tsx
import { onCleanup } from 'solid-js';

const Component = () => {
  const handleResize = () => console.log('Resized');
  
  window.addEventListener('resize', handleResize);
  
  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
  });
  
  return <div>Component</div>;
};
```

## Advanced Patterns

### State Persistence

**Use for**: Syncing state with localStorage or sessionStorage

```tsx
import { persistent, session } from '@anchorlib/solid/storage';

// Persists to localStorage (survives restart)
const settings = persistent('app-settings', { 
  theme: 'dark' 
});

// Persists to sessionStorage (tab session only)
const draft = session('form-draft', { 
  title: '' 
});
```

### State Serialization

**Use for**: Safely serializing reactive state

```tsx
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
```

### Optimistic UI

**Use for**: UI updates that can be undone

```tsx
import { undoable } from '@anchorlib/solid';

const LikeButton = (props) => {
  const handleClick = () => {
    const [rollback, settled] = undoable(() => {
      props.liked = !props.liked;
    });
    
    updateLike(props.liked).then(settled).catch(rollback);
  };
  
  return (
    <button onClick={handleClick}>
      {props.liked ? 'Unlike' : 'Like'}
    </button>
  );
};
```

## SolidJS Integration

### Control Flow Components

Use SolidJS's built-in control flow components for conditional rendering and lists:

**Show** - Conditional rendering:
```tsx
import { Show } from 'solid-js';

<Show when={user.isLoggedIn} fallback={<Login />}>
  <Dashboard user={user} />
</Show>
```

**For** - List rendering:
```tsx
import { For } from 'solid-js';

const TodoList = () => {
  const todos = mutable([
    { id: 1, text: 'Task 1', done: false },
    { id: 2, text: 'Task 2', done: true },
  ]);
  
  return (
    <ul>
      <For each={todos}>
        {(todo) => (
          <li>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => todo.done = !todo.done}
            />
            {todo.text}
          </li>
        )}
      </For>
    </ul>
  );
};
```

**Switch/Match** - Multiple conditions:
```tsx
import { Switch, Match } from 'solid-js';

<Switch>
  <Match when={status === 'loading'}>
    <Spinner />
  </Match>
  <Match when={status === 'error'}>
    <Error />
  </Match>
  <Match when={status === 'success'}>
    <Content />
  </Match>
</Switch>
```

## TypeScript

```tsx
// Component with props
interface Props {
  value: number;
  onChange?: (val: number) => void;
}

const Counter = (props: Props) => {
  return <div>{props.value}</div>;
};

// Component with two-way binding
interface TextInputProps {
  value: Bindable<string>; // Two-way binding
  placeholder?: string;
}

const TextInput = bindable<TextInputProps>((props) => {
  return (
    <input 
      value={props.value} 
      placeholder={props.placeholder}
      onInput={(e) => props.value = e.currentTarget.value} 
    />
  );
});

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
```

## Best Practices

### 1. Encapsulate Logic with Data

Group related data and behavior together in objects:

```tsx
const todoApp = mutable({
  newText: '',
  todos: [],
  addTodo() {
    this.todos.push({ text: this.newText });
    this.newText = '';
  }
});
```

### 2. Direct Mutations

Direct property updates:

```tsx
// ✅ Logic-Driven
user.age++;
```

### 3. Automatic Dependency Tracking

Effects automatically track dependencies - no manual arrays needed:

```tsx
effect(() => {
  fetchUser(state.userId).then(d => state.data = d);
}); // Automatically tracks state.userId
```

### 4. Use Bindable Components for Forms

```tsx
// ✅ Reusable bindable component
const SignUp = () => {
  const state = mutable({
    email: '',
    password: '',
  });
  
  return (
    <form>
      <TextInput value={$bind(state, 'email')} />
      <TextInput type="password" value={$bind(state, 'password')} />
      <button type="submit">Sign Up</button>
    </form>
  );
};
```

### 5. Computed Properties with Getters

Use JavaScript getters for derived values within objects:

```tsx
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
```

### 6. Prefer Immutable for Shared State

Use `immutable()` + `writable()` for controlled access to shared state:

```tsx
// Public: Read-only
export const state = immutable({ count: 0 });

// Private: Write contract
export const stateControl = writable(state);
```

## Common Pitfalls

### ❌ Using Module-Level State in SSR

```tsx
// ⚠️ SSR Risk: Shared across all requests!
export const appState = mutable({ theme: 'dark' });
```

**Fix**: Use Solid Context for request-scoped state in SSR.

### ❌ Not Using Initial Data for Queries

```tsx
// ❌ Requires defensive checks
const user = query(fetchUser);
console.log(user.data?.name); // Need optional chaining

// ✅ Safe to access immediately
const user = query(fetchUser, { name: '', email: '' });
console.log(user.data.name); // Always works
```

### ❌ Using effect() with SolidJS Signals

```tsx
import { effect } from '@anchorlib/solid';
import { createSignal, createEffect } from 'solid-js';

const [count, setCount] = createSignal(0);

// ❌ Won't work: effect() cannot track SolidJS signals
effect(() => {
  console.log(count()); // Will NOT re-run when signal changes
});

// ✅ Use SolidJS createEffect for signals
createEffect(() => {
  console.log(count()); // Works correctly
});

// ✅ Use Anchor effect only for Anchor state
const anchorState = mutable({ count: 0 });
effect(() => {
  console.log(anchorState.count); // Works correctly
});
```

## Quick Reference

### Imports

```tsx
import {
  // State
  mutable, immutable, writable, derived,
  
  // Binding
  $bind, bindable,
  
  // Async
  query, fetchState, streamState,
  
  // Form
  form,
  
  // Reactivity
  effect, untrack, snapshot, subscribe,
  
  // Storage
  persistent, session,
  
  // Utils
  stringify, undoable
} from '@anchorlib/solid';

// Types
import type { Bindable, BindableProp } from '@anchorlib/solid';

// SolidJS
import { Show, For, Switch, Match, onMount, onCleanup } from 'solid-js';
```

### Decision Trees

**State Type**:
- Local component state → `mutable`
- Shared state → `immutable` + `writable`
- Computed value (same object) → getter
- Computed value (cross-object) → `derived`
- Form with validation → `form()`

**Async Operations**:
- General async → `query()`
- HTTP requests → `fetchState()`
- Streaming → `streamState()`

**When to Use**:
- `effect()` → Side effects for Anchor state only (use `createEffect()` for SolidJS signals)
- `onMount` → DOM access after mount (SolidJS)
- `onCleanup` → Cleanup on unmount (SolidJS)
- `$bind()` → Two-way binding
- `bindable()` → Make component accept bindable props
- `untrack` → Read without subscribing
- `persistent()` → localStorage sync
- `session()` → sessionStorage sync

## Performance Optimization

1. **Use `derived()` for cross-object computations** - Auto-cached
2. **Use getters for derived state within objects** - Auto-cached
3. **Use `untrack` for expensive reads** - Avoid over-subscription
4. **Use SolidJS control flow** - `<Show>`, `<For>`, `<Switch>`, `<Match>`
5. **Provide initial data for queries** - Avoid undefined states
6. **Use `bindable()` for reusable form components** - Reduce boilerplate

## Key Principles for AI

1. **Use standard SolidJS function components** - No special wrappers needed
2. **Use `bindable()` HOC** for components that accept bindable props
3. **Use `$bind()` for two-way binding** - Prop must be typed with `Bindable<T>`
4. **Use SolidJS control flow** - `<Show>`, `<For>`, `<Switch>`, `<Match>`
5. **Use `mutable()` for local state** - Direct mutation works
6. **Use `immutable()` + `writable()` for shared state** - Enforce contracts
7. **Use getters for computed properties** - Within same object
8. **Use `derived()` for cross-object computations** - Across multiple sources
9. **Use `query()` for async operations** - Built-in status tracking
10. **Use `form()` for forms with validation** - Automatic error tracking
11. **Provide initial data for queries** - Avoid undefined states
12. **Use `effect()` for Anchor state side effects** - Only tracks Anchor state, not SolidJS signals
13. **Use `createEffect()` for SolidJS signals** - Anchor's `effect()` cannot track signals

## Success Checklist

- [ ] Using standard SolidJS function components
- [ ] State uses `mutable()` or `immutable()`
- [ ] Bindable components use `bindable()` HOC
- [ ] Two-way binding uses `$bind()` with `Bindable<T>` props
- [ ] Conditional rendering uses `<Show>`, `<Switch>`, `<Match>`
- [ ] List rendering uses `<For>`
- [ ] Async operations use `query()`, `fetchState()`, or `streamState()`
- [ ] Forms with validation use `form()`
- [ ] Effects use `effect()` for automatic tracking
- [ ] Shared state uses `immutable()` + `writable()`
