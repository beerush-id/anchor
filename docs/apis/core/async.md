# Async APIs

The Async APIs provide utilities for managing asynchronous operations and state.

## `query()`

Creates a reactive state for an async operation. It handles loading states, errors, and data updates.

```typescript
export function query<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>,
  init?: T,
  options?: AsyncOptions
): AsyncState<T, E>;
```

- `fn`: The async function to execute. It receives an `AbortSignal`.
- `init` (optional): Initial data.
- `options` (optional): Configuration.
  - `deferred` (boolean): If `true`, does not auto-start.
- **Returns**: An [AsyncState](types.md#asyncstate-t-e) (readonly).

The returned state has:
- `data`: The result.
- `status`: `idle` | `pending` | `success` | `error`.
- `error`: Error object if failed.
- `start()`: Function to (re)start the query.
- `abort()`: Function to cancel the current query.

## `cancelable()`

Helper to create a promise that can be cancelled via an `AbortSignal`.

```typescript
export function cancelable<R>(fn: (signal: AbortSignal) => Promise<R> | R, signal: AbortSignal): Promise<R>;
```

- `fn`: The function to execute.
- `signal`: The `AbortSignal` to listen to.
- **Returns**: A Promise that rejects if aborted.
