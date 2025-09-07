# Derivation APIs (Svelte)

These Svelte functions are used for deriving computed values or creating reactive relationships between states.

## `useDerived()`

Derives a computed value from a reactive state, returning a Svelte-compatible readable store. The store automatically updates when the dependent state changes.

```typescript
// Basic derivation
type useDerived = <T>(state: T): T;

// With transformation
type useDerived = <T, R>(state: T, transform: (snapshot: T) => R): R;
```

- `state`: The reactive state to derive from.
- `transform` (optional): A function to transform the derived value.
- **Returns**: A Svelte store-compatible object that holds the derived value.
