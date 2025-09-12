# Utility APIs (Svelte)

These Svelte functions provide general utility functions for working with Anchor's reactive system.

## Props APIs

These APIs help with handling component props in a reactive manner.

### `propsRef()`

Creates a reactive reference object from the provided props. For each property in the input props:

- If the value is a State object, it will be converted to a derived ref
- Otherwise, the value will be kept as is

```typescript
function propsRef<T extends Props>(props: T): PropsRef<T>;
```

- `props`: The input props object containing KeyLike or State values.
- **Returns**: A [PropsRef](#propsref-t) object with State values converted to refs.

## Reference Utility APIs

These APIs provide utility functions for working with refs.

### `isRef()`

Checks if a given value is a writable reference.

```typescript
function isRef<T>(ref: unknown): ref is VariableRef<T>;
```

- `ref`: The value to check.
- **Returns**: True if the value is a writable reference, false otherwise.

## Type References

### `Props`

```typescript
type Props = {
  [key: string]: KeyLike | State;
};
```

Represents the props object that can contain either primitive values or State objects.

### `PropsRef<T>`

```typescript
type PropsRef<T extends Props> = {
  [K in keyof T]: T[K] extends State ? ConstantRef<T[K]> : T[K];
};
```

Represents the transformed props object where State values are converted to ConstantRefs.

### `REF_REGISTRY`

A WeakMap that stores the relationship between refs and their underlying state objects.

```typescript
const REF_REGISTRY: WeakMap<ConstantRef<unknown>, StateRef<unknown>>;
```
