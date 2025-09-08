# Session Storage APIs

This API creates a reactive state that is automatically synchronized with the browser's `sessionStorage`.

## `session()`

Creates a reactive object that persists its data for the duration of the browser session. This is the primary, high-level API you should use for session-based state.

```typescript
type session = <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
) => T;
```

- `name`: A unique key for the storage instance. Versioning is also supported, just like `persistent`.
- `init`: The initial state, used if no data exists in session storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A reactive object that is synced with `sessionStorage`.

## `session.leave()`

Disconnects a session state from `sessionStorage`, stopping synchronization and cleaning up its resources.

```typescript
type leave = <T extends ObjLike>(state: T) => void;
```

- `state`: The reactive state to disconnect.

## `SessionStorage`

`SessionStorage` is a lower-level class that extends `MemoryStorage` to provide session storage functionality. It is used internally by the `session()` function.

```typescript
interface SessionStorage<T extends Record<string, unknown> = Record<string, unknown>> extends MemoryStorage<T> {
  readonly key: string;
  readonly oldKey: string;

  set(key: keyof T, value: T[keyof T]): void;
  delete(key: keyof T): void;
  write(): void;
}
```

### `key: string`

The storage key used in `sessionStorage` for the current version of the data. The format is `anchor-session://{name}@{version}`.

### `oldKey: string`

The storage key for the previous version of the data. This is used internally to clean up old data during a version migration.

### `set(key: keyof T, value: T[keyof T])`

Sets a value in the storage and immediately persists it to `sessionStorage`.

- `key`: The key to set.
- `value`: The value to store.

### `delete(key: keyof T)`

Deletes a key from storage and immediately updates `sessionStorage`.

- `key`: The key to delete.

### `write()`

Writes the entire current storage state to the `sessionStorage` adapter.
