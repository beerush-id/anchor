---
title: "Form Handling"
description: "Learn how to build reactive forms in Svelte with built-in validation support."
keywords:
  - form form-handling
  - validation
  - zod
  - reactivity
  - svelte
---

# Form Handling

Managing form state and validation is a common requirement in modern web applications. Anchor provides a built-in `form` primitive that combines reactivity with **Zod** schema validation to simplify this process.

It automatically handles state tracking, validation feedback, and error mapping without requiring complex boilerplate.

## Defining a Form

The `form` function takes a Zod schema and an initial value. It returns a tuple containing the **State** and the **Errors** map.

```ts
import { form } from '@anchorlib/svelte';
import { z } from 'zod';

// Define Validation Schema
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Create Form State
const [state, errors] = form(schema, {
  email: '',
  password: '',
});
```

- **`state`**: A mutable reactive object containing the form values.
- **`errors`**: A reactive map containing validation issues for each field.

## Binding to Input

Since the form state is mutable, you can bind it directly to input elements using Svelte's `bind:value` or standard event listeners.

```svelte
<script lang="ts">
  import { form } from '@anchorlib/svelte';
  import { z } from 'zod';

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });

  const [state, errors] = form(schema, { email: '', password: '' });

  function handleSubmit(e: Event) {
    const result = schema.safeParse(state);
    if (result.success) {
      console.log('Valid:', result.data);
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div>
    <label>Email</label>
    <!-- Two-way binding works seamlessly -->
    <input
      type="text"
      bind:value={state.email}
    />
    {#if errors.email}
      <span class="error">{errors.email.message}</span>
    {/if}
  </div>

  <div>
    <label>Password</label>
    <input
      type="password"
      bind:value={state.password}
    />
    {#if errors.password}
      <span class="error">{errors.password.message}</span>
    {/if}
  </div>
  
  <button type="submit">Login</button>
</form>
```

## Validation Logic

Validation is **Safe by Default**. This means:

1.  **Initial State**: The form starts without errors (unless `safeInit: false` is passed).
2.  **On Change**: When a field is updated, it is validated against the schema.
3.  **Error Mapping**: If validation fails, the `errors` object is updated with the specific issue for that field.

### Checking Validity

You can check if the form is valid by inspecting the `errors` object. If a field is valid, its corresponding entry in `errors` will be `undefined`.

```ts
// Check if a specific field has errors
if (errors.email) {
  console.log('Email error:', errors.email.message);
}
```

## Form Submission

When submitting the form, you can validate the entire state at once using `schema.safeParse(state)`.

```svelte
<script>
  const handleSubmit = () => {
    const result = schema.safeParse(state);

    if (!result.success) {
      // Validation failed
      console.error('Form is invalid');
      return;
    }

    // Validation succeeded
    console.log('Submitting:', result.data);
  };
</script>

<form on:submit|preventDefault={handleSubmit}>
  <!-- ... inputs ... -->
  <button type="submit">Login</button>
</form>
```

## Configuration

The `form` function accepts an optional configuration object as the third argument.

```ts
const [state, errors] = form(schema, init, {
  // Options
  safeInit: true, // Default: true. Set to false to validate validating initial values immediately.
  onChange: (event) => {
    // Callback triggered whenever the form state changes
    console.log('Form changed:', event);
  },
});
```
