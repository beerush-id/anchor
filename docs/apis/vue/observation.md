# Observation APIs (Vue)

These Vue composables are used for observing changes in reactive states.

## Composables

These are the primary Vue composables for observing reactive state changes.

### `observedRef()`

The primary composable for creating a reactive computation that automatically re-runs when its observed dependencies change.

```typescript
function observedRef<R>(observe: () => R): ConstantRef<R>;
```

- `observe`: A function containing the reactive computation.
- **Returns**: A readonly ref that automatically updates when dependencies change. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.
