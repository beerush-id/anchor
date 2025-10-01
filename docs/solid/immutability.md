---
title: 'Immutability in Anchor for Solid'
description: 'Learn how Anchor provides true immutability in Solid applications while allowing intuitive direct mutations through controlled contracts.'
keywords:
  - anchor for solid
  - solid immutability
  - immutable state
  - data integrity
  - mutation contracts
---

# Immutability in Anchor for Solid

Anchor provides true immutability for your state while still allowing intuitive direct mutations through controlled
contracts. This approach gives you the safety of immutability with the convenience of direct state manipulation.

## Understanding True Immutability

True immutability means that your state objects cannot be modified except through explicitly defined contracts. This
prevents accidental mutations and makes your application more predictable and easier to debug.

In Solid, you might typically use `createStore` for immutable state management, but this requires using immutable update
patterns:

```tsx
// Solid's typical immutable pattern
const [state, setState] = createStore({ count: 0 });

// Update requires immutable patterns
setState('count', (c) => c + 1);
```

## Anchor's Approach

Anchor allows direct mutations while maintaining true immutability behind the scenes:

```tsx
import { immutableRef, writableRef } from '@anchorlib/solid';

const state = immutableRef({ count: 0, name: 'Solid' });
const writer = writableRef(state, ['count']);

// Direct mutation that looks simple but maintains immutability guarantees
state.count++;

// This will be trapped and logs an error
writer.name = 'Changed';
```

Behind the scenes, Anchor ensures that:

1. Changes are tracked through a controlled mutation system
2. Only authorized mutations can occur based on defined contracts

## Creating Immutable State

You can explicitly create immutable state using the `immutable` option:

```tsx
import { immutableRef } from '@anchorlib/solid';

// Create immutable state
const immutableState = immutableRef({ count: 0, name: 'Solid' });

// This will throw an error at runtime
// immutableState.count++; // Error: Cannot mutate immutable state
```

## Benefits of True Immutability

### 1. Predictable State Changes

With true immutability, you always know when and how state can change:

```tsx
import { anchorRef, writableRef } from '@anchorlib/solid';

const user = anchorRef({
  profile: { name: 'John', age: 30 },
});
const profile = writableRef(user.profile, ['name']);

// You can be confident that direct mutations are safe and tracked
profile.name = 'Jane'; // Tracked and safe

// Don't worry about this since state won't change
user.profile = { name: 'John', age: 25 }; // `profile` is read-only
profile.age = 25; // `age` is read-only
```

### 2. Easier Debugging

Since mutations are controlled, you can track exactly what changes occur:

```tsx
import { anchorRef } from '@anchorlib/solid';

const state = anchorRef({ items: [] });

// Every mutation is tracked and can be traced
state.items.push({ id: 1, text: 'New item' });
```

### 3. Prevention of Accidental Mutations

True immutability prevents accidental state changes:

```tsx
import { immutableRef } from '@anchorlib/solid';

const state = immutableRef({ data: { value: 42 } });

// Passing state to a function
someFunction(state.data);

// Function cannot accidentally mutate the state
function someFunction(data) {
  // This will logs an error
  // data.value = 100; // Error: "value" is read-only
}
```

## Schema-Based Immutability

When using schemas, you can define which parts of your state should be mutable:

```tsx
import { modelRef, writableRef } from '@anchorlib/solid';
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

state.user.name = 'Jane'; // Not allowed - state won't change.

settings.theme = 'light'; // Allowed and valid - state will change.
settings.theme = 10; // Allowed but invalid - state won't change.
```
