# Utility APIs (React)

These React hooks provide general utility functions.

## `useMicrotask()`

Provides a memoized microtask function with an optional timeout.

```typescript
type useMicrotask = (timeout?: number): [TaskScheduler<unknown>, TaskDestroyer];
```

- `timeout` (optional): Delay in milliseconds.
- **Returns**: A memoized microtask function and a destroyer.

## `useMicrobatch()`

Provides a memoized microbatch function with an optional delay.

```typescript
type useMicrobatch = (delay?: number): [BatchScheduler, BatchResetter];
```

- `delay` (optional): Delay in milliseconds.
- **Returns**: A memoized microbatch function and a resetter.
