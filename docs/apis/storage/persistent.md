# Persistent Storage APIs

This API creates a reactive state that is automatically synchronized with the browser's `localStorage`.

## Core Persistent Functions

### `persistent()`

Creates a reactive object that persists its data across browser sessions by synchronizing with `localStorage`. This is the primary, high-level API you should use for persistent state.

```typescript
type persistent = <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
) => T;
```

- `name`: A unique key for the storage instance. You can also specify a version by appending `@x.x.x` and a version to migrate from with `@x.x.x:x.x.x`.
- `init`: The initial state, used if no data exists in local storage. See [ObjLike](../core/types.md#objlike).
- `options` (optional): Standard anchor state options. See [StateOptions](../core/types.md#stateoptions-s) and [LinkableSchema](../core/types.md#linkableschema).
- **Returns**: A reactive object that is synced with `localStorage`. See [T](types.md#persistentstorage).

### `persistent.leave()`

Disconnects a persistent state from `localStorage`, stopping synchronization and cleaning up its resources.

```typescript
type leave = <T extends ObjLike>(state: T) => void;
```

- `state`: The reactive state to disconnect. See [ObjLike](../core/types.md#objlike).

## Persistent Storage Classes

### `PersistentStorage`

`PersistentStorage` is a lower-level class that extends `SessionStorage` to provide persistent storage functionality. This class uses `localStorage` to persist data across browser sessions. It is used internally by the `persistent()` function.

```typescript
interface PersistentStorage<T extends Record<string, unknown> = Record<string, unknown>> extends SessionStorage<T> {
  readonly key: string;
  readonly oldKey: string;
}
```

#### Properties

##### `key: string`

The storage key used in `localStorage` for the current version of the data. The format is `anchor-persistent://{name}@{version}`.

##### `oldKey: string`

The storage key for the previous version of the data. This is used internally to clean up old data during a version migration.
