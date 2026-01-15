# Subscription APIs

The Subscription APIs provide tools for listening to state changes.

## `subscribe()`

The primary function to observe changes in a reactive state.

```typescript
export function subscribe<T>(
  state: T,
  handler: StateSubscriber<T>,
  recursive?: boolean
): StateUnsubscribe;
```

- `state`: The anchored state to observe.
- `handler`: Callback receiving `(snapshot, event)`.
- `recursive`: If `true`, listens to nested changes.
- **Returns**: Unsubscribe function.

### `subscribe.log()`

Debug utility to log changes to console.

```typescript
subscribe.log(state);
```

### `subscribe.pipe()`

One-way sync from source to target.

```typescript
subscribe.pipe(source, target, transform?);
```

### `subscribe.bind()`

Two-way binding between two states.

```typescript
subscribe.bind(left, right, transformLeft?, transformRight?);
```

### `subscribe.resolve()`

Resolves the internal state controller.

```typescript
const controller = subscribe.resolve(state);
```

> [!WARNING]
> `derive()` is deprecated. Please use `subscribe()` instead.
