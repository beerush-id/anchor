# @anchorlib/core

Reactive State Management for JavaScript with a focus on simplicity and developer experience.

## Features

- **Reactive State Management** - Directly mutate state without needing setState patterns
- **Framework Agnostic** - Works with Vanilla JS, React and Svelte (more coming)
- **True Immutable** - Supports true immutable state, making it easy to reason about your state
- **Schema Validation** - Built-in schema validation support
- **History Tracking** - Undo/redo functionality with the history module
- **API Integration** - Fetch and stream utilities for REST APIs and Readable Streams
- **Type Safety** - Full TypeScript support with comprehensive type definitions
- **Zero Dependencies** - Lightweight core with no production dependencies

## Installation

```bash
npm install @anchorlib/core
```

## Documentation

For full documentation, visit [Anchor Core Documentation](https://anchorlib.dev/docs/overview.html)

## Quick Start

```javascript
import { anchor, derive } from '@anchorlib/core';

// Create a reactive state object
const state = anchor({
  count: 0,
  user: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});

// Subscribe to state changes
const unsubscribe = derive(state, (snapshot, event) => {
  console.log('State changed:', snapshot, event);
});

// Mutate state directly
state.count++;
state.user.name = 'Jane Doe';

// Unsubscribe when needed
// unsubscribe();
```

## License

MIT
