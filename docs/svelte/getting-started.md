# Getting Started with Anchor for Svelte

This guide will quickly get you up and running with Anchor in your Svelte project. You'll learn how to install Anchor, create your first reactive state, and connect it to your Svelte components to build dynamic and performant UIs.

## Installation

To begin, install the `@anchor/svelte` package using your preferred package manager:

::: code-group

```bash [npm]
npm install @anchor/svelte
```

```bash [Yarn]
yarn add @anchor/svelte
```

```bash [pnpm]
pnpm add @anchor/svelte
```

```bash [Bun]
bun add @anchor/svelte
```

:::

## Basic Usage

Let's build a simple counter to see how Anchor works with Svelte:

```sveltehtml

<script>
  import { anchorRef } from '@anchor/svelte';

  // Create your reactive state with a simple primitive value
  let count = anchorRef(0);
</script>

<div>
  <h1>Counter: {$count}</h1>
  <button onclick={() => $count++}>Increment</button>
  <button onclick={() => $count--}>Decrement</button>
  <button onclick={() => $count = 0}>Reset</button>
</div>
```

## Working with Objects

You can also work with objects and nested structures just as easily:

```sveltehtml
<script>
  import { anchorRef } from '@anchor/svelte';

  const user = anchorRef({ name: 'John Doe', age: 30 });
</script>

<div>
  <h2>User Profile</h2>
  <input bind:value="{$user.name}" placeholder="Name" />

  <p>Age: {$user.age}</p>
  <button onclick={() => $user.age++}>$user.age++}>Increment Age</button>
</div>
```

## Nested Objects

One of Anchor's key advantages over Svelte's built-in stores is its recursive reactivity. Let's see how it handles nested objects:

```sveltehtml

<script>
  import { anchorRef } from '@anchor/svelte';

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
    $user.preferences.theme = $user.preferences.theme === 'dark' ? 'light' : 'dark';
  };
</script>

<div>
  <h2>User Profile</h2>
  <input bind:value={$user.profile.name} placeholder="Name" />
  <input bind:value={$user.profile.address.city} placeholder="City" />

  <p>Age: {$user.profile.age}</p>

  <p>Theme: {$user.preferences.theme}</p>
  <button onclick={toggleTheme}>
    Switch to {$user.preferences.theme === 'dark' ? 'Light' : 'Dark'} Theme
  </button>
</div>
```

## Observing Specific State

One of Anchor's most powerful features is the ability to observe only specific parts of your state, leading to more efficient updates:

```sveltehtml

<script>
  import { anchorRef, observedRef } from '@anchor/svelte';

  const appState = anchorRef({
    ui: {
      loading: false,
      modalOpen: false
    },
    data: {
      users: [],
      posts: []
    }
  });

  // These observers only re-run when their specific dependencies change
  const loading = observedRef(() => $appState.ui.loading);
  const userCount = observedRef(() => $appState.data.users.length);
  const postCount = observedRef(() => $appState.data.posts.length);

  const fetchData = async () => {
    $appState.ui.loading = true;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    $appState.data.users = [{ id: 1, name: 'John' }];
    $appState.data.posts = [{ id: 1, title: 'Hello World' }];
    $appState.ui.loading = false;
  };
</script>

<div>
  {#if $loading}
    <p>Loading...</p>
  {:else}
    <p>Users: {$userCount}</p>
    <p>Posts: {$postCount}</p>
  {/if}

  <button onclick={fetchData}>Fetch Data</button>
</div>
```

## Working with Forms

Here's a more complex example showing how to work with forms using Anchor:

```sveltehtml

<script>
  import { anchorRef } from '@anchor/svelte';

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

    if (!$formState.user.firstName) {
      errors.firstName = 'First name is required';
    }

    if (!$formState.user.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test($formState.user.email)) {
      errors.email = 'Email is invalid';
    }

    $formState.errors = errors;
    return Object.keys(errors).length === 0;
  };

  const submitForm = () => {
    if (validate()) {
      // Process form submission
      console.log('Submitting:', $formState.user);
      $formState.submitted = true;
    }
  };

  const resetForm = () => {
    $formState.user = {
      firstName: '',
      lastName: '',
      email: '',
      age: 0,
    };
    $formState.errors = {};
    $formState.submitted = false;
  };
</script>

{#if $formState.submitted}
  <div>
    <h2>Form Submitted Successfully!</h2>
    <p>Welcome, {$formState.user.firstName}!</p>
    <button onclick={resetForm}>Submit Another</button>
  </div>
{:else}
  <form onsubmit={submitForm}>
    <div>
      <label>
        First Name:
        <input type="text" bind:value={$formState.user.firstName} />
      </label>
      {#if $formState.errors.firstName}
        <span class="error">{$formState.errors.firstName}</span>
      {/if}
    </div>

    <div>
      <label>
        Email:
        <input type="email" bind:value={$formState.user.email} />
      </label>
      {#if $formState.errors.email}
        <span class="error">{$formState.errors.email}</span>
      {/if}
    </div>

    <div>
      <label>
        Age:
        <input type="number" bind:value={$formState.user.age} />
      </label>
    </div>

    <button type="submit">Submit</button>
    <button type="button" onclick={resetForm}>Reset</button>
  </form>
{/if}

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

Now that you've seen the basics of Anchor with Svelte, you might want to explore:

- [Reactivity](/svelte/reactivity) - Learn how Anchor's fine-grained reactivity works
- [Immutability](/svelte/immutability) - Discover how Anchor handles immutable state
- [State Management](/svelte/state-management) - Understand how to structure your application state
- [API References](/apis/svelte/initialization) - Dive into the complete API documentation

With Anchor, you can build Svelte applications that are not only more performant but also easier to maintain and reason about. The combination of Svelte's compile-time optimizations and Anchor's fine-grained reactivity creates a powerful foundation for modern web applications.
