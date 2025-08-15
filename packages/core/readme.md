# @anchor/core

Reactive State Management for JavaScript with a focus on simplicity and developer experience.

## Features

- **Reactive State Management** - Directly mutate state without needing setState patterns
- **Framework Agnostic** - Works with React, Svelte, Vue, Angular, and vanilla JS
- **Schema Validation** - Built-in Zod schema validation support
- **History Tracking** - Undo/redo functionality with the history module
- **API Integration** - Fetch and stream utilities for REST APIs and WebSockets
- **Type Safety** - Full TypeScript support with comprehensive type definitions
- **Zero Dependencies** - Lightweight core with no production dependencies

## Installation

```bash
npm install @anchor/core
```

## Quick Start

```javascript
import { anchor, derive } from '@anchor/core';

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

## Core Concepts

### Anchoring State

The **anchor** function makes JavaScript objects, arrays, Maps, and Sets reactive. Note that Anchor only supports complex data types - not primitive values directly:

```javascript
import { anchor } from '@anchor/core';

// Objects (supported)
const user = anchor({
  name: 'John',
  age: 30,
});

// Arrays (supported)
const items = anchor([1, 2, 3]);

// Maps (supported)
const mapState = anchor(new Map([['key', 'value']]));

// Sets (supported)
const setState = anchor(new Set([1, 2, 3]));
```

### Subscriptions

Listen to state changes with the **derive** function:

```javascript
import { anchor, derive } from '@anchor/core';

const state = anchor({ count: 0 });

const unsubscribe = derive(state, (snapshot, event) => {
  console.log('State updated:', snapshot, 'Event:', event);
});

// Later, to unsubscribe
unsubscribe();
```

Alternatively, you can access the controller directly:

```javascript
import { anchor, derive } from '@anchor/core';

const state = anchor({ count: 0 });
const controller = derive.resolve(state);

if (controller) {
  const unsubscribe = controller.subscribe((snapshot, event) => {
    console.log('State updated:', snapshot, 'Event:', event);
  });

  // Later, to unsubscribe
  // unsubscribe();
}
```

### Schema Validation

Validate your state with Zod schemas:

```javascript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const user = anchor(
  {
    name: 'John',
    email: 'john@example.com',
  },
  {
    schema: UserSchema,
    strict: true, // Throws on validation errors
  }
);
```

## Modules

### Fetch

Handle REST API calls with reactive state:

```javascript
import { fetchState } from '@anchor/core/fetch';

const users = fetchState([], {
  url: '/api/users',
  methodCall: 'GET',
});

// users.status will be 'pending' -> 'success' or 'error'
// users.data will contain the response data
```

### History

Add undo/redo functionality to your state:

```javascript
import { anchor } from '@anchor/core';
import { history } from '@anchor/core/history';

const state = anchor({ count: 0 });
const stateHistory = history(state);

state.count++; // 1
state.count++; // 2

stateHistory.backward(); // count: 1
stateHistory.backward(); // count: 0
stateHistory.forward(); // count: 1
```

## API Reference

### anchor(value, options?)

Creates a reactive state from any value. Supported value types are objects, arrays, Maps, and Sets.

**Parameters:**

- `value` - The value to make reactive (objects, arrays, Maps, or Sets)
- `options` - Configuration options:
  - `schema` - Zod schema for validation
  - `strict` - Throw on validation errors
  - `cloned` - Clone the initial value
  - `deferred` - Defer child anchoring
  - `recursive` - Recursively anchor children

### derive(state, handler)

Subscribe to an existing anchored state.

```javascript
import { derive } from '@anchor/core';

const state = anchor({ count: 0 });

const unsubscribe = derive(state, (snapshot, event) => {
  console.log('State changed:', snapshot);
});
```

### derive.resolve(state)

Resolve the StateController for a given anchored state to access subscribe, destroy methods directly.

```javascript
import { derive } from '@anchor/core';

const state = anchor({ count: 0 });
const controller = derive.resolve(state);

if (controller) {
  const unsubscribe = controller.subscribe((snapshot, event) => {
    console.log('State changed:', snapshot);
  });
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
