# Derivation APIs (Svelte)

These Svelte functions are used for deriving computed values or creating reactive relationships between states.

## `derivedRef()`

Creates a derived store from a state or a writable reference with optional transformation.

```typescript
// Basic derivation
function derivedRef<T>(state: T | VariableRef<T>, recursive?: boolean): Readable<T>;

// With transformation
function derivedRef<T, R>(state: T | VariableRef<T>, transform: (current: T) => R): Readable<R>;
```

- `state`: The input state or writable reference.
- `transformRecursive` (optional): An optional function that transforms the current state value, or a boolean indicating whether to recursively derive the state.
- **Returns**: A Svelte store-compatible object that holds the derived value.

### Example

```svelte
<script>
  import { anchorRef, derivedRef } from '@anchorlib/svelte';

  const count = anchorRef(0);

  // Basic derivation
  const doubled = derivedRef(count, (current) => current * 2);

  // With transformation
  const description = derivedRef(count, (current) => `Count is ${current}`);
</script>

<button on:click={() => count.value++}>
  Clicked {$count} {$description}
</button>

<p>Doubled value: {$doubled}</p>
```
