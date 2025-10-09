# Anchor Vue Library

This is the official Anchor library for Vue. It provides a set of tools to manage state in your Vue applications, based on the principles of the Anchor framework.

## Installation

```bash
npm install @anchorlib/vue
```

## Documentation

For full documentation, visit [Anchor for Vue](https://anchorlib.dev/docs/vue/introduction.html)

## Quick Start

Here's a simple example of how to use `anchorRef` in a Vue component:

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

const state = anchorRef({
  user: {
    name: 'John Doe',
    age: 30,
  },
  isAuthenticated: false,
});
</script>

<template>
  <div>
    <h1>{{ state.user.name }}</h1>
    <p>Age: {{ state.user.age }}</p>
    <button @click="state.user.age++">Increment Age</button>
  </div>
</template>
```

## License

MIT

```

## License

MIT
```
