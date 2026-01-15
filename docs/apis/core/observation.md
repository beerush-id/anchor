# Low-Level Observation APIs

Fine-grained control over the observation system. For standard effects, see [`effect()`](reactivity.md#effect).

## `createObserver()`

Creates a manual observer.

```typescript
export function createObserver(
  onChange: (event: StateChange) => void,
  onTrack?: (state: Linkable, key: KeyLike) => void,
  controlled?: boolean
): StateObserver;
```

## `withinObserver()`

Execute a function within a specific observer's context.

```typescript
export function withinObserver<R>(fn: () => R, observer: StateObserver): R;
```

## `getObserver()`

Gets the current active observer.

```typescript
export function getObserver(): StateObserver | undefined;
```

> [!WARNING]
> `setObserver()` is deprecated.
> `outsideObserver()` is deprecated. Use `untrack()`.
