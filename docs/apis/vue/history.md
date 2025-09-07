# History APIs (Vue)

This Vue composable provides history management (undo/redo) for a given reactive state.

### `historyRef()`

Creates a Vue `Ref` that wraps a history state object, providing reactive undo/redo functionality.

```typescript
type historyRef = <T extends State>(state: T, options?: HistoryOptions): Ref<HistoryState>;
```

- `state`: The Anchor state to track history for.
- `options` (optional): History configuration options.
- **Returns**: A Vue `Ref` containing the history state object.
