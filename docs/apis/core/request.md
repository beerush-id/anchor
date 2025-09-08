# Request APIs

The Request APIs provide reactive wrappers around the native `fetch` API, making it easy to handle HTTP requests and streaming data within your application.

## `fetchState()`

Creates a reactive state that manages the lifecycle of a standard HTTP request. The state object automatically updates as the request progresses through pending, success, and error states.

```typescript
type fetchState = <T, S extends LinkableSchema = LinkableSchema>(init: T, options: FetchOptions<S>) => FetchState<T>;
```

- `init`: The initial value for the `data` property before the fetch completes.
- `options`: Configuration for the fetch call.
  - `url`: The request URL.
  - `deferred` (boolean): If `true`, the fetch will not be initiated automatically. You must call `fetch()` on the returned state object to start it. Defaults to `false`.
  - ...and all other standard `RequestInit` properties (`method`, `headers`, `body`, etc.).
- **Returns**: A `FetchState` object.

## `fetchState.promise()`

Converts a `FetchState` object into a Promise. This is useful for awaiting the result of a fetch operation outside of a reactive context.

```typescript
type promise = <T, S extends FetchState<T>>(state: S) => Promise<S>;
```

- `state`: The `FetchState` object to convert.
- **Returns**: A `Promise` that resolves with the final state when the fetch is complete, or rejects if there is an error.

## `streamState()`

Creates a reactive state that handles a streaming HTTP response. The `data` property of the state is updated incrementally as chunks of data are received.

```typescript
type streamState = <T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StreamOptions<T, S>
) => FetchState<T>;
```

- `init`: The initial value for the `data` property.
- `options`: Configuration for the stream call.
  - `transform` (function): An optional function to process or merge incoming data chunks with the current data.
  - ...and all other `FetchOptions`.
- **Returns**: A `FetchState` object.

## `streamState.promise()`

Converts a `streamState` object into a Promise.

```typescript
type promise = <T, S extends FetchState<T>>(state: S) => Promise<S>;
```

- `state`: The `FetchState` object to convert.
- **Returns**: A `Promise` that resolves with the final state when the stream is closed, or rejects if there is an error.

## `FetchState` Object

Both `fetchState()` and `streamState()` return a `FetchState` object with the following properties and methods:

### Properties

- `data`: `T`
  - The body of the response. It holds the `init` value until the request completes.
- `status`: `FetchStatus`
  - The current status of the request (e.g., `FetchStatus.Pending`).
- `error`: `Error | undefined`
  - An `Error` object if the request fails.
- `response`: `Response | undefined`
  - The raw `Response` object from the fetch call.

### Methods

- `fetch(): void`
  - Manually starts the request. (Useful when `deferred: true` is set).
- `abort(): void`
  - Aborts the ongoing request.

---

## `FetchStatus` Enum

An enum representing the possible states of a request:

- `Idle`: The request has not yet started (`deferred: true`).
- `Pending`: The request is in progress.
- `Success`: The request completed successfully.
- `Error`: The request failed.
