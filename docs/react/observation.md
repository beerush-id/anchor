# Observation in Anchor for React

Observation is a core concept in Anchor, enabling your React components to automatically react to changes in your application's state. Anchor's fine-grained reactivity system ensures that only components or parts of components that depend on specific pieces of data re-render when that data changes, leading to highly optimized performance.

## How Observation Works

When you access a property of an Anchor reactive state within a component or a reactive computation, Anchor automatically tracks that dependency. If the value of that property later changes, Anchor intelligently identifies all components that observed it and triggers a re-render for only those components, avoiding unnecessary updates to the rest of your application.

## `useObserved` Hook

The `useObserved` hook is the primary way to create reactive computations and ensure your components re-render efficiently when their dependencies change. It allows you to define a function that accesses reactive state, and Anchor will automatically re-run this function and update your component whenever the accessed state changes.

```typescript
function useObserved<R, D extends unknown[]>(observe: () => R, deps?: D): R;
```

- `observe`: A function that performs your computation. Any reactive state accessed within this function will be automatically tracked by Anchor. When the tracked state changes, this function will re-run.
- `deps` (optional): An array of additional dependencies (similar to React's `useMemo` or `useEffect` dependencies). If any of these non-reactive dependencies change, the `observe` function will also re-run.

`useObserved` returns the result of the `observe` function. This value is memoized and will only be recomputed when its reactive dependencies or additional `deps` change.

### Example: Displaying a Derived Value

Let's say you have a reactive `user` state and you want to display the user's full name, which is derived from `firstName` and `lastName`.

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useObserved } from '@anchor/react';

function UserProfileDisplay() {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  // useObserved tracks user.firstName and user.lastName
  const fullName = useObserved(() => {
    console.log('Recalculating full name...');
    return `${user.firstName} ${user.lastName}`;
  });

  const incrementAge = () => {
    user.age++; // This will NOT trigger fullName recalculation
  };

  const changeName = () => {
    user.firstName = 'Jane';
    user.lastName = 'Smith'; // This WILL trigger fullName recalculation and re-render
  };

  return (
    <div>
      <h1>Welcome, {fullName}!</h1>
      <p>Age: {user.age}</p>
      <button onClick={incrementAge}>Increment Age</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
}

export default UserProfileDisplay;
```

In this example:

- When `user.firstName` or `user.lastName` changes, `useObserved` detects this, re-runs the `observe` function, and updates `fullName`. This triggers a re-render of `UserProfileDisplay`.
- When `user.age` changes, `useObserved` does _not_ re-run the `observe` function because `user.age` is not accessed within it. The component will still re-render due to `user.age` being directly accessed in the JSX, but the `fullName` derivation is optimized.

## `useObservedList` Hook

When working with reactive arrays, `useObservedList` provides an efficient way to render lists in your components. It ensures that your list items are rendered with stable keys, which is crucial for React's reconciliation process and overall performance.

```typescript
// For arrays of objects with a specific key property
function useObservedList<T extends ObjLike[], K extends keyof T[number]>(
  state: T,
  key: K
): Array<{ key: T[number][K]; value: T[number] }>;

// For arrays where index is used as key
function useObservedList<T extends ObjLike[]>(state: T): Array<{ key: number; value: T[number] }>;
```

- `state`: The reactive array state you want to render.
- `key` (optional): A property name (string literal) within each object in the array to use as a unique key for list items. If not provided, the array index will be used as the key.

`useObservedList` returns an array of objects, where each object has a `key` property (either the index or the value of the specified key property) and a `value` property (the actual item from the reactive array).

### Example: Rendering a List of Todos

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useObservedList } from '@anchor/react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

function TodoList() {
  const [todos] = useAnchor<TodoItem[]>([
    { id: 1, text: 'Learn Anchor', completed: false },
    { id: 2, text: 'Build something awesome', completed: false },
  ]);

  // Use 'id' as the key for list items
  const observedTodos = useObservedList(todos, 'id');

  const addTodo = () => {
    const newId = Math.max(...todos.map((t) => t.id)) + 1;
    todos.push({ id: newId, text: `New Task ${newId}`, completed: false });
  };

  const toggleComplete = (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };

  return (
    <div>
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {observedTodos.map((item) => (
          <li key={item.key} style={{ textDecoration: item.value.completed ? 'line-through' : 'none' }}>
            <input type="checkbox" checked={item.value.completed} onChange={() => toggleComplete(item.key as number)} />
            {item.value.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
```

In this example, `useObservedList(todos, 'id')` ensures that React can efficiently update the list when items are added, removed, or reordered, by using the stable `id` property as the key.

## Conclusion

Anchor's observation hooks, `useObserved` and `useObservedList`, provide powerful and efficient ways to integrate reactive state into your React components. By leveraging fine-grained reactivity, Anchor minimizes unnecessary re-renders, leading to highly performant and responsive user interfaces. In the next section, we will explore how to derive new reactive data from existing states.
