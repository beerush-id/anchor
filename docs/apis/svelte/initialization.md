# Initialization APIs (Svelte)

These Svelte functions are primarily used for creating and initializing reactive states within your components.

## `useAnchor()`

The primary function for creating and managing reactive state within Svelte components. It returns a Svelte-compatible store.

```typescript
type useAnchor = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): T;
```

- `init`: The initial value for the state.
- `options` (optional): Configuration options for the state.
- **Returns**: A Svelte store-compatible object that holds the reactive state.
