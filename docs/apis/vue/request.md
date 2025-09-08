# Request APIs (Vue)

These Vue composables provide reactive data fetching and streaming functionalities.

## `fetchRef()`

Creates a reactive reference to a fetch state. This wraps the core `fetchState` functionality with Vue's reactivity system.

```typescript
// GET or DELETE
type fetchRef = <R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }) => Ref<FetchState<R>>;

// POST, PUT, PATCH
type fetchRef = <R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
) => Ref<FetchState<R>>;
```

- `init`: The initial data for the fetch state.
- `options`: Fetch configuration options.
- **Returns**: A Vue `Ref` containing the fetch state.

## `streamRef()`

Creates a reactive reference to a stream state. This wraps the core `streamState` functionality with Vue's reactivity system, useful for streaming data sources.

```typescript
// GET or DELETE
type streamRef = <R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }) => Ref<FetchState<R>>;

// POST, PUT, PATCH
type streamRef = <R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
) => Ref<FetchState<R>>;
```

- `init`: The initial data for the stream state.
- `options`: Stream configuration options.
- **Returns**: A Vue `Ref` containing the stream state.
