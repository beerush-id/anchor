# Request APIs (React)

These React hooks provide reactive data fetching and streaming functionalities.

## `useFetch()`

Provides reactive data fetching functionality, managing the state of an HTTP request.

```typescript
// GET or DELETE
type useFetch = <R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'GET' | 'DELETE' }
): FetchState<R>;

// POST, PUT, PATCH
type useFetch = <R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;
```

- `init`: Initial data value.
- `options`: Fetch configuration options.
- **Returns**: A `FetchState` object.

## `useStream()`

Provides reactive streaming data fetch functionality, updating incrementally as chunks are received.

```typescript
// GET or DELETE
type useStream = <R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'GET' | 'DELETE' }
): FetchState<S>;

// POST, PUT, PATCH
type useStream = <R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<S>;
```

- `init`: Initial data value.
- `options`: Stream configuration options.
- **Returns**: A `FetchState` object.
