# Anchor Svelte Library

This is the official Anchor library for Svelte. It provides a set of tools to manage state in your Svelte applications, based on the principles of the Anchor framework.

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
  <h1>Hello {state.user.name}</h1>
  <p>Count: {state.count}</p>
  <button onclick={() => state.count++}>Increment</button>
  <button onclick={() => state.user.name = 'Jane Doe'}>Change Name</button>
</div>
```

## License

MIT
