---
title: 'React Form Validation Tutorial: A Guide to useFormWriter with Anchor'
description: 'A step-by-step tutorial on building validated forms in React with Anchor. Learn to use the useFormWriter and useModel hooks with Zod for robust, reactive form validation.'
keywords:
  - react form validation tutorial
  - anchor react tutorial
  - useFormWriter hook
  - zod validation react
  - reactive forms react
  - form state management
  - useModel hook
  - anchor form validation
---

# Form Validation with Anchor in React

Learn how to build robust form validation with Anchor's reactive state management in React applications.

## What You'll Learn

In this tutorial, you'll learn:

1.  How to create validated forms with Anchor
2.  How to handle form validation errors
3.  How to implement form reset functionality
4.  How to use Anchor's primary form hook: `useFormWriter`
5.  Best practices for form validation with Anchor

## Prerequisites

Before starting this tutorial, make sure you have:

- Basic knowledge of React and TypeScript
- Anchor [installed](/installation) in your React project
- Familiarity with [Anchor's core concepts](/getting-started)
- Understanding of [data integrity principles](/data-integrity)

## Basic Validation

For simple forms that don't need to be shared across components, you can use a local state approach. You create a local, validated model with `useModel` and then pass it to `useFormWriter`.

```tsx
import { type FC, type FormEventHandler } from 'react';
import { Input } from '@anchorlib/react/components';
import { useFormWriter, useModel, observer } from '@anchorlib/react';
import { z } from 'zod';

const ProfileForm: FC = observer(() => {
  // 1. Define a schema for the form.
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().email('Invalid email format'),
  });

  // 2. Create a local reactive model.
  const profile = useModel(schema, { name: '', email: '' });

  // 3. Create the form state from the model.
  const form = useFormWriter(profile, ['name', 'email']);

  // 4. Handle form submission.
  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    // Valid data is already synced with the `profile` state.
    // We can add other logic here, like showing a notification.
    console.log('Profile saved!', anchor.get(profile));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Full Name</label>
        <Input bind={form.data} name="name" placeholder="Enter your name" />
        {form.errors.name && <p className="error">{form.errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <Input bind={form.data} name="email" placeholder="Enter your email" />
        {form.errors.email && <p className="error">{form.errors.email.message}</p>}
      </div>

      <div>
        <button type="submit" disabled={!form.isValid || !form.isDirty}>
          Save Profile
        </button>
      </div>
    </form>
  );
});
```

In this example, `useFormWriter` provides everything we need: the form `data` to bind to inputs, an `errors` object for validation messages, and state properties like `isValid` and `isDirty` to control the UI.

## Advanced Validation

When you need to manage form state that is shared across multiple components, you can integrate Anchor's validation with a global state. The `ProfileForm.tsx` component is a good example of this approach.

### Global State Setup

First, let's assume you have a global state for the user's profile defined in a separate file:

```typescript
// lib/auth.ts
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

export const profileState = anchor.model(
  z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().email('Invalid email format'),
  }),
  { name: 'John Doe', email: 'john@example.com' },
  { immutable: true }
);
export const profileWriter = anchor.writable(profileState);
```

- **`profileState`**: The global, immutable reactive state object.
- **`profileWriter`**: A write contract for the `profileState` to allow mutations.

### The `ProfileForm` Component

The component for the shared form is almost identical to the basic example. The only difference is that we pass the global `profileWriter` to `useFormWriter` instead of a local state.

```tsx
import { type FC, type FormEventHandler } from 'react';
import { Button } from '../Button.js';
import { Input } from '@anchorlib/react/components';
import { Card } from '../Card.js';
import { useFormWriter, observe } from '@anchorlib/react';
import { profileWriter } from '@lib/auth.js';

export const ProfileForm: FC<{ className?: string }> = ({ className }) => {
  const form = useFormWriter(profileWriter, ['name', 'email']);

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Data is automatically synced with profileWriter.
    // We can add other logic here, like showing a notification.
    console.log('Profile updated!');
  };

  const NameError = observe(() => {
    return form.errors.name && <p className="text-sm text-red-400">{form.errors.name.message}</p>;
  });

  const EmailError = observe(() => {
    return form.errors.email && <p className="text-sm text-red-400">{form.errors.email.message}</p>;
  });

  const FormControl = observe(() => {
    const disabled = !form.isValid || !form.isDirty;

    return (
      <div>
        <button type="button" disabled={!form.isDirty} onClick={() => form.reset()}>
          Reset
        </button>
        <button type={'submit'} disabled={disabled}>
          Submit
        </button>
      </div>
    );
  });

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        <div>
          <h2>🧑‍💻 Edit Profile</h2>
          <p>Fill the form below to update your profile</p>
        </div>

        <label>
          <span>Full Name</span>
          <Input bind={form.data} name="name" placeholder="John Doe" autoComplete="name" />
          <NameError />
        </label>

        <label>
          <span>Email</span>
          <Input bind={form.data} name="email" placeholder="john@domain.com" autoComplete="email" />
          <EmailError />
        </label>

        <FormControl />
      </form>
    </Card>
  );
};
```

### Performance: `observer()` vs. `observe()`

A key difference between the "Basic" and "Advanced" examples lies in their rendering strategy, which has significant performance implications.

In the **Basic Validation** example, the entire `ProfileForm` component is wrapped in the `observer()` HoC (Higher-Order Component).

```tsx
const ProfileForm: FC = observer(() => {
  // ... entire form logic and JSX
});
```

This is simple to set up, but it means the **entire form will re-render** whenever any reactive value it depends on changes. This includes every keystroke in an input, the appearance of an error message, or a change in the `form.isDirty` state. For small forms, this is often acceptable.

In the **Advanced Validation** example, we use a more granular approach. Instead of wrapping the whole form, we create smaller, dedicated components for reactive parts of the UI and wrap each of them with `observe`.

```tsx
const NameError = observe(() => {
  // ... only renders when form.errors.name changes
});

const FormControl = observe(() => {
  // ... only renders when form.isValid or form.isDirty changes
});
```

This pattern is called **fine-grained reactivity**. It ensures that only the components that are actually affected by a state change will re-render. When a user types in the "Full Name" input, only the `NameError` component might re-render if an error appears or disappears. The `EmailError` and the main form structure remain untouched, preventing unnecessary re-renders and leading to much better performance in complex or large forms.

### Key Concepts: `useFormWriter`

The `useFormWriter` hook is the cornerstone of form management in Anchor. It streamlines form state management by providing a single, comprehensive API.

```typescript
const form = useFormWriter(profileWriter, ['name', 'email']);
```

It takes a state or state writer and an array of keys to create a form state object with the following properties:

- **`form.data`**: A mutable, reactive object containing the form fields (`name` and `email` in this case). It's safe to bind this directly to your inputs.
- **`form.errors`**: A reactive object that holds any validation errors for the form fields.
- **`form.isDirty`**: A boolean that is `true` if any of the form fields have been changed from their initial values.
- **`form.isValid`**: A boolean that is `true` if all form fields are valid according to the schema.
- **`form.reset()`**: A function to reset the form fields and errors back to their initial state.

Because `useFormWriter` automatically pipes valid data back to the source writer, your `handleSubmit` function can focus on application logic (like showing notifications) rather than state synchronization.

### Under the Hood: What `useFormWriter` Does

The `useFormWriter` hook simplifies form creation by composing several other Anchor hooks into a single, convenient API. Understanding its inner workings can be helpful for advanced use cases. Internally, `useFormWriter` combines:

1.  **`useSnapshot`**: It takes a snapshot of the initial state. This is used to determine if the form is "dirty" (if `form.data` differs from the snapshot) and to power the `reset()` function.
2.  **`useInherit`**: It creates a separate, mutable `data` object for the form inputs. This is crucial because it allows users to type freely, even if the input is temporarily invalid, without violating the source state's validation rules.
3.  **`useException`**: It sets up an error-capturing object (`errors`) that reactively updates whenever a validation rule is broken in the source state.
4.  **`usePipe`**: It creates a one-way data flow from the form's `data` object back to the source state/writer. This pipe automatically attempts to apply changes, triggering validation. If the change is valid, the source state is updated.

It then wraps all of this functionality, along with computed properties like `isDirty` and `isValid`, into the single `form` object that you use in your component. This composition provides a powerful and streamlined developer experience for building robust forms.

## Best Practices

When working with form validation in Anchor, consider these best practices:

### 1. Use Local State for Simple Forms

For forms that are only used in a single component, use local state with `useModel` and `useFormWriter`.

```tsx
const loginFormState = useModel(schema, { email: '', password: '' });
const form = useFormWriter(loginFormState, ['email', 'password']);
```

### 2. Use Global State for Complex Forms

For forms that share data across components, use a global immutable state with a write contract, and pass the writer to `useFormWriter`.

```typescript
// In a shared module
export const userState = anchor.model(UserSchema, initialUserData, { immutable: true });
export const userWriter = anchor.writable(userState);

// In a component
const form = useFormWriter(userWriter, ['name', 'email']);
```

### 3. Provide Clear Error Messages

Make sure your Zod schemas provide clear, user-friendly error messages.

```typescript
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
});
```

### 4. Reset Forms with `form.reset()`

Use the built-in `reset` method from `useFormWriter` to properly reset form data and errors.

```typescript
const form = useFormWriter(profileWriter, ['name', 'email']);

const handleReset = () => {
  form.reset();
};
```

### 5. Handle Asynchronous Validation

For asynchronous validation (e.g., checking if an email is already in use), you can combine `useFormWriter` with a custom submission handler.

```tsx
const form = useFormWriter(profileWriter, ['name', 'email']);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  try {
    // Custom async validation
    await checkEmailAvailability(form.data.email);
    // If successful, the data is already in the profileWriter.
    // You might just need to trigger a final sync if there are pending debounced updates,
    // or simply let the user know it was successful.
    console.log('Submit successful!');
  } catch (error) {
    // Manually set an error on the form state
    form.errors.email = { message: error.message };
  }
};
```

## Next Steps

To learn more about form validation and Anchor:

- Review the [Data Integrity Guide](/data-integrity) for advanced validation patterns
- Explore [Immutability](/immutability) to understand write contracts
- Check out the [API Reference](/apis/react/initialization) for detailed documentation on React hooks
- See how validation works with [Storage](/storage/getting-started) for persistent form data
