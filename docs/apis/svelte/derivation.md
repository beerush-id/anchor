# Derivation APIs (Svelte)

These Svelte functions are used for deriving computed values or creating reactive relationships between states.

## `derivedRef()`

Creates a derived state from a source state with an optional transformation.

```typescript
function derivedRef<T, R>(state: T, derive: (current: T) => R): ConstantRef<R>;
```

- `state`: The source state.
- `derive`: A function that transforms the current state value.
- **Returns**: A read-only reference containing the derived state value.

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
