# History APIs

Manage state history with undo/redo capabilities.

## `history()`

Creates a history manager for a state.

```typescript
export function history<T>(state: T, options?: HistoryOptions): HistoryState;
```

## Low-Level Operations

### `rollback()`

Reverts a specific change event.

```typescript
export function rollback<T>(state: T, event: StateChange): void;
```

### `replay()`

Re-applies a specific change event.

```typescript
export function replay<T>(state: T, event: StateChange): void;
```

> [!WARNING]
> `undoChange` and `redoChange` are deprecated. Use `rollback` and `replay`.

## `undoable()`

Creates an undoable operation wrapper.

```typescript
export function undoable(op: () => void): [undo: () => void, clear: () => void];
```
