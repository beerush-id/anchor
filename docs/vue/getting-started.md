# Getting Started with Anchor for Vue

This guide will quickly get you up and running with Anchor in your Vue project. You'll learn how to install Anchor, create your first reactive state, and connect it to your Vue components to build dynamic and performant UIs.

## Installation

To begin, install the `@anchorlib/vue` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchorlib/vue
```

```bash [Yarn]
yarn add @anchorlib/vue
```

```bash [pnpm]
pnpm add @anchorlib/vue
```

```bash [Bun]
bun add @anchorlib/vue
```

:::

## Basic Usage

Let's build a simple counter to see how Anchor works with Vue:

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

// Create your reactive state with a simple primitive value
const count = anchorRef(0);

const increment = () => count.value++;
const decrement = () => count.value--;
const reset = () => (count.value = 0);
</script>

<template>
  <div>
    <h1>Counter: {{ count }}</h1>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="reset">Reset</button>
  </div>
</template>
```

## Working with Objects

You can also work with objects and nested structures just as easily:

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

const user = anchorRef({ name: 'John Doe', age: 30 });

const incrementAge = () => user.value.age++;
</script>

<template>
  <div>
    <h2>User Profile</h2>
    <input v-model="user.name" placeholder="Name" />

    <p>Age: {{ user.age }}</p>
    <button @click="incrementAge">Increment Age</button>
  </div>
</template>
```

## Nested Objects

One of Anchor's key advantages over Vue's built-in reactivity is its recursive reactivity. Let's see how it handles nested objects:

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

const user = anchorRef({
  profile: {
    name: 'John Doe',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
    },
  },
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

const toggleTheme = () => {
  user.value.preferences.theme = user.value.preferences.theme === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <div>
    <h2>User Profile</h2>
    <input v-model="user.profile.name" placeholder="Name" />
    <input v-model="user.profile.address.city" placeholder="City" />

    <p>Age: {{ user.profile.age }}</p>

    <p>Theme: {{ user.preferences.theme }}</p>
    <button @click="toggleTheme">Switch to {{ user.preferences.theme === 'dark' ? 'Light' : 'Dark' }} Theme</button>
  </div>
</template>
```

## Observing Specific State

One of Anchor's most powerful features is the ability to observe only specific parts of your state, leading to more efficient updates:

```vue
<script setup>
import { anchorRef, observedRef } from '@anchorlib/vue';

const appState = anchorRef({
  ui: {
    loading: false,
    modalOpen: false,
  },
  data: {
    users: [],
    posts: [],
  },
});

// These observers only re-run when their specific dependencies change
const loading = observedRef(() => appState.value.ui.loading);
const userCount = observedRef(() => appState.value.data.users.length);
const postCount = observedRef(() => appState.value.data.posts.length);

const fetchData = async () => {
  appState.value.ui.loading = true;

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  appState.value.data.users = [{ id: 1, name: 'John' }];
  appState.value.data.posts = [{ id: 1, title: 'Hello World' }];
  appState.value.ui.loading = false;
};
</script>

<template>
  <div>
    <div v-if="loading">
      <p>Loading...</p>
    </div>
    <div v-else>
      <p>Users: {{ userCount }}</p>
      <p>Posts: {{ postCount }}</p>
    </div>

    <button @click="fetchData">Fetch Data</button>
  </div>
</template>
```

## Working with Forms

Here's a more complex example showing how to work with forms using Anchor:

```vue
<script setup>
import { anchorRef } from '@anchorlib/vue';

const formState = anchorRef({
  user: {
    firstName: '',
    lastName: '',
    email: '',
    age: 0,
  },
  errors: {},
  submitted: false,
});

const validate = () => {
  const errors = {};

  if (!formState.value.user.firstName) {
    errors.firstName = 'First name is required';
  }

  if (!formState.value.user.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formState.value.user.email)) {
    errors.email = 'Email is invalid';
  }

  formState.value.errors = errors;
  return Object.keys(errors).length === 0;
};

const submitForm = () => {
  if (validate()) {
    // Process form submission
    console.log('Submitting:', formState.value.user);
    formState.value.submitted = true;
  }
};

const resetForm = () => {
  formState.value.user = {
    firstName: '',
    lastName: '',
    email: '',
    age: 0,
  };
  formState.value.errors = {};
  formState.value.submitted = false;
};
</script>

<template>
  <div v-if="formState.submitted">
    <div>
      <h2>Form Submitted Successfully!</h2>
      <p>Welcome, {{ formState.user.firstName }}!</p>
      <button @click="resetForm">Submit Another</button>
    </div>
  </div>
  <div v-else>
    <form @submit.prevent="submitForm">
      <div>
        <label>
          First Name:
          <input type="text" v-model="formState.user.firstName" />
        </label>
        <span v-if="formState.errors.firstName" class="error">
          {{ formState.errors.firstName }}
        </span>
      </div>

      <div>
        <label>
          Email:
          <input type="email" v-model="formState.user.email" />
        </label>
        <span v-if="formState.errors.email" class="error">
          {{ formState.errors.email }}
        </span>
      </div>

      <div>
        <label>
          Age:
          <input type="number" v-model.number="formState.user.age" />
        </label>
      </div>

      <button type="submit">Submit</button>
      <button type="button" @click="resetForm">Reset</button>
    </form>
  </div>
</template>

<style>
.error {
  color: red;
  font-size: 0.8rem;
}

form div {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
```

## Next Steps

Now that you've seen the basics of Anchor with Vue, you might want to explore:

- [Reactivity](/vue/reactivity) - Learn how Anchor's fine-grained reactivity works
- [Immutability](/vue/immutability) - Discover how Anchor handles immutable state
- [State Management](/vue/state-management) - Understand how to structure your application state
- [API References](/apis/vue/initialization) - Dive into the complete API documentation

With Anchor, you can build Vue applications that are not only more performant but also easier to maintain and reason about. The combination of Vue's reactivity system and Anchor's fine-grained reactivity creates a powerful foundation for modern web applications.
