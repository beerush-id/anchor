---
title: "View & Template"
description: "The Presentation Layer: Creating reactive UIs that respond to state changes."
keywords:
  - view
  - template
  - presentation layer
  - reactive ui
---

# View & Template

The **View** is the Presentation Layer of your Anchor component. It's responsible for displaying your UI and automatically updating when state changes.

Views are **reactive**—they track which state properties they read and re-render only when those specific properties change. This creates efficient, fine-grained updates without manual optimization.

## Understanding Views

A View is any reactive UI that responds to state changes. In Anchor, you create Views in two ways:

1. **Template** - A reusable View that accepts props
2. **Component View** - A View that belongs to a specific Component

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

## Template: Reusable Views

A **Template** is a View that can be reused across your application. Templates accept props and update independently when their dependencies change.

### Standalone Templates

Standalone Templates are defined **outside** any Component. They rely entirely on props passed to them:

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

**Use standalone Templates when:**
- The Template doesn't need access to Component state
- You want to share the Template across multiple Components
- The Template is purely presentational

### Internal Templates

Internal Templates are defined **inside** a Component. They can access the Component's state through closure:

```tsx
export const Profile = setup(() => {
  const state = mutable({ name: 'Alice', bio: 'Frontend Dev' });

  // Internal Template - accesses state.name from closure
  const Avatar = template<{ size: number }>(({ size }) => (
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

**Use internal Templates when:**
- The Template needs to access Component state directly
- The Template is specific to this Component
- You want to avoid passing many props

## Component Views

A **Component View** is a reactive View that belongs to a specific Component, created using `render()`. Unlike Templates, Component Views don't accept props—they access state through closure.

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

**Use Component Views when:**
- The entire Component UI needs to be reactive
- You don't need to reuse the View elsewhere
- The View is simple and self-contained

## Template Props

Templates receive two arguments:

```tsx
const MyTemplate = template<Props>((props, parentProps) => { /* ... */ }, 'MyTemplate');
```

- **`props`** (first argument): The props passed to the Template
- **`parentProps`** (second argument): Reference to the parent Component's props (only available for internal Templates)

### Example with Parent Props

```tsx
interface AppProps {
  theme: 'light' | 'dark';
}

export const App = setup<AppProps>((props) => {
  const state = mutable({ items: ['A', 'B', 'C'] });

  // Internal Template accesses both its own props and parent props
  const Item = template<{ text: string }>(
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

> [!WARNING] Rest Props
> Using `const { prop1, ...rest } = props` reads **all properties** from props, causing the Template to re-render whenever *any* prop changes, even unused ones.
>
> **When it's acceptable:**
> - Simple Templates that forward props to native elements (e.g., `<input {...rest} />`)
> - Templates that genuinely need to react to all prop changes
>
> **When to avoid:**
> - Large Templates or list items where performance matters
> - When you only need specific props
>
> **Better approach:** Destructure only what you need: `const { prop1, prop2 } = props`

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

For optimal list performance, extract list items into Templates. Each item updates independently:

```tsx
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// Standalone Template - can directly mutate the mutable todo object
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

export const TodoList = setup(() => {
  const state = mutable({
    todos: [
      { id: 1, text: 'Learn Anchor', done: false },
      { id: 2, text: 'Build app', done: false }
    ]
  });

  return render(() => (
    <ul>
      {state.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  ));
}, 'TodoList');
```

When a todo is toggled, only that specific `TodoItem` re-renders, not the entire list.

> [!NOTE] When to Use Internal Templates
> Define Templates **inside** the Component only when they need to access Component state through closure:
> ```tsx
> export const Dashboard = setup(() => {
>   const state = mutable({ theme: 'dark', users: [...] });
>   
>   // Internal Template accesses state.theme from Component scope
>   const UserCard = template<{ user: User }>(({ user }) => (
>     <div className={`card ${state.theme}`}>
>       {user.name}
>     </div>
>   ), 'UserCard');
>   
>   return render(() => (
>     <div>
>       {state.users.map(user => <UserCard key={user.id} user={user} />)}
>     </div>
>   ));
> });
> ```
> 
> If the Template only relies on props, define it **outside** to share it across all instances.

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

**The rule:** If your JSX needs to **read** reactive state, wrap it in `render()` or `template()`. If it only **contains** reactive Templates, returning static JSX is fine.

## When to Use What?

| Approach | Purpose | Use Case |
| :--- | :--- | :--- |
| **`template()`** | Reusable View | List items, cards, modals, shared UI components |
| **`render()`** | Component View | Main Component View, simple reactive UIs |
| **Static JSX** | Static Layout | Wrapper layouts, containers with embedded Templates |

## Best Practices

### 1. Name Your Templates
Always provide a display name as the second argument to `template()`. This makes debugging in React DevTools much easier:

```tsx
const Header = template(() => <header>...</header>, 'Header');
```

### 2. Choose the Right Scope
- **Standalone Template**: When the View is purely presentational and doesn't need Component state
- **Internal Template**: When the View needs to access Component state directly
- **Component View**: When the entire Component UI is reactive and not reused elsewhere

### 3. Optimize List Rendering
Extract list items into Templates for independent updates. This prevents re-rendering the entire list when a single item changes.

### 4. Separate Static from Reactive
Use static JSX for layouts and containers that never change. Embed Templates for the parts that need to update.
