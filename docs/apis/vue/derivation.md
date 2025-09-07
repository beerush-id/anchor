# Derivation APIs (Vue)

These Vue composables are used for deriving computed values or creating reactive relationships between states.

### `derivedRef()`

Creates a Vue `Ref` that derives its value from an Anchor state. It automatically updates when the source Anchor state changes.

```typescript
// Basic derivation
type derivedRef = <T extends State>(state: T | Ref<T>): Ref<T>;

// With transformation
type derivedRef = <T extends State, R>(state: T | Ref<T>, transform: PipeTransformer<T, R>): Ref<Immutable<R>>;
```

- `state`: The Anchor state (or a Vue `Ref` to an Anchor state) to derive from.
- `transform` (optional): A function to transform the state value.
- **Returns**: A Vue `Ref` that tracks the (possibly transformed) state value.
