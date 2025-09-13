<h1 align="center">Anchor - State Management for Humans, Built for Enterprise</h1>

<p align="center">A comprehensive state management solution that embraces JavaScript's natural mutability for effortlessly managing state — from simple todos to complex enterprise applications. Anchor handles state complexity with elegance, making any app's state a breeze.</p>

## 🏗️ The Anchor Ecosystem

Anchor is more than just a state management library - it's a comprehensive ecosystem for building modern applications based on the **DSV (Data-State-View) model**.

### Core Packages

- **[@anchor/core](./packages/core)** - The heart of the ecosystem with reactive state management
- **[@anchor/react](./packages/react)** - React integration with hooks and components
- **[@anchor/vue](./packages/vue)** - Vue integration with composables
- **[@anchor/svelte](./packages/svelte)** - Svelte integration

### Storage Solutions

- **[@anchor/storage](./packages/storage)** - Persistent storage with multiple backends (memory, localStorage, sessionStorage, IndexedDB)

## ✨ Key Features

- **Fine-Grained Reactivity**: Only components that depend on changed state re-render, eliminating wasted renders
- **True Immutability**: Direct mutation syntax with proxy-based write contracts for safety without performance penalties
- **Zero Configuration**: Works out of the box with optional advanced configuration
- **Framework Agnostic**: First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript
- **Built-in Toolkit**: Includes optimistic UI, history tracking, reactive storage, and reactive requests out of the box
- **Data Integrity**: Schema validation with Zod and TypeScript ensures your state always conforms to expectations

## 📚 Documentation

You can view the full online documentation at [Anchor Documentations](https://beerush-id.github.io/anchor/docs). You can also find the local documentation in the [docs](./docs) directory.

## 🚀 Getting Started

Unlike traditional React state management which requires explicit setState calls and complex state update logic, Anchor allows you to work with state naturally:

```jsx
import { useAnchor } from '@anchor/react';
import { observable } from '@anchor/react/components';

const TodoApp = observable(() => {
  const [todos] = useAnchor([
    { id: 1, text: 'Learn Anchor', completed: true },
    { id: 2, text: 'Build an app', completed: false },
  ]);

  // Add a new todo - just mutate the state directly!
  const addTodo = (text) => {
    todos.push({ id: Date.now(), text, completed: false });
  };

  // Toggle completion status - direct mutation
  const toggleTodo = (todo) => {
    todo.completed = !todo.completed;
  };

  // Remove a todo - simple array manipulation
  const removeTodo = (todo) => {
    const index = todos.indexOf(todo);
    if (index !== -1) {
      todos.splice(index, 1);
    }
  };

  return (
    <div>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }} onClick={() => toggleTodo(todo)}>
              {todo.text}
            </span>
            <button onClick={() => removeTodo(todo)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => addTodo('New task')}>Add Todo</button>
    </div>
  );
});
```

## 🤝 Support and Contributions

If you need help, have found a bug, or want to contribute, please see
our [contributing guidelines](./CONTRIBUTING.md). We appreciate and value
your input!

Don't forget to star ⭐ the project if you find it interesting and stay tuned for upcoming updates.

## 📄 License

Anchor is [MIT licensed](./LICENSE.md).
