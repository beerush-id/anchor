# Utility APIs (Vue)

These Vue composables and utility functions provide general utility functions for working with Anchor's reactive system.

## Composables

These are Vue composables that provide various utility functionalities.

### `propsRef()`

Creates a reactive reference object from the provided props, converting State objects to refs.

```typescript
function propsRef<T extends Props>(props: T): PropsRef<T>;
```

- `props`: The input props object containing KeyLike or State values.
- **Returns**: A new object with State values converted to Refs. See [PropsRef&lt;T&gt;](#propsref-t) for more information.

## Type References

### `PropsRef<T>`

```typescript
type PropsRef<T extends Props> = {
  [K in keyof T]: T[K] extends State ? ConstantRef<T[K]> : T[K];
};
```

A mapped type that converts State values in a props object to ConstantRef values while leaving other values unchanged.

### `Props`

```typescript
type Props = {
  [key: string]: KeyLike | State;
};
```

An object type with string keys and values that are either KeyLike or State objects.
