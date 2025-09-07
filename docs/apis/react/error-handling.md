# Error Handling APIs (React)

This React hook is used for capturing and managing exceptions from a reactive state.

## `useException()`

Captures and manages exceptions (e.g., validation errors) from a reactive state, providing a reactive object of errors keyed by property path.

```typescript
type useException = <T extends State, R extends keyof T>(
  state: T,
  init?: ExceptionList<T, R>
): ExceptionList<T, R>;
```

- `state`: The reactive state to capture exceptions from.
- `init` (optional): Initial exception states.
- **Returns**: A reactive object containing current exception states.
