# Fetch APIs

The Fetch APIs provide reactive wrappers around the native `fetch` API for HTTP requests.

## `fetchState()`

Creates a reactive state for an HTTP request.

```typescript
export function fetchState<T>(init: T, options: FetchOptions): FetchState<T>;
```

- `init`: Initial data.
- `options`: Fetch options (url, method, headers, etc.).
  - `deferred`: If true, requires manual `state.fetch()` call.

## `streamState()`

Creates a reactive state for a streaming HTTP response.

```typescript
export function streamState<T>(init: T, options: StreamOptions): FetchState<T>;
```

- `init`: Initial data.
- `options`: Stream options including `transform` to merge chunks.

## `streamState.readable()`

Creates a state and a `ReadableStream`.

```typescript
export function streamState.readable<T>(init: T): [ReadableState<T>, ReadableStream<T>];
```
