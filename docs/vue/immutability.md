# Immutability in Anchor for Vue

Immutability is a core principle in Anchor that ensures predictable state management while still allowing intuitive direct mutations through controlled contracts.

## Understanding Immutability

Immutability means that once a state object is created, it cannot be changed. Instead of modifying existing objects, you create new ones with the desired changes. This approach provides several benefits:

- Predictable state changes
- Easier debugging
- Prevention of accidental mutations
- Simplified reasoning about data flow

## Traditional Immutability Challenges in Vue

In traditional Vue applications, achieving true immutability often requires:

- Deep cloning of objects for nested changes
- Complex update patterns
- Performance overhead from copying large data structures
- Verbose code for simple mutations

```vue
<!-- Traditional approach with verbose updates -->
<script setup>
import { ref } from 'vue';

const user = ref({
  profile: {
    personal: {
      name: 'John',
      age: 30,
    },
  },
});

// Verbose update pattern
const updateName = (newName) => {
  user.value = {
    ...user.value,
    profile: {
      ...user.value.profile,
      personal: {
        ...user.value.profile.personal,
        name: newName,
      },
    },
  };
};
</script>
```

## Anchor's Approach to Immutability

Anchor provides a better approach that combines the safety of immutability with the convenience of direct mutations:

### Direct Mutations with Safety

With Anchor, you can directly mutate state while maintaining immutability guarantees:

```vue
<script setup>
import { anchorRef } from '@anchor/vue';

const user = anchorRef({
  profile: {
    personal: {
      name: 'John',
      age: 30,
    },
  },
});

// Direct mutation - simple and intuitive
const updateName = (newName) => {
  user.value.profile.personal.name = newName;
};
</script>
```

### Immutable States

You can create truly immutable states that prevent any direct mutations:

```vue
<script setup>
import { immutableRef, writableRef } from '@anchor/vue';

// Create an immutable state
const userState = immutableRef({
  profile: {
    name: 'John',
    email: 'john@example.com',
  },
  preferences: {
    theme: 'dark',
  },
});

// This will log an error, also the IDE will show a warning.
// userState.value.profile.name = 'Jane'; // ❌ Not allowed

// Create a controlled writer for specific mutations
const userWriter = writableRef(userState.value, ['profile']);

// This is allowed within the contract
const updateProfile = (newProfile) => {
  userWriter.value.profile = newProfile;
};

// This would be restricted
// userWriter.value.preferences = { theme: 'light' }; // ❌ Not in contract
</script>
```

## Benefits of Anchor's Immutability

### 1. Performance Without Compromise

Anchor's approach eliminates the deep cloning overhead of traditional immutable patterns while maintaining all the benefits:

```vue
<script setup>
import { anchorRef } from '@anchor/vue';

const largeDataSet = anchorRef({
  items: Array(10000)
    .fill()
    .map((_, i) => ({
      id: i,
      data: `Item ${i}`,
    })),
  metadata: {
    lastUpdated: Date.now(),
  },
});

// Efficient mutation - only the changed parts are tracked
const updateMetadata = () => {
  largeDataSet.value.metadata.lastUpdated = Date.now();
};
</script>
```

### 2. Predictable State Changes

With controlled mutations, you always know what can change and when:

```vue
<script setup>
import { immutableRef, writableRef } from '@anchor/vue';

const appState = immutableRef({
  user: { name: 'John' },
  ui: { loading: false },
  data: [],
});

// Writers clearly define what can be mutated
const userWriter = writableRef(appState.value, ['user']);
const uiWriter = writableRef(appState.value, ['ui']);
const dataWriter = writableRef(appState.value, ['data']);

// Clear separation of concerns
const updateUserName = (name) => {
  userWriter.value.user.name = name;
};

const setLoading = (loading) => {
  uiWriter.value.ui.loading = loading;
};

const updateData = (newData) => {
  dataWriter.value.data = newData;
};
</script>
```

### 3. Easy Debugging and Testing

Immutable states make it easier to track changes and debug issues:

```vue
<script setup>
import { immutableRef, writableRef } from '@anchor/vue';

const state = immutableRef({
  counter: 0,
  history: [],
});

const writer = writableRef(state.value, ['counter', 'history']);

// Every mutation is explicit and trackable
const increment = () => {
  writer.value.history.push(writer.value.counter);
  writer.value.counter++;
};
</script>
```

## Best Practices

### 1. Use Immutable States for Shared Data

For global state that's shared across many components, use immutable states:

```js
// lib/App.js
import { immutableRef } from '@anchor/vue';

export const globalState = immutableRef({
  currentUser: null,
  appConfig: {
    theme: 'dark',
    language: 'en',
  },
});
```

### 2. Create Specific Writers

Create writers with specific contracts to limit what can be mutated:

```vue
<script setup>
import { immutableRef, writableRef } from '@anchor/vue';

const state = immutableRef({
  user: { name: 'John' },
  preferences: { theme: 'dark' },
  session: { token: null },
});

// Specific writers for different parts of the application
const userProfileWriter = writableRef(state.value, ['user']);
const preferencesWriter = writableRef(state.value, ['preferences']);
const sessionWriter = writableRef(state.value, ['session']);
</script>
```

### 3. Combine with Schema Validation

Use schema validation with immutable states to ensure data integrity:

```vue
<script setup>
import { immutableRef } from '@anchor/vue';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const userState = immutableRef(
  {
    name: 'John Doe',
    email: 'john@example.com',
  },
  UserSchema
);
</script>
```

By leveraging Anchor's immutability system, you can build Vue applications with predictable state management that's both safe and performant.
