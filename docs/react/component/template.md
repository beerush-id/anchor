---
title: "Template & Render"
description: "Defining the Reactive View layer of your component."
keywords:
  - template function
  - render function
  - reactive view
  - view layer
---

# Template & Render

In Anchor, the **View** is responsible for describing your UI and updating it whenever the state changes. You define the View using `template()` or `render()`.

In Anchor, a component consists of two distinct layers:

1.  **Setup (Logic Layer)**: Runs **once**. It initializes state, handles logic, and prepares data.
2.  **View (Presentation Layer)**: Runs **frequently**. It describes the UI based on the current state.

```tsx
export const Counter = setup(() => {
  // 1. Setup (Logic Layer)
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  // 2. View (Presentation Layer)
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
});
```

## Reactive View

A **template** is a reusable reactive view that accepts props and automatically updates when reactive state changes. You create templates using the `template()` function.

You can define templates in two places:

### 1. Standalone Template
Defined **outside** of any component setup. These are shared templates that rely entirely on the props passed to them.

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

### 2. Internal Template
Defined **inside** a `setup` function. These templates can access the component's state through closure, allowing you to update specific parts of the UI without re-rendering the component.

```tsx
export const Profile = setup(() => {
  const state = mutable({ name: 'Alice', bio: 'Frontend Dev' });

  // Internal template - updates when used state changes
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
});
```

### Props Handling

Templates receive two arguments:

```tsx
const MyTemplate = template<Props>((props, parentProps) => { /* ... */ }, 'MyTemplate');
```

-   **Props** (first argument): Contains the props passed to the template.
-   **Parent Props** (second argument): Reference to the parent component's setup props (only available for internal templates).

**Example with parent props:**

```tsx
interface AppProps {
  theme: 'light' | 'dark';
}

export const App = setup<AppProps>((props) => {
  const state = mutable({ items: ['A', 'B', 'C'] });

  // Internal template can access both its own props and parent props
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
});
```

> [!WARNING] Rest Props
> Using `const { prop1, ...rest } = props` reads **all properties** from props, causing the template to re-render whenever *any* prop changes, even unused ones.
>
> **When it's acceptable:**
> - Simple templates that forward props to native elements (e.g., `<input {...rest} />`)
> - Templates that genuinely need to react to all prop changes
>
> **When to avoid:**
> - Large templates or list items where performance matters
> - When you only need specific props
>
> **Better approach:** Destructure only what you need: `const { prop1, prop2 } = props`

## Inline View

An **inline view** is the reactive view returned directly from `setup()`. You create inline views using the `render()` function.

Unlike templates (which accept props), inline views access state through closure and are typically used as the main return value of your component.

```tsx
export const Banner = setup(() => {
  const state = mutable({ title: 'Hello', description: 'World' });

  // Returns an Inline View
  return render(() => (
    <div>
      <h1>{state.title}</h1>
      <p>{state.description}</p>
    </div>
  ));
});
```

## When to use what?

| Function | Purpose | Use Case |
| :--- | :--- | :--- |
| **`template()`** | Reusable View | List items, cards, modals, reusable UI parts. |
| **`render()`** | Inline View | Main component view. |

## Best Practices

### 1. Separate Static Layout from Dynamic Templates
You can mix static JSX and reactive templates to optimize your component. The static parts (returned directly from setup) never re-render, while the `template`s or `render` blocks inside them update independently.

```tsx
export const Dashboard = setup(() => {
  const state = mutable({ ... });

  // Dynamic parts
  const Header = template(() => <header>{state.title}</header>, 'Header');
  const Content = template(() => <main>{state.data}</main>, 'Content');

  // Static Layout (Runs once)
  return (
    <div className="layout">
      <Header />
      <div className="sidebar">Static Sidebar</div>
      <Content />
    </div>
  );
});
```

### 2. Always Name Your Templates
Pass a string as the second argument to `template` (e.g., `'Header'`). This sets the display name in React DevTools, making inspection and debugging much easier.

### 3. Use Templates for List Items
For optimal list performance, extract list items into templates. They update independently when their props change:

```tsx
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// External template - can directly mutate the mutable todo object
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
});
```

When a todo is toggled, only that specific `TodoItem` re-renders, not the entire list.

> [!NOTE] When to Use Internal Templates
> Define templates **inside** `setup()` only when they need to access parent state through closure:
> ```tsx
> export const Dashboard = setup(() => {
>   const state = mutable({ theme: 'dark', users: [...] });
>   
>   // Internal template accesses state.theme from parent scope
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
> If the template only relies on props, define it **outside** to share it across all instances.

## Common Pitfalls

### Accessing Reactive State in Static JSX

JSX returned directly from `setup()` (not wrapped in `render()`) is **static** - created once and never re-evaluated. This means:

**✅ Works:** Static JSX can contain reactive **templates** (they update independently)
```tsx
export const Layout = setup(() => {
  const state = mutable({ title: 'Dashboard' });
  
  const Header = template(() => <h1>{state.title}</h1>, 'Header');
  
  // Static wrapper JSX returned directly
  return (
    <div className="layout">
      <Header /> {/* This template updates when state.title changes */}
      <div className="sidebar">Navigation</div> {/* This is static */}
    </div>
  );
});
```

**❌ Doesn't Work:** Static JSX displays the **initial value** but won't react to state changes
```tsx
export const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  // Static JSX - created once, never re-evaluates
  return (
    <div>
      <button onClick={() => state.count++}>+</button>
      <span>{state.count}</span> {/* Shows initial value (0), never updates */}
    </div>
  );
});
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
});
```

**The rule:** If your JSX needs to **read** reactive state, wrap it in `render()` or `template()`. If it only **contains** reactive templates, returning static JSX is fine.
