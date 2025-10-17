---
title: 'Immutability in Anchor for Svelte'
description: 'Learn how Anchor provides true immutability in Svelte applications while allowing intuitive direct mutations through controlled contracts.'
keywords:
  - anchor for svelte
  - svelte immutability
  - immutable state
  - data integrity
  - mutation contracts
---

# Immutability in Anchor for Svelte

Anchor provides true immutability for your state while still allowing intuitive direct mutations through controlled
contracts. This approach gives you the safety of immutability with the convenience of direct state manipulation.

## Understanding True Immutability

True immutability means that your state objects cannot be modified except through explicitly defined contracts. This
prevents accidental mutations and makes your application more predictable and easier to debug.

With Svelte 5, runes simplify state management by embracing mutability, but this means immutability is not enforced by default:

```sveltehtml
<script>
  // Svelte 5's typical mutable pattern
  let count = $state(0);

  // Direct mutation is the standard way, which can be risky
  const increment = () => {
    count++;
  };
</script>
```

## Anchor's Approach

Anchor allows direct mutations while maintaining true immutability behind the scenes:

```sveltehtml
<script>
  import { immutableRef, writableRef } from '@anchorlib/svelte';

  const state = immutableRef({ count: 0, name: 'Svelte' });
  const writer = writableRef(state, ['count']);

  // Direct mutation that looks simple but maintains immutability guarantees
  const increment = () => {
    writer.count++;
  };

  // This will be trapped and logs an error
  const changeName = () => {
    writer.name = 'Changed';
  };
</script>
```

Behind the scenes, Anchor ensures that:

1. Changes are tracked through a controlled mutation system
2. Only authorized mutations can occur based on defined contracts

## Creating Immutable State

You can explicitly create immutable state using the `immutableRef` function:

```sveltehtml
<script>
  import { immutableRef } from '@anchorlib/svelte';

  // Create immutable state
  const immutableState = immutableRef({ count: 0, name: 'Svelte' });

  const mutateCount = () => {
    immutableState.count++; // Trapped: Cannot mutate immutable state
  };
</script>
```

## Benefits of True Immutability

### 1. Predictable State Changes

With true immutability, you always know when and how state can change:

```sveltehtml
<script>
  import { anchorRef, writableRef } from '@anchorlib/svelte';

  const user = anchorRef({
    profile: { name: 'John', age: 30 },
  });
  const profile = writableRef(user.profile, ['name']);

  // You can be confident that direct mutations are safe and tracked
  const changeName = () => {
    profile.name = 'Jane'; // Tracked and safe
  };

  // Don't worry about this since state won't change
  const changeProfile = () => {
    user.profile = { name: 'John', age: 25 }; // `profile` is read-only
    profile.age = 25; // `age` is read-only
  };
</script>
```

### 2. Easier Debugging

Since mutations are controlled, you can track exactly what changes occur:

```sveltehtml

<script>
  import { writableRef, immutableRef } from '@anchorlib/svelte';

  const state = immutableRef({ items: [] });
  const writer = writableRef(state.items, ['push']);

  // Every mutation is tracked and can be traced
  const addItem = () => {
    writer.push({ id: 1, text: 'New item' });
  };
</script>
```

### 3. Prevention of Accidental Mutations

True immutability prevents accidental state changes:

```sveltehtml
<script>
  import { immutableRef } from '@anchorlib/svelte';

  const state = immutableRef({ data: { value: 42 } });

  // Passing state to a function
  someFunction(state.data);

  // Function cannot accidentally mutate the state
  function someFunction(data) {
    // This will logs an error
    data.value = 100; // Error: "value" is read-only
  }
</script>
```

## Schema-Based Immutability

When using schemas, you can define which parts of your state should be mutable:

```sveltehtml
<script>
  import { modelRef, writableRef } from '@anchorlib/svelte';
  import { z } from 'zod';

  const schema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number(),
    }),
    settings: z.object({
      theme: z.enum(['light', 'dark']),
    }),
  });

  const state = modelRef(
    schema,
    {
      user: { name: 'John', age: 30 },
      settings: { theme: 'dark' },
    },
    { immutable: true } // Set the immutable flag
  );

  const settings = writableRef(state.settings);

  // state.user.name = 'Jane'; // Not allowed - state won't change.

  settings.theme = 'light'; // Allowed and valid - state will change.
  // settings.theme = 10; // Allowed but invalid - state won't change.
</script>
```
