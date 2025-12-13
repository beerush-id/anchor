# Anchor for React - AI Knowledge Base

> **Purpose**: Comprehensive reference for AI assistants to build robust Anchor applications with high success rate, minimal tokens, and maximum maintainability.

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

### 4. State Scope Patterns

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

// ✅ Safe for CSR only or use React Context for SSR
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

```tsx
return render(() => <div>{state.value}</div>);
```

#### B. Template
* **Use for**: Standalone, reusable, props-driven Views
* **Created with**: `template()`
* **Scope**: No access to component state

```tsx
const UserCard = template<{ user: User }>(({ user }) => (
  <div>{user.name}</div>
), 'UserCard');

// Pros: Best performance, reusable, testable
// Cons: No scope access, more props
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

**Component Props** (`setup` and `snippet` parentProps):
- Reactive proxies
- ⚠️ **Never use `...rest` spread** - logs error
- Use `$omit` and `$pick` for rest props

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

**View Props** (`template` and `snippet` first arg):
- Standard objects (like React)
- ✅ Can use destructuring and `...rest`

```tsx
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

### 1. Binding Reference (`bind(source, key?)`)

* **Use for**: Mark a prop as state binding reference.
* **Behavior**: Pass-by-reference, read and write happens in the child component.
* **Pattern**: Only for component created with `setup()`.

**Parent**:
```tsx
const count = mutable(0);
const state = mutable({ count: 0 });

// Binding to MutableRef.
<Counter value={bind(count)} />

// Binding to specific key.
<Counter value={bind(state, 'count')} />
```

**Child**:
```tsx
export const Counter = setup<{ value: number }>((props) => {
  const increment = () => props.value++; // Updates parent!
  return render(() => <button onClick={increment}>{props.value}</button>);
});
```

### 2. Bindable Interface (`bindable(init, source, key)`)

* **Use for**: External state binding
* **Behavior**:
  * Using the init value if the source is not defined.
  * Internal value changes, source changes, and vice versa.

```tsx
export const NameInpuut = setup<{ user: User }>((props) => {
  const text = bindable('', props.user, 'name'); // Syncs with user.name
  
  return render(() => (
    <input
      value={text.value}
      onInput={(e) => text.value = e.currentTarget.value}
    />
  ));
});
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
const TextInput = setup<{ value, onChange? }>((props) => {
  const handleChange = (e) => {
    props.value = e.currentTarget.value;
    props.onChange?.(e);
  }
  
  return render(() => (
    <TextInput value={props.value} onChange={handleChange} />
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
  
  const EmailInput = snippet(() => (
    <input value={state.email} onChange={(e) => state.email = e.currentTarget.value} />
  ));

  const PasswordInput = snippet(() => (
    <input type="password" value={state.password} onChange={(e) => state.password = e.currentTarget.value} />
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
      <TextInput value={bind(state, 'email')} />
      <TextInput type="password" value={bind(state, 'password')} />
      <button type="submit">Sign Up</button>
    </form>
  );
});

// ✅ TextInput updates itself when the value changes
const TextInput = setup<{ value, type? }>((props) => {
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
  bind, bindable, nodeRef, callback
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
- `bind` → Two-way binding
- `untrack` → Read without subscribing

## Performance Optimization

1. **Use Templates for lists** - Independent item updates
2. **Use Snippets to avoid props drilling** - No performance penalty for large components
3. **Use `nodeRef` for containers** - Avoid re-rendering children
4. **Use getters for derived state** - Auto-cached
5. **Use `untrack` for expensive reads** - Avoid over-subscription
6. **Use Static JSX for layouts** - Zero re-render overhead

## TypeScript Patterns

```tsx
// Component with props
interface Props {
  value: number;
  onChange?: (val: number) => void;
}

export const Counter = setup<Props>((props) => {
  // ...
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
A: Props are reactive proxies that update in-place (no re-render). Never destructure in setup body.

**Q: Do I need dependency arrays?**
A: No. Effects track automatically based on what you read.

## Key Principles for AI

1. **Always initialize client**: `import '@anchorlib/react/client'` first
2. **Never destructure props** in setup body or reactive boundaries
3. **Use `$omit`/`$pick`** for rest props in setup, standard spread in views
4. **Wrap reactive JSX** in `render()`, `template()`, or `snippet()`
5. **Prefer `immutable` + `writable`** for shared state
6. **Use getters** for derived state within objects
7. **Use `derived()`** for cross-object computations
8. **Name all views** (second argument to template/snippet)
9. **Extract list items** to separate views (template or snippet)
10. **Use `effect` not `onMount`** for data fetching that depends on state

## Success Checklist

- [ ] Client initialized (`import '@anchorlib/react/client'`)
- [ ] Component uses `setup()` not function component
- [ ] State uses `mutable()` or `immutable()`
- [ ] Props never destructured in setup body
- [ ] Rest props use `$omit`/`$pick` not spread
- [ ] Reactive JSX wrapped in `render()`, `template()`, or `snippet()`
- [ ] All views have display names
- [ ] List items extracted to separate views
- [ ] Effects use `effect()` not `useEffect`
- [ ] No React hooks in setup
- [ ] Shared state uses `immutable` + `writable`
- [ ] Computed values use getters or `derived()`
- [ ] Cleanup handlers defined for side effects
