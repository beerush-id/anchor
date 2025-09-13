# Observation APIs (Svelte)

These Svelte functions are used for observing changes in reactive states and creating reactive computations.

## `observedRef()`

Creates a Svelte readable store that observes a reactive function and updates its subscribers when the observed value changes. The function automatically handles observer lifecycle and cleanup using Svelte's onDestroy hook.

```typescript
function observedRef<R>(observe: () => R): Readable<R>;
```

- `observe`: A function that returns the value to be observed
- **Returns**: A Svelte readable store containing the observed value

### Example

```svelte
<script>
  import { observedRef } from '@anchorlib/svelte';
  import { count } from './stores';

  // Create a reactive computation that doubles the count
  const doubled = observedRef(() => $count * 2);
</script>

<p>Count: {$count}</p>
<p>Doubled: {$doubled}</p>
```
