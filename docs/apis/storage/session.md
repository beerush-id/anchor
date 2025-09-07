# Session Storage APIs

This API creates a reactive state that is automatically synchronized with the browser's `sessionStorage`.

## `session()`

Creates a reactive object that persists its data for the duration of the browser session.

```typescript
type session = <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T;
```

- `name`: A unique key for the storage instance. Versioning is also supported, just like `persistent`.
- `init`: The initial state, used if no data exists in session storage.
- `options` (optional): Standard anchor state options.
- **Returns**: A reactive object that is synced with `sessionStorage`.

## `session.leave()`

Disconnects a session state from `sessionStorage`, stopping synchronization.

```typescript
type leave = <T extends ObjLike>(state: T): void;
```

- `state`: The reactive state to disconnect.
