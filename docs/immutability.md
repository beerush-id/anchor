# **True Immutability in Anchor**

Immutability is a cornerstone of robust, predictable applications. It ensures that a piece of state cannot be changed
once it's created, preventing unintended side effects and making your application easier to reason about. However, the
traditional approach to immutability often comes with a steep cost in both performance and developer experience. Anchor
offers a revolutionary solution: **True Immutability**.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/immutable.webp" alt="Reactivity Schema" />
</div>

## **Traditional Immutability**

Most immutable patterns rely on a "copy-on-mutation" model. When you need to update a
state, you must create an entirely new object or array. This seems straightforward for a simple change, but for deeply
nested data structures, it quickly leads to:

- **Manual Complexity:** You have to manually write code to copy every nested layer of the state tree. This is tedious,
  error-prone, and a source of significant boilerplate.
- **Performance Overhead:** Creating deep copies of large objects can be computationally expensive. Every time you
  update a small part of your state, your application must perform a costly deep clone, which can cause noticeable lag
  and performance degradation as your application scales.
- **Source of Confusion:** It can be difficult work with data because we need to make sure that the data that is being
  read is the upto-date one. It leads to confusion and potential bugs.

## **True Immutability**

Anchor's approach to immutability is fundamentally different. Instead of relying on manual copying, Anchor uses a
powerful, proxy-based system that gives you the best of both worlds:

::: details Developer Friendly Error! {open}
<img style="border-radius: 8px" src="/images/contract-violation.webp" alt="Write Contract Violation" />
:::

- **Direct Mutation:** You can write simple, intuitive code that looks like a direct mutation (e.g.,
  `state.profile.name = 'John Doe'`). This eliminates boilerplate and makes your code cleaner and easier to read.
- **Safe and Immutable:** Behind the scenes, Anchor's write contract engine apply this change. It maintains a single,
  stable source of truth, so you get all the safety and predictability of an immutable
  state without the performance penalties.
- **Fine-grained Updates:** Anchor's write contract engine only updates the parts of the state that signed in the
  contract,
  preventing accidental changes to the state.
- **Up to Date:** Whenever and wherever you read a state, it will be always up to date and consistent since it maintain
  a
  stable reference to the state.

This innovative approach is what makes Anchor so fast. It allows for highly optimized, fine-grained updates without the
expensive overhead of deep cloning.

### **Strongly Typed Immutability**

Anchor reinforces its commitment to immutability through **strong typing**. When you declare an immutable state, Anchor
returns a
read-only type in your IDE. This is a crucial feature for preventing accidental mutations:

::: details Catch Illegal Mutation Early! {open}
<img style="border-radius: 8px" src="/images/ide-warning.webp" alt="Write Contract Violation" />
:::

- **Compile-time Safety:** If you try to mutate a read-only state directly, your IDE will immediately warn you, or your
  build will fail. This catches potential bugs before they even reach runtime.
- **Confidence:** This gives you confidence that your state will not be mutated outside of an explicit "write contract,"
  which is where Anchor's system can track and manage the change.

By combining direct mutation with a proxy-based system and strong typing, Anchor solves the immutability problem in a
way that is both powerful and practical.

## Usage

To use Anchor's immutability feature, you need to declare your state as immutable:

```typescript
import { anchor } from '@anchor/core';

// Create an immutable state
const state = anchor.immutable({ count: 0, name: 'Anchor' });
```

## Basic Usage

You can create immutable states in several ways:

```typescript
import { anchor } from '@anchor/core';

// Using the immutable method
const immutableState = anchor.immutable({ count: 0, items: [] });

// Using the immutable option
const anotherImmutableState = anchor({ count: 0, items: [] }, { immutable: true });
```

### Working with Immutable States

Immutable states behave like regular objects but prevent direct mutations:

```typescript
import { anchor } from '@anchor/core';

const user = anchor.immutable({
  name: 'John Doe',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA',
  },
});

// Reading properties works normally
console.log(user.name); // 'John Doe'
console.log(user.address.city); // 'New York'

// Direct mutations are prevented
user.name = 'Jane Doe'; // This will be trapped and produce an error
user.age = 31; // This will also be trapped
```

## Write Contract

To modify an immutable state, you need to create a writable version of the state by using the `writable` method:

```typescript
import { anchor } from '@anchor/core';

// Declare an immutable state.
const immutableState = anchor.immutable({ count: 0, name: 'Anchor' });

// Create a writable version of the immutable state
const writableState = anchor.writable(immutableState);

// Now you can mutate the state
writableState.count = 1;
writableState.name = 'Updated Anchor';

// Changes are reflected in the original immutable state
console.log(immutableState.count); // 1
console.log(immutableState.name); // 'Updated Anchor'
```

::: warning Write Contract

Write contract allows you to mutate a state, but it's limited to single level mutation. This is important to make sure
there is no unintentionally modified nested state. This is a design choice to make sure that the state is always stable.

```ts
const profileWriter = anchor.writable(profile, ['name']);

profileWriter.name = 'New Name'; // This is allowed
profileWriter.age = 10; // This is not allowed
profileWriter.address.line = 'New Line'; // This is not allowed (need a new contract).
```

:::

### Partially Writable States with Contracts

You can also create partially writable states by specifying a contract that allows only certain mutations:

::: tip Recommended

We always recommend using contracts to define the allowed mutations for your state to reduce the risk of accidental
changes. The purpose of immutable is to maintain the state stable, open contract can lead to unexpected changes.

:::

```typescript
import { anchor } from '@anchor/core';

const immutableState = anchor.immutable({
  count: 0,
  name: 'Anchor',
  active: true,
});

// Create a writable version that only allows mutating 'count'
const partiallyWritable = anchor.writable(immutableState, ['count']);

partiallyWritable.count = 1; // This works
partiallyWritable.name = 'New Name'; // This will be trapped
partiallyWritable.active = false; // This will also be trapped

console.log(immutableState.count); // 1
console.log(immutableState.name); // 'Anchor' (unchanged)
console.log(immutableState.active); // true (unchanged)
```

## Best Practices

### 1. Use Immutable States for Shared Data

Immutable states are ideal for shared data that should not be directly modified by multiple components:

```tsx
// ✓ Good: Configuration data that should remain consistent
const config = anchor.immutable({
  apiUrl: 'https://api.example.com',
  theme: 'dark',
  language: 'en',
});

// Components can read the config but cannot modify it directly
function Component() {
  return <div>{config.theme}</div>;
}
```

### 2. Create Writable Versions When Needed

When you need to modify an immutable state, create a writable version rather than making the original mutable:

```tsx
// ✓ Good: Create a specific writable version for mutations
const settings = anchor.immutable({ volume: 50, brightness: 70 });
const settingsWriter = anchor.writable(settings, ['volume']);

function SettingsPanel() {
  return (
    <input type="range" value={settings.volume} onChange={(e) => (settingsWriter.volume = parseInt(e.target.value))} />
  );
}
```

### 3. Use Contracts for Fine-Grained Control

Use contracts to limit which properties or methods can be mutated:

```typescript
// ✓ Good: Only allow specific mutations
const userState = anchor.immutable({
  profile: { name: 'John', email: 'john@example.com' },
  preferences: { theme: 'dark' },
});

// Only allow updating preferences
const preferenceWriter = anchor.writable(userState, ['preferences']);
```

### 4. Combine with Schema Validation

Use schema validation with immutable states to ensure data integrity:

```typescript
// ✓ Good: Immutable state with schema validation
const userSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
});

const user = anchor.immutable(
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  userSchema
);
```

### 5. Avoid Direct Mutations

Never attempt to directly mutate immutable states:

```typescript
// ✕ Bad: Direct mutation attempt
const state = anchor.immutable({ count: 0 });
state.count = 1; // This will be trapped

// ✓ Good: Use writable version
const state2 = anchor.immutable({ count: 0 });
const writer = anchor.writable(state2);
writer.count = 1; // This is the correct approach
```

### 6. Share Immutable States, Not Writable Ones

Share the immutable version of your state with components that only need to read it:

```tsx
// ✓ Good: Share immutable state for reading
const data = anchor.immutable({ items: [] });
const dataWriter = anchor.writable(data);

// Components that only read data use the immutable version
<ReadOnlyComponent data={ data } />

// Components that need to modify data use the writable version
<EditableComponent data={ data } writer={ dataWriter } />
```

By following these practices, you can leverage the full power of Anchor's immutability system while maintaining clean,
predictable, and maintainable code.

## APIs

Anchor provides a set of APIs to manage immutable state in your application. To learn more about these APIs, please refer to:

- [Anchor Immutable API Reference](/apis/core/initialization#anchor-immutable) - Immutability APIs for the Core Package.
- [Anchor for React Immutable API Reference](/apis/react/initialization#useimmutable) - Immutability APIs for the React Package.
- [Anchor for Svelte Immutable API Reference](/apis/svelte/initialization#immutableref) - Immutability APIs for the Svelte Package.
- [Anchor for Vue Immutable API Reference](/apis/vue/initialization#immutableref) - Immutability APIs for the Vue Package.
