# Error Handling APIs (Svelte)

These Svelte functions are used for capturing and managing exceptions from a reactive state.

## `exceptionRef()`

Captures and manages exceptions (e.g., validation errors) from a reactive state, providing a reactive object of errors keyed by property path.

```typescript
function exceptionRef<T extends ObjLike | Array<unknown>>(state: T): StateExceptionMap<T>;
```

- `state`: The reactive state to capture exceptions from.
- **Returns**: A `StateExceptionMap` containing current exception states.
