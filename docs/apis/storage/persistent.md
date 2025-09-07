# Persistent Storage APIs

This API creates a reactive state that is automatically synchronized with the browser's `localStorage`.

## `persistent()`

Creates a reactive object that persists its data across browser sessions.

```typescript
type persistent = <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T;
```

- `name`: A unique key for the storage instance. You can also specify a version by appending `@x.x.x` and a version to migrate from with `@x.x.x:x.x.x`.
- `init`: The initial state, used if no data exists in local storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A reactive object that is synced with `localStorage`.

## `persistent.leave()`

Disconnects a persistent state from `localStorage`, stopping synchronization.

```typescript
type leave = <T extends ObjLike>(state: T): void;
```

- `state`: The reactive state to disconnect.
