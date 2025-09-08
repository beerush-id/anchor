# Ordered List API (React)

This section documents the `useOrderedList` hook, which creates and manages a reactive ordered list state.

## `useOrderedList()`

Creates a reactive ordered list state using Anchor's state management. This hook provides a way to manage an array state where the order of elements is maintained according to a custom comparison function. The list will automatically sort itself when elements are added, removed, or modified.

```typescript
function useOrderedList<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): AnchorState<T>;
```

- `init`: The initial array state for the ordered list.
- `compare`: A comparison function that defines the sort order. It should return a negative value if the first argument is less than the second, zero if equal, or a positive value if greater.
- `options` (optional): Optional state configuration options for the underlying Anchor state.
- **Returns**: A reactive state object (`AnchorState<T>`) with methods to interact with the ordered list.
