# Anchor Vue Library

This is the official Anchor library for Vue. It provides a set of tools to manage state in your Vue applications, based on the principles of the Anchor framework.

## Installation

```bash
npm install @anchor/vue
```

## Core Concepts

### Reactivity in Vue

In Vue, reactive objects are wrapped in a `Ref`, which exposes the underlying value through a `.value` property. When working with Anchor, you'll often interact with these `Ref` objects.

### Example

Here's a simple example of how to use `anchorRef` in a Vue component:

```vue
<script setup>
import { anchorRef } from '@anchor/vue';

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

## API Reference

### `anchorRef`

The `anchorRef` function is the primary way to create a reactive state object in your Vue application. It works similarly to Vue's `ref`, but with the added benefits of Anchor's features like schemas and deep reactivity. Anchor only supports `object`, `array`, `map`, and `set` data types.

**Basic Usage:**

```typescript
import { anchorRef } from '@anchor/vue';

const state = anchorRef({
  user: {
    name: 'John Doe',
    age: 30,
  },
  isAuthenticated: false,
});

console.log(state.value.user.name); // 'John Doe'

state.value.user.age++;

console.log(state.value.user.age); // 31
```

### `modelRef`

For more complex state, you can use `modelRef` to create a state object based on a schema. This allows you to define the shape of your data and validate it. If a mutation is invalid, it will be prevented.

```typescript
import { modelRef } from '@anchor/vue';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const user = modelRef(UserSchema, {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
});

console.log(user.value.email); // 'john.doe@example.com'

// The mutation is prevented because the email is invalid
user.value.email = 'invalid-email';

console.log(user.value.email); // 'john.doe@example.com'
```

### `propsRef`

When working with components, you often pass reactive state as props. The `propsRef` function allows you to easily convert props into reactive refs within your component.

```typescript
import { propsRef } from '@anchor/vue';
import { defineProps } from 'vue';

const props = defineProps<{ user: { name: string } }>();
const { user } = propsRef(props);

console.log(user.value.name);
```

### `flatRef`

Creates a reactive array that only reacts to changes in the array itself (e.g., adding or removing items), not to changes within the items.

```typescript
import { flatRef } from '@anchor/vue';

const list = flatRef([1, 2, 3]);

list.value.push(4);

console.log(list.value); // [1, 2, 3, 4]
```

### `rawRef`

Creates a reactive object that mutates the original object.

```typescript
import { rawRef } from '@anchor/vue';

const data = { count: 0 };
const state = rawRef(data);

state.value.count++;

console.log(data.count); // 1
```

### `derivedRef`

Creates a Vue ref that derives its value from an Anchor state. This is useful for creating computed values from your state.

```typescript
import { anchorRef, derivedRef } from '@anchor/vue';

const state = anchorRef({
  firstName: 'John',
  lastName: 'Doe',
});

const fullName = derivedRef(state, (value) => `${value.firstName} ${value.lastName}`);

console.log(fullName.value); // 'John Doe'

state.value.firstName = 'Jane';

console.log(fullName.value); // 'Jane Doe'
```

### `fetchRef` and `streamRef`

For handling asynchronous operations, Anchor Vue provides `fetchRef` and `streamRef`. These functions create reactive references to a fetch or stream state, respectively.

```vue
<script setup>
import { fetchRef } from '@anchor/vue';

const state = fetchRef(
  {},
  {
    url: 'https://api.example.com/data',
    method: 'GET',
  }
);
</script>

<template>
  <div>
    <h1>Data Fetching</h1>
    <p>Status: {{ state.status }}</p>
    <pre v-if="state.status === 'success'">{{ state.data }}</pre>
  </div>
</template>
```

### `historyRef`

`historyRef` creates a Vue ref that wraps a history state object, allowing you to track changes to a state object over time.

```typescript
import { anchorRef, historyRef } from '@anchor/vue';

const state = anchorRef({ count: 0 });
const history = historyRef(state);

console.log(history.value.past); // []

state.value.count++;

console.log(history.value.past); // [{ count: 0 }]
```

### `immutableRef` and `writableRef`

`immutableRef` creates an immutable reactive state. `writableRef` creates a writable version of a readonly state.

```typescript
import { immutableRef, writableRef } from '@anchor/vue';

const state = immutableRef({ count: 0 });

// This mutation will be prevented.
// state.value.count++;

const writableState = writableRef(state);

writableState.value.count++; // This is allowed
```

## License

MIT
