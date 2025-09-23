# **Data Integrity with Anchor**

Learn how Anchor ensures data integrity through schema validation and type safety in your state management.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/data-integrity.webp" alt="Reactivity Schema" />
</div>

### **What is Data Integrity in State Management?**

Data integrity in state management refers to ensuring that your application state always conforms to expected formats,
types, and constraints. With Anchor, you can maintain data integrity through:

1. **Schema Validation**: Runtime validation of state against defined schemas
2. **Type Safety**: Compile-time type checking with TypeScript
3. **Immutable State**: Prevention of unauthorized mutations
4. **Controlled Mutations**: Write contracts that limit state changes

## **Schema Validation**

Anchor integrates seamlessly with Zod, a TypeScript-first schema declaration and validation library:

```typescript
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

// Define a schema for user data
const UserSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
  isActive: z.boolean().default(true),
});

// Create a state with schema validation
const userState = anchor(
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  UserSchema
);

// Valid updates work as expected
userState.name = 'Jane Doe';

// Invalid updates are caught
userState.email = 'invalid-email'; // This will be rejected
userState.age = -5; // This will also be rejected
```

## **Error Handling**

Anchor implements a soft-error model, meaning validation errors are logged to the console without throwing exceptions.
This design choice ensures your application remains usable even when validation issues occur.

To handle validation errors programmatically, use the **`anchor.catch`** method. This method accepts a callback function
that executes whenever a validation error occurs on the specified state.

```typescript
const errors = [];

// Register error handler for a specific state
const unhandle = anchor.catch(state, (exception) => {
  errors.push(exception);
});

// Attempt to mutate the state with invalid data
state.email = 'invalid-email';

// Check for captured validation errors
if (errors.length) {
  console.log('Validation errors occurred:', errors);
}

// Unregister error handler.
unhandle();
```

This approach allows you to provide user feedback or implement custom error handling logic while maintaining application
stability.

::: tip Concerned about verbosity?

At first glance, handling validation errors might seem verbose. But, it becomes highly beneficial in complex applications. You won't need to wrap every operation in
`try-catch` blocks, and errors can be handled centrally while keeping your application stable and responsive.

:::

### **Sample of Validation Handling in React**

In React applications, Anchor provides a seamless way to handle validation errors directly within your components.
The **`useException`** hook allows you to capture and display validation errors for specific state properties.

```tsx
import { observable } from '@anchorlib/react/view';
import { useException } from '@anchorlib/react';

const EditProfile = observable(() => {
  // Capture validation errors for the 'state' object
  const formErrors = useException(state);

  return (
    <form>
      <Input bind={state} name="email" />
      {/* Display error message if email validation fails */}
      {formErrors.email && <span className="error">Invalid email format.</span>}
    </form>
  );
});
```

## **Immutable State with Validation**

Combine immutability with schema validation for maximum data integrity:

```typescript
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().min(2).max(5),
  notifications: z.boolean(),
});

// Create an immutable, validated state
const appSettings = anchor.immutable(
  {
    theme: 'dark',
    language: 'en',
    notifications: true,
  },
  SettingsSchema
);

// Create a write contract for controlled mutations
const settingsWriter = anchor.writable(appSettings, ['theme', 'language']);

// Valid mutations
settingsWriter.theme = 'light';
settingsWriter.language = 'es';

// Invalid mutations are prevented
// settingsWriter.theme = 'invalid-theme'; // Validation error!
```

This pattern enables you to provide real-time feedback to users as they interact with form fields, improving the overall
user experience by guiding them towards valid input.

## **Type Safety with TypeScript**

Anchor provides excellent TypeScript support for compile-time type checking:

```typescript
import { anchor } from '@anchorlib/core';

interface User {
  id: number;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

const userState = anchor<User>({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

// TypeScript will catch these errors at compile time:
// userState.id = 'string'; // Type error!
// userState.preferences.theme = 'blue'; // Type error!
```

## **Nested Schema Validation**

Anchor supports nested schema validation for complex state structures:

```typescript
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().min(2),
});

const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  address: AddressSchema,
});

const userState = anchor(
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      zipCode: '12345',
      country: 'USA',
    },
  },
  UserSchema
);
```

## **Array Validation**

Validate arrays and their contents with Anchor:

```typescript
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

const TagSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
});

const PostSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(TagSchema).max(10),
});

const postState = anchor(
  {
    id: 1,
    title: 'My First Post',
    content: 'This is the content of my first post',
    tags: [
      { id: 1, name: 'introduction' },
      { id: 2, name: 'tutorial' },
    ],
  },
  PostSchema
);
```

## **Custom Validation**

Create custom validation logic for domain-specific requirements:

```typescript
import { anchor } from '@anchorlib/core';
import { z } from 'zod';

// Custom validation for password strength
const PasswordSchema = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must be at least 8 characters long',
    });
  }

  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one uppercase letter',
    });
  }

  if (!/[0-9]/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one number',
    });
  }
});

const UserRegistrationSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: PasswordSchema,
});

const registrationState = anchor(
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'MyPassword123',
  },
  UserRegistrationSchema
);
```

## **Benefits of Data Integrity with Anchor**

1. **Prevent Runtime Errors**: Catch data issues before they cause application problems
2. **Improve User Experience**: Provide clear feedback on data requirements
3. **Enhance Developer Productivity**: Catch errors early in the development process
4. **Ensure Consistent State**: Maintain predictable application behavior
5. **Simplify Debugging**: Clear error messages help identify issues quickly

## **Best Practices for Data Integrity**

1. **Define Schemas Early**: Create schemas during the design phase
2. **Use TypeScript Types**: Combine runtime validation with compile-time checking
3. **Validate at Boundaries**: Validate data when it enters your application
4. **Provide Clear Error Messages**: Help users understand validation requirements
5. **Test Validation Logic**: Ensure your schemas work as expected
6. **Document Data Requirements**: Make schema constraints clear to other developers

## **Next Steps**

To learn more about data integrity and validation with Anchor:

- Review the [Immutability Guide](/immutability) for safe state mutations
- Explore [Reactivity](/reactivity) to understand how validated state works with observation
- Check out the [API Reference](/usage) for detailed function documentation
- See how validation works with [Storage](/storage/getting-started) for persistent data
