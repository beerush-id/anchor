# @anchor/svelte

Svelte integration for the Anchor reactive state management library.

## Features

- **Reactive State Management** - Directly mutate state without needing setState patterns
- **Automatic Cleanup** - Automatic subscription cleanup using Svelte's onDestroy lifecycle
- **Svelte 5 Runes Integration** - Works with Svelte 5's runes system
- **Framework Optimized** - Designed specifically for Svelte's reactivity model
- **Schema Validation** - Built-in Zod schema validation support
- **Type Safety** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @anchor/svelte
```

## Quick Start

First, set up the Vite preprocessor (recommended approach):

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { anchor } from '@anchor/svelte/preprocessor';

export default defineConfig({
  plugins: [sveltekit(), anchor()],
});
```

Then use Anchor in your Svelte components:

```svelte
<script>
  import { useAnchor } from '@anchor/svelte';

  // Create a reactive state object
  const state = useAnchor({
    count: 0,
    user: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });
</script>

<div>
  <h1>Hello {state.user.name}</h1>
  <p>Count: {state.count}</p>
  <button onclick={() => state.count++}>Increment</button>
  <button onclick={() => state.user.name = 'Jane Doe'}>Change Name</button>
</div>
```

## Core Concepts

### Preprocessor (Recommended)

The package includes a Vite preprocessor that automatically transforms variable declarations to Svelte's reactive syntax. This is the recommended way to use @anchor/svelte as it provides the most natural development experience:

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { anchor } from '@anchor/svelte/preprocessor';

export default defineConfig({
  plugins: [sveltekit(), anchor()],
});
```

With the preprocessor, you can write natural JavaScript code without explicit reactive prefixes:

```svelte
<script>
  import { useAnchor } from '@anchor/svelte';

  const state = useAnchor({ count: 0 });
</script>

<p>Count: {state.count}</p>
<button onclick={() => state.count++}>Increment</button>
```

The preprocessor automatically transforms references to reactive variables, so you don't need to use the `$` prefix in your templates or logic. This provides a cleaner, more natural syntax while maintaining full reactivity.

### Creating Reactive State

The _useAnchor_ function creates a reactive state that integrates seamlessly with Svelte. Note that Anchor only supports objects, arrays, Maps, and Sets - not primitive values directly:

```svelte
<script>
  import { useAnchor } from '@anchor/svelte';

  // Objects (supported)
  const user = useAnchor({
    name: 'John',
    age: 30
  });

  // Arrays (supported)
  const items = useAnchor([1, 2, 3]);

  // Maps (supported)
  const mapState = useAnchor(new Map([['key', 'value']]));

  // Sets (supported)
  const setState = useAnchor(new Set([1, 2, 3]));
</script>

<div>
  <p>User: {user.name} ({user.age})</p>
  <ul>
    {#each items as item}
      <li>{item}</li>
    {/each}
  </ul>
</div>
```

### Schema Validation

Validate your state with Zod schemas:

```svelte
<script>
  import { useAnchor } from '@anchor/svelte';
  import { z } from 'zod';

  const UserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email()
  });

  const user = useAnchor({
    name: 'John',
    email: 'john@example.com'
  }, {
    schema: UserSchema,
    strict: true // Throws on validation errors
  });
</script>
```

### Automatic Cleanup

The **useAnchor** function automatically handles subscription cleanup when the component is destroyed, so you don't need to manually unsubscribe.

## API Reference

### useAnchor(value, options?)

Creates a reactive state from any value that integrates with Svelte's reactivity system. Supported value types are objects, arrays, Maps, and Sets.

**Parameters:**

- `value` - The value to make reactive (objects, arrays, Maps, or Sets)
- `options` - Configuration options:
  - `schema` - Zod schema for validation
  - `strict` - Throw on validation errors
  - `cloned` - Clone the initial value
  - `deferred` - Defer child anchoring
  - `recursive` - Recursively anchor children

### useDerived(state, transform?)

Subscribes to an existing anchored state and optionally transforms the value.

```svelte
<script>
  import { useAnchor, useDerived } from '@anchor/svelte';

  const state = useAnchor({ count: 0 });

  // Simple derived state
  const doubled = useDerived(state, (snapshot) => snapshot.count * 2);

  // Transformed derived state
  const message = useDerived(state, (snapshot) => `Count is ${snapshot.count}`);
</script>

<div>
  <p>Count: {state.count}</p>
  <p>Doubled: {doubled}</p>
  <p>Message: {message}</p>
</div>
```

## Browser Support

Anchor works in all modern browsers that support ES6+ features including:

- Proxy API
- WeakMap and WeakSet
- Promises
- Modern Array methods

## License

MIT
