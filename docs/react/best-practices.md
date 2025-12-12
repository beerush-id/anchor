---
title: "Best Practices"
description: "Essential patterns for building efficient, maintainable applications with Anchor."
keywords:
  - best practices
  - patterns
  - javascript
  - logic-driven design
---

# Best Practices

This guide covers essential patterns for building applications with Anchor. These practices help you write code that is more maintainable, performant, and aligned with JavaScript's natural idioms.

## Core Principles

Anchor enables you to write applications using standard JavaScript patterns. The key is to shift from **state-driven thinking** (where you manage state changes) to **logic-driven thinking** (where you group data and behavior together).

This shift brings several benefits:
- **Simpler Code**: Use standard JavaScript objects, methods, and getters instead of specialized state management patterns
- **Better Performance**: Fine-grained reactivity updates only what changed, not entire component trees
- **Easier Maintenance**: Logic and data stay together, making code easier to understand and modify
- **Natural Flow**: Code reads like regular JavaScript, reducing cognitive overhead

## 1. Logic-Driven Design

Group related data and logic into cohesive models instead of scattering state across multiple variables.

### The Pattern

In state-driven approaches, you often split related data into separate state variables, leading to verbose updates and scattered logic.

In Anchor, you group everything into a single object with methods that encapsulate behavior.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Scattered state and verbose updates
const [newText, setNewText] = useState('');
const [todos, setTodos] = useState([]);

const addTodo = () => {
  setTodos([...todos, { text: newText, done: false }]);
  setNewText('');
};
```

**Logic-Driven Approach:**

```tsx
// ✅ Cohesive model with encapsulated behavior
const todoApp = mutable({
  newText: '',
  todos: [],
  
  addTodo() {
    this.todos.push({ text: this.newText, done: false });
    this.newText = '';
  }
});

// Usage
todoApp.addTodo();
```

### Benefits

**Cohesion**: All related data and operations live in one place. You don't need to hunt through the file to find where `newText` is used or how `todos` is updated.

**Discoverability**: When you have `todoApp`, you can see all available operations via autocomplete. With scattered state, you need to remember function names.

**Testability**: You can export the model factory and test it independently:

```tsx
// models/todoApp.ts
export function createTodoApp() {
  return mutable({
    newText: '',
    todos: [],
    addTodo() { /* ... */ }
  });
}

// todoApp.test.ts
const app = createTodoApp();
app.newText = 'Test';
app.addTodo();
expect(app.todos).toHaveLength(1);
```

**Portability**: The same model can be used in different UI frameworks or even in Node.js for server-side logic.

### When to Use

- **Always** for component-local state with multiple related properties
- **Always** for shared application state (user session, settings, cart)
- **Always** when state has associated operations (add, remove, update, validate)

Use separate variables only for truly independent values (like a single loading flag that doesn't relate to any other state).

### Reusable State Factories

For complex or shared logic, define factory functions outside components:

```tsx
// stores/cart.ts
export function createCart() {
  return mutable({
    items: [],
    
    add(product, quantity = 1) {
      const existing = this.items.find(i => i.product.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({ product, quantity });
      }
    },
    
    remove(item) {
      const index = this.items.indexOf(item);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    },
    
    get total() {
      return this.items.reduce((sum, item) => 
        sum + item.product.price * item.quantity, 0
      );
    }
  });
}

// Use in any component
const cart = createCart();
cart.add(product, 2);
```

## 2. Stable Scopes

Leverage stable, single-run logic instead of managing stale closures and recreated functions.

### The Pattern

In state-driven approaches, component functions re-execute on every render, recreating functions and requiring patterns like `useCallback` to maintain stable references.

In Anchor, the Component runs once. Functions are created once and always reference the current state—no stale closures, no memoization needed.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Functions recreated on every render
const [count, setCount] = useState(0);

// This function is recreated on every render
const increment = () => setCount(count + 1);

// Need useCallback to stabilize
const stableIncrement = useCallback(() => {
  setCount(c => c + 1);
}, []); // Empty deps, but uses updater function
```

**Logic-Driven Approach:**

```tsx
// ✅ Function created once, always current
export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  // Created once, always references current state.count
  const increment = () => state.count++;
  
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
});
```

### Benefits

**No Stale Closures**: Functions always reference the current state because they access it through the reactive proxy, not by capturing a snapshot.

**No Memoization**: You never need `useCallback`, `useMemo`, or dependency arrays. Functions are stable by default.

**Simpler Code**: Write straightforward functions without worrying about closure capture or optimization patterns.

**Better Performance**: No function recreation overhead. The same function reference is used throughout the component's lifetime.

### When to Use

- **Always** define functions inside `setup()` for component logic
- **Always** access state through the reactive object (`state.count`) rather than destructuring
- Use this pattern for event handlers, computed logic, and any operation that needs current state

### Common Pitfall

```tsx
// ❌ Avoid: Destructuring breaks reactivity
const { count } = state; // Captures current value
const increment = () => count++; // Won't work, 'count' is a number

// ✅ Correct: Access through the object
const increment = () => state.count++; // Always current
```

## 3. Surgical Mutations

Use direct property updates instead of immutable copy-on-write patterns.

### The Pattern

In state-driven approaches, you create new objects/arrays for every update to trigger re-renders. This is verbose and creates garbage collection overhead.

In Anchor, you update properties directly. The reactive system detects the change and updates only the affected Views.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Verbose immutable updates
const [user, setUser] = useState({ name: 'John', age: 30 });

// Update requires spreading and creating new object
setUser({ ...user, age: user.age + 1 });

// Nested updates are even worse
const [app, setApp] = useState({
  user: { profile: { name: 'John' } }
});

setApp({
  ...app,
  user: {
    ...app.user,
    profile: {
      ...app.user.profile,
      name: 'Jane'
    }
  }
});
```

**Logic-Driven Approach:**

```tsx
// ✅ Direct, surgical updates
const user = mutable({ name: 'John', age: 30 });
user.age++;

// Nested updates are just as simple
const app = mutable({
  user: { profile: { name: 'John' } }
});
app.user.profile.name = 'Jane';
```

### Benefits

**Clarity**: Updates read like natural JavaScript. `user.age++` is immediately understandable.

**Performance**: No object spreading, no intermediate objects created, no garbage collection pressure.

**Precision**: Only the exact property that changed triggers updates. Changing `user.age` doesn't affect Views displaying `user.name`.

**Simplicity**: No need to remember spreading patterns or use helper libraries like Immer.

### When to Use

- **Always** for local component state (state inside `setup()`)
- **Always** for mutable objects passed as props (when the parent expects updates)
- Use for any state where you control both reads and writes

For shared state across components, consider using `immutable()` with `writable()` contracts to control who can modify what.

### Working with Arrays

```tsx
const state = mutable({ todos: [] });

// ✅ Direct array methods work perfectly
state.todos.push({ text: 'New', done: false });
state.todos[0].done = true;

// Remove completed todos in place
for (let i = state.todos.length - 1; i >= 0; i--) {
  if (state.todos[i].done) {
    state.todos.splice(i, 1);
  }
}

// All of these trigger fine-grained updates
```

## 4. Automatic Tracking

Let the system track dependencies automatically instead of manually managing dependency arrays.

### The Pattern

In state-driven approaches, you manually list dependencies in arrays for effects and memoization. This is error-prone and leads to bugs when dependencies are missed or stale.

In Anchor, dependencies are tracked automatically based on what you actually read during execution.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Manual dependency management
const [userId, setUserId] = useState(1);
const [data, setData] = useState(null);

useEffect(() => {
  fetchUser(userId).then(setData);
}, [userId]); // Must remember to list dependencies

// Easy to forget dependencies
useEffect(() => {
  if (settings.debug) {
    console.log(data); // Bug: 'data' not in deps!
  }
}, [settings.debug]); // Missing 'data'
```

**Logic-Driven Approach:**

```tsx
// ✅ Automatic dependency tracking
const state = mutable({ userId: 1, data: null });
const settings = mutable({ debug: false });

effect(() => {
  fetchUser(state.userId).then(d => state.data = d);
}); // Automatically tracks state.userId

// Dependencies tracked dynamically
effect(() => {
  if (settings.debug) {
    console.log(state.data); // Automatically tracks both
  }
}); // Tracks settings.debug and state.data (when debug is true)
```

### Benefits

**No Bugs from Missing Dependencies**: The system tracks every property you read. You can't forget to list a dependency.

**Dynamic Tracking**: Dependencies change based on execution path. If a branch isn't taken, its dependencies don't cause re-runs.

**Simpler Code**: No dependency arrays to maintain. Just write the logic.

**Correctness**: The effect always has the exact dependencies it needs *right now*, not what you thought it needed when you wrote it.

### When to Use

- **Always** use `effect()` instead of `useEffect` in Anchor components
- **Always** use `derived()` instead of `useMemo` for computed values
- Let the system track dependencies; don't try to manually optimize

### Dynamic Tracking Example

```tsx
effect(() => {
  if (state.showDetails) {
    // This property is ONLY tracked when showDetails is true
    console.log(state.details);
  }
});

// When showDetails is false:
// - Changing state.details does NOT trigger the effect
// When showDetails becomes true:
// - Effect re-runs, reads details, starts tracking it
// - Now changing state.details WILL trigger the effect
```

This dynamic behavior is impossible with manual dependency arrays.

## 5. Efficient Views

Use fine-grained reactive Views instead of splitting components for performance.

### The Pattern

In state-driven approaches, you split components into smaller pieces to prevent unnecessary re-renders. This leads to props drilling and scattered logic.

In Anchor, you use Templates and Snippets to create update boundaries *within* a component, keeping related logic together while achieving fine-grained updates.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Component splitting for performance
function UserCard({ user }) {
  return (
    <div className="card">
      <UserHeader name={user.name} />
      <UserBody role={user.role} />
    </div>
  );
}

// Separate components to prevent re-renders
const UserHeader = memo(({ name }) => (
  <div className="header">
    <h1>{name}</h1>
  </div>
));

const UserBody = memo(({ role }) => (
  <div className="body">
    <p>Role: {role}</p>
  </div>
));
```

**Logic-Driven Approach:**

```tsx
// ✅ Snippets for granular updates
export const UserCard = setup(() => {
  const user = mutable({ name: 'John', role: 'Admin' });
  
  // Snippets access state directly, no props drilling
  const Header = snippet(() => (
    <div className="header">
      <h1>{user.name}</h1>
    </div>
  ));
  
  const Body = snippet(() => (
    <div className="body">
      <p>Role: {user.role}</p>
    </div>
  ));
  
  // Static layout, never re-renders
  return (
    <div className="card">
      <Header /> {/* Updates only when user.name changes */}
      <Body />   {/* Updates only when user.role changes */}
    </div>
  );
});
```

### Benefits

**Cohesion**: Related UI parts stay together in the same file. You don't need to jump between files to understand the component.

**No Props Drilling**: Snippets access state directly from the closure. No need to pass data through layers.

**Automatic Optimization**: Each Snippet updates independently. Changing `user.role` doesn't re-render `Header`.

**Simpler Mental Model**: You think about "what updates when" rather than "how to prevent re-renders."

### When to Use

**Use Snippets when:**
- Breaking up a large View into logical sections
- The View needs access to component state/functions
- You want to keep related logic co-located

**Use Templates when:**
- Creating reusable UI components (buttons, cards, modals)
- The View is purely presentational (props-driven)
- You want to share the View across multiple components

**Use Static JSX when:**
- The layout never changes (wrapper divs, containers)
- You're embedding reactive Snippets/Templates inside

### List Rendering Pattern

```tsx
// Template for reusable, self-contained items
const TodoItem = template<{ todo: Todo }>(({ todo }) => (
  <li>
    <input
      type="checkbox"
      checked={todo.done}
      onChange={() => todo.done = !todo.done}
    />
    <span>{todo.text}</span>
  </li>
));

// Snippet when items need component functions
export const TodoList = setup(() => {
  const state = mutable({
    todos: [],
    
    // Method on the object - portable and encapsulated
    remove(todo) {
      const index = this.todos.indexOf(todo);
      if (index !== -1) {
        this.todos.splice(index, 1);
      }
    }
  });
  
  // Snippet can access state from closure
  const TodoItem = snippet<{ todo: Todo }>(({ todo }) => (
    <li>
      <span>{todo.text}</span>
      {/* Pass the object itself, not the ID */}
      <button onClick={() => state.remove(todo)}>Remove</button>
    </li>
  ));
  
  return render(() => (
    <ul>
      {state.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  ));
});
```

## 6. Event-Driven Logic

Use direct function calls for user interactions instead of effect-driven side effects.

### The Pattern

In state-driven approaches, you often use effects to respond to state changes, even for user-triggered actions. This creates indirect, hard-to-follow logic.

In Anchor, you call functions directly in response to events. Effects are reserved for true side effects (syncing with external systems, logging, etc.).

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Effect-driven logic
const [shouldSave, setShouldSave] = useState(false);

const handleSubmit = () => {
  setShouldSave(true);
};

useEffect(() => {
  if (shouldSave) {
    saveData();
    setShouldSave(false);
  }
}, [shouldSave]);
```

**Logic-Driven Approach:**

```tsx
// ✅ Direct function calls
export const Form = setup(() => {
  const state = mutable({ data: {} });
  
  const handleSubmit = () => {
    saveData(state.data);
  };
  
  return render(() => (
    <button onClick={handleSubmit}>Submit</button>
  ));
});
```

### Benefits

**Clarity**: The flow is obvious. Click button → call function → save data. No intermediate state flags.

**Debuggability**: You can set breakpoints in the event handler and step through the logic. With effects, you need to trace through state changes.

**Simplicity**: No need to manage boolean flags or track effect execution order.

**Predictability**: Functions execute exactly when called, not "sometime after the next render."

### When to Use

**Use direct function calls for:**
- User interactions (clicks, form submissions, input changes)
- Immediate responses to events
- Synchronous operations

**Use effects for:**
- Syncing with external systems (localStorage, WebSocket)
- Responding to prop changes from parent
- Logging or analytics
- Setting up subscriptions

### Example: Form Validation

```tsx
// ✅ Direct validation on submit
export const LoginForm = setup(() => {
  const state = mutable({
    email: '',
    password: '',
    errors: {}
  });
  
  const validate = () => {
    const errors = {};
    if (!state.email.includes('@')) {
      errors.email = 'Invalid email';
    }
    if (state.password.length < 8) {
      errors.password = 'Too short';
    }
    state.errors = errors;
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = () => {
    if (validate()) {
      login(state.email, state.password);
    }
  };
  
  return render(() => (
    <form onSubmit={handleSubmit}>
      <input
        value={state.email}
        onInput={e => state.email = e.target.value}
      />
      {state.errors.email && <span>{state.errors.email}</span>}
      <button type="submit">Login</button>
    </form>
  ));
});
```





Use closure-based access to share state instead of props drilling.

### The Pattern

In state-driven approaches, you pass data through multiple component layers via props, even when intermediate components don't use the data.

In Anchor, Snippets can access state directly from the closure, eliminating props drilling while keeping components cohesive.

### Comparison

```tsx
// ❌ State-Driven: Props drilling
function Dashboard({ user }) {
  return (
    <div>
      <Sidebar user={user} />
      <Content user={user} />
    </div>
  );
}

function Sidebar({ user }) {
  return (
    <nav>
      <UserMenu user={user} />
    </nav>
  );
}

function UserMenu({ user }) {
  return <div>Welcome, {user.name}</div>;
}

// ✅ Logic-Driven: Direct access via closure
export const Dashboard = setup(() => {
  const user = mutable({ name: 'John', role: 'Admin' });
  
  const UserMenu = snippet(() => (
    <div>Welcome, {user.name}</div>
  ));
  
  const Sidebar = snippet(() => (
    <nav>
      <UserMenu />
    </nav>
  ));
  
  const Content = snippet(() => (
    <main>
      <h1>Dashboard for {user.name}</h1>
    </main>
  ));
  
  return (
    <div>
      <Sidebar />
      <Content />
    </div>
  );
});
```

### Benefits

**No Props Drilling**: Deeply nested Snippets access state directly. No need to pass props through intermediate layers.

**Cohesion**: All related UI stays in one component. You can see the entire structure at a glance.

**Flexibility**: Add new Snippets that need `user` without updating intermediate components.

**Simplicity**: Less code, fewer props to track, easier to understand.

### When to Use

**Use Snippets with closure access when:**
- Multiple nested Views need the same state
- Intermediate Views don't use the state
- The Views are specific to this component (not reusable)

**Use Templates with props when:**
- Creating reusable components
- The component should work with any data source
- You want to test the View in isolation

### Combining Both Approaches

```tsx
// Reusable Template (props-based)
const UserCard = template<{ user: User }>(({ user }) => (
  <div className="card">
    <h2>{user.name}</h2>
    <p>{user.role}</p>
  </div>
));

// Component with Snippets (closure-based)
export const TeamDashboard = setup(() => {
  const team = mutable({
    members: [],
    selected: null
  });
  
  // Snippet accesses team from closure
  const MemberList = snippet(() => (
    <ul>
      {team.members.map(member => (
        <li key={member.id} onClick={() => team.selected = member}>
          {/* Template receives data via props */}
          <UserCard user={member} />
        </li>
      ))}
    </ul>
  ));
  
  return <MemberList />;
});
```

## 7. Computed Properties

Use JavaScript getters for derived values instead of separate computed state.

### The Pattern

In state-driven approaches, you often create separate state or memoized values for computed data, leading to synchronization issues.

In Anchor, you use standard JavaScript getters. They automatically recompute when dependencies change.

### Comparison

**State-Driven Approach:**

```tsx
// ❌ Separate computed state
const [price, setPrice] = useState(10);
const [quantity, setQuantity] = useState(2);
const [total, setTotal] = useState(20);

// Must manually sync
const updatePrice = (newPrice) => {
  setPrice(newPrice);
  setTotal(newPrice * quantity);
};

const updateQuantity = (newQty) => {
  setQuantity(newQty);
  setTotal(price * newQty);
};

// Or use useMemo
const total = useMemo(() => price * quantity, [price, quantity]);
```

**Logic-Driven Approach:**

```tsx
// ✅ JavaScript getter
const cart = mutable({
  price: 10,
  quantity: 2,
  
  get total() {
    return this.price * this.quantity;
  }
});

// Usage: Always in sync
cart.price = 20;
console.log(cart.total); // 40 (automatically updated)
```

### Benefits

**Single Source of Truth**: No duplicate state to keep in sync. The getter computes from source data.

**Automatic Updates**: When `price` or `quantity` changes, `total` automatically reflects the new value.

**No Manual Dependencies**: You don't list dependencies. The getter just reads what it needs.

**Standard JavaScript**: Uses language features everyone knows. No framework-specific patterns.

### When to Use

**Use getters for:**
- Values derived from other properties in the same object
- Formatting or transforming data for display
- Filtering or sorting collections
- Any computation that should always reflect current state

**Use `derived()` for:**
- Values computed from multiple separate state objects
- Complex computations that need caching
- View models that transform domain objects

### Complex Example

```tsx
const todoApp = mutable({
  todos: [
    { text: 'Buy milk', done: false, priority: 'high' },
    { text: 'Walk dog', done: true, priority: 'low' }
  ],
  filter: 'all', // 'all' | 'active' | 'completed'
  sortBy: 'priority', // 'priority' | 'text'
  
  get filteredTodos() {
    let result = this.todos;
    
    if (this.filter === 'active') {
      result = result.filter(t => !t.done);
    } else if (this.filter === 'completed') {
      result = result.filter(t => t.done);
    }
    
    return result;
  },
  
  get sortedTodos() {
    return [...this.filteredTodos].sort((a, b) => {
      if (this.sortBy === 'priority') {
        return a.priority.localeCompare(b.priority);
      }
      return a.text.localeCompare(b.text);
    });
  },
  
  get stats() {
    return {
      total: this.todos.length,
      active: this.todos.filter(t => !t.done).length,
      completed: this.todos.filter(t => t.done).length
    };
  }
});

// Usage: All getters update automatically
todoApp.filter = 'active';
console.log(todoApp.sortedTodos); // Filtered and sorted

todoApp.todos[0].done = true;
console.log(todoApp.stats); // Updated counts
```

## Summary

These best practices help you write Anchor applications that are:

- **Maintainable**: Logic and data stay together, making code easier to understand and modify
- **Performant**: Fine-grained reactivity updates only what changed, not entire component trees
- **Natural**: Code reads like standard JavaScript, reducing cognitive overhead
- **Testable**: State logic can be extracted and tested independently of UI

The key shift is from **state-driven thinking** (managing state changes) to **logic-driven thinking** (grouping data and behavior). This aligns with JavaScript's natural idioms and makes your code simpler, clearer, and more efficient.

