# @anchor/react

React integration for the Anchor reactive state management library.

## Features

- **Reactive State Management** - Directly mutate state without needing setState patterns
- **Automatic Re-renders** - Components automatically re-render when state changes
- **Hooks-based API** - Designed specifically for React's hooks system
- **Dependency Tracking** - Fine-grained control over when components re-render
- **Schema Validation** - Built-in Zod schema validation support
- **Type Safety** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @anchor/react
```

## Quick Start

```jsx
import { useAnchor } from '@anchor/react';

function Counter() {
  const state = useAnchor({
    count: 0,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  });

  return (
    <div>
      <h1>Hello {state.user.name}</h1>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
      <button onClick={() => (state.user.name = 'Jane Doe')}>Change Name</button>
    </div>
  );
}
```

## Core Concepts

### Creating Reactive State

The **useAnchor** hook creates a reactive state that integrates seamlessly with React. Note that Anchor only supports objects, arrays, Maps, and Sets - not primitive values directly:

```jsx
import { useAnchor } from '@anchor/react';

function MyComponent() {
  // Objects (supported)
  const user = useAnchor({
    name: 'John',
    age: 30,
  });

  // Arrays (supported)
  const items = useAnchor([1, 2, 3]);

  // Maps (supported)
  const mapState = useAnchor(new Map([['key', 'value']]));

  // Sets (supported)
  const setState = useAnchor(new Set([1, 2, 3]));

  return (
    <div>
      <p>
        User: {user.name} ({user.age})
      </p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Dependency Tracking

Control when components re-render by specifying dependencies:

```jsx
import { useAnchor } from '@anchor/react';

function MyComponent() {
  const state = useAnchor(
    {
      count: 0,
      name: 'John',
      age: 30,
    },
    {
      // Only re-render when 'count' changes or when 'set' mutations occur
      listen: ['count'],
    }
  );

  return (
    <div>
      <p>Count: {state.count}</p>
      {/* This won't cause re-renders when 'name' or 'age' change */}
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

### Schema Validation

Validate your state with Zod schemas:

```jsx
import { useAnchor } from '@anchor/react';
import { z } from 'zod';

function MyComponent() {
  const UserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  const user = useAnchor(
    {
      name: 'John',
      email: 'john@example.com',
    },
    {
      schema: UserSchema,
      strict: true, // Throws on validation errors
    }
  );

  return (
    <div>
      <p>
        User: {user.name} ({user.email})
      </p>
      <button onClick={() => (user.name = 'Jane Doe')}>Change Name</button>
    </div>
  );
}
```

## API Reference

### useAnchor(value, options?)

Creates a reactive state from any value that integrates with React's reactivity system. Supported value types are objects, arrays, Maps, and Sets.

**Parameters:**

- `value` - The value to make reactive (objects, arrays, Maps, or Sets)
- `options` - Configuration options:
  - `schema` - Zod schema for validation
  - `strict` - Throw on validation errors
  - `cloned` - Clone the initial value
  - `deferred` - Defer child anchoring
  - `recursive` - Recursively anchor children
  - `listen` - Array of dependencies to control re-renders

### useDerived(state, transform?)

Subscribes to an existing anchored state and optionally transforms the value.

```jsx
import { useAnchor, useDerived } from '@anchor/react';

function MyComponent() {
  const state = useAnchor({ count: 0 });

  // Simple derived state
  const doubled = useDerived(state, (snapshot) => snapshot.count * 2);

  // Transformed derived state
  const message = useDerived(state, (snapshot) => `Count is ${snapshot.count}`);

  return (
    <div>
      <p>Count: {state.count}</p>
      <p>Doubled: {doubled}</p>
      <p>Message: {message}</p>
    </div>
  );
}
```

## Browser Support

Anchor works in all modern browsers that support ES6+ features including:

- Proxy API
- WeakMap and WeakSet
- Promises
- Modern Array methods

## License

MIT
