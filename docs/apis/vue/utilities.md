# Utilities (Vue)

These Vue composables provide general utility functions.

### `propsRef()`

Creates a reactive reference object from the provided props. If a prop's value is an Anchor `State` object, it will be converted to a derived `Ref`.

```typescript
type propsRef = <T extends Props>(props: T): PropsRef<T>;
```

- `props`: The input props object.
- **Returns**: A new object with `State` values converted to `Refs`.
