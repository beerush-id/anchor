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
