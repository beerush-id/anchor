# Error Handling APIs (Vue)

This Vue composable is used for capturing and managing exceptions from a reactive state.

## `exceptionRef()`

Captures and manages exceptions (e.g., validation errors) from a reactive state, providing a reactive object of errors keyed by property path.

```typescript
function exceptionRef<T extends ObjLike | Array<unknown>>(state: T | VariableRef<T>): ConstantRef<StateExceptionMap<T>>;
```

- `state`: The reactive state or variable ref to capture exceptions from.
- **Returns**: A constant ref containing current exception states. See [ConstantRef&lt;T&gt;](./initialization.md#constantref-t) for more information.
