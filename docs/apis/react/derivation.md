# Derivation APIs (React)

These React hooks are used for deriving computed values or creating reactive relationships between states.

### `useDerived()`

Derives a computed value from a reactive state. The component re-renders automatically when the dependent state changes.

```typescript
// Basic derivation
type useDerived = <T extends Linkable>(state: T, recursive?: boolean): T;

// With transformation
type useDerived = <T extends Linkable, R>(state: T, transform: TransformFn<T, R>): R;
```

- `state`: The reactive state to derive from.
- `recursive` (optional): If `true`, recursively derives the computed value.
- `transform` (optional): A function to transform the derived value.
- **Returns**: The derived value.

## `useValue()`

Derives a specific property's value from a reactive state. The component re-renders when that property changes.

```typescript
type useValue = <T extends State, K extends keyof T>(state: T, key: K): T[K];
```

- `state`: The reactive state.
- `key`: The property key to derive.
- **Returns**: The derived value of the property.

## `useValueIs()`

Checks if a specific property of a reactive state equals an expected value. The comparison re-evaluates when the property changes.

```typescript
type useValueIs = <T extends State, K extends keyof T>(state: T, key: K, expect: unknown): boolean;
```

- `state`: The reactive state.
- `key`: The property key to check.
- `expect`: The expected value for comparison.
- **Returns**: `true` if the property value equals the expected value, `false` otherwise.

## `useDerivedRef()`

Creates a React `RefObject` whose `current` property is reactive and synchronized with a state.

```typescript
type useDerivedRef = <S extends State, R>(
  state: S,
  handle: (current: S, ref: R | null) => void
): RefObject<R | null>;
```

- `state`: The reactive state.
- `handle`: A function called when the state changes or the ref value is set.
- **Returns**: A `RefObject`.
