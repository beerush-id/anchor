# Utility APIs (Svelte)

These Svelte functions provide general utility functions for working with Anchor's reactive system.

## Reference Utility APIs

These APIs provide utility functions for working with refs.

### `isRef()`

Checks if a given value is a writable reference.

```typescript
function isRef<T>(ref: unknown): ref is VariableRef<T>;
```

- `ref`: The value to check.
- **Returns**: True if the value is a writable reference, false otherwise.
