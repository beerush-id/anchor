# @anchorlib/react

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
npm install @anchorlib/react
```

## Documentation

For full documentation, visit [Anchor for React](https://anchorlib.dev/docs/react/introduction.html)

## Quick Start

```jsx
import { useAnchor } from '@anchorlib/react-classic';

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

## License

MIT
