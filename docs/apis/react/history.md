# History APIs (React)

This React hook provides history management (undo/redo) for a given reactive state.

## `useHistory()`

Provides history management (undo/redo) for a given reactive state.

```typescript
type useHistory = <T extends State>(state: T, options?: HistoryOptions): HistoryState;
```

- `state`: The reactive state to track history for.
- `options` (optional): History configuration options.
- **Returns**: The `HistoryState` object.
