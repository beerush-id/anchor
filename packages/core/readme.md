# @anchor/core

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

The **anchor** function makes JavaScript objects, arrays, Maps, and Sets reactive.

> Note that Anchor only supports complex data types - not primitive values directly.

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

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const user = anchor(
  {
    name: 'John',
    email: 'john@example.com',
  },
  userSchema
);
```

## Advanced Usage

### Creating Different Types of States

Anchor provides several methods for creating different types of reactive states:

```javascript
import { anchor } from '@anchor/core';

// Standard reactive state
const standard = anchor({ count: 0 });

// Raw state (without cloning the initial value)
const raw = anchor.raw({ count: 0 });

// Flat array state (only tracks array mutation methods)
const flat = anchor.flat([1, 2, 3]);

// Model state (with schema validation)
const model = anchor.model({ name: 'John' }, z.object({ name: z.string().min(1) }));

// Immutable state
const immutable = anchor.immutable({ count: 0 });

// Immutable state with schema validation
const immutableModel = anchor.immutable({ name: 'John' }, z.object({ name: z.string().min(1) }));
```

### Working with Immutable States

Immutable states provide a way to create read-only reactive objects:

```javascript
import { anchor } from '@anchor/core';

// Create an immutable state
const immutableState = anchor.immutable({ count: 0 });

// This will throw an error in strict mode or log an error
// immutableState.count = 1;

// To make it writable, use the writable method
const writableState = anchor.writable(immutableState);
writableState.count = 1; // This works

// Or make only specific properties writable
const partiallyWritable = anchor.writable(immutableState, ['count']);
partiallyWritable.count = 1; // This works
```

### Utility Methods

Anchor provides several utility methods for working with states:

```javascript
import { anchor } from '@anchor/core';

const state1 = anchor({ a: 1, b: 2 });
const state2 = anchor({ c: 3, d: 4 });

// Assign properties from one object to another
anchor.assign(state1, state2);
// state1 is now { a: 1, b: 2, c: 3, d: 4 }
// assign event is emitted.

// Remove specific keys
anchor.remove(state1, 'a', 'b');
// state1 is now { c: 3, d: 4 }
// remove event is emitted.

// Clear all entries
anchor.clear(state1);
// state1 is now {}
// clear event is emitted.
```

### Global Configuration

You can configure global settings for Anchor:

```javascript
import { anchor } from '@anchor/core';

// Configure global settings
anchor.configure({
  strict: true, // Throw on validation errors
  cloned: true, // Clone initial values (ignored in immutable mode)
  recursive: true, // Recursively anchor children
  immutable: false, // Create mutable states by default
});
```

## Modules

### Fetch

Handle REST API calls with reactive state:

```javascript
import { fetchState, streamState } from '@anchor/core';

const users = fetchState([], {
  url: '/api/users',
  method: 'GET',
});

// users.status will be 'pending' -> 'success' or 'error'
// users.data will contain the response data
// users.error will contain any error that occurred
// users.response will contain the raw Response object

const message = streamState('Please wait...', {
  url: '/api/message',
  method: 'GET',
});

// message.status will be 'pending' -> 'success' or 'error'
// message.data will contain the response data, updated chunk by chunk.
// message.error will contain any error that occurred
```

### History

Add undo/redo functionality to your state:

> Note:
> Changes are batched and applied in a single transaction to avoid flooding with verbose successive updates.

```javascript
import { anchor, history } from '@anchor/core';

const state = anchor({ count: 0 });
const stateHistory = history(state);

state.count++; // 1
state.count++; // 2

stateHistory.backward(); // count: 1
stateHistory.backward(); // count: 0
stateHistory.forward(); // count: 1

// Check if you can move forward/backward
if (stateHistory.canBackward) {
  // ...
}

if (stateHistory.canForward) {
  // ...
}

// Clear history
stateHistory.clear();

// Reset history (keeps current state but clears history)
stateHistory.reset();

// Destroy history (cleans up all listeners)
stateHistory.destroy();
```

## API Reference

### anchor(init, options?)

Creates a reactive state from any value. Supported value types are objects, arrays, Maps, and Sets.

**Parameters:**

- `init` - The value to make reactive (objects, arrays, Maps, or Sets)
- `options` - Configuration options:
  - `schema` - Zod schema for validation
  - `strict` - Throw on validation errors
  - `cloned` - Clone the initial value
  - `recursive` - Recursively anchor children
  - `immutable` - Create an immutable state

### anchor.raw(init, options?)

Creates a raw reactive state without cloning the initial value.

### anchor.flat(init, options?)

Creates a flat reactive array state that only tracks array mutation methods.

### anchor.model(init, schema, options?)

Creates a reactive state with schema validation.

### anchor.immutable(init, options?)

Creates an immutable reactive state.

### anchor.immutable(init, schema, options?)

Creates an immutable reactive state with schema validation.

### anchor.get(state)

Gets the current state value.

### anchor.snapshot(state)

Creates a snapshot of the current state.

### anchor.writable(state, contracts?)

Makes a readonly state writable. If contracts are provided, only those keys will be mutable.

### anchor.assign(target, source)

Assigns properties from source to target object.

### anchor.remove(target, ...keys)

Removes keys from a collection.

### anchor.clear(target)

Clears all entries from a collection.

### anchor.configure(config)

Configures global anchor settings.

### derive(state, handler)

Subscribe to an existing anchored state.

```javascript
import { derive } from '@anchor/core';

const state = anchor({ count: 0 });

const unsubscribe = derive(state, (snapshot, event) => {
  console.log('State changed:', snapshot);
});
```

### derive.log(state)

Subscribe to an existing anchored state and log changes to the console.

```javascript
import { derive } from '@anchor/core';

const state = anchor({ count: 0 });

const unsubscribe = derive.log(state);
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

### derive.pipe(source, target, transform?)

Pipe changes of the source state to a target state with an optional transformation function.

```javascript
import { anchor, derive } from '@anchor/core';

const source = anchor({ count: 0 });
const target = anchor({ count: 0 });

// Without transformation
const unsubscribe1 = derive.pipe(source, target);

// With transformation
const unsubscribe2 = derive.pipe(source, target, (snapshot) => ({
  count: snapshot.count * 2,
}));
```

### fetchState(init, options)

Create a reactive fetch state object that syncs with fetch response.

**Parameters:**

- `init` - Initial data value
- `options` - Fetch configuration options including URL and request settings:
  - `url` - The URL to fetch from
  - Other standard fetch options (method, headers, etc.)

### streamState(init, options)

Create a reactive fetch state object that syncs with fetch response.

**Parameters:**

- `init` - Initial data value
- `options` - Fetch configuration options including URL and request settings:
  - `url` - The URL to fetch from
  - `transform` - Optional function to transform each chunk of data
  - Other standard fetch options (method, headers, etc.)

### history(state, options?)

Creates a history management system for a reactive state object.

**Parameters:**

- `state` - The reactive state object to track
- `options` - Configuration options:
  - `debounce` - Debounce time in milliseconds for collecting changes (default: 100ms)
  - `maxHistory` - Maximum number of history states to keep (default: 100)

**Returns:**
An object with the following properties and methods:

- `backwardList` - Array of previous states
- `forwardList` - Array of future states
- `canBackward` - Boolean indicating if backward movement is possible
- `canForward` - Boolean indicating if forward movement is possible
- `backward()` - Move to the previous state
- `forward()` - Move to the next state
- `destroy()` - Clean up all listeners
- `clear()` - Clear all history
- `reset()` - Reset history but keep current state

## Browser Support

Anchor works in all modern browsers that support ES6+ features including:

- Proxy API
- WeakMap and WeakSet
- Promises
- Modern Array methods

## License

MIT
