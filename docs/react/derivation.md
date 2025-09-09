# Derivation in Anchor for React

Derivation in Anchor refers to the process of creating new reactive data or relationships from existing reactive states. This allows you to build complex data flows, computed values, and synchronized states that automatically update when their underlying dependencies change. Anchor provides several hooks in the React package to facilitate powerful derivation patterns.

## `useDerived` Hook

The `useDerived` hook allows you to create a computed value that automatically re-computes whenever the reactive state it depends on changes. It's similar to `useObserved` but specifically designed for deriving new values from a single reactive state.

```typescript
// Derive the state itself (useful for re-rendering on any change)
function useDerived<T extends Linkable>(state: T, recursive?: boolean): T;

// Derive a transformed value from the state
function useDerived<T extends Linkable, R>(state: T, transform: TransformFn<T, R>): R;
```

- `state`: The reactive state object from which to derive.
- `transform` (optional): A function that receives the current value of the `state` and returns the computed value. If not provided, the hook returns the `state` itself, triggering re-renders on any change.
- `recursive` (optional, boolean): When `transform` is not provided, this flag determines if changes in nested properties of the `state` should also trigger re-renders. Defaults to `false`.

### Example: Calculating Total Price

Let's say you have a reactive `cart` state, and you want to derive the `totalPrice`.

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useDerived } from '@anchor/react';

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

function ShoppingCart() {
  const [cart] = useAnchor<Product[]>([
    { id: 1, name: 'Laptop', price: 1200, quantity: 1 },
    { id: 2, name: 'Mouse', price: 25, quantity: 2 },
  ]);

  const totalPrice = useDerived(cart, (currentCart) => {
    console.log('Recalculating total price...');
    return currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  const addProduct = () => {
    const newId = cart.length > 0 ? Math.max(...cart.map((p) => p.id)) + 1 : 1;
    cart.push({ id: newId, name: `New Item ${newId}`, price: 50, quantity: 1 });
  };

  const updateQuantity = (id: number, delta: number) => {
    const product = cart.find((p) => p.id === id);
    if (product) {
      product.quantity += delta;
    }
  };

  return (
    <div>
      <h2>Shopping Cart</h2>
      <ul>
        {cart.map((product) => (
          <li key={product.id}>
            {product.name} - ${product.price} x {product.quantity}
            <button onClick={() => updateQuantity(product.id, 1)}>+</button>
            <button onClick={() => updateQuantity(product.id, -1)}>-</button>
          </li>
        ))}
      </ul>
      <h3>Total: ${totalPrice.toFixed(2)}</h3>
      <button onClick={addProduct}>Add Product</button>
    </div>
  );
}

export default ShoppingCart;
```

In this example, `totalPrice` automatically updates whenever any `price` or `quantity` in the `cart` array changes, or when items are added/removed from the `cart`.

## `usePipe` Hook

The `usePipe` hook establishes a unidirectional data flow, synchronizing changes from a `source` reactive state to a `target` reactive state. This is useful for scenarios where one state should always reflect a transformed version of another.

```typescript
function usePipe<T extends State, R extends State>(source: T, target: R, transform?: TransformFn<T, R>): void;
```

- `source`: The reactive state from which changes will originate.
- `target`: The reactive state to which changes will be applied.
- `transform` (optional): A function that receives the `source` state and returns a value to be applied to the `target` state. If omitted, the `source` state itself will be assigned to the `target`.

### Example: Mirroring User Input to a Display State

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { usePipe } from '@anchor/react';

function InputMirror() {
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
}

export default InputMirror;
```

## `useBind` Hook

The `useBind` hook creates a bidirectional synchronization between two reactive states. Changes in either the `left` or `right` state will automatically propagate to the other, with optional transformation functions for each direction.

```typescript
function useBind<T extends State, R extends State>(
  left: T,
  right: R,
  transformLeft?: TransformFn<T, R>,
  transformRight?: TransformFn<R, T>
): void;
```

- `left`: The first reactive state to bind.
- `right`: The second reactive state to bind.
- `transformLeft` (optional): A function to transform data when propagating from `left` to `right`.
- `transformRight` (optional): A function to transform data when propagating from `right` to `left`.

### Example: Synchronizing Form Fields

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useBind } from '@anchor/react';

function BidirectionalSync() {
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
}

export default BidirectionalSync;
```

## `useValue` Hook

The `useValue` hook allows you to derive and observe a specific property's value from a reactive state object. It ensures that your component only re-renders when that particular property changes, providing fine-grained control over updates.

```typescript
function useValue<T extends State, K extends keyof T>(state: T, key: K): T[K];
```

- `state`: The reactive state object.
- `key`: The key (property name) of the value to derive.

### Example: Observing a Single User Property

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useValue } from '@anchor/react';

function UserNameDisplay() {
  const [user] = useAnchor({
    firstName: 'Alice',
    lastName: 'Wonderland',
    age: 28,
  });

  // Only re-renders when user.firstName changes
  const firstName = useValue(user, 'firstName');

  const changeLastName = () => {
    user.lastName = 'Smith'; // This will NOT cause UserNameDisplay to re-render
  };

  const changeFirstName = () => {
    user.firstName = 'Bob'; // This WILL cause UserNameDisplay to re-render
  };

  return (
    <div>
      <p>First Name: {firstName}</p>
      <p>Last Name: {user.lastName}</p>
      <button onClick={changeFirstName}>Change First Name</button>
      <button onClick={changeLastName}>Change Last Name</button>
    </div>
  );
}

export default UserNameDisplay;
```

## `useValueIs` Hook

The `useValueIs` hook provides a reactive way to check if a specific property of a reactive state equals an expected value. The boolean result automatically updates whenever the state property changes.

```typescript
function useValueIs<T extends State, K extends keyof T>(state: T, key: K, expect: unknown): boolean;
```

- `state`: The reactive state object.
- `key`: The key (property name) of the value to compare.
- `expect`: The value to compare against.

### Example: Conditional Rendering Based on Status

```tsx
import React from 'react';
import { useAnchor } from '@anchor/react';
import { useValueIs } from '@anchor/react';

function TaskStatus() {
  const [task] = useAnchor({
    id: 1,
    description: 'Complete documentation',
    status: 'pending', // 'pending', 'in-progress', 'completed'
  });

  const isCompleted = useValueIs(task, 'status', 'completed');

  const markAsComplete = () => {
    task.status = 'completed';
  };

  const markAsInProgress = () => {
    task.status = 'in-progress';
  };

  return (
    <div>
      <p>Task: {task.description}</p>
      <p>Status: {task.status}</p>
      {isCompleted ? (
        <p style={{ color: 'green' }}>Task is Completed!</p>
      ) : (
        <p style={{ color: 'orange' }}>Task is still pending or in progress.</p>
      )}
      <button onClick={markAsComplete}>Mark as Complete</button>
      <button onClick={markAsInProgress}>Mark as In Progress</button>
    </div>
  );
}

export default TaskStatus;
```

## `useDerivedRef` Hook

The `useDerivedRef` hook creates a mutable `RefObject` that automatically updates its `current` value based on changes in a reactive state. It also provides a `handle` function that is called whenever the state changes or the ref's `current` value is set, making it ideal for integrating with imperative APIs or external libraries that rely on refs.

```typescript
function useDerivedRef<S extends State, R>(state: S, handle: (current: S, ref: R | null) => void): RefObject<R | null>;
```

- `state`: The reactive state to derive from.
- `handle`: A callback function that receives the current `state` and the `current` value of the ref. This function is executed when the `state` changes or when the ref's `current` value is explicitly set.

### Example: Integrating with a Third-Party Chart Library

Imagine you have a chart library that takes a ref to a DOM element and updates the chart based on data. `useDerivedRef` can help you keep the chart synchronized with your reactive state.

```tsx
import React, { useEffect } from 'react';
import { useAnchor } from '@anchor/react';
import { useDerivedRef } from '@anchor/react';

// Mock a third-party chart library function
const initializeChart = (element: HTMLCanvasElement | null, data: number[]) => {
  if (element) {
    const ctx = element.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, element.width, element.height);
      ctx.fillStyle = 'blue';
      data.forEach((value, index) => {
        ctx.fillRect(index * 20, element.height - value, 15, value);
      });
      console.log('Chart updated with data:', data);
    }
  }
};

function DataChart() {
  const [chartData] = useAnchor({ values: [10, 50, 30, 80, 20] });

  // useDerivedRef to update the chart when chartData.values changes
  const chartRef = useDerivedRef(chartData, (currentData, canvasElement) => {
    // This handle function is called when chartData.values changes
    // or when chartRef.current is set.
    initializeChart(canvasElement as HTMLCanvasElement, currentData.values);
  });

  const addRandomValue = () => {
    chartData.values.push(Math.floor(Math.random() * 100) + 10);
  };

  return (
    <div>
      <canvas ref={chartRef} width="300" height="100" style={{ border: '1px solid black' }}></canvas>
      <button onClick={addRandomValue}>Add Random Value</button>
    </div>
  );
}

export default DataChart;
```

In this example, `useDerivedRef` ensures that `initializeChart` is called whenever `chartData.values` changes, keeping the chart synchronized with your reactive state. The `chartRef` can be directly assigned to the `canvas` element.

## Conclusion

Anchor's derivation hooks provide powerful tools for creating computed values, synchronizing states, and building complex reactive data flows in your React applications. By leveraging these hooks, you can maintain a clean separation of concerns and ensure that your UI remains consistent and performant as your data evolves. In the next section, we will explore the various components provided by Anchor for React.
