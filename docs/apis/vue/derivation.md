# Derivation APIs (Vue)

These Vue composables are used for deriving computed values from reactive states.

## Primary Derivation APIs

These are the main APIs for deriving values from reactive states.

### `derivedRef()`

Derives a computed value from a reactive state or ref.

```typescript
// Without transform function
function derivedRef<T extends State>(state: T | Ref<T>): ConstantRef<T>;

// With transform function
function derivedRef<T extends State, R>(state: T | Ref<T>, transform: PipeTransformer<T, R>): ConstantRef<R>;
```

- `state`: The reactive state or ref to derive from.
- `transform` (optional): A function to transform the derived value.
- **Returns**: A constant ref with the derived value. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.
