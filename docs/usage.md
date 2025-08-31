# Usage

Before getting started with Anchor, ensure you have followed the [installation](/installation) instructions.
This guide will provide a basic introduction to Anchor's core functionality.

## Basic Usage

After installing the appropriate packages, you can start using **Anchor** in your project. Here's a basic example with
the core package:

```typescript
import { anchor, derive } from '@anchor/core';

// Create a reactive state.
const state = anchor({
  count: 0,
  name: 'Anchor',
  items: [],
});

// Logs each state change to console.
derive(state, console.log);

// Access state properties.
console.log(state.count); // 0

// Mutate state directly
state.count++;
state.name = 'Updated Name';
state.items.push({ id: 1, text: 'First item' });

// Each change above will logs the event to console.
```

For framework-specific usage, refer to the respective framework guides.

## Configurations

Anchor works out of the box with zero configuration. However, for advanced use cases, you can customize behavior through
global configuration or per-state options:

### Default Configuration

You can configure Anchor's default configurations using `anchor.configure`:

```typescript
import { anchor } from '@anchor/core';

anchor.configure({
  immutable: true, // Enable true immutability as default
});
```

::: tip Important Note

While Anchor value and support true immutability model, its core mental is to provide an intuitive and easy-to-use API
to work with state. That's why we don't enable true immutability by default, as we don't want to force you to work with
immutable state everywhere.

:::

### Per-State Configuration

You can also configure options when creating individual states, overriding the default configuration:

```typescript
import { anchor } from '@anchor/core';

const state = anchor(
  {
    count: 0,
    name: 'Anchor',
  },
  // Options
  {
    observable: false, // Disable observation, state can be only derived.
  }
);
```

### Available Options

- **`immutable`** **_boolean_**: Enables true immutability. The returned state will become read-only with read-only
  typed (Default:
  `false`).
- **`observable`** **_boolean_**: Disables observation, state can be only derived (Default: `true`).
- **`recursive`** **_`true`|`false`|`'flat'`_**: Enables recursive/nested state (Default: `true`).

::: tip Flat Recursion

When a state is configured with `recursive: 'flat'`, it will only notify for array mutations while maintains nested
reactivity. This can be useful when you have a large array and you only need to react to array mutations.

:::

## APIs

Anchor provides a set of APIs to manage state:

### **`anchor`**

This function is used to creates a reactive state with optional configuration.

```ts
// Create a reactive state with optional configuration.
type anchor = <T, S>(init: T, options?: StateOptions<S>) => T;
```

```ts
// Create a reactive state with schema.
type anchor = <S, T>(init: T, schema: S, options?: StateBaseOptions) => T;
```

#### Options

Each option is optional and can be used to configure the state.

- **`immutable`** **_boolean_**: Enable/disable true immutability.
- **`observable`** **_boolean_**: Enable/disable observation.
- **`recursive`** **_`true`|`false`|`'flat'`_**: Enable/disable recursive state.
- **`schema`**: Schema to validate the state.

#### Usage

```typescript
// Create a reactive state.
const state = anchor(initialState, options);
```

```typescript
// Create a reactive state with schema.
const state = anchor(initialState, schema, options);
```

#### Parameters

- **`initialState`**: The initial state of the state.
- **`options`** **_[optional]_**: Options to configure the state.
- **`schema`** **_[optional]_**: Schema to validate the state.

### **`anchor.model`**

Creates a reactive state with schema validation.

```ts
type model = <S, T>(init: T, schema: S, options?: StateBaseOptions) => T;
```

### **`anchor.immutable`**

Creates an immutable reactive state.

```ts
// Without schema
type immutable = <T, S>(init: T, options?: StateOptions<S>) => Immutable<T>;

// With schema
type immutable = <S, T>(init: T, schema: S, options?: StateBaseOptions) => Immutable<T>;
```

### **`anchor.get`**

Gets the current state value.

```ts
type get = <T>(state: State<T>) => T;
```

### **`anchor.snapshot`**

Creates a snapshot of the current state.

```ts
type snapshot = <T>(state: State<T>) => T;
```

### **`anchor.writable`**

Create a write contract to mutate a state.

```ts
// Make entire state writable
type writable = <T>(state: T) => Mutable<T>;

// Make specific keys writable
type writable = <T, K>(state: T, contracts?: K) => MutablePart<T, K>;
```

### **`anchor.assign`**

Assigns properties from source to target object.

```ts
type assign = {
  <T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>): void;
  <T>(target: T[], source: { [key: string]: T } | Record<string, T>): void;
  <T>(target: T, source: Partial<T>): void;
};
```

### **`anchor.remove`**

Removes keys from a collection.

```ts
type remove = {
  <T, K>(target: Map<T, K>, ...keys: Array<T>): void;
  <T>(target: T[], ...keys: Array<string>): void;
  <T>(target: T, ...keys: Array<keyof T>): void;
};
```

### **`anchor.clear`**

Clears all entries from a collection.

```ts
type clear = <T>(target: T) => void;
```

### **`anchor.destroy`**

Destroys a reactive state and cleans up all associated resources.

```ts
type destroy = <T extends State>(state: T) => void;
```

### **`anchor.configure`**

Configures global Anchor settings.

```ts
type configure = (config: Partial<AnchorSettings>) => void;
```

### **`anchor.configs`**

Gets the global Anchor settings.

```ts
type configs = () => AnchorSettings;
```

## Examples

### Simple Counter (Core)

```typescript
import { anchor, derive } from '@anchor/core';

const counter = anchor({ count: 0 });

// Increment the counter
counter.count++;

// Subscribe to changes
const view = document.getElementById('counter');
derive(counter, () => {
  view.innerHTML = counter.count;
});
```

### Todo List (React)

```tsx
import { useAnchor } from '@anchor/react';

function TodoList() {
  const todos = useAnchor([
    { id: 1, text: 'Learn Anchor', done: false },
    { id: 2, text: 'Build an app', done: false },
  ]);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input type="checkbox" checked={todo.done} onChange={(e) => (todo.done = e.target.checked)} />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```
