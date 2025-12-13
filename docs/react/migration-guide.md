---
title: "Migration Guide"
description: "A comprehensive guide to identifying performance bottlenecks and migrating React components to Anchor."
---

# Migration Guide

Migrating to Anchor is an architectural shift from **Top-Down Rendering** (React) to **Signal-Based Fine-Grained Reactivity** (Anchor). This guide demonstrates the strategic steps to adopt this model.

Here is a standard React implementation of a Todo list.

```tsx
// TodoApp.tsx
import { useState } from 'react';

export const TodoApp = () => {
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);

  const handleSubmit = () => {
    setTodos([...todos, { text }]);
    setText('');
  };

  return (
    <div>
      <div className="form">
        <input value={text} onChange={e => setText(e.target.value)} />
        <button onClick={handleSubmit}>Add</button>
      </div>
      <ul>
        {todos.map(todo => <li key={todo.text}>{todo.text}</li>)}
      </ul>
    </div>
  );
};
```

## 1. Problem Identification

Before migrating, we must analyze **why** this component needs migration.

*   The `text` state is linked to the `TodoApp` component scope.
*   Typing in the `<input>` triggers `setText`, which forces the **entire function** to re-run.
*   The `<ul>` list (which hasn't changed) is forced to re-render and Diff against the DOM on every single keystroke.

## 2. Setting Priority (Strategy)

Now we decide **how** to attack the problem. We use the **"Hot-Path" Strategy**.

1.  **High Priority (Hot Path):** The Form. It updates frequently (on input) and causes the lag. **Actions:** Isolate this first.
2.  **Low Priority (Cold Path):** The List. It updates rarely (on submit). **Actions:** Inherit existing behavior or migrate later.

**Decided Approach:** We will first isolate the form using a **Hybrid Integration** to stop the bleeding, then perform a **Full Migration** for long-term stability.

## 3. Gradual Migration

**Goal:** Isolate the "Hot Path" (Form) immediately.

We create an **Update Boundary** to isolate the high-frequency state changes. This keeps high-frequency state changes contained, preventing them from leaking out and triggering the parent React component.

```tsx
import { useState } from 'react';
import { mutable, snippet } from '@anchorlib/react';

export const TodoApp = () => {
  const [todos, setTodos] = useState([]);

  // STEP 1: Bypass React Render Cycle
  // We move the high-frequency state to a mutable signal.
  const formState = mutable({ text: '' });

  const handleSubmit = () => {
    setTodos([...todos, { text: formState.text }]);
    formState.text = '';
  };

  // STEP 2: Create Update Boundary
  // We wrap the input UI so it listens strictly to the signal, ignoring React updates.
  const TodoForm = snippet(() => (
    <div className="form">
      <input 
        value={formState.text} 
        onInput={e => formState.text = e.target.value} 
      />
      <button onClick={handleSubmit}>Add</button>
    </div>
  ));

  return (
    <div>
      {/* Updates here NO LONGER trigger TodoApp re-render */}
      <TodoForm />
      <ul>
        {todos.map(todo => <li key={todo.text}>{todo.text}</li>)}
      </ul>
    </div>
  );
};
```

## 4. Full Migration

**Goal:** Complete stability and granular reactivity for the entire component.

Now that the immediate bottleneck is solved, we adopt the **Constructor Pattern**. This ensures our logic initializes exactly once, and every part of the UI updates independently.

```tsx
import { setup, template, snippet, mutable } from '@anchorlib/react';

// STEP 1: Initialize Once
// Logic moves to 'setup', guaranteeing it never re-runs.
export const TodoApp = setup(() => {
  const formState = mutable({ text: '' });
  const todos = mutable([]);

  const handleSubmit = () => {
    todos.push({ text: formState.text });
    formState.text = '';
  };

  // STEP 2: Granular View Definitions
  // We define views that have access to the closure scope.
  const TodoForm = snippet(() => (
    <div className="form">
      <input 
        value={formState.text} 
        onInput={e => formState.text = e.target.value} 
      />
      <button onClick={handleSubmit}>Add</button>
    </div>
  ));

  const TodoList = snippet(() => (
    <ul>
      {todos.map(todo => <TodoItem key={todo.text} todo={todo} />)}
    </ul>
  ));

  return (
    <div>
      <TodoForm />
      <TodoList />
    </div>
  );
});

// STEP 3: External Component Definition
// Pure views are defined outside to maximize reusability.
const TodoItem = template(({ todo }) => (
  <li style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
    <input 
      type="checkbox" 
      checked={todo.completed}
      onChange={() => todo.completed = !todo.completed}
    />
    {todo.text}
  </li>
));
```

## Recap

By following this process, we have transformed the component architecture:

*   **Identified** that the "Hot Path" (Input) was dragging down the entire app.
*   **Prioritized** fixing the input first using a Hybrid Strategy.
*   **Executed** a Full Migration to achieve:
    *   **Stable Logic:** The component function only runs once (`setup`).
    *   **Zero Re-renders:** The parent container never updates after mount.
    *   **Fine-Grained Updates:** Typing only updates the Input DOM node; Adding a todo only appends a DOM node.

## Advanced Migration

This section covers advanced scenarios you may encounter when integrating Anchor into an existing React codebase.

### Mixing React's State and Anchor's State

When you need to use both React's state (`useState`) and Anchor's state (`mutable`) in the same component scope, you must preserve Anchor's state across React re-renders.

#### Standalone State

If your Anchor state is independent, wrap it in `useState` to preserve it:

```tsx
import { useState } from 'react';
import { mutable, snippet } from '@anchorlib/react';

const Counter = setup(() => {
  // React state
  const [count, setCount] = useState(0);
  
  // Anchor state - preserved across React re-renders
  const [counter] = useState(() => mutable(0));

  const AnchorCounter = template(() => (
    <button onClick={() => counter.value++}>{counter.value}</button>
  ));

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <AnchorCounter />
    </>
  );
};
```

#### Dependent State

If your Anchor state depends on React state, use `useMemo` to recreate it when dependencies change:

```tsx
import { useState, useMemo } from 'react';
import { mutable, template } from '@anchorlib/react';

const Counter = () => {
  const [initialValue, setInitialValue] = useState(0);
  
  // Anchor state - recreated when initialValue changes
  const counter = useMemo(() => mutable(initialValue), [initialValue]);

  const AnchorCounter = template(() => (
    <button onClick={() => counter.value++}>{counter.value}</button>
  ));

  return (
    <>
      <button onClick={() => setInitialValue(v => v + 10)}>
        Reset to {initialValue + 10}
      </button>
      <AnchorCounter />
    </>
  );
};
```

> [!WARNING]
> Mixing React and Anchor state is **not recommended**. You lose the benefits of Anchor's stable scope and universality. This pattern should only be used as a temporary workaround during gradual migration.

### Using Anchor Components in React Components

Anchor **components** and **templates** integrate seamlessly into standard React's component tree. The Anchor component maintains its stable logic scope while receiving props from the React parent.

```tsx
import { useState } from 'react';
import { setup, render, mutable } from '@anchorlib/react';

// Stable component with internal state
const Counter = setup<{ onIncrement?: () => void }>((props) => {
  const state = mutable({ count: 0 });
  
  const increment = () => {
    state.count++;
    props.onIncrement?.();
  };
  
  return render(() => (
    <button onClick={increment}>{state.count}</button>
  ));
});

// React component
const ReactApp = () => {
  const [total, setTotal] = useState(0);

  return (
    <div>
      <p>Total clicks: {total}</p>
      <Counter onIncrement={() => setTotal(t => t + 1)} />
    </div>
  );
};
```

### Using React Components in Anchor Components

Third-party React components (Shadcn/UI, Material-UI, etc.) work seamlessly inside Anchor components.

```tsx
import { setup, mutable, snippet } from '@anchorlib/react';
import { Badge } from '@/components/ui/badge'; // Shadcn/UI component
import { Button } from '@/components/ui/button';

const Dashboard = setup(() => {
  const state = mutable({ 
    notifications: 5, 
    messages: 0 
  });

  // Only the dynamic badges are in a snippet
  const NotificationBadge = snippet(() => (
    <Badge variant="destructive">{state.notifications}</Badge>
  ));

  const MessageBadge = snippet(() => (
    <Badge variant="secondary">{state.messages}</Badge>
  ));

  return (
    <div>
      <div>
        <span>Notifications</span>
        <NotificationBadge />
      </div>
      <div>
        <span>Messages</span>
        <MessageBadge />
      </div>
      <Button onClick={() => state.notifications++}>
        Add Notification
      </Button>
      <Button onClick={() => state.messages++}>
        Add Message
      </Button>
    </div>
  );
});
```
In the example above, each `Badge` is isolated in its own snippet, so they only update when their specific state changes.

**Important Considerations:**

*   Most component libraries (like Shadcn/UI) are already optimized with `React.memo` internally, but not all are.
*   Third-party components can't receive binding reference, so you need to put them in a reactive boundary (`template`, `snippet`, or `render`) and use standard imperative handling.

```tsx
// ❌ Won't work because component will receive a binding reference object, not the actual value.
return (
  <MaterialInput value={bind(state, 'name')} />
);
```

```tsx
// ✅ Works because component will receive the actual value.
render(() => (
  <MaterialInput value={state.name} onChange={e => state.name = e.target.value} />
));
```

*   If you notice performance issues with unoptimized third-party components, you can wrap them:

```tsx
import { memo } from 'react';
import { Badge as ShadcnBadge } from '@/components/ui/badge';

// Wrap if the library component isn't already memoized
const Badge = memo(ShadcnBadge);
```

*   For frequently-used components, consider creating Anchor **component** for better performance and consistency with Anchor's reactivity model.
