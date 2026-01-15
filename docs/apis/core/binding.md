# Binding APIs

The Binding API provides two-way data binding between reactive properties.

## `binding()`

Establishes a two-way binding between a source and a target property.

```typescript
export function binding<T, B, S extends ObjLike = ObjLike>(
  source: StateBinding<T, B>,
  target: S,
  targetKey: keyof S
): StateUnsubscribe;
```

- `source`: The source binding. Can be a reactive object (binds to 'value') or `[object, key]`.
- `target`: The target reactive object.
- `targetKey`: The key on the target object.
- **Returns**: An unsubscribe function to stop the binding.
