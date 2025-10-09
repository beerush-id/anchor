# @anchorlib/svelte

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
npm install @anchorlib/svelte
```

## Documentation

For full documentation, visit [Anchor for Svelte](https://anchorlib.dev/docs/svelte/introduction.html)

## Quick Start

```svelte
<script>
  import { anchorRef } from '@anchorlib/svelte';

  // Create a reactive state object
  const state = anchorRef({
    count: 0,
    user: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });
</script>

<div>
  <h1>Hello {$state.user.name}</h1>
  <p>Count: {$state.count}</p>
  <button onclick={() => $state.count++}>Increment</button>
  <button onclick={() => $state.user.name = 'Jane Doe'}>Change Name</button>
</div>
```

## License

MIT
