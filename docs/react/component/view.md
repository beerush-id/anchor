---
title: "View"
description: "The Presentation Layer: Creating reactive UIs that respond to state changes."
keywords:
  - view
  - template
  - presentation layer
  - reactive ui
---

# View

**View** is the Presentation Layer of your Anchor component. It's responsible for displaying your UI and automatically updating when state changes.

Views are **reactive**—they track which state properties they read and re-render only when those specific properties change. This creates efficient, fine-grained updates without manual optimization.

## Understanding Views

A View is any reactive UI that responds to state changes. In Anchor, you create Views in three ways:

1. **Template** - A standalone, reusable View that accepts props
2. **Snippet** - A scoped View defined inside a Component with access to its state
3. **Component View** - The primary View returned immediately via `render()`, tied to the Component's output

```tsx
import { setup, template, render, mutable } from '@anchorlib/react';

// ━━━ COMPONENT (Logic Layer) ━━━
export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  // ━━━ VIEW (Presentation Layer) ━━━
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
}, 'Counter');
```

## Template

A **Template** is a standalone, reusable View defined **outside** any Component. Templates rely entirely on props passed to them and can be shared across multiple Components:

```tsx
// components/UserCard.tsx
interface User { name: string; bio: string }

const UserCard = template<{ user: User }>(({ user }) => (
  <div className="card">
    User: {user.name} <br />
    Bio: {user.bio}
  </div>
), 'UserCard');
```

### Props
Templates receive `props` as their argument:

```tsx
// Template - props only
const MyTemplate = template<Props>((props) => { /* ... */ }, 'MyTemplate');
```

### Pros
- **Best Performance**: Defined once, low memory footprint
- **Reusable**: Can be exported and shared
- **Testable**: Pure function of props

### Cons
- **No Scope Access**: Cannot access Component state/functions
- **More Props**: Must pass data/callbacks explicitly




## Snippet

A **Snippet** is a scoped View defined **inside** a Component. Snippets can access the Component's state through closure:

```tsx
export const Profile = setup(() => {
  const state = mutable({ name: 'Alice', bio: 'Frontend Dev' });

  // Snippet - accesses state.name from closure
  const Avatar = snippet<{ size: number }>(({ size }) => (
    <img src={`/avatars/${state.name}.png`} width={size} />
  ), 'Avatar');

  // Static Layout: Never re-renders
  return (
    <div className="profile">
      {/* Avatar updates when state.name changes */}
      <Avatar size={64} />
      
      {/* UserCard updates when state.name or state.bio changes */}
      <UserCard user={state} />
    </div>
  );
}, 'Profile');
```



### Props
Snippets receive `props` as their first argument and `parentProps` as their second argument:

```tsx
// Snippet - props + parentProps
const MySnippet = snippet<Props>((props, parentProps) => { /* ... */ }, 'MySnippet');
```

- **`props`** (first argument): The props passed to the View
- **`parentProps`** (second argument): Reference to the parent Component's props

### Example with Parent Props

```tsx
interface AppProps {
  theme: 'light' | 'dark';
}

export const App = setup<AppProps>((props) => {
  const state = mutable({ items: ['A', 'B', 'C'] });

  // Snippet accesses both its own props and parent props
  const Item = snippet<{ text: string }>(
    ({ text }, { theme }) => (
      <div className={`item theme-${theme}`}>
        {text}
      </div>
    ),
    'Item'
  );

  return render(() => (
    <div>
      {state.items.map(item => <Item key={item} text={item} />)}
    </div>
  ));
}, 'App');
```

### Pros
- **Easy Access**: Can use state/functions from closure
- **Convenient**: Less prop passing required
- **Co-located**: Keeps related logic together

### Cons
- **Lower Performance**: Re-created for every Component instance
- **Not Reusable**: Tightly coupled to Component logic


## Component View

A **Component View** is the primary reactive View returned immediately via `render()`. It's tied directly to the Component's output—when this View updates, the Component's rendered output updates.

```tsx
export const Banner = setup(() => {
  const state = mutable({ title: 'Hello', description: 'World' });

  // Component View
  return render(() => (
    <div>
      <h1>{state.title}</h1>
      <p>{state.description}</p>
    </div>
  ));
}, 'Banner');
```

### Pros
- **Immediate**: No need to define a separate variable
- **Direct**: Simplest way to return UI from a Component
- **Reactive**: Updates automatically with state changes

### Cons
- **Not Reusable**: Tightly coupled to the specific Component
- **Monolithic**: Can become hard to manage if the UI is complex (use Templates/Snippets to break it up)


### Choosing the Right Approach

| Feature | Template | Snippet |
| :--- | :--- | :--- |
| **Scope Access** | **No** (Props only) | **Yes** (Full closure access) |
| **Data Flow** | Explicit (passed via props) | Implicit (captured from closure) |
| **Reusability** | **High** (Export & share) | **Low** (Bound to component) |
| **Performance** | **Best** (Defined once) | **Good** (Defined per instance) |

## Working With Props

Anchor handles props differently depending on whether you are working with a **Component** (via `setup`) or a **View** (via `template`/`snippet`).

### Component Props (Setup)

In `setup()` and `snippet()`'s `parentProps`, the props object is a **Reactive Proxy**. This enables fine-grained reactivity but comes with specific rules:

1.  **Do NOT use `...rest` (Spread)**: Spreading props (`const { ...rest } = props`) **inside a reactive boundary** will **log an error and ignore the access**, preventing unintentional subscriptions to every property.
2.  **Use `$omit` and `$pick`**: Use these built-in helpers to safely handle "rest props" without over-subscribing.

**Why?** To maintain fine-grained reactivity, you should access specific properties directly (e.g., `props.variant`). Spreading `props` indiscriminately (`{...props}`) subscribes to *everything*, breaking this optimization. `$omit` creates a filtered proxy that allows you to spread only the *remaining* properties.

```tsx
export const Card = setup<CardProps>((props) => {
  // 1. Create the "rest" proxy in the setup body (runs once)
  // This proxy excludes properties that we handle explicitly in the view
  const divProps = props.$omit(['variant']);
  
  return render(() => (
    // 2. Access specific props directly (tracks 'variant')
    <div className={`card-${props.variant}`} {...divProps}>
      {props.children}
    </div>
  ));
}, 'Card');
```

- **`props.$omit(keys)`**: Returns a proxy with specified keys excluded.
- **`props.$pick(keys)`**: Returns a proxy with only specified keys included.

### View Props (Template & Snippet)

In `template()` and `snippet()` (first argument), props are **standard objects** (like in regular React).

- **Standard Destructuring**: You can safeley use destructuring and `...rest` here.
- **No `$omit`/`$pick`**: These helpers are **not available** on standard view props.

```tsx
// Standard usage in Template
const Button = template<ButtonProps>(({ variant, ...rest }) => (
  // Spreading rest is fine here because 'props' is not a reactive proxy
  <button className={`btn-${variant}`} {...rest} />
), 'Button');
```

> [!NOTE] Reactive State in Props
> While View props themselves aren't proxied, if you pass a reactive object (like a `mutable` state) *as* a prop, accessing its properties inside the View will still trigger updates correctly.

## Static Layout

You can return JSX directly from the Component to create a **static layout** that never re-renders. Embed Templates inside to make specific parts reactive:

```tsx
export const Dashboard = setup(() => {
  const state = mutable({ title: 'Dashboard', data: [] });

  // Templates
  const Header = template(() => <header>{state.title}</header>, 'Header');
  const Content = template(() => <main>{state.data}</main>, 'Content');

  // Static Layout (runs once)
  return (
    <div className="layout">
      <Header /> {/* Updates when state.title changes */}
      <div className="sidebar">Static Sidebar</div>
      <Content /> {/* Updates when state.data changes */}
    </div>
  );
}, 'Dashboard');
```

**Benefits:**
- The layout `div`s never re-render
- Only `Header` and `Content` update when their dependencies change
- Event handlers and static content remain stable

## List Rendering

When rendering lists, you should always extract the item into a separate View to ensure granular updates. You can choose between a **Template** or a **Snippet** depending on whether the item needs access to the component's scope.

### Using Template (No Scope Access)

Use a `template()` when the item is self-contained and doesn't need to call functions from the component's scope. This is ideal for pure presentation or items that only modify their own mutable prop.

```tsx
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// Standalone Template - relies only on props
const TodoItem = template<{ todo: Todo }>(({ todo }) => (
  <li>
    <input
      type="checkbox"
      checked={todo.done}
      onChange={() => todo.done = !todo.done}
    />
    <span>{todo.text}</span>
  </li>
), 'TodoItem');
```

### Using Snippet (Scope Access Required)

Use a `snippet()` when the item needs to interact with the component's Logic Layer, such as removing itself from a list. Since Snippets are defined *inside* the component, they can access functions like `removeTodo` directly from the closure.

```tsx
export const TodoList = setup(() => {
  const state = mutable({
    todos: [
      { id: 1, text: 'Learn Anchor', done: false },
      { id: 2, text: 'Build app', done: false }
    ],
    
    // Method on the object
    remove(todo) {
      const index = this.todos.indexOf(todo);
      if (index !== -1) {
        this.todos.splice(index, 1);
      }
    }
  });

  // Snippet - can access state from closure
  const TodoItem = snippet<{ todo: Todo }>(({ todo }) => (
    <li>
      <span>{todo.text}</span>
      {/* Pass the object, not the ID */}
      <button onClick={() => state.remove(todo)}>Remove</button>
    </li>
  ), 'TodoItem');

  return render(() => (
    <ul>
      {state.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  ));
}, 'TodoList');
```

## Common Patterns

### Accessing Reactive State in Static JSX

JSX returned directly from the Component (not wrapped in `render()`) is **static**—created once and never re-evaluated.

**✅ Works:** Static JSX can contain reactive Templates (they update independently)
```tsx
export const Layout = setup(() => {
  const state = mutable({ title: 'Dashboard' });
  
  const Header = template(() => <h1>{state.title}</h1>, 'Header');
  
  // Static wrapper
  return (
    <div className="layout">
      <Header /> {/* This Template updates when state.title changes */}
      <div className="sidebar">Navigation</div> {/* This is static */}
    </div>
  );
}, 'Layout');
```

**❌ Doesn't Work:** Static JSX displays the **initial value** but won't react to state changes
```tsx
export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  // Static wrapper
  return (
    <div>
      <button onClick={() => state.count++}>+</button>
      <span>{state.count}</span> {/* Shows initial value (0), never updates */}
    </div>
  );
}, 'Counter');
```

**✅ Fix:** Wrap in `render()` to make JSX reactive
```tsx
export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  return render(() => (
    <div>
      <button onClick={() => state.count++}>+</button>
      <span>{state.count}</span> {/* Updates correctly! */}
    </div>
  ));
}, 'Counter');
```

**The rule:** If your JSX needs to **read** reactive state, wrap it in `render()`, `template()`, or `snippet()`. If it only **contains** static UI, returning static JSX is fine.

## When to Use What?

| Approach | Purpose | Use Case |
| :--- | :--- | :--- |
| **Template** | Standalone View | List items, cards, modals, shared UI components |
| **Snippet** | Scoped View | Component-specific parts that access local state |
| **Component View** | Component View | Primary Component output, simple reactive UIs |
| **Static JSX** | Static Layout | Wrapper layouts, containers with embedded Views |

## Best Practices

### 1. Name Your Views
Always provide a display name as the second argument to `template()` and `snippet()`. This makes debugging in React DevTools much easier:

```tsx
const Header = template(() => <header>...</header>, 'Header');
const Body = snippet(() => <main>...</main>, 'Body');
```

### 2. Choose the Right Scope
- **Template**: When the View is purely presentational and doesn't need Component state
- **Snippet**: When the View needs to access Component state directly
- **Component View**: When the View is the Component's primary output
- **Static JSX**: When the View is a static layout with embedded Views

### 3. Optimize List Rendering
Extract list items into Templates for independent updates. This prevents re-rendering the entire list when a single item changes.

### 4. Separate Static from Reactive
Use static JSX for layouts and containers that never change. Embed Templates for the parts that need to update.
