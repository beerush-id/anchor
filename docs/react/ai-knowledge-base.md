# Anchor for React - AI Knowledge Base

Reference for AI assistants to build robust Anchor applications in React.

## Terminology

Before diving into Anchor, understand these core terms:

### Component
The **Logic Layer** of your application. Created with `setup()`.
- **Runs**: Once on mount
- **Contains**: State, logic, effects, lifecycle handlers
- **Nature**: Stateful - manages reactive state and behavior
- **Purpose**: Define what your component does

```tsx
export const Counter = setup(() => {
  // Component: Logic Layer (runs once)
  const state = mutable({ count: 0 });
  const increment = () => state.count++;
  
  // Return a View
  return render(() => <button onClick={increment}>{state.count}</button>);
});
```

### View
The **Presentation Layer** of your application. Displays UI and responds to state changes.
- **Runs**: Reactively when dependencies change
- **Contains**: JSX that reads state
- **Nature**: Stateless - no internal state, only displays data
- **Purpose**: Define what your component looks like

**Three types of Views:**

1. **Component View** - Created with `render()`, the primary output tied to the Component
   ```tsx
   return render(() => <div>{state.value}</div>);
   ```

2. **Snippet** - Created with `snippet()`, stateless, local, has scope access
   ```tsx
   const Counter = snippet(() => <span>{count.value}</span>);
   ```

3. **Template** - Created with `template()`, stateless, reusable, no scope access
   ```tsx
   const UserCard = template<{ user: User }>(({ user }) => (
     <div>{user.name}</div>
   ));
   ```

**Key distinction:**
- **Component** = Stateful (has state)
- **Snippet** = Stateless, local (accesses component scope)
- **Template** = Stateless, reusable (props only)

### Props
Props in Anchor are **reactive proxies**, unlike React's plain objects. This enables them to be writable and support pass-by-reference.

```tsx
// Anchor props are reactive proxies
export const Card = setup<CardProps>((props) => {
  return render(() => (
    <div className={`card-${props.variant}`}>
      {props.children}
    </div>
  ));
});
```

**Key difference from React:**
- **React**: Props are plain objects, passed by value, **read-only**
- **Anchor**: Props are reactive proxies, **can be writable**, enabling pass-by-reference with `$bind()` and `$use()`

```tsx
// React: Props are read-only
function ReactComponent(props) {
  props.value = 'new'; // ❌ Error or ignored
}

// Anchor: Props can be writable (if declared with Bindable<T>)
export const AnchorComponent = setup<{ value: Bindable<string> }>((props) => {
  props.value = 'new'; // ✅ Works - writes back to parent
});
```

### Binding
Pass-by-reference for reactive state between Anchor components.
- **`$bind()`**: Two-way binding (child can read and write)
- **`$use()`**: One-way binding (child can only read)
- **Important**: Only works with Anchor components, not standard HTML elements

```tsx
// Parent
const state = mutable({ email: '' });

// Two-way binding
<TextInput value={$bind(state, 'email')} />

// One-way binding
<Display text={$use(state, 'email')} />

// Child with two-way binding must declare Bindable<T> type
export type TextInputProps = {
  value: Bindable<string>; // Two-way binding
};

export const TextInput = setup<TextInputProps>((props) => {
  // ✅ TypeScript allows write because value is Bindable<string>
  const handleChange = (e) => props.value = e.target.value;
  return render(() => <input value={props.value} onChange={handleChange} />);
});

// Child with one-way binding uses regular type
export type DisplayProps = {
  text: string; // One-way, just reads the value
};

export const Display = setup<DisplayProps>((props) => {
  // ❌ TypeScript error: Cannot assign to 'text' because it is a read-only property
  // props.text = 'new value';
  
  return render(() => <span>{props.text}</span>);
});
```

**TypeScript enforcement**: Props are strongly typed. If you attempt to assign to props not declared with `Bindable<T>`, TypeScript will warn you.

## Core Architecture

### Fundamental Shift
Anchor solves React's core problem: **The Rendering Model**. It separates components into two layers:

1. **Component (Logic Layer)** - Runs **once** when created. Contains state, logic, and effects. Never re-executes.
2. **View (Presentation Layer)** - Runs **reactively**. Updates only when specific dependencies change.

**Key Benefit**: Eliminates re-render cascades, stale closures, and dependency arrays.

```tsx
import { setup, mutable, render } from '@anchorlib/react';

export const Counter = setup(() => {
  // Logic Layer - runs once
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  // Presentation Layer - reactive
  return render(() => (
    <button onClick={increment}>{state.count}</button>
  ));
}, 'Counter');
```

### Pass-By-Reference for Reactive State

**Core principle:** Always use `$bind()` or `$use()` when passing reactive state to Anchor components.

**Why?** Pass-by-value requires parent re-renders. Pass-by-reference enables child components to update reactively without parent re-renders.

**Important:** Pass-by-reference **only works with Anchor components** (components created with `setup()`). It does not work with standard HTML elements or 3rd-party components not built with Anchor.

```tsx
// ❌ Pass-by-value: Parent must re-render to update child
<Counter value={state.count} />

// ✅ Pass-by-reference: Child updates reactively without parent re-render
<Counter value={$use(state, 'count')} />
```

### View Scope Decision Tree

**When to use `render()`:**
- Simple components where full re-render won't hurt performance
- Component has minimal reactive state
- No need for fine-grained updates

```tsx
export const SimpleCard = setup(() => {
  const state = mutable({ title: 'Card', count: 0 });
  
  // Simple component - just use render()
  return render(() => (
    <div>
      <h2>{state.title}</h2>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  ));
});
```

**When NOT to use `render()`:**
- ❌ Don't wrap everything in `render()` by default - it makes the entire component reactive
- ✅ Use static JSX for structural elements that never change
- ✅ Use snippets to isolate reactive parts from static layout

**When to use `snippet()`:**
1. **Related UI that updates together** - Group related reactive values in a single snippet
2. **Offload reactive UI from static component** - Most of the UI is static, only small parts are reactive

**Example 1: Related UI updates together**
```tsx
export const TodoList = setup(() => {
  const todos = mutable([
    { text: 'Task 1', done: false },
    { text: 'Task 2', done: true },
  ]);
  
  const stats = derived(() => ({
    total: todos.length,
    active: todos.filter(t => !t.done).length,
    completed: todos.filter(t => t.done).length,
  }));
  
  const Stats = snippet(() => (
    <div>
      <span>Total: {stats.value.total}</span>
      <span>Active: {stats.value.active}</span>
      <span>Done: {stats.value.completed}</span>
    </div>
  ));
  
  return (
    <div>
      <Stats />
      {/* ... todo list ... */}
    </div>
  );
});
```

**Example 2: Offload reactive UI from static component**
```tsx
export const Dashboard = setup(() => {
  const count = mutable(0);
  
  const Counter = snippet(() => <span>{count.value}</span>);
  
  return (
    <div className="dashboard"> {/* Static */}
      <h1>Dashboard</h1> {/* Static */}
      <p>Count: <Counter /></p> {/* Reactive snippet */}
      <button onClick={() => count.value++}>+</button> {/* Static */}
    </div>
  );
});
```

**When snippets add value:**
- ✅ Isolating reactive parts from static layout (like Counter in Dashboard above)
- ✅ Grouping related reactive values (like Stats showing total/active/completed)
- ✅ Reusing view logic within the same component
- ❌ Don't create snippets for every single `<span>` or `<div>` - use judgment based on reactivity needs

**When to use `template()`:**
- Stateless, reusable views with no component scope access
- Can be used across different components
- Good for list items, cards, buttons, or any reusable UI element

```tsx
// Reusable card template
const UserCard = template<{ user: User }>(({ user }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <p>{user.email}</p>
  </div>
));

// Use in different components
<UserCard user={currentUser} />
<UserCard user={selectedUser} />
```

**When to create reusable components:**
- Common patterns like inputs with two-way binding
- Better than creating new snippet for each instance
- Example: `<TextInput>` component with `Bindable<string>` prop

```tsx
// ❌ Verbose: New snippet for each input
const EmailInput = snippet(() => (
  <input value={state.email} onChange={e => state.email = e.target.value} />
));
const PasswordInput = snippet(() => (
  <input type="password" value={state.password} onChange={e => state.password = e.target.value} />
));

// ✅ Better: Reusable component
<TextInput value={$bind(state, 'email')} />
<TextInput type="password" value={$bind(state, 'password')} />
```

## State Management

### 1. Mutable State
* **Use for**: Local component state, direct mutations
* **Pattern**: Wrap objects/arrays in `mutable()` to create reactive proxies

```tsx
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

### 2. Immutable State
* **Use for**: Shared/global state, controlled access
* **Pattern**: Read-only public interface + writable contracts

```tsx
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
**Use for**: Computed values that auto-update

**Intrinsic (within object)**:
```tsx
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
```

**Composite (across objects)**:
```tsx
const todos = mutable([...]);
const filter = mutable('all');

const visibleTodos = derived(() => {
  if (filter.value === 'completed') return todos.filter(t => t.done);
  return todos;
});

console.log(visibleTodos.value);
```

### 4. Form State with Validation

* **Use for**: Forms with schema validation and automatic error tracking
* **Pattern**: Use `form()` to create state + errors tuple
* **Returns**: `[state, errors]` where errors update automatically on validation failures

```tsx
import { form } from '@anchorlib/core';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(18),
});

export const SignUpForm = setup(() => {
  const [state, errors] = form(schema, {
    email: '',
    password: '',
    age: 0,
  });
  
  const submit = () => {
    if (Object.keys(errors).length === 0) {
      api.signup(state);
    }
  };
  
  // Reactive error display
  const ErrorMessage = snippet<{ field: string }>(({ field }) => {
    const error = errors[field];
    return error ? <span className="error">{error.message}</span> : null;
  });
  
  // Static layout with reactive error snippets
  return (
    <form onSubmit={submit}>
      <TextInput value={$bind(state, 'email')} />
      <ErrorMessage field="email" />
      
      <TextInput type="password" value={$bind(state, 'password')} />
      <ErrorMessage field="password" />
      
      <NumberInput value={$bind(state, 'age')} />
      <ErrorMessage field="age" />
      
      <button type="submit">Sign Up</button>
    </form>
  );
});
```

**Options:**
```tsx
form(schema, init, {
  onChange: (event) => console.log('Changed:', event),
  safeInit: false, // Show validation errors on initial render
});
```

### 6. State Serialization

* **Use for**: Safely serializing reactive state without subscribing to all properties
* **Pattern**: Use `stringify()` instead of `JSON.stringify()` on reactive state
* **Why**: `JSON.stringify()` would subscribe to all properties when reading them, causing unnecessary reactivity tracking. `stringify()` reads the state without subscribing.

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
console.log(json); // {"user":{"name":"John","age":30},"todos":[{"text":"Task 1","done":false}]}

// With formatting
const formatted = stringify(state, null, 2);

// Save to localStorage safely
localStorage.setItem('app-state', stringify(state));
```

### 7. State Scope Patterns

**Local State** (Component-scoped):
```tsx
export const Counter = setup(() => {
  const state = mutable({ count: 0 }); // Dies with component
  // ...
});
```

**Headless State** (Reusable logic):
```tsx
// stores/counter.ts
export function createCounter() {
  return mutable({
    count: 0,
    increment() { this.count++; }
  });
}

// Use anywhere
const counter = createCounter();
```

**Global State** (Module-scoped):
```tsx
// ⚠️ SSR Risk: Shared across all requests!
export const appState = mutable({ theme: 'dark' });
```

## Component Architecture

### 1. Component (Logic Layer)

* **Created with**: `setup()`
* **Runs**: Once on mount
* **Contains**: State, logic, effects, lifecycle handlers

```tsx
export const UserCard = setup((props) => {
  // State
  const state = mutable({ expanded: false });
  
  // Logic
  const toggle = () => state.expanded = !state.expanded;
  
  // Effects
  effect(() => console.log('Expanded:', state.expanded));
  
  // Lifecycle
  onMount(() => console.log('Mounted'));
  onCleanup(() => console.log('Unmounted'));
  
  // Return View
  return render(() => <div onClick={toggle}>...</div>);
}, 'UserCard');
```

**Reactive Props**:
- Props are reactive proxies that update in-place
- ⚠️ **Never destructure props in setup body** - breaks reactivity
- Use props directly in reactive boundaries (views, effects)

```tsx
// ❌ Wrong
const { name } = props; // Captures initial value only

// ✅ Correct
effect(() => console.log(props.name)); // Tracks changes
```

### 2. View (Presentation Layer)

Three types of Views:

#### A. Component View
* **Use for**: Primary component output
* **Created with**: `render()`
* **Props**: Can accept props (same as setup), allows destructuring

```tsx
// Without props
return render(() => <div>{state.value}</div>);

// With props - can destructure since render() is a reactive boundary
export const Card = setup<CardProps>((props) => {
  return render<typeof props>(({ variant, children }) => (
    <div className={`card-${variant}`}>
      {children}
    </div>
  ));
});
```

#### B. Template
* **Use for**: Stateless, reusable, props-driven views
* **Created with**: `template()`
* **Scope**: No access to component state
* **Nature**: Stateless - no internal state, only props

```tsx
const UserCard = template<{ user: User }>(({ user }) => (
  <div>{user.name}</div>
), 'UserCard');

// Pros: Stateless, reusable across components, testable
// Cons: No scope access, requires all data via props
```

#### C. Snippet
* **Use for**: Component-specific Views with scope access
* **Created with**: `snippet()`
* **Scope**: Full closure access to component state

```tsx
export const Dashboard = setup(() => {
  const state = mutable({ title: 'Dashboard' });
  
  const Header = snippet(() => <h1>{state.title}</h1>, 'Header');
  const Content = snippet(() => <main>...</main>, 'Content');
  
  return (
    <div>
      <Header /> {/* Updates when state.title changes */}
      <Content />
    </div>
  );
});

// Pros: Easy access, convenient, co-located
// Cons: Lower performance, not reusable
```

**Snippet Props**:
```tsx
const Item = snippet<{ text: string }>(
  (props, parentProps) => ( // props + parentProps
    <div className={`item theme-${parentProps.theme}`}>
      {props.text}
    </div>
  ),
  'Item'
);
```

#### D. Static Layout
* **Use for**: Structural JSX that never changes
* **Pattern**: Return JSX directly (no `render()`)

```tsx
return (
  <div className="layout"> {/* Static */}
    <Header /> {/* Reactive */}
    <div className="sidebar">Static</div>
    <Content /> {/* Reactive */}
  </div>
);
```

### 3. Props Handling

Props are **reactive proxies** in all contexts. The difference is how you can use them based on whether you're in a reactive boundary.

**In Component context** (`setup()` body):
- Not in a reactive boundary (setup runs once)
- ⚠️ **Never destructure** - captures initial values only
- ⚠️ **Never use `...rest` spread** - logs error
- ✅ Use `$omit()` and `$pick()` for rest props

```tsx
export const Card = setup<CardProps>((props) => {
  const divProps = props.$omit(['variant']); // Exclude specific keys
  
  return render(() => (
    <div className={`card-${props.variant}`} {...divProps}>
      {props.children}
    </div>
  ));
});
```

**In View context** (`render()`, `template()`, `snippet()` body):
- In a reactive boundary (Views re-run when dependencies change)
- ✅ Can destructure for reading - safe because Views re-run
- ✅ Can use `...rest` spread for reading
- ⚠️ To write to props, access directly (no destructure)

```tsx
// render() can accept and destructure props
export const Card = setup<CardProps>((props) => {
  return render<typeof props>(({ variant, children }) => (
    <div className={`card-${variant}`}>
      {children}
    </div>
  ));
});

// template() can destructure props
const Button = template<ButtonProps>(({ variant, ...rest }) => (
  <button className={`btn-${variant}`} {...rest} />
));
```

### 4. List Rendering

**Template** (self-contained items):
```tsx
const TodoItem = template<{ todo: Todo }>(({ todo }) => (
  <li>
    <input
      type="checkbox"
      checked={todo.done}
      onChange={() => todo.done = !todo.done}
    />
    {todo.text}
  </li>
), 'TodoItem');
```

**Snippet** (needs component functions):
```tsx
export const TodoList = setup(() => {
  const state = mutable({
    todos: [],
    remove(todo) {
      const index = this.todos.indexOf(todo);
      if (index !== -1) this.todos.splice(index, 1);
    }
  });
  
  const TodoItem = snippet<{ todo: Todo }>(({ todo }) => (
    <li>
      <span>{todo.text}</span>
      <button onClick={() => state.remove(todo)}>Remove</button>
    </li>
  ), 'TodoItem');
  
  return render(() => (
    <ul>
      {state.todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </ul>
  ));
});
```

### 5. Bi-Directional Component

* **Use for**: Generic components (inputs, selects, etc.) that support both two-way and one-way bindings.
* **Behavior**: Component read and write to props, props propagates to parent component if it's a binding reference.

```tsx
export const TextInput = setup<TextInputProps>((props) => {
  const handleChange = (e) => {
    props.value = e.target.value;
    props.onChange?.(e.target.value);
  };

  return render(() => (
    <input
      type="text"
      value={props.value ?? ''}
      onChange={handleChange}
    />
  ));
});
```

### 6. Optimistic UI

* **Use for**: UI updates that are optimistic and can be undone.

```tsx
export const LikeButton = setup<{ liked: boolean }>((props) => {
  const handleClick = () => {
    const [rollback, settled] = undoable(() => {
      props.liked = !props.liked;
    });
    
    updateLike(props.liked).then(settled).catch(rollback);
  };
  
  return render(() => (
    <button onClick={handleClick}>{props.liked ? 'Unlike' : 'Like'}</button>
  ));
});
```

## Reactivity System

### 1. Effects
* **Use for**: Side effects that respond to state changes
* **Pattern**: Automatic dependency tracking, no arrays

```tsx
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
effect(() => {
  if (state.query) {
    const copy = snapshot(state); // Deep clone, not reactive
    const json = JSON.stringify(copy); // Safe
  }
});
```

### 2. Subscribe (Global Observability)
**Use for**: Listening to any change in an object

```tsx
subscribe(user, (val, event) => {
  console.log('Changed:', event);
}, true); // recursive = true (default)

// vs effect:
// - effect: Granular, runs immediately
// - subscribe: Global, runs only on updates
```

## Lifecycle

### onMount
* **Use for**: DOM access, 3rd-party libs, animations
* **Runs**: Once after component is in DOM

```tsx
onMount(() => {
  inputRef.current?.focus();
  
  // Return cleanup
  return () => console.log('Cleanup');
});
```

### onCleanup
* **Use for**: Cleanup when component unmounts

```tsx
onCleanup(() => {
  window.removeEventListener('resize', handleResize);
});
```

**Lifecycle Flow**:
1. Setup → 2. Render → 3. Mount → 4. `onMount` → 5. Updates → 6. Unmount → 7. `onCleanup`

## Binding & Refs

**Binding is a core feature of Anchor for preventing unnecessary re-renders.** By default, passing props in React is pass-by-value, which requires the parent to re-render whenever the value changes. Anchor's `$bind()` and `$use()` enable **pass-by-reference**, allowing child components to update reactively without parent re-renders.

**When to use:**
- ✅ **Always prefer `$bind()` or `$use()`** when passing reactive state to child components
- ✅ Use `$bind()` for two-way data flow (child can read and write)
- ✅ Use `$use()` for one-way data flow (child can only read)
- ❌ Avoid pass-by-value (`value={state.value}`) for reactive state—it forces parent re-renders

### 1. Two-Way Binding (`$bind(source, key?)`)

* **Use for**: Two-way data binding between parent and child components
* **Behavior**: Pass-by-reference, child can read and write to parent's state
* **Pattern**: Use `$bind()` in parent, declare `Bindable<T>` type in child props

**Parent (passing binding)**:
```tsx
import { $bind, mutable } from '@anchorlib/react';

const count = mutable(0);
const state = mutable({ count: 0 });

// Binding to MutableRef
<Counter value={$bind(count)} />

// Binding to specific key
<Counter value={$bind(state, 'count')} />
```

**Child (accepting binding)**:
```tsx
import { type Bindable, setup, render } from '@anchorlib/react';

export type CounterProps = {
  value: Bindable<number>; // Declares this prop accepts two-way binding
};

export const Counter = setup<CounterProps>((props) => {
  const increment = () => props.value++; // Updates parent!
  return render(() => <button onClick={increment}>{props.value}</button>);
});
```

**Advanced: Syncing with Internal State**
```tsx
import { type Bindable, effect, mutable, setup } from '@anchorlib/react';

export type TabProps = {
  value?: Bindable<string>;
  disabled?: boolean;
};

export const Tab = setup<TabProps>((props) => {
  const tab = mutable({ active: '', disabled: false });
  
  // Sync props to internal state
  effect(() => (tab.active = props.value ?? ''));
  effect(() => (tab.disabled = props.disabled ?? false));
  
  // Sync internal state back to props (two-way binding)
  effect(() => (props.value = tab.active));
  
  // ... rest of component
});
```

### 2. One-Way Binding (`$use(source, key?)`)

* **Use for**: Pass-by-reference for reactive values (avoids parent re-renders)
* **Behavior**: Child receives a reference to parent's state and updates reactively
* **Pattern**: Use `$use()` when child only needs to read the value (one-way data flow)

**Why use `$use()`?**

Without `$use()`, you're passing by value, which requires parent re-render:
```tsx
// ❌ Pass-by-value: Parent must re-render to update child
<Tab disabled={state.disabled} />

// ✅ Pass-by-reference: Child updates reactively without parent re-render
<Tab disabled={$use(state, 'disabled')} />
```

**Examples:**
```tsx
import { $use, $bind, mutable } from '@anchorlib/react';

const tabs = mutable({
  active: 'profile',
  disabled: false,
});

<Tab 
  value={$bind(tabs, 'active')}      // Two-way: Tab can change active tab
  disabled={$use(tabs, 'disabled')}  // One-way: Tab reactively reads disabled state
/>

// Or with functions (computed values)
<AdminForm isAdmin={$use(() => user.role === 'admin')} />
```

### 3. DOM Refs

**Access DOM**:
```tsx
const inputRef = nodeRef<HTMLInputElement>((node) => {
  if (node) node.focus();
});

return render(() => <input ref={inputRef} />);
```

**Reactive Attributes** (bypasses React):
```tsx
const panelRef = nodeRef(() => ({
  className: state.activeTab === 'home' ? 'active' : 'hidden',
  'aria-hidden': state.activeTab !== 'home'
}));

return render(() => (
  <div ref={panelRef} {...panelRef.attributes}>
    <HeavyContent /> {/* Won't re-render when class changes */}
  </div>
));
```

**When to use `nodeRef`**:
- ✅ Containers with large trees (avoid re-rendering children)
- ✅ High-frequency updates (animations, drag-and-drop)
- ❌ Simple leaf components (use standard JSX)

## Advanced Patterns

### 1. Async Handling (`query`)

Anchor provides a robust `query()` primitive for handling asynchronous operations. It solves common problems like race conditions, status tracking, and cancellation.

**Features:**
- **Auto-Status**: `status` property ('pending' \| 'success' \| 'error')
- **Auto-Cancellation**: Aborts previous request if a new one starts
- **Manual Cancellation**: Call `.abort()` to cancel ongoing request
- **Signal Passing**: Passes `AbortSignal` to your async function

```tsx
const userQuery = query(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { name: 'Guest' }); // Initial data (safe access)

// Manual abort (e.g., on unmount)
onCleanup(() => userQuery.abort());

// Usage in View
if (userQuery.status === 'pending') return <Spinner />;
if (userQuery.status === 'error') return <Error msg={userQuery.error.message} />;
return <Profile data={userQuery.data} />;
```

### 2. State Persistence (`persistent` & `session`)

Don't manually sync with `localStorage` or `sessionStorage`. Use Anchor's reactive storage primitives. They automatically:
- Load initial state from storage
- Sync changes to storage
- Update specific properties reactively

```tsx
import { persistent, session } from '@anchorlib/react/storage';

// Persists to localStorage (survives restart)
const settings = persistent('app-settings', { 
  theme: 'dark' 
});

// Persists to sessionStorage (tab session only)
const draft = session('form-draft', { 
  title: '' 
});
```

### 3. Optimistic UI (`undoable`)

For interactions that require instant feedback (like "Like" buttons), use `undoable()`. It provides a way to optimistically update the state and automatically rollback if the server request fails.

```tsx
const [rollback, settled] = undoable(() => {
  // 1. Optimistic update (runs immediately)
  state.liked = !state.liked;
});

// 2. Perform actual request
api.like()
  .then(settled)   // 3a. Success: confirm change
  .catch(rollback); // 3b. Error: revert change automatically
```

### 4. Advanced Reactivity

Control how and when reactivity triggers track dependencies.

- **`untrack(fn)`**: Executes `fn` without tracking dependencies. Essential for reading state inside an effect without subscribing to it.
- **`snapshot(state)`**: Creates a deep, non-reactive copy of the state. Use this before passing state to `JSON.stringify()` to avoid performance issues.
- **`subscribe(state, callback)`**: Manually listen to all changes on an object. Useful for logging or debugging.

### 5. Lifecycle Deep Dive: `effect()` vs `onMount()`

Understanding the difference is critical for proper data fetching and initialization.

| Feature | `effect()` | `onMount()` |
|---------|------------|-------------|
| **Timing** | Runs **IMMEDIATELY** during setup (before mount) | Runs **ONCE** after component is mounted in DOM |
| **Tracking** | **Auto-tracks** any state read synchronously | **No tracking**. Safe to read state without re-running |
| **Re-runs** | Yes, whenever dependencies change | No, never re-runs |
| **Best For** | Syncing state A to B, derived logic | Data fetching, DOM manipulation, extensive setup | 

## TypeScript

```tsx
// Component with props
interface Props {
  value: number;
  onChange?: (val: number) => void;
}

export const Counter = setup<Props>((props) => {
  // Can destructure in render()
  return render<typeof props>(({ value }) => (
    <div>{value}</div>
  ));
});

// Component with two-way binding
interface TextInputProps {
  value: Bindable<string>; // Two-way binding
  placeholder?: string;
}

export const TextInput = setup<TextInputProps>((props) => {
  const handleChange = (e) => props.value = e.target.value;
  
  return render(() => (
    <input 
      value={props.value} 
      placeholder={props.placeholder}
      onChange={handleChange} 
    />
  ));
});

// Template with props
const Button = template<{ variant: 'primary' | 'secondary' }>(
  ({ variant }) => <button className={`btn-${variant}`} />,
  'Button'
);

// Snippet with props
const Item = snippet<{ text: string }>(
  ({ text }, parentProps) => <li>{text}</li>,
  'Item'
);

// Mutable with type
const state = mutable<{ count: number }>({ count: 0 });

// NodeRef with type
const inputRef = nodeRef<HTMLInputElement>();
```

## Best Practices

### 1. Logic-Driven Design
**Pattern**: Group data + behavior in objects

```tsx
// ❌ State-Driven
const [newText, setNewText] = useState('');
const [todos, setTodos] = useState([]);
const addTodo = () => {
  setTodos([...todos, { text: newText }]);
  setNewText('');
};
```

```tsx
// ✅ Logic-Driven
const todoApp = mutable({
  newText: '',
  todos: [],
  addTodo() {
    this.todos.push({ text: this.newText });
    this.newText = '';
  }
});
```

### 2. Stable Scopes
**Pattern**: Functions created once, always current

```tsx
// ❌ State-Driven
const increment = () => setCount(count + 1); // Recreated every render
const stableIncrement = useCallback(() => setCount(c => c + 1), []); // Needs useCallback
```

```tsx
// ✅ Logic-Driven
const increment = () => state.count++; // Created once, always current
```

### 3. Surgical Mutations
**Pattern**: Direct property updates

```tsx
// ❌ State-Driven
setUser({ ...user, age: user.age + 1 });
```

```tsx
// ✅ Logic-Driven
user.age++;
```

### 4. Automatic Tracking
**Pattern**: No dependency arrays

```tsx
// ❌ State-Driven
useEffect(() => {
  fetchUser(userId).then(setData);
}, [userId]); // Manual deps
```

```tsx
// ✅ Logic-Driven
effect(() => {
  fetchUser(state.userId).then(d => state.data = d);
}); // Auto-tracked
```

### 5. Efficient Views
**Pattern**: Snippets instead of component splitting

```tsx
// ❌ State-Driven (props drilling)
function UserCard({ user }) {
  return (
    <div>
      <UserHeader name={user.name} />
      <UserBody role={user.role} />
    </div>
  );
}
```

```tsx
// ✅ Logic-Driven (snippets)
export const UserCard = setup(() => {
  const user = mutable({ name: 'John', role: 'Admin' });
  
  const Header = snippet(() => <h1>{user.name}</h1>);
  const Body = snippet(() => <p>{user.role}</p>);
  
  return (
    <div>
      <Header /> {/* Updates only when user.name changes */}
      <Body />   {/* Updates only when user.role changes */}
    </div>
  );
});
```

### 6. Component for Bi-Directional Data Flow

```tsx
// ❌ Parent needs to re-render to get the updated value
const TextInput = template<{ value, onChange }>((props) => (
  <input value={props.value} onChange={props.onChange} />
));
```

```tsx
// ✅ Component updates itself when the value changes
const TextInput = setup<{ value: Bindable<string>, onChange?: (e: Event) => void }>((props) => {
  const handleChange = (e) => {
    props.value = e.currentTarget.value;
    props.onChange?.(e);
  };
  
  return render(() => (
    <input value={props.value} onChange={handleChange} />
  ));
});
```

### 7. Reusable Component for Generic Views

```tsx
// ❌ Too verbose for similar functionalities
const SignUp = setup(() => { 
  const state = mutable({
    email: '',
    password: '',
  });
  
  const handleEmailChange = (e) => state.email = e.currentTarget.value;
  const handlePasswordChange = (e) => state.password = e.currentTarget.value;
  
  const EmailInput = snippet(() => (
    <input value={state.email} onChange={handleEmailChange} />
  ));

  const PasswordInput = snippet(() => (
    <input type="password" value={state.password} onChange={handlePasswordChange} />
  ));
  
  return (
    <form>
      <EmailInput />
      <PasswordInput />
      <button type="submit">Sign Up</button>
    </form>
  );
});
```
```tsx
// ✅ Component with static layout.
const SignUp = setup(() => {
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
});

// ✅ TextInput updates itself when the value changes
const TextInput = setup<{ value: Bindable<string>; type?: string }>((props) => {
  return render(() => (
    <input type={props.type ?? 'text'} value={props.value} onChange={(e) => props.value = e.currentTarget.value} />
  ));
});
```

### 7. Event-Driven Logic
**Pattern**: Direct function calls, not effects

```tsx
// ❌ State-Driven
const [shouldSave, setShouldSave] = useState(false);
const handleSubmit = () => setShouldSave(true);
useEffect(() => {
  if (shouldSave) {
    saveData();
    setShouldSave(false);
  }
}, [shouldSave]);
```

```tsx
// ✅ Logic-Driven
const handleSubmit = () => saveData(state.data);
```

### 8. Computed Properties
**Pattern**: JavaScript getters

```tsx
// ❌ State-Driven
const total = useMemo(() => price * quantity, [price, quantity]);
```

```tsx
// ✅ Logic-Driven
const cart = mutable({
  price: 10,
  quantity: 2,
  get total() { return this.price * this.quantity; }
});
```

## Universal Components (RSC/SSR/CSR)

Anchor components work seamlessly across all rendering modes:

```tsx
export const UserProfile = setup<ProfileProps>(({ id, user }) => {
  const state = mutable<UserState>({
    user: user || null, // If provided (RSC), start loaded
    loading: !user,
    error: null
  });
  
  const getUser = () => {
    if (!id) return;
    state.loading = true;
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        state.user = data;
        state.loading = false;
      });
  };
  
  onMount(() => {
    if (!state.user && id) getUser();
  });
  
  const Content = snippet(() => (
    <div>
      <h1>{state.user?.name}</h1>
      {id && <button onClick={callback(getUser)}>Refresh</button>}
    </div>
  ));
  
  return render(() => {
    if (state.loading) return <div>Loading...</div>;
    if (state.error) return <div>{state.error}</div>;
    return <Content />;
  });
});
```

**Usage**:
- **RSC**: `<UserProfile user={user} />` - Static HTML, zero JS
- **SSR**: `<UserProfile user={user} id={user.id} />` - HTML + hydration
- **CSR**: `<UserProfile id={1} />` - Client-side fetch

## Migration Strategy

### 1. Problem Identification
Identify "hot paths" - high-frequency updates causing re-render cascades

### 2. Gradual Migration (Hybrid)
Isolate hot paths with `mutable` + `snippet`:

```tsx
export const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const formState = mutable({ text: '' }); // Bypass React
  
  const TodoForm = snippet(() => ( // Update boundary
    <input
      value={formState.text}
      onInput={e => formState.text = e.target.value}
    />
  ));
  
  return (
    <div>
      <TodoForm /> {/* No longer triggers TodoApp re-render */}
      <ul>{todos.map(...)}</ul>
    </div>
  );
};
```

### 3. Full Migration
Convert to `setup()` for complete stability:

```tsx
export const TodoApp = setup(() => {
  const formState = mutable({ text: '' });
  const todos = mutable([]);
  
  const handleSubmit = () => {
    todos.push({ text: formState.text });
    formState.text = '';
  };
  
  const TodoForm = snippet(() => (
    <input
      value={formState.text}
      onInput={e => formState.text = e.target.value}
    />
  ));
  
  const TodoList = snippet(() => (
    <ul>{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}</ul>
  ));
  
  return (
    <div>
      <TodoForm />
      <TodoList />
    </div>
  );
});
```

## Common Pitfalls

### ❌ Destructuring Props
```tsx
const { name } = props; // Captures initial value only
```

### ❌ Spreading Props in Setup
```tsx
const divProps = { ...props }; // Error! Use props.$omit([...])
```

### ❌ Accessing State in Static JSX
```tsx
return <div>{state.count}</div>; // Shows initial value, never updates
// Fix: Wrap in render() or use snippet
```

### ❌ Using React Hooks in Setup
```tsx
const [count, setCount] = useState(0); // Breaks stable logic model
```

### ❌ Binding to Immutable State
```tsx
const state = immutable({ count: 0 });
<Counter value={bind(state, 'count')} /> // Error!
```

## Quick Reference

### Imports
```tsx
import {
  // State
  mutable, immutable, writable, derived,
  
  // Component
  setup, render,
  
  // View
  template, snippet,
  
  // Reactivity
  effect, untrack, snapshot, subscribe,
  
  // Lifecycle
  onMount, onCleanup,
  
  // Binding
  $bind, $use, nodeRef, callback
} from '@anchorlib/react';
```

### Client Initialization
```tsx
// main.tsx or app/layout.tsx
import '@anchorlib/react/client'; // ⚠️ Required for reactivity
```

### Decision Trees

**State Type**:
- Local component state → `mutable`
- Shared state → `immutable` + `writable`
- Computed value (same object) → getter
- Computed value (cross-object) → `derived`

**View Type**:
- Primary output → Component View (`render()`)
- Reusable, props-driven → Template
- Component-specific, needs scope → Snippet
- Never changes → Static JSX

**When to Use**:
- `effect` → Reactive side effects
- `onMount` → DOM access after mount
- `onCleanup` → Cleanup on unmount
- `nodeRef` → High-frequency DOM updates
- `$bind()` → Two-way binding (pass-by-reference)
- `$use()` → One-way binding (pass-by-reference)
- `untrack` → Read without subscribing

## Performance Optimization

1. **Use Templates for lists** - Independent item updates
2. **Use Snippets to avoid props drilling** - No performance penalty for large components
3. **Use `nodeRef` for containers** - Avoid re-rendering children
4. **Use getters for derived state** - Auto-cached
5. **Use `untrack` for expensive reads** - Avoid over-subscription
6. **Use Static JSX for layouts** - Zero re-render overhead

## FAQ Quick Answers

**Q: Does Anchor replace React?**
A: No. It's an enhancement layer. React handles rendering, Anchor handles logic stability and fine-grained reactivity.

**Q: Doesn't mutation break React?**
A: No. Anchor uses the Gateway Pattern - mutations are intercepted and trigger only affected Views.

**Q: Is it hard to learn?**
A: No. Uses standard JavaScript (objects, functions) instead of complex hooks.

**Q: Performance overhead?**
A: Minimal. Net gain from stopping re-render cascades vastly outweighs library cost.

**Q: When does it bypass React?**
A: Only with `nodeRef` for high-frequency updates (animations, etc.).

**Q: Can I use React hooks in setup?**
A: You can, but shouldn't. Breaks the stable logic model.

**Q: How are props different?**
A: Props are reactive proxies. Never destructure in setup body. Can destructure in Views (render/template/snippet) since they're reactive boundaries.

**Q: Do I need dependency arrays?**
A: No. Effects track automatically based on what you read.

## Key Principles for AI

1. **Always initialize client**: `import '@anchorlib/react/client'` first
2. **Never destructure props** in setup body (can destructure in Views)
3. **Use `$omit()`/`$pick()`** for rest props in setup body (can use spread in Views)
4. **Wrap reactive JSX** in `render()`, `template()`, or `snippet()`
5. **Prefer `immutable` + `writable`** for shared state
6. **Use getters** for derived state within objects
7. **Use `derived()`** for cross-object computations
8. **Always name components and views** - Pass name as second argument to `setup()`, `render()`, `template()`, and `snippet()` for better React DevTools visibility
9. **Extract list items** to separate views (template or snippet)
10. **Use `query()`** for async operations
11. **Use `persistent()` or `session()`** for browser storage

**Example naming:**
```tsx
// Component with named view
const Tab = setup(() => {
  return render(() => <div>Tab</div>, 'Tab');
}, 'Tab');

// Template
const TodoItem = template(({ todo }) => <li>{todo.text}</li>, 'TodoItem');

// Snippet
const Header = snippet(() => <h1>Title</h1>, 'Header');
```

**React DevTools tree:**
```
- Tab (Setup)
  - Tab (View)
    - TodoItem (Template)
    - Header (Snippet)
```

## Success Checklist

- [ ] Client initialized (`import '@anchorlib/react/client'`)
- [ ] Component uses `setup()` not function component
- [ ] State uses `mutable()` or `immutable()`
- [ ] Props never destructured in setup body (OK in Views)
- [ ] Rest props use `$omit`/`$pick` not spread
- [ ] Reactive JSX wrapped in `render()`, `template()`, or `snippet()`
- [ ] All components and views have names (second argument to setup/render/template/snippet)
- [ ] List items extracted to separate views
- [ ] Effects use `effect()` not `useEffect`
- [ ] No React hooks in setup
- [ ] Shared state uses `immutable` + `writable`
- [ ] Computed values use getters or `derived()`
- [ ] Cleanup handlers defined for side effects
- [ ] Use `query()` for async operations
- [ ] Use `persistent()` or `session()` for state persistence
- [ ] Use `undoable()` for optimistic UI
- [ ] Use `nodeRef` for high-frequency updates
