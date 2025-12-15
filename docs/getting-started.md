---
title: "Getting Started with Anchor: AIR Stack State Management"
description: 'Learn the basics of Anchor, the state management component of the AIR Stack. This guide walks you through creating reactive state, immutability, and fine-grained reactivity.'
keywords:
  - AIR Stack getting started
  - Anchor getting started
  - Anchor tutorial
  - state management tutorial
  - React state management
  - Vue state management
  - Svelte state management
  - fine-grained reactivity
---

# Getting Started with Anchor

Welcome to **Anchor**, the state management component of the **AIR Stack** (Anchor + IRPC + Reactive UI)!

Anchor offers fine-grained reactivity and true immutability, making your state predictable and easy to work with. This guide will walk you through the essentials to get you up and running.

> **Note:** This guide covers Anchor (state management). For IRPC (API framework), see [IRPC Getting Started](/irpc/getting-started).

## **Prerequisites**

Before we begin, make sure you have:

- A basic understanding of JavaScript or TypeScript.
- Anchor [installed](/installation) in your project.

## **Creating Your First State**

Let's dive in by creating a simple reactive state. With Anchor, you can create a state object that your components can "watch" for changes. When the state updates, your UI will react automatically.

Here’s how you can create a simple counter:

::: code-group

```tsx [React]
import { setup, mutable, render } from '@anchorlib/react';

const Counter = setup(() => {
  // Create a reactive state object.
  const state = mutable({
    count: 0,
    title: 'My App',
  });

  return render(() => (
    <div>
      <h1>{state.title}</h1>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  ));
});
```

```jsx [SolidJS]
import { mutable } from '@anchorlib/solid';

const Counter = () => {
  // Create a reactive state object.
  const state = mutable({
    count: 0,
    title: 'My App',
  });

  return (
    <div>
      <h1>{state.title}</h1>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
};
```

```sveltehtml [Svelte]
<script>
  import { mutable } from '@anchorlib/svelte';

  // Create a reactive state object.
  const state = mutable({ count: 0, title: 'My App' });
</script>

<div>
  <h1>{state.title}</h1>
  <p>Count: {state.count}</p>
  <button on:click={() => state.count++}>Increment</button>
</div>
```

```vue [Vue]
<script setup>
import { anchorRef } from '@anchorlib/vue';

// Create a reactive state object.
const state = anchorRef({ count: 0, title: 'My App' });
</script>

<template>
  <div>
    <h1>{{ state.title }}</h1>
    <p>Count: {{ state.count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

```typescript [VanillaJS]
import { mutable, subscribe } from '@anchorlib/core';

// Create a reactive state object.
const state = mutable({
  count: 0,
  title: 'Hello, World!',
});

// Subscribe to changes in the state.
subscribe(state, (current, event) => {
  console.log('State changed:', current, event);
});

// This will trigger the subscription callback.
state.count++;
```

:::

## **Embracing Immutability**

One of Anchor's core features is its powerful immutability system. It helps you prevent accidental state mutations, which are a common source of bugs. When you create an immutable state, Anchor provides warnings at the IDE, build, and runtime levels if you try to change it directly, all without crashing your application.

::: code-group

```tsx [React]
import { setup, immutable, render } from '@anchorlib/react';

const Profile = setup(() => {
  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This line will trigger a warning in your IDE, a build error,
    // and a runtime error log without crashing the app.
    profile.name = 'Jane Smith';
  };

  return render(() => (
    <div>
      <h1>{profile.name}</h1>
      <p>Email: {profile.email}</p>
    </div>
  ));
});
```

```tsx [SolidJS]
import { immutable } from '@anchorlib/solid';

const Profile = () => {
  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This line will trigger a warning in your IDE, a build error,
    // and a runtime error log without crashing the app.
    profile.name = 'Jane Smith';
  };

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>Email: {profile.email}</p>
    </div>
  );
};
```

```sveltehtml [Svelte]
<script>
  import { immutable } from '@anchorlib/svelte';

  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This line will trigger a warning in your IDE, a build error,
    // and a runtime error log without crashing the app.
    profile.name = 'Jane Smith';
  }
</script>

<div>
  <h1>{profile.name}</h1>
  <p>Email: {profile.email}</p>
</div>
```

```vue [Vue]
<script setup>
import { immutableRef } from '@anchorlib/vue';

// Create an immutable state.
const profile = immutableRef({
  name: 'John Doe',
  email: 'john@example.com',
});

const changeName = () => {
  // This line will trigger a warning in your IDE, a build error,
  // and a runtime error log without crashing the app.
  profile.value.name = 'Jane Smith';
};
</script>

<template>
  <div>
    <h1>{{ profile.name }}</h1>
    <p>Email: {{ profile.email }}</p>
  </div>
</template>
```

```typescript [VanillaJS]
import { immutable } from '@anchorlib/core';

// Create an immutable state.
const profile = immutable({
  name: 'Jane Smith',
  email: 'jane@example.com',
});

// Reading properties is fine.
console.log(profile.name); // 'Jane Smith'

// This line will trigger a warning in your IDE, a build error,
// and a runtime error log without crashing the app.
profile.name = 'New Name';
```

:::

So, how do you modify an immutable state? That's where **Write Contracts** come in.

## **Controlled Mutations with Write Contracts**

A Write Contract is a powerful feature that lets you define exactly which parts of your immutable state can be changed. This gives you the safety of immutability with the flexibility to make controlled updates.

Here's how to create a write contract to allow changing just the `name` property:

::: code-group

```tsx [React]
import { setup, immutable, writable, render } from '@anchorlib/react';

const Profile = setup(() => {
  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Create a write contract for the 'name' property.
  const writer = writable(profile, ['name']);

  const changeName = () => {
    // This is allowed because 'name' is in the contract.
    writer.name = 'Jane Smith';

    // This will trigger a warning because 'email' is not in the contract.
    writer.email = 'new@example.com';
  };

  return render(() => (
    <div>
      <h1>{profile.name}</h1>
      <p>Email: {profile.email}</p>
      <button onClick={changeName}>Change Name</button>
    </div>
  ));
});
```

```tsx [SolidJS]
import { immutable, writable } from '@anchorlib/solid';

const Profile = () => {
  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Create a write contract for the 'name' property.
  const writer = writable(profile, ['name']);

  const changeName = () => {
    // This is allowed because 'name' is in the contract.
    writer.name = 'Jane Smith';

    // This will trigger a warning because 'email' is not in the contract.
    writer.email = 'new@example.com';
  };

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>Email: {profile.email}</p>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};
```

```sveltehtml [Svelte]
<script>
  import { immutable, writable } from '@anchorlib/svelte';

  // Create an immutable state.
  const profile = immutable({
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Create a write contract for the 'name' property.
  const writer = writable(profile, ['name']);

  const changeName = () => {
    // This is allowed because 'name' is in the contract.
    writer.name = 'Jane Smith';

    // This will trigger a warning because 'email' is not in the contract.
    writer.email = 'new@example.com';
  };
</script>

<div>
  <h1>{profile.name}</h1>
  <p>Email: {profile.email}</p>
  <button on:click={changeName}>Change Name</button>
</div>
```

```vue [Vue]
<script setup>
import { immutableRef, writableRef } from '@anchorlib/vue';

// Create an immutable state.
const profile = immutableRef({
  name: 'John Doe',
  email: 'john@example.com',
});

// Create a write contract for the 'name' property.
const writer = writableRef(profile, ['name']);

const changeName = () => {
  // This is allowed because 'name' is in the contract.
  writer.value.name = 'Jane Smith';

  // This will trigger a warning because 'email' is not in the contract.
  writer.value.email = 'new@example.com';
};
</script>

<template>
  <div>
    <h1>{{ profile.name }}</h1>
    <p>Email: {{ profile.email }}</p>
    <button @click="changeName">Change Name</button>
  </div>
</template>
```

```typescript [VanillaJS]
import { immutable, writable } from '@anchorlib/core';

// Create an immutable state.
const profile = immutable({
  name: 'Jane Smith',
  email: 'jane@example.com',
});

// Create a write contract for the 'name' property.
const writer = writable(profile, ['name']);

// Reading is always fine.
console.log(profile.name); // 'Jane Smith'

// This is allowed because 'name' is in the contract.
writer.name = 'New Name';

// This will trigger a warning because 'email' is not in the contract.
writer.email = 'new@example.com';
```

:::

## **Data Integrity with Zod**

Anchor integrates with [Zod](https://zod.dev/) to provide powerful schema validation out of the box. This ensures that your state always conforms to a predefined shape, preventing bugs and improving data integrity.

Here's how you can create a state object with schema validation:

::: code-group

```tsx [React]
import { z } from 'zod';
import { setup, model, render } from '@anchorlib/react';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const Profile = setup(() => {
  const user = model(UserSchema, {
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This is a valid change.
    user.name = 'Jane Smith';

    // This will trigger a validation error and the change will be ignored.
    user.name = 'J';
  };

  return render(() => (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <button onClick={changeName}>Change Name</button>
    </div>
  ));
});
```

```tsx [SolidJS]
import { z } from 'zod';
import { model } from '@anchorlib/solid';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const Profile = () => {
  const user = model(UserSchema, {
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This is a valid change.
    user.name = 'Jane Smith';

    // This will trigger a validation error and the change will be ignored.
    user.name = 'J';
  };

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};
```

```sveltehtml [Svelte]
<script>
  import { z } from 'zod';
  import { model } from '@anchorlib/svelte';

  const UserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
  });

  const user = model(UserSchema, {
    name: 'John Doe',
    email: 'john@example.com',
  });

  const changeName = () => {
    // This is a valid change.
    user.name = 'Jane Smith';

    // This will trigger a validation error and the change will be ignored.
    user.name = 'J';
  };
</script>

<div>
  <h1>{user.name}</h1>
  <p>Email: {user.email}</p>
  <button on:click={changeName}>Change Name</button>
</div>
```

```vue [Vue]
<script setup>
import { z } from 'zod';
import { modelRef } from '@anchorlib/vue';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const user = modelRef(UserSchema, {
  name: 'John Doe',
  email: 'john@example.com',
});

const changeName = () => {
  // This is a valid change.
  user.value.name = 'Jane Smith';

  // This will trigger a validation error and the change will be ignored.
  user.value.name = 'J';
};
</script>

<template>
  <div>
    <h1>{{ user.name }}</h1>
    <p>Email: {{ user.email }}</p>
    <button @click="changeName">Change Name</button>
  </div>
</template>
```

```typescript [VanillaJS]
import { z } from 'zod';
import { model } from '@anchorlib/core';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const user = model(UserSchema, {
  name: 'John Doe',
  email: 'john@example.com',
});

// This is a valid change.
user.name = 'Jane Smith';

// This will trigger a validation error and the change will be ignored.
user.name = 'J';

console.log(user.name); // 'Jane Smith'
```

:::

## **Best Practices**

As you build with Anchor, keep these tips in mind:

1.  **Separate Data from UI**: Anchor promotes the DSV (Data-State-View) pattern, where application logic and state are kept separate from your UI components. Component-level state is fine for UI-specific concerns, but your core business logic should live outside your components for better maintainability and reusability.
2.  **Default to Immutable**: For state that's shared across components, start with immutability to prevent unexpected side effects.
3.  **Be Specific with Writers**: Create write contracts that only allow changing what's necessary. This keeps your state updates predictable.
4.  **Observe What You Need**: Anchor's fine-grained reactivity means you can observe specific parts of your state, preventing unnecessary re-renders.
5.  **Clean Up Subscriptions**: In VanillaJS, remember to clean up your subscriptions when they're no longer needed to avoid memory leaks.

## **Next Steps**

You've just scratched the surface of what Anchor can do. Here's where to go next:

- Dive deeper into [Reactivity](/reactivity) to master fine-grained observation.
- Learn more about [Immutability](/immutability) and advanced write contracts.
- Explore [Data Integrity](/data-integrity) for schema validation.
- Check out our framework-specific guides:
  - [React Guide](/react/getting-started)
  - [SolidJS Guide](/solid/getting-started)
  - [Svelte Guide](/svelte/getting-started)
  - [Vue Guide](/vue/getting-started)

## **Need Help?**

If you get stuck, we're here to help:

1.  Check the [FAQ](/faq) for answers to common questions.
2.  Open an issue on [GitHub](https://github.com/beerush-id/anchor/issues).
3.  Join our community on [Discord](https://discord.gg/aEFgpaghq2) for real-time support.
