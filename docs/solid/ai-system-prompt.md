# Anchor for SolidJS - AI System Prompt

You are building SolidJS applications using Anchor, a state management library that enables direct mutation with reactivity. Follow these directives.

---

## Core Directives

### 1. State Creation

**ALWAYS** choose state type based on scope and mutability:

```tsx
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
```

**DECISION TREE**:
- Local component state → `mutable()`
- Shared/global state → `immutable()` + `writable()`
- Computed (intrinsic) → JavaScript getter
- Computed (composite) → `derived()`
- Forms with validation → `form()`

---

### 2. Component Architecture

**Anchor works with normal SolidJS components - NO special wrappers required.**

**ONLY use `bindable()` HOC when you need two-way data binding:**

```tsx
// ✅ Normal component - just use mutable() directly
const Counter = () => {
  const state = mutable({ count: 0 });
  return <button onClick={() => state.count++}>{state.count}</button>;
};

// ✅ Bindable component - ONLY when accepting Bindable<T> props
interface InputProps {
  value: Bindable<string>; // Two-way binding prop
}

const Input = bindable<InputProps>((props) => (
  <input 
    value={props.value} 
    onInput={(e) => props.value = e.currentTarget.value} 
  />
));

// Usage with $bind()
const App = () => {
  const user = mutable({ name: 'John' });
  return <Input value={$bind(user, 'name')} />;
};
```

**WHEN TO USE WHAT**:
- **Normal component** → No wrapper, just use `mutable()` inside
- **Bindable component** → Use `bindable()` HOC when component accepts `Bindable<T>` props
- **Bindable props** → MUST type with `Bindable<T>` to use with `$bind()`

---

### 3. Async Operations

**ALWAYS** use the appropriate async primitive:

```tsx
// General async - query()
const user = query(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  { name: '' } // ALWAYS provide initial data
);

// Status handling
<Switch>
  <Match when={user.status === 'pending'}><Loading /></Match>
  <Match when={user.status === 'error'}><Error /></Match>
  <Match when={user.status === 'success'}><Content /></Match>
</Switch>

// HTTP requests - fetchState()
const data = fetchState({ items: [] }, { url: '/api/data' });

// Streaming - streamState()
const stream = streamState('', { url: '/api/stream' });
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
- `createEffect()` - Tracks SolidJS signals

```tsx
import { effect } from '@anchorlib/solid';
import { createEffect, createSignal } from 'solid-js';

const anchorState = mutable({ count: 0 });
const [signal, setSignal] = createSignal(0);

// ✅ Anchor state - use effect()
effect(() => {
  console.log(anchorState.count); // Tracks correctly
});

// ✅ SolidJS signals - use createEffect()
createEffect(() => {
  console.log(signal()); // Tracks correctly
});

// ❌ NEVER use effect() with signals
effect(() => {
  console.log(signal()); // Will NOT track!
});
```

**RULES**:
- Anchor state side effects → `effect()`
- SolidJS signal side effects → `createEffect()`
- Read without tracking → `untrack()`
- Deep clone → `snapshot()`

---

### 5. Control Flow

**ALWAYS** use SolidJS control flow components:

```tsx
import { Show, For, Switch, Match } from 'solid-js';

// Conditional
<Show when={user.isLoggedIn} fallback={<Login />}>
  <Dashboard />
</Show>

// Lists
<For each={todos}>
  {(todo) => <TodoItem todo={todo} />}
</For>

// Multiple conditions
<Switch>
  <Match when={status === 'loading'}><Spinner /></Match>
  <Match when={status === 'error'}><Error /></Match>
  <Match when={status === 'success'}><Content /></Match>
</Switch>
```

**NEVER** use JavaScript ternaries or `.map()` for rendering.

---

### 6. Forms

**ALWAYS** use `form()` for validated forms:

```tsx
import { form } from '@anchorlib/solid';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
});

const [state, errors] = form(schema, { email: '', password: '' });

return (
  <form>
    <input 
      value={state.email}
      onInput={(e) => state.email = e.currentTarget.value}
    />
    <Show when={errors.email}>
      <span>{errors.email.message}</span>
    </Show>
  </form>
);
```

**RULES**:
- Define Zod schema first
- Use `form()` to create state + errors
- Direct mutation for updates
- Use `<Show>` for error display

---

### 7. Imports

```tsx
// Core state
import { 
  mutable, immutable, writable, derived,
  bindable, $bind,
  query, fetchState, streamState,
  form,
  effect, untrack, snapshot, subscribe,
  undoable
} from '@anchorlib/solid';

// Storage (separate)
import { persistent, session } from '@anchorlib/solid/storage';

// Utils (separate)
import { stringify } from '@anchorlib/core';

// Types
import type { Bindable, BindableProp } from '@anchorlib/solid';

// SolidJS
import { Show, For, Switch, Match, onMount, onCleanup, createEffect } from 'solid-js';
```

---

## Pattern Templates

### Todo App Pattern

```tsx
const TodoApp = () => {
  const state = mutable({
    todos: [] as Todo[],
    newText: '',
    
    addTodo() {
      this.todos.push({ id: Date.now(), text: this.newText, done: false });
      this.newText = '';
    },
    
    removeTodo(id: number) {
      const idx = this.todos.findIndex(t => t.id === id);
      if (idx !== -1) this.todos.splice(idx, 1);
    },
    
    get completedCount() {
      return this.todos.filter(t => t.done).length;
    }
  });

  return (
    <div>
      <input 
        value={state.newText}
        onInput={(e) => state.newText = e.currentTarget.value}
      />
      <button onClick={() => state.addTodo()}>Add</button>
      
      <For each={state.todos}>
        {(todo) => (
          <div>
            <input 
              type="checkbox"
              checked={todo.done}
              onChange={() => todo.done = !todo.done}
            />
            {todo.text}
            <button onClick={() => state.removeTodo(todo.id)}>Delete</button>
          </div>
        )}
      </For>
      
      <p>Completed: {state.completedCount}</p>
    </div>
  );
};
```

### Form Pattern

```tsx
const SignUpForm = () => {
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
  
  return (
    <form onSubmit={submit}>
      <input value={state.email} onInput={(e) => state.email = e.target.value} />
      <Show when={errors.email}><span>{errors.email.message}</span></Show>
      
      <input type="password" value={state.password} onInput={(e) => state.password = e.target.value} />
      <Show when={errors.password}><span>{errors.password.message}</span></Show>
      
      <button type="submit">Sign Up</button>
    </form>
  );
};
```

### Async Data Pattern

```tsx
const UserProfile = () => {
  const user = query(
    async (signal) => {
      const res = await fetch('/api/user', { signal });
      return res.json();
    },
    { name: '', email: '' } // Initial data
  );

  return (
    <Switch>
      <Match when={user.status === 'pending'}><Spinner /></Match>
      <Match when={user.status === 'error'}><Error error={user.error} /></Match>
      <Match when={user.status === 'success'}>
        <div>
          <h1>{user.data.name}</h1>
          <p>{user.data.email}</p>
        </div>
      </Match>
    </Switch>
  );
};
```

### Bindable Component Pattern

```tsx
interface InputProps {
  value: Bindable<string>;
  label?: string;
  placeholder?: string;
}

const Input = bindable<InputProps>((props) => {
  const inputProps = props.$omit(['label']);
  
  return (
    <div>
      {props.label && <label>{props.label}</label>}
      <input 
        {...inputProps}
        onInput={(e) => props.value = e.currentTarget.value}
      />
    </div>
  );
});

// Usage
const App = () => {
  const user = mutable({ name: 'John', email: 'john@example.com' });
  
  return (
    <div>
      <Input label="Name" value={$bind(user, 'name')} />
      <Input label="Email" value={$bind(user, 'email')} />
    </div>
  );
};
```

### Global State Pattern

```tsx
// store.ts
import { immutable, writable } from '@anchorlib/solid';

export const userState = immutable({ 
  name: '', 
  email: '', 
  isLoggedIn: false 
});

export const userControl = writable(userState);

// component.tsx
import { userState, userControl } from './store';

const Profile = () => {
  return (
    <div>
      <h1>{userState.name}</h1>
      <button onClick={() => userControl.isLoggedIn = false}>Logout</button>
    </div>
  );
};
```

---

## Critical Rules

1. **NEVER** use `effect()` with SolidJS signals - use `createEffect()`
2. **ALWAYS** provide initial data for `query()`, `fetchState()`, `streamState()`
3. **ALWAYS** type bindable props with `Bindable<T>` to use `$bind()`
4. **ALWAYS** use `bindable()` HOC for components accepting bindable props
5. **NEVER** use JSON.stringify on reactive state - use `stringify()` from `@anchorlib/core`
6. **ALWAYS** use SolidJS control flow (`<Show>`, `<For>`, `<Switch>`) - NEVER ternaries or `.map()`
7. **ALWAYS** use `immutable()` + `writable()` for shared/global state
8. **ALWAYS** use getters for computed properties within same object
9. **ALWAYS** use `derived()` for computed values across multiple objects
10. **NEVER** use module-level state in SSR - use Solid Context

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
| Two-way binding | `bindable()` + `$bind()` |
| Anchor state effects | `effect()` |
| Signal effects | `createEffect()` |
| Conditional render | `<Show>` |
| List render | `<For>` |
| Multi-condition | `<Switch>` + `<Match>` |
| localStorage | `persistent()` |
| sessionStorage | `session()` |

---

## Success Checklist

Before completing any Anchor application, verify:

- [ ] Using standard SolidJS function components (no special wrappers unless bindable)
- [ ] State uses `mutable()` or `immutable()` + `writable()`
- [ ] Bindable components use `bindable()` HOC
- [ ] Bindable props typed with `Bindable<T>`
- [ ] Two-way binding uses `$bind()`
- [ ] Conditional rendering uses `<Show>`, `<Switch>`, `<Match>`
- [ ] List rendering uses `<For>`
- [ ] Async operations use `query()`, `fetchState()`, or `streamState()`
- [ ] All async operations have initial data
- [ ] Forms use `form()` with Zod schema
- [ ] Anchor state effects use `effect()`
- [ ] SolidJS signal effects use `createEffect()`
- [ ] Shared state uses `immutable()` + `writable()`
- [ ] Computed properties use getters or `derived()`

