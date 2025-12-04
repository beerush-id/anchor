---
title: "Migration Guide"
description: "Guide for migrating from standard React to Anchor using a gradual adoption strategy."
---

# Migration Guide

Migrating to Anchor doesn't have to be an all-or-nothing process. Anchor is designed to work alongside standard React components, allowing you to adopt it incrementally.

The recommended strategy is **"Leaf-First"** or **"Hot-Path First"**. Identify components that suffer from performance issues (like forms or complex lists) and migrate them first.

## Gradual Migration Strategy

We'll use a simple Todo App as an example.

### 1. The Starting Point (Standard React)

Here is a typical React component. It uses `useState` and re-renders the entire component on every keystroke.

```tsx
// TodoApp.tsx (Standard React)
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
        {/* Re-renders TodoApp on every keystroke */}
        <input 
          value={text} 
          onChange={e => setText(e.target.value)} 
        />
        <button onClick={handleSubmit}>Add</button>
      </div>
      <ul>
        {todos.map(todo => <li key={todo.text}>{todo.text}</li>)}
      </ul>
    </div>
  );
};
```

### 2. The Hybrid Approach (Partial Migration)

You can introduce Anchor's `template` into an existing React component to isolate updates. This is great for fixing specific bottlenecks without rewriting the whole component.

```tsx
// TodoApp.tsx (Hybrid)
import { useState } from 'react';
import { mutable, template } from '@anchorlib/react';

export const TodoApp = () => {
  // Keep todos in React state for now
  const [todos, setTodos] = useState([]);

  // 1. Migrate Form State to use Mutable State.
  const formState = mutable({ text: '' }); // [!code ++]

  const handleSubmit = () => {
    setTodos([...todos, { text: formState.text }]);
    formState.text = '';
  };

  // 2. Create a Reactive Template for the Form
  const TodoForm = template(() => ( // [!code ++]
    <div className="form">
      {/* Only this template updates on keystroke */}
      <input 
        value={formState.text} 
        onInput={e => formState.text = e.target.value} 
      />
      <button onClick={handleSubmit}>Add</button>
    </div>
  )); // [!code ++]

  return (
    <div>
      {/* 3. Use the Template [!code ++] */}
      <TodoForm />
      <ul>
        {todos.map(todo => <li key={todo.text}>{todo.text}</li>)}
      </ul>
    </div>
  );
};
```

> [!WARNING]
> **State Stability**: When using `mutable` inside a standard React component, remember that if the *parent* component re-renders, your `mutable` state will be recreated and reset.
> 
> This is acceptable for a **temporary migration step**, but for the final version, you should move to `setup` (Step 3) to ensure stability without hooks.

### 3. Full Migration (Anchor Component)

Finally, you can convert the entire component to use `setup`. This gives you stable setup logic and full reactivity.

```tsx
// TodoApp.tsx (Anchor)
import { setup, template, mutable } from '@anchorlib/react';

export const TodoApp = setup(() => { // [!code ++]
  // 1. Setup runs once. State is stable.
  const formState = mutable({ text: '' }); // [!code ++]
  const todos = mutable([]); // [!code ++]

  const handleSubmit = () => {
    todos.push({ text: formState.text }); // [!code ++]
    formState.text = ''; // [!code ++]
  };

  // 2. Define granular templates
  const TodoForm = template(() => ( // [!code ++]
    <div className="form">
      <input 
        value={formState.text} 
        onInput={e => formState.text = e.target.value} 
      />
      <button onClick={handleSubmit}>Add</button>
    </div>
  )); // [!code ++]

  const TodoList = template(() => ( // [!code ++]
    <ul>
      {/* 3. Use TodoItem for fine-grained updates [!code ++] */}
      {todos.map(todo => <TodoItem key={todo.text} todo={todo} />)}
    </ul>
  )); // [!code ++]

  // 4. Return the layout [!code ++]
  return (
    <div>
      <TodoForm />
      <TodoList />
    </div>
  ); // [!code ++]
});

// 5. Independent Item Component
const TodoItem = template(({ todo }) => ( // [!code ++]
  <li style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
    <input 
      type="checkbox" 
      checked={todo.completed}
      onChange={() => todo.completed = !todo.completed} // [!code ++]
    />
    {todo.text}
  </li>
)); // [!code ++]
```

> [!TIP] Pro Tip
> Define sub-components like `TodoItem` **outside** the `setup` function.
> 
> Since `TodoItem` relies purely on props and doesn't need access to `TodoApp`'s internal scope (like `formState`), defining it inside would just re-create the component function unnecessarily on every `TodoApp` instance. Defining it outside is more efficient.

### Why is this better?

By breaking the UI into **templates**, we achieve fine-grained reactivity:

*   **Zero Parent Re-renders**: The main `TodoApp` component renders its layout **once**. It never runs again.
*   **Isolated Updates**: When you type in the input, **only** `TodoForm` updates.
*   **Item Granularity**: When a single todo changes, **only** that specific `TodoItem` updates. The list itself doesn't re-render.
*   **Stable Logic**: Your event handlers and state are created once in `setup` and never recreated.
