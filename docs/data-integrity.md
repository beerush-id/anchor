# **Data Integrity**

Data integrity is the assurance that your application's data is accurate, consistent, and reliable throughout its
lifecycle. In a traditional state management model, ensuring data integrity can be a manual, error-prone process. Anchor
makes data integrity a core part of its architecture, not an afterthought.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/data-integrity.webp" alt="Reactivity Schema" />
</div>

## **Schema Integration**

Anchor champions data integrity by integrating **Zod schemas as a first-citizen class**. Zod is a powerful
TypeScript-first schema declaration and validation library that provides:

- **Runtime Validation:** Anchor automatically validates incoming data against your Zod schema. If an API response, user
  input, or local storage data doesn't conform to the expected shape, Anchor will catch the error, preventing corrupt
  data from ever reaching your application state.
- **Compile-time Type Safety:** By using Zod schemas to define your state, you get robust type inference and
  compile-time type safety. Your IDE will immediately warn you if you try to access a property that doesn't exist on
  your state, or if you try to assign a value of the wrong type. This catches a wide class of bugs before you even run
  your code.

## **Unified Data Model**

The integration of Zod schemas reinforces the **DSV model** by ensuring that the **State** layer is always a single,
stable source of truth.

- **A Single Source of Truth for Data:** Your Zod schema acts as the single source of truth for your data's shape and
  integrity. You don't have to duplicate type definitions or validation logic in different parts of your application.
- **Predictable Data:** With Anchor and Zod, you can be confident that the data you read from the state will always have
  the shape you expect. This predictability simplifies component logic and makes your application much easier to reason
  about.

By making data integrity a core part of its state management philosophy, Anchor frees developers from the burden of
manual data validation and provides a robust foundation for building reliable applications.

## Usage

To use schema validation in Anchor, you need to provide a Zod schema when creating your state:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

// Define your schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  isActive: z.boolean().default(true),
});

// Create a validated state
const userState = anchor(
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    isActive: true,
  },
  {
    schema: userSchema,
  }
);

// Valid updates work as expected
userState.name = 'Jane Doe';

// Invalid updates are caught
userState.email = 'invalid-email'; // This will be validated and rejected
userState.age = -5; // This will also be rejected
```

### Strict Mode

Anchor provides a strict mode that throws errors when validation fails, rather than silently ignoring invalid updates:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Create a validated state with strict mode
const userState = anchor.model(
  {
    name: 'John Doe',
    email: 'john@example.com',
  },
  {
    schema: userSchema,
    strict: true, // Throws errors on validation failure
  }
);

// This will throw an error in strict mode
try {
  userState.email = 'invalid-email';
} catch (error) {
  console.error('Validation failed:', error);
}
```

## APIs

### **`anchor.model()`**

Creates a reactive state with schema validation.

```typescript
type model = <S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
) => ModelOutput<S>;
```

**Parameters:**

- `init`: The initial value for the state
- `schema`: Zod schema for validation
- `options`: Optional configuration for the state

**Example:**

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const userState = anchor.model({ name: 'John', age: 30 }, userSchema);
```

### **`anchor.immutable()`** with Schema

Creates an immutable reactive state with schema validation.

```typescript
type immutable = <S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
) => ImmutableOutput<S>;
```

**Parameters:**

- `init`: The initial value for the state
- `schema`: Zod schema for validation
- `options`: Optional configuration for the state

**Example:**

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const immutableUserState = anchor.immutable({ name: 'John', age: 30 }, userSchema);
```

## Data Integrity & Immutability

Anchor's powerful combination of data integrity and immutability provides a robust foundation for building reliable
applications. When you combine Zod schema validation with immutable states, you get the benefits of both features:

### Immutable Validated States

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
});

// Create an immutable state with schema validation
const userState = anchor.immutable(
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: true,
    },
  },
  userSchema
);

// Reading properties works normally
console.log(userState.name); // 'John Doe'
console.log(userState.preferences.theme); // 'light'

// Direct mutations are prevented
userState.name = 'Jane Doe'; // This will be trapped and produce an error
```

### Controlled Mutations with Validation

To modify an immutable validated state, you need to create a writable version using the **`writable`** method, which
still enforces schema validation:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0),
});

// Create an immutable state with schema validation
const userState = anchor.immutable(
  {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  },
  userSchema
);

// Create a writable version
const userWriter = anchor.writable(userState);

// Valid mutations work
userWriter.name = 'Jane Doe';
userWriter.age = 31;

// Invalid mutations are caught by the schema
userWriter.email = 'invalid-email'; // This will be rejected
userWriter.age = -5; // This will also be rejected
```

### Partial Mutations with Contracts

You can also create partially writable states with specific contracts that still enforce schema validation:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0),
  active: z.boolean(),
});

// Create an immutable state with schema validation
const userState = anchor.immutable(
  {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    active: true,
  },
  userSchema
);

// Create a writable version that only allows mutating 'name' and 'age'
const userWriter = anchor.writable(userState, ['name', 'age']);

// These mutations work (valid and allowed by contract)
userWriter.name = 'Jane Doe';
userWriter.age = 31;

// This is rejected by the contract (not in allowed keys)
userWriter.active = false;

// This is rejected by the schema (invalid value)
userWriter.age = -5;
```

## Best Practices

### 1. Always Use Schema Validation for Complex States

For any state that has a defined structure, always use schema validation to ensure data integrity:

```typescript
// Good: Using schema validation
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.date(),
});

const userState = anchor.model(
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date(),
  },
  userSchema
);

// Bad: No validation
const userState1 = anchor({
  id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date(),
});
```

### 2. Use Strict Mode in Development

Enable strict mode during development to catch validation errors early:

```typescript
// Enable strict mode as the default configuration in dev mode.
anchor.configure({ strict: isDevMode() });
```

```typescript
// Enable strict mode for a specific state
const userState = anchor(initialValue, {
  schema: userSchema,
  strict: isDevMode(),
});
```

### 3. Combine with Immutability for Shared Data

Use immutable validated states for shared data that should not be directly modified:

```tsx
import { anchor } from '@anchor/core';
import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z.string().url(),
  theme: z.enum(['light', 'dark']),
  language: z.string().min(2).max(5),
});

// Configuration data that should remain consistent
const config = anchor.immutable(
  {
    apiUrl: 'https://api.example.com',
    theme: 'dark',
    language: 'en',
  },
  configSchema
);

// Components can read the config but cannot modify it directly
function Component() {
  return <div className={config.theme}>Content</div>;
}
```

### 4. Create Specific Writers for Mutations

When you need to modify immutable validated states, create specific writers rather than making the original mutable:

```tsx
import { anchor } from '@anchor/core';
import { z } from 'zod';

const settingsSchema = z.object({
  volume: z.number().min(0).max(100),
  brightness: z.number().min(0).max(100),
  notifications: z.boolean(),
});

const settings = anchor.immutable(
  {
    volume: 50,
    brightness: 70,
    notifications: true,
  },
  settingsSchema
);

// Create a specific writer for mutations
const settingsWriter = anchor.writable(settings);

function SettingsPanel() {
  return (
    <input type="range" value={settings.volume} onChange={(e) => (settingsWriter.volume = parseInt(e.target.value))} />
  );
}
```

### 5. Use Contracts for Fine-Grained Control

Use contracts to limit which properties can be mutated, adding an extra layer of control:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  profile: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
  }),
});

const userState = anchor.immutable(
  {
    profile: {
      name: 'John',
      email: 'john@example.com',
    },
    preferences: {
      theme: 'dark',
    },
  },
  userSchema
);

// Only allow updating preferences
const preferenceWriter = anchor.writable(userState, ['preferences']);
preferenceWriter.preferences.theme = 'light'; // This works
preferenceWriter.profile.name = 'Jane'; // This is blocked by contract
```

### 6. Validate Incoming Data

Always validate data from external sources (APIs, localStorage, etc.) before using it:

```typescript
import { anchor } from '@anchor/core';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

// Validate data from an API response
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const userData = await response.json();

  // Create state with validated data
  return anchor.immutable(userData, userSchema);
}
```

By following these practices and leveraging the combination of data integrity and immutability, you can build
applications with robust, predictable state management that catches errors early and prevents data corruption.
