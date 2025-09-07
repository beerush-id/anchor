# Form Validation with Anchor in React

Learn how to build robust form validation with Anchor's reactive state management in React applications.

## What You'll Learn

In this tutorial, you'll learn:

1. How to create validated forms with Anchor
2. How to handle form validation errors
3. How to implement form reset functionality
4. How to use Anchor's form-related hooks
5. Best practices for form validation with Anchor

## Prerequisites

Before starting this tutorial, make sure you have:

- Basic knowledge of React and TypeScript
- Anchor [installed](/installation) in your React project
- Familiarity with [Anchor's core concepts](/getting-started)
- Understanding of [data integrity principles](/data-integrity)

## Basic Validation

For simple forms that don't need to be shared across components, you can use a local state approach with Anchor's
validation:

```tsx
import { type FC, type FormEventHandler } from 'react';
import { Input, observable } from '@anchor/react/components';
import { useException, useInherit, useModel } from '@anchor/react';
import { z } from 'zod';

const ProfileForm: FC = observable(() => {
  // Define a schema for our form.
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().email('Invalid email format'),
  });

  // Create the state.
  const profile = useModel(schema, { name: '', email: '' });

  // Create a form that inherit from the state.
  const profileForm = useInherit(profile, ['name', 'email']);

  // Capture validation errors
  const formErrors = useException(profile);

  // Handle form submission.
  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    Object.assign(profile, profileForm);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Full Name</label>
        <Input bind={profileForm} name="name" placeholder="Enter your name" />
        {formErrors.name && <p className="error">{formErrors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <Input bind={profileForm} name="email" placeholder="Enter your email" />
        {formErrors.email && <p className="error">{formErrors.email.message}</p>}
      </div>

      <div>
        <button type="submit">Save Profile</button>
      </div>
    </form>
  );
});
```

There are a few important things to note in this example:

1. We use [useModel](/react/usage#useModel) to create a validated state with a Zod schema
2. We use [useInherit](/react/usage#useInherit) to create a mutable copy of specific properties for form inputs
3. We use [useException](/react/usage#useException) to capture validation errors from the state
4. We handle form submission by assigning the form data to the main state

### Understanding the Key Hooks

#### **`useInherit`**

The [useInherit](/react/usage#useInherit) hook creates a reactive object that inherits properties from a source object.
In forms, it's used to create a mutable copy of state properties:

```typescript
const formData = useInherit(profile, ['name', 'email']);
```

This creates a reactive object with `name` and `email` properties that can be safely mutated without affecting the
original state until explicitly applied.

::: tip Why Inherit?

Anchor prevents invalid values from entering the state. Directly binding an input to the state won't work as expected
because the input value would always be rejected if it doesn't conform to the schema, leading to unexpected behavior
where the user can't even type in the form.

- User types `A` in the input.
- Anchor validate the value and reject if it doesn't conform the schema.
- React didn't see the change because `A` never enters the state.

:::

::: tip Why Prevent Invalid Values?

Anchor uses atomic validation under the hood for optimal performance. Instead of validating the entire state for a
minor change, Anchor only validates the specific property that was modified. Allowing invalid values to be set in the
state would go against our principles of maintaining state stability.

:::

#### **`useException`**

The [useException](/react/usage#useException) hook captures validation errors from a state object:

```typescript
const formErrors = useException(profile);
```

This creates a reactive object that mirrors the structure of your state but contains error messages instead of values.
When validation fails, the corresponding error property is populated with a [ZodError](https://zod.dev/?id=error-handling) or other exception details.

#### **`useModel`**

The [useModel](/react/usage#useModel) hook creates a reactive state with built-in validation:

```typescript
const profile = useModel(schema, { name: '', email: '' });
```

This creates a reactive state that automatically validates any changes against the provided schema.

## Advanced Validation

When you need to manage form state that is shared across multiple components, you can integrate Anchor's validation with
a global state. The `AuthForm.tsx` component is a good example of this approach.

### Global State Setup

First, let's assume you have a global state for the user's profile defined in a separate file:

```typescript
// lib/auth.ts
import { anchor } from '@anchor/core';
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

### The `AuthForm` Component

Now, let's see how the `AuthForm` component uses this global state to manage form validation.

```tsx
import { type FC, type FormEventHandler } from 'react';
import { Button } from '../Button.js';
import { Input, observe } from '@anchor/react/components';
import { Card } from '../Card.js';
import { useException, useInherit, useSnapshot } from '@anchor/react';
import { profileState, profileWriter } from '@lib/auth.js';

export const AuthForm: FC<{ className?: string }> = ({ className }) => {
  const snapshot = useSnapshot(profileState);
  const formData = useInherit(profileWriter, ['name', 'email']);
  const formErrors = useException(profileWriter);

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    Object.assign(profileWriter, formData);
  };

  const handleReset = () => {
    Object.assign(formData, snapshot);
    Object.assign(formErrors, { name: null, email: null });
  };

  const NameError = observe(() => {
    if (formErrors.name) {
      return <p className="text-sm text-red-400">{formErrors.name.message}</p>;
    }
  });

  const EmailError = observe(() => {
    if (formErrors.email) {
      return <p className="text-sm text-red-400">{formErrors.email.message}</p>;
    }
  });

  const FormControl = observe(() => {
    const disabled = !formData.email || !formData.name;

    return (
      <div className="flex items-center justify-end gap-4 pt-6">
        <Button type="button" onClick={handleReset} className="btn-lg">
          Reset
        </Button>
        <Button type="submit" disabled={disabled} className="btn-lg btn-primary">
          Update
        </Button>
      </div>
    );
  });

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-10 rounded-xl flex-1">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-white">🧑‍💻 Edit Profile</h2>
          <p className="text-slate-400 mt-2">Fill the form below to update your profile</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Full Name</span>
          <Input
            bind={formData}
            name="name"
            placeholder="John Doe"
            autoComplete="name"
            className="w-full anchor-input input-md"
          />
          <NameError />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Email</span>
          <Input
            bind={formData}
            name="email"
            placeholder="john@domain.com"
            autoComplete="email"
            className="w-full anchor-input input-md"
          />
          <EmailError />
        </label>

        <FormControl />
      </form>
    </Card>
  );
};
```

### Key Concepts

- **`useSnapshot`**: We use [useSnapshot](/react/usage#useSnapshot) to get a read-only copy of the current `profileState`. This is useful for
  resetting the form to its original state.
- **`useInherit`**: `useInherit` creates a mutable copy of the `profileWriter`'s properties. This `formData` object is
  bound to the form inputs, allowing users to make changes without directly mutating the global state.
- **`useException`**: This hook captures any validation errors from the `profileWriter` and makes them available in the
  `formErrors` object.
- **`handleSubmit`**: When the form is submitted, we apply the changes from `formData` to the `profileWriter`. Anchor's
  validation is triggered, and if the data is valid, the global `profileState` is updated.
- **`handleReset`**: This function resets the form by copying the data from the `snapshot` back into the `formData`
  object. It also clears any validation errors.
- **`observe`**: The `observe` HOC is used to wrap components that depend on reactive state. This ensures that only the
  components that need to be updated are re-rendered, which is great for performance.

### Advanced Validation Techniques

The advanced validation approach with Anchor provides several benefits over basic validation, particularly for complex applications:

#### **Immutable State Management**

In advanced validation, we use immutable state management to ensure data consistency across components:

```typescript
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

The `immutable: true` option creates a read-only state that can only be modified through controlled write operations. This pattern ensures:

- Data integrity across multiple components
- Predictable state changes
- Easier debugging and testing
- Prevention of accidental mutations

#### **Write Contracts for Controlled Mutations**

The `profileWriter` is a write contract that allows controlled mutations to the immutable state:

```typescript
const formData = useInherit(profileWriter, ['name', 'email']);
const formErrors = useException(profileWriter);
```

Benefits of using write contracts:

- Fine-grained control over which parts of the state can be modified
- Centralized validation logic
- Audit trail of state changes
- Prevention of unauthorized mutations

#### **Snapshot-Based Form Reset**

Using [useSnapshot](/react/usage#useSnapshot) provides a clean way to implement form reset functionality:

```typescript
const snapshot = useSnapshot(profileState);
const handleReset = () => {
  Object.assign(formData, snapshot);
  Object.assign(formErrors, { name: null, email: null });
};
```

This approach:

- Captures the exact state at the time of component mount
- Provides a clean rollback mechanism
- Maintains consistency with the global state
- Avoids manual state management errors

#### **Performance-Optimized Reactive Components**

The use of [observe](/react/usage#observe) HOC creates performance-optimized components that only re-render when their dependencies change:

```typescript
const NameError = observe(() => {
  if (formErrors.name) {
    return <p className="text-sm text-red-400">{formErrors.name.message}</p>;
  }
});
```

This pattern offers:

- Fine-grained reactivity
- Reduced unnecessary re-renders
- Better performance in complex forms
- Cleaner component organization

#### **Centralized Error Handling**

Advanced validation uses centralized error handling through the [useException](/react/usage#useException) hook:

```typescript
const formErrors = useException(profileWriter);
```

This approach:

- Automatically captures validation errors
- Provides real-time error feedback
- Integrates seamlessly with Zod schemas
- Enables consistent error display across the application

#### **Cross-Component State Consistency**

With global immutable state, all components that use the state are automatically synchronized:

```typescript
// In another component
const userInfo = useSnapshot(profileState);
// This will always reflect the latest validated data
```

This ensures:

- Consistent UI across the application
- No stale data issues
- Automatic updates when state changes
- Reduced prop drilling

#### **Type Safety and Developer Experience**

Advanced validation provides enhanced type safety:

```typescript
// profileWriter is strictly typed based on the schema
profileWriter.name = 'New Name'; // Type-safe assignment
// profileWriter.nonExistentProperty = "Error"; // TypeScript error
```

Benefits include:

- Compile-time error detection
- IDE autocompletion
- Refactoring safety
- Self-documenting code

### When to Use Advanced Validation

Advanced validation is recommended when:

1. **Multiple components interact with the same form data**
   - Centralized state management prevents inconsistencies
   - All components automatically reflect the latest data

2. **Complex form workflows with multiple steps**
   - Data persistence across different views
   - Consistent validation throughout the workflow

3. **Enterprise applications with strict data integrity requirements**
   - Audit trails of all state changes
   - Controlled mutation patterns
   - Enhanced debugging capabilities

4. **Performance-critical applications**
   - Fine-grained reactivity minimizes re-renders
   - Optimized state updates
   - Efficient error handling

5. **Applications requiring undo/redo functionality**
   - Built-in history tracking with immutable state
   - Easy implementation of state snapshots
   - Reliable rollback mechanisms

### Advanced Patterns

#### **Partial State Updates**

You can create writers with limited write permissions:

```typescript
// Only allow updating the email field
const emailWriter = anchor.writable(profileState, ['email']);
```

#### **Nested Schema Validation**

Complex nested objects can be validated with nested schemas:

```typescript
const UserSchema = z.object({
  profile: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
});

const userState = anchor.model(UserSchema, initialData, { immutable: true });
const profileWriter = anchor.writable(userState, ['profile.name', 'profile.email']);
```

#### **Custom Validation Logic**

Combine Zod validation with custom logic:

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  // Custom async validation
  const isAvailable = await checkEmailAvailability(formData.email);
  if (!isAvailable) {
    formErrors.email = { message: 'Email is already taken' };
    return;
  }

  // Apply validated data
  Object.assign(profileWriter, formData);
};
```

This advanced approach provides a robust foundation for building complex, data-intensive forms while maintaining excellent performance and developer experience.

## Best Practices

When working with form validation in Anchor, consider these best practices:

### 1. Use Local State for Simple Forms

For forms that are only used in a single component and don't need to share data with other parts of your application,
use local state with `useModel`:

```tsx
const LoginForm = observable(() => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const loginForm = useModel(schema, { email: '', password: '' });
  const formErrors = useException(loginForm);

  // ... rest of component
});
```

### 2. Use Global State for Complex Forms

For forms that need to share data across multiple components or persist beyond a single component's lifecycle,
use global immutable state with write contracts:

```typescript
// In a shared module
export const userState = anchor.model(UserSchema, initialUserData, { immutable: true });
export const userWriter = anchor.writable(userState);
```

### 3. Provide Clear Error Messages

Make sure your Zod schemas provide clear, user-friendly error messages:

```typescript
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  age: z.number().min(18, 'You must be at least 18 years old').max(120, 'Please enter a valid age'),
});
```

### 4. Reset Forms Properly

Always reset both form data and error state when resetting a form:

```typescript
const handleReset = () => {
  Object.assign(formData, snapshot);
  Object.assign(formErrors, {
    name: null,
    email: null,
    age: null,
  });
};
```

### 5. Handle Asynchronous Validation

For asynchronous validation (e.g., checking if an email is already in use), combine Anchor's validation with async functions:

```tsx
const checkEmailAvailability = async (email: string) => {
  const response = await fetch(`/api/check-email?email=${email}`);
  const data = await response.json();

  if (!data.available) {
    throw new Error('This email is already in use');
  }
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  try {
    await checkEmailAvailability(formData.email);
    Object.assign(profileWriter, formData);
  } catch (error) {
    // Manually set error
    formErrors.email = { message: error.message };
  }
};
```

## Next Steps

To learn more about form validation and Anchor:

- Review the [Data Integrity Guide](/data-integrity) for advanced validation patterns
- Explore [Immutability](/immutability) to understand write contracts
- Check out the [API Reference](/react/usage) for detailed documentation on React hooks
- See how validation works with [Storage](/storage/getting-started) for persistent form data
