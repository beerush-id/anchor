# Utilities in Anchor for React

Anchor for React provides a set of utility functions that complement its core reactivity system, offering helpful tools for common tasks in your React applications. These utilities are designed to streamline development and enhance the integration of Anchor with your components.

## `cleanProps`

The `cleanProps` utility is essential when working with components wrapped by the `observable` HOC. It helps you manage internal props that are not intended to be passed down to native DOM elements or other child components.

### Why use `cleanProps`?

- **Prevent Prop Pollution:** Removes internal Anchor-specific props (like `_state_version`) that are used for reactivity but are not part of your component's public API.
- **Avoid React Warnings:** Prevents React from issuing warnings about unknown DOM attributes when spreading props onto native elements.
- **Maintain Component Purity:** Ensures that child components only receive the props they are designed to handle.

### Parameters

```typescript
function cleanProps<T extends Bindable>(props: T): Omit<T, '_state_version'>;
```

- `props`: The props object of your component, which might contain the internal `_state_version` prop.

### Usage Example

```tsx
import React from 'react';
import { observable } from '@anchor/react';
import { cleanProps } from '@anchor/react/utils';

interface MyButtonProps {
  onClick: () => void;
  label: string;
  // _state_version might be implicitly added by `observable` HOC
}

const MyButton = observable((props: MyButtonProps) => {
  // Use cleanProps to remove _state_version before spreading to a native button
  const cleanedProps = cleanProps(props);

  return <button {...cleanedProps}>{props.label}</button>;
});

export default MyButton;
```

## `depsChanged`

The `depsChanged` utility is an internal helper primarily used by Anchor's observation system. It efficiently compares two sets of dependencies to determine if any significant changes have occurred, which is crucial for optimizing re-renders. While primarily for internal use, understanding its purpose can deepen your grasp of Anchor's reactivity.

### Why use `depsChanged`?

- **Optimized Dependency Tracking:** Helps Anchor's internal mechanisms to efficiently detect changes in observed dependencies.
- **Performance:** Avoids unnecessary re-computations or re-renders by performing a shallow comparison of dependency sets.

### Parameters

```typescript
function depsChanged(prev: Set<unknown>, next: unknown[]): Set<unknown> | void;
```

- `prev`: A `Set` containing the previously tracked dependencies.
- `next`: An array containing the new set of dependencies.

### Usage Example (Conceptual)

This utility is primarily for internal Anchor use. You typically won't call it directly in your application code.

```typescript
// Inside Anchor's internal observation logic (conceptual example)
const oldDependencies = new Set([myReactiveState.propA, myReactiveState.propB]);
const newDependencies = [myReactiveState.propA, myReactiveState.propC];

if (depsChanged(oldDependencies, newDependencies)) {
  // Re-establish observation or trigger update
  console.log('Dependencies have changed, re-observing...');
} else {
  console.log('Dependencies are the same, no re-observation needed.');
}
```

## `pickValues`

The `pickValues` utility allows you to extract specific properties from an Anchor reactive state object. It returns both an object containing the picked properties and an array of their values.

### Why use `pickValues`?

- **Selective Data Extraction:** Easily get only the properties you need from a larger state object.
- **Convenience:** Returns data in two useful formats (object and array of values) for different use cases.
- **Readability:** Improves code clarity by explicitly defining which properties are being used.

### Parameters

```typescript
function pickValues<T extends State>(state: T, keys: (keyof T)[]): [T, T[keyof T][]];
```

- `state`: The Anchor reactive state object from which to pick values.
- `keys`: An array of property keys (strings) to extract from the state object.

### Usage Example

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { pickValues } from '@anchor/react/utils';

const UserSummary = observable(() => {
  const [user] = useAnchor({
    id: 1,
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    role: 'admin',
  });

  // Pick specific values from the user state
  const [pickedUser, userValues] = pickValues(user, ['firstName', 'lastName', 'email']);

  return (
    <div>
      <h2>User Summary</h2>
      <p>
        Name: {pickedUser.firstName} {pickedUser.lastName}
      </p>
      <p>Contact: {pickedUser.email}</p>
      <p>All picked values: {userValues.join(', ')}</p>
    </div>
  );
});

export default UserSummary;
```

## `isMutationOf`

The `isMutationOf` utility checks if a given state change event specifically relates to a mutation of a particular key within a state object. This is useful for fine-grained control over reactions to state changes.

### Why use `isMutationOf`?

- **Targeted Reactions:** Allows you to trigger logic only when a specific property of a state changes, rather than any change in the entire state.
- **Event Filtering:** Helps in building more precise and efficient event handlers or effects.

### Parameters

```typescript
function isMutationOf(event: StateChange, key: KeyLike): boolean;
```

- `event`: The `StateChange` event object provided by Anchor's subscription system.
- `key`: The specific key (property name) to check for mutation.

### Usage Example

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { isMutationOf } from '@anchor/react/utils';
import { derive } from '@anchor/core';

const ProductLogger = observable(() => {
  const [product] = useAnchor({
    name: 'Laptop',
    price: 1200,
    stock: 50,
  });

  React.useEffect(() => {
    // Subscribe to product changes
    const unsubscribe = derive(product, (newValue, event) => {
      if (event.type !== 'init') {
        // Ignore initial subscription
        if (isMutationOf(event, 'stock')) {
          console.log(`Stock changed for ${newValue.name}: ${event.prev} -> ${event.value}`);
        } else if (isMutationOf(event, 'price')) {
          console.log(`Price changed for ${newValue.name}: ${event.prev} -> ${event.value}`);
        } else {
          console.log(`Other change detected for ${newValue.name}:`, event);
        }
      }
    });

    return () => unsubscribe();
  }, [product]);

  return (
    <div>
      <h2>Product Management</h2>
      <p>Name: {product.name}</p>
      <p>Price: ${product.price}</p>
      <p>Stock: {product.stock}</p>
      <button onClick={() => product.stock--}>Sell One</button>
      <button onClick={() => (product.price += 10)}>Increase Price</button>
    </div>
  );
});

export default ProductLogger;
```

## `mutationKeys`

The `mutationKeys` utility extracts the specific keys that were affected by a state change event. This is particularly useful for understanding precisely what changed within a reactive state.

### Why use `mutationKeys`?

- **Detailed Change Information:** Get a clear list of properties that were modified in a state update.
- **Debugging:** Aids in debugging by providing insight into which parts of your state are being mutated.
- **Conditional Logic:** Allows you to build logic that depends on which specific keys have changed.

### Parameters

```typescript
function mutationKeys(event: StateChange): KeyLike[];
```

- `event`: The `StateChange` event object provided by Anchor's subscription system.

### Usage Example

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { mutationKeys } from '@anchor/react/utils';
import { derive } from '@anchor/core';

const UserActivityMonitor = observable(() => {
  const [user] = useAnchor({
    name: 'Charlie',
    status: 'online',
    lastActive: new Date().toISOString(),
  });

  React.useEffect(() => {
    const unsubscribe = derive(user, (newValue, event) => {
      if (event.type !== 'init') {
        const changedKeys = mutationKeys(event);
        console.log(`User ${newValue.name} changed: ${changedKeys.join(', ')}`);
        if (changedKeys.includes('status')) {
          console.log(`Status updated to: ${newValue.status}`);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div>
      <h2>User Activity</h2>
      <p>Name: {user.name}</p>
      <p>Status: {user.status}</p>
      <button onClick={() => (user.status = user.status === 'online' ? 'offline' : 'online')}>Toggle Status</button>
      <button onClick={() => (user.lastActive = new Date().toISOString())}>Update Last Active</button>
    </div>
  );
});

export default UserActivityMonitor;
```
