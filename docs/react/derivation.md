---
title: 'A Guide to Derivation in Anchor for React: Computed Values & Data Flow'
description: 'Learn about derivation in Anchor for React. This guide covers hooks like useDerived, useValue, usePipe, and useBind to create computed values and synchronized states.'
keywords:
  - anchor for react
  - react derivation
  - computed state react
  - useDerived hook
  - useValue hook
  - usePipe hook
  - useBind hook
  - state synchronization
  - reactive data flow
---

# A Guide to Derivation in Anchor for React

Derivation in **Anchor** refers to the process of creating new reactive data or relationships from existing reactive
states. This allows you to build complex data flows, computed values, and synchronized states that automatically update
when their underlying dependencies change. **Anchor** provides several hooks in the React package to facilitate powerful
derivation patterns.

## How Derivation Works

Derivation in **Anchor** enables you to create computed values, synchronize states, and establish reactive relationships
between different pieces of state. When a source state changes, any derived values or synchronized states automatically
update, ensuring consistency throughout your application while maintaining optimal performance through fine-grained
reactivity.

## Primary Derivation APIs

These are the main APIs for deriving values from reactive states that cause re-renders.

### **`useDerived(state, transform?)`**

Derives a computed value from a reactive state. The component re-renders automatically when the dependent state changes.

**Params**

- **`state`** - The reactive state to derive from.
- **`transform`** _(optional)_ - A function that receives the current value of the `state` and returns the computed
  value. If not provided, the hook returns the `state` itself, triggering re-renders on any change.
- **`recursive`** _(optional)_ - When `transform` is not provided, this flag determines if changes in nested properties
  of the `state` should also trigger re-renders. Defaults to `false`.

[API Reference](../apis/react/derivation.md#usederived)

#### Usage

::: details Basic Usage {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useDerived } from '@anchorlib/react';

const UserProfile = () => {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  // Derive a computed value
  const fullName = useDerived(user, (currentUser) => {
    return `${currentUser.firstName} ${currentUser.lastName}`;
  });

  const updateFirstName = () => {
    user.firstName = 'Jane';
  };

  return (
    <div>
      <h1>Welcome, {fullName}!</h1>
      <p>Age: {user.age}</p>
      <button onClick={updateFirstName}>Change Name</button>
    </div>
  );
};
```

:::

::: details Without Transform Function {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useDerived } from '@anchorlib/react';

const TodoList = () => {
  const [todos] = useAnchor([
    { id: 1, text: 'Learn Anchor', completed: false },
    { id: 2, text: 'Build an app', completed: true },
  ]);

  // Derive the state itself - re-renders on any change to the array
  const observedTodos = useDerived(todos);

  const addTodo = () => {
    todos.push({
      id: Date.now(),
      text: 'New todo',
      completed: false,
    });
  };

  const toggleTodo = (id) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };

  return (
    <div>
      <ul>
        {observedTodos.map((todo) => (
          <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</span>
          </li>
        ))}
      </ul>
      <button onClick={addTodo}>Add Todo</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useDerived` when you need to create computed values from a single reactive state that automatically update when the
source state changes. It's particularly useful for transforming or aggregating data from a reactive state.

:::

### **`useValue(state, key)`**

Derives a specific property's value from a reactive state. The component re-renders when that property changes.

**Params**

- **`state`** - The reactive state object.
- **`key`** - The property key to derive.

[API Reference](../apis/react/derivation.md#usevalue)

#### Usage

::: details Observing a Single Property {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useValue } from '@anchorlib/react';

const UserDashboard = () => {
  const [user] = useAnchor({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    theme: 'light',
  });

  // Only re-renders when user.name changes
  const userName = useValue(user, 'name');

  // Only re-renders when user.theme changes
  const userTheme = useValue(user, 'theme');

  const changeName = () => {
    user.name = 'Jane Smith';
  };

  const toggleTheme = () => {
    user.theme = user.theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div className={`theme-${userTheme}`}>
      <h1>Welcome, {userName}!</h1>
      <p>Email: {user.email}</p>
      <p>Age: {user.age}</p>
      <button onClick={changeName}>Change Name</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useValue` when you need to observe a single property of a reactive state object. This provides fine-grained
reactivity, ensuring that components only re-render when the specific property they depend on changes, not when any
property in the object changes.

:::

### **`useValueIs(state, key, expect)`**

Checks if a specific property of a reactive state equals an expected value. The comparison re-evaluates when the
property changes.

**Params**

- **`state`** - The reactive state object.
- **`key`** - The property key to check.
- **`expect`** - The expected value for comparison.

[API Reference](../apis/react/derivation.md#usevalueis)

#### Usage

::: details Conditional Rendering Based on State {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useValueIs } from '@anchorlib/react';

const TaskManager = () => {
  const [task] = useAnchor({
    id: 1,
    title: 'Complete project',
    status: 'pending', // 'pending', 'in-progress', 'completed'
  });

  // Reactive boolean that updates when task.status changes
  const isCompleted = useValueIs(task, 'status', 'completed');
  const isInProgress = useValueIs(task, 'status', 'in-progress');

  const startTask = () => {
    task.status = 'in-progress';
  };

  const completeTask = () => {
    task.status = 'completed';
  };

  return (
    <div>
      <h2>{task.title}</h2>
      <p>Status: {task.status}</p>

      {isCompleted && <p style={{ color: 'green' }}>✅ Task completed successfully!</p>}

      {isInProgress && <p style={{ color: 'orange' }}>⏳ Task is in progress...</p>}

      {!isCompleted && !isInProgress && <p style={{ color: 'gray' }}>⏸ Task is pending</p>}

      {task.status === 'pending' && <button onClick={startTask}>Start Task</button>}

      {task.status === 'in-progress' && <button onClick={completeTask}>Complete Task</button>}
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useValueIs` when you need to conditionally render UI based on whether a specific property of a reactive state
equals a particular value. This is especially useful for implementing UI states like selected items, active tabs, or
status indicators.

:::

## State Synchronization APIs

These APIs allow you to synchronize states, creating reactive data flows between different pieces of state.

### **`usePipe(source, target, transform?)`**

Establishes a unidirectional data flow, synchronizing changes from a `source` reactive state to a `target` reactive
state. This is useful for scenarios where one state should always reflect a transformed version of another.

**Params**

- **`source`** - The reactive state from which changes will originate.
- **`target`** - The reactive state to which changes will be applied.
- **`transform`** _(optional)_ - A function that receives the `source` state and returns a value to be applied to the
  `target` state. If omitted, the `source` state itself will be assigned to the `target`.

[API Reference](../apis/react/data-flow.md#usepipe)

#### Usage

::: details Mirroring User Input {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { usePipe } from '@anchorlib/react';

const InputMirror = () => {
  const [inputState] = useAnchor({ text: '' });
  const [displayState] = useAnchor({ mirroredText: '' });

  // Pipe changes from inputState.text to displayState.mirroredText
  usePipe(inputState, displayState, (source) => ({
    mirroredText: source.text.toUpperCase(), // Transform the text to uppercase
  }));

  return (
    <div>
      <input
        type="text"
        value={inputState.text}
        onChange={(e) => (inputState.text = e.target.value)}
        placeholder="Type something..."
      />
      <p>Mirrored (Uppercase): {displayState.mirroredText}</p>
    </div>
  );
};
```

:::

::: details Complex Data Transformation {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { usePipe } from '@anchorlib/react';

const DataProcessor = () => {
  const [rawData] = useAnchor({
    items: [
      { id: 1, name: 'Item 1', value: 10 },
      { id: 2, name: 'Item 2', value: 20 },
      { id: 3, name: 'Item 3', value: 30 },
    ],
  });

  const [processedData] = useAnchor({
    summary: { total: 0, count: 0, average: 0 },
    sortedItems: [],
  });

  // Process raw data into summary statistics
  usePipe(rawData, processedData, (source) => {
    const total = source.items.reduce((sum, item) => sum + item.value, 0);
    const count = source.items.length;
    const average = count > 0 ? total / count : 0;

    return {
      summary: { total, count, average },
      sortedItems: [...source.items].sort((a, b) => b.value - a.value),
    };
  });

  const addItem = () => {
    rawData.items.push({
      id: Date.now(),
      name: `Item ${rawData.items.length + 1}`,
      value: Math.floor(Math.random() * 100),
    });
  };

  return (
    <div>
      <div>
        <h3>Raw Data</h3>
        <ul>
          {rawData.items.map((item) => (
            <li key={item.id}>
              {item.name}: {item.value}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Processed Data</h3>
        <p>Total: {processedData.summary.total}</p>
        <p>Count: {processedData.summary.count}</p>
        <p>Average: {processedData.summary.average.toFixed(2)}</p>
        <h4>Sorted Items (by value)</h4>
        <ul>
          {processedData.sortedItems.map((item) => (
            <li key={item.id}>
              {item.name}: {item.value}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={addItem}>Add Item</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `usePipe` when you need to create a unidirectional data flow where changes in one state automatically update another
state. This is particularly useful for data transformation, creating view models from domain models, or maintaining
derived state that should always be consistent with a source state.

:::

### **`useBind(left, right, transformLeft?, transformRight?)`**

Creates a bidirectional synchronization between two reactive states. Changes in either the `left` or `right` state will
automatically propagate to the other, with optional transformation functions for each direction.

**Params**

- **`left`** - The first reactive state to bind.
- **`right`** - The second reactive state to bind.
- **`transformLeft`** _(optional)_ - A function to transform data when propagating from `left` to `right`.
- **`transformRight`** _(optional)_ - A function to transform data when propagating from `right` to `left`.

[API Reference](../apis/react/data-flow.md#usebind)

#### Usage

::: details Synchronizing Form Fields {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useBind } from '@anchorlib/react';

const BidirectionalSync = () => {
  const [stateA] = useAnchor({ value: 'Hello' });
  const [stateB] = useAnchor({ value: 'World' });

  // Bind stateA.value and stateB.value
  useBind(
    stateA,
    stateB,
    (sourceA) => ({ value: sourceA.value.toUpperCase() }), // A to B: uppercase
    (sourceB) => ({ value: sourceB.value.toLowerCase() }) // B to A: lowercase
  );

  return (
    <div>
      <div>
        <label>State A (Uppercase to B): </label>
        <input type="text" value={stateA.value} onChange={(e) => (stateA.value = e.target.value)} />
      </div>
      <div>
        <label>State B (Lowercase to A): </label>
        <input type="text" value={stateB.value} onChange={(e) => (stateB.value = e.target.value)} />
      </div>
      <p>State A Value: {stateA.value}</p>
      <p>State B Value: {stateB.value}</p>
    </div>
  );
};
```

:::

::: details Unit Conversion {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useBind } from '@anchorlib/react';

const UnitConverter = () => {
  const [celsius] = useAnchor({ temperature: 0 });
  const [fahrenheit] = useAnchor({ temperature: 32 });

  // Bind celsius and fahrenheit with conversion functions
  useBind(
    celsius,
    fahrenheit,
    (celsiusState) => ({
      temperature: (celsiusState.temperature * 9) / 5 + 32,
    }),
    (fahrenheitState) => ({
      temperature: ((fahrenheitState.temperature - 32) * 5) / 9,
    })
  );

  return (
    <div>
      <div>
        <label>Celsius: </label>
        <input
          type="number"
          value={celsius.temperature}
          onChange={(e) => (celsius.temperature = Number(e.target.value))}
        />
      </div>
      <div>
        <label>Fahrenheit: </label>
        <input
          type="number"
          value={fahrenheit.temperature}
          onChange={(e) => (fahrenheit.temperature = Number(e.target.value))}
        />
      </div>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useBind` when you need bidirectional synchronization between two states, where changes in either state should
automatically update the other. This is useful for unit conversions, form field synchronization, or maintaining
consistency between different representations of the same data.

:::

### **`useFormWriter(state, keys)`**

Provides a comprehensive form management solution that automatically pipes valid form data back to a source state.

**Params**

- **`state`** - The reactive state object to which form data will be piped.
- **`keys`** - An array of keys that represent the fields managed by this form.

[API Reference](../apis/react/data-flow.md#useformwriter)

#### Usage

::: details Form Management {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useFormWriter } from '@anchorlib/react';

const UserForm = () => {
  const [user] = useAnchor({
    name: '',
    email: '',
    age: 0,
  });

  // Create a form writer for user data
  const form = useFormWriter(user, ['name', 'email', 'age']);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.isValid) {
      // Form data is automatically piped to user state when valid
      console.log('Form submitted:', user);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input type="text" value={form.data.name} onChange={(e) => (form.data.name = e.target.value)} />
        {form.errors.name && <span>{form.errors.name}</span>}
      </div>

      <div>
        <label>Email:</label>
        <input type="email" value={form.data.email} onChange={(e) => (form.data.email = e.target.value)} />
        {form.errors.email && <span>{form.errors.email}</span>}
      </div>

      <div>
        <label>Age:</label>
        <input type="number" value={form.data.age} onChange={(e) => (form.data.age = Number(e.target.value))} />
        {form.errors.age && <span>{form.errors.age}</span>}
      </div>

      <button type="submit" disabled={!form.isValid}>
        Submit
      </button>
      <button type="button" onClick={form.reset}>
        Reset
      </button>
    </form>
  );
};
```

:::

::: tip When to use it?

Use `useFormWriter` when you need to manage form state with validation and automatic synchronization to a source state.
It provides a complete solution for form handling including data management, validation, dirty state tracking, and
resetting capabilities.

:::

## Advanced Data Flow APIs

These APIs provide more specialized data flow capabilities.

### **`useAction(action)`**

Allows immediate reaction to value assignments, typically used with the ref pattern `<div ref={action}>` to manipulate
DOM elements (adding classes, getting bounding rectangles, adding event listeners, etc.) immediately as they are
created, before they are painted to the browser. This avoids the noticeable repaint that occurs when making DOM changes
inside effects, which run only after the browser has completely painted the DOM. It also manages side effects with
automatic cleanup capabilities.

**Params**

- **`init`** _(optional)_ - The initial value, can be null.
- **`action`** - A function that takes the current value and returns a cleanup function.

[API Reference](../apis/react/data-flow.md#useaction)

#### Usage

::: details DOM Element Manipulation {open}

```tsx
import React, { useState } from 'react';
import { useAction } from '@anchorlib/react';

const AnimatedElement = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Use action to manipulate DOM element directly
  const elementRef = useAction((element) => {
    if (element) {
      // Apply initial styles
      element.style.transition = 'all 0.3s ease';
      element.style.opacity = isVisible ? '1' : '0';
      element.style.transform = isVisible ? 'translateY(0)' : 'translateY(20px)';

      // Cleanup function
      return () => {
        // Cleanup code if needed
        console.log('Element removed from DOM');
      };
    }
  });

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div>
      <button onClick={toggleVisibility}>{isVisible ? 'Hide' : 'Show'} Element</button>

      {isVisible && (
        <div
          ref={elementRef}
          style={{
            width: '200px',
            height: '100px',
            backgroundColor: 'lightblue',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          Animated Element
        </div>
      )}
    </div>
  );
};
```

:::

::: details Event Listener Management {open}

```tsx
import React from 'react';
import { useAction } from '@anchorlib/react';

const ScrollDetector = () => {
  const scrollRef = useAction((element) => {
    if (element) {
      const handleScroll = () => {
        console.log('Element scrolled:', element.scrollTop);
      };

      element.addEventListener('scroll', handleScroll);

      // Cleanup function to remove event listener
      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    }
  });

  return (
    <div
      ref={scrollRef}
      style={{
        width: '300px',
        height: '200px',
        overflow: 'auto',
        border: '1px solid #ccc',
      }}>
      <div style={{ height: '500px', padding: '20px' }}>
        <p>Scrollable content...</p>
        <p>Scroll down to see more content.</p>
        <p>Check the console for scroll events.</p>
        <p>More content here...</p>
        <p>Even more content...</p>
      </div>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useAction` when you need to manipulate DOM elements directly, add event listeners, or perform other imperative
operations on elements as they are created. It's particularly useful for animations, measurements, and event handling
that need to happen before the browser paints the element.

:::

## Advanced Derivation APIs

These are more advanced APIs for specialized derivation scenarios.

### **`useDerivedRef(state, handle)`**

Creates a mutable `RefObject` that automatically updates its `current` value based on changes in a reactive state. It
also provides a `handle` function that is called whenever the state changes or the ref's `current` value is set, making
it ideal for integrating with imperative APIs or external libraries that rely on refs.

**Params**

- **`state`** - The reactive state to derive from.
- **`handle`** - A callback function that receives the current `state` and the `current` value of the ref. This function
  is executed when the `state` changes or when the ref's `current` value is explicitly set.

[API Reference](../apis/react/derivation.md#usederivedref)

#### Usage

::: details Integrating with Third-Party Libraries {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useDerivedRef } from '@anchorlib/react';

// Mock a third-party chart library function
const updateChart = (element, data) => {
  if (element && data) {
    // Simulate updating a chart with new data
    console.log('Chart updated with data:', data);
    element.textContent = `Chart showing: ${data.join(', ')}`;
  }
};

const DataChart = () => {
  const [chartData] = useAnchor({ values: [10, 50, 30, 80, 20] });

  // useDerivedRef to update the chart when chartData.values changes
  const chartRef = useDerivedRef(chartData, (currentData, element) => {
    // This handle function is called when chartData.values changes
    // or when chartRef.current is set.
    updateChart(element, currentData.values);
  });

  const addRandomValue = () => {
    chartData.values.push(Math.floor(Math.random() * 100) + 10);
  };

  return (
    <div>
      <div
        ref={chartRef}
        style={{
          border: '1px solid black',
          padding: '10px',
          minHeight: '50px',
        }}>
        Chart will appear here
      </div>
      <button onClick={addRandomValue}>Add Random Value</button>
    </div>
  );
};
```

:::

::: details Working with DOM Elements {open}

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useDerivedRef } from '@anchorlib/react';

const ScrollingText = () => {
  const [textState] = useAnchor({
    content: 'Hello, World!',
    speed: 1,
  });

  const textRef = useDerivedRef(textState, (currentState, element) => {
    if (element) {
      // Update text content when state changes
      element.textContent = currentState.content;

      // Apply speed-based styling
      element.style.animationDuration = `${5 / currentState.speed}s`;
    }
  });

  const updateText = () => {
    textState.content = 'Text has been updated!';
  };

  const increaseSpeed = () => {
    textState.speed += 0.5;
  };

  return (
    <div>
      <div
        ref={textRef}
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          animation: 'scrolling 5s linear infinite',
        }}>
        {textState.content}
      </div>
      <button onClick={updateText}>Update Text</button>
      <button onClick={increaseSpeed}>Increase Speed</button>
    </div>
  );
};
```

:::

::: tip When to use it?

Use `useDerivedRef` when you need to integrate reactive state with imperative APIs, third-party libraries, or DOM
manipulation that requires direct access to elements. This hook bridges the gap between reactive state management and
imperative programming patterns.

:::

## Best Practices

When working with derivation APIs, keep these best practices in mind:

1. **Choose the Right API**: Use [useValue](#usevalue-state-key) for observing single properties, [useDerived](#usederivedref-state-handle) for
   computed values, and [usePipe](#usepipe-source-target-transform)/[useBind](#usebind-left-right-transformleft-transformright) for state synchronization.
2. **Optimize for Performance**: Use [useValue](#usevalue-state-key) instead of [useDerived](#usederivedref-state-handle) when you only need to
   observe a single property to ensure fine-grained reactivity.
3. **Keep Transformation Functions Pure**: Transformation functions in [useDerived](#usederivedref-state-handle), [usePipe](#usepipe-source-target-transform),
   and [useBind](#usebind-left-right-transformleft-transformright) should be pure functions without side effects to ensure predictable behavior.
4. **Use [useDerivedRef](#usederivedref-state-handle) for Imperative Integrations**: When you need to work with APIs that require
   direct element access or imperative updates, [useDerivedRef](#usederivedref-state-handle) is the right tool for the job.
5. **Use [useFormWriter](#useformwriter-state-keys) for Form Management**: For complex form handling with validation and automatic
   state synchronization, [useFormWriter](#useformwriter-state-keys) provides a comprehensive solution.
6. **Use [useAction](#useaction-action) for Direct DOM Manipulation**: When you need to manipulate DOM elements directly or add
   event listeners with automatic cleanup, [useAction](#useaction-action) is the appropriate choice.
