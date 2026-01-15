# Lifecycle APIs

The Lifecycle APIs manage cleanup and resource disposal, essential for preventing memory leaks in reactive applications.

## Core Functions

### `onCleanup()`

Registers a cleanup function to be called when the current scope (e.g., an effect or a lifecycle run) is disposed.

```typescript
export function onCleanup(handler: () => void): void;
```

- `handler`: The function to run during cleanup.

### `createLifecycle()`

Creates a lifecycle manager to manually control a scope of resources.

```typescript
export function createLifecycle(): {
  run<R>(fn: () => R): R;
  runAsync<R>(fn: () => Promise<R>): Promise<R>;
  destroy(): void;
};
```

- `run(fn)`: Executes `fn` collecting any `onCleanup` calls registered within it.
- `destroy()`: Runs all collected cleanup handlers.

## Global / Low-Level

### `onGlobalCleanup()`

Registers a cleanup handler directly to the global scope (application shutdown).

```typescript
export function onGlobalCleanup(handler: () => void): void;
```

### `setCleanUpHandler()`

Customizes how cleanup handlers are registered (e.g., for integrating with other frameworks).

```typescript
export function setCleanUpHandler(handler: (handler: () => void) => void): void;
```
