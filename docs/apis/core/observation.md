# Observation APIs

Observation is the mechanism Anchor uses for fine-grained reactivity. It allows you to track which specific properties of a state are accessed within a given function. These APIs form the foundation for building reactive components and hooks in UI frameworks.

## Core Observation Functions

These functions form the core of Anchor's observation system, allowing you to create and manage observers that track state changes.

### `createObserver()`

Creates a new observer instance. An observer is an object that tracks state properties and executes a callback when any of them change.

```typescript
type createObserver = (
  onChange: (event: StateChange) => void,
  onTrack?: (state: Linkable, key: KeyLike) => void
) => StateObserver;
```

- `onChange`: A callback function that is executed whenever a tracked property changes. See [StateChange](types.md#statechange).
- `onTrack` (optional): A callback that is executed when a new state property is tracked for the first time. See [Linkable](types.md#linkable) and [KeyLike](types.md#keylike).
- **Returns**: A [StateObserver](types.md#stateobserver) instance.

### `withinObserver()`

Executes a function within the context of a specific observer. Any anchored state properties accessed inside the function will be tracked by that observer.

```typescript
// Overload 1
type withinObserver = <R>(fn: () => R, observer: StateObserver) => R;

// Overload 2
type withinObserver = <R>(observer: StateObserver, fn: () => R) => R;
```

- `fn`: The function to execute. See [StateObserver](types.md#stateobserver).
- `observer`: The `StateObserver` instance that should track the function's property access.
- **Returns**: The result of the executed function.

### `outsideObserver()`

Executes a function without any tracking. This is useful when you need to access a state's property inside a tracked function but do not want that specific access to be part of the dependency list.

```typescript
type outsideObserver = <R>(fn: () => R) => R;
```

- `fn`: The function to execute without tracking.
- **Returns**: The result of the executed function.

## Observer Management Functions

These functions provide lower-level control over the observer system.

### `setObserver()`

Manually sets the current global observer. This is a low-level API and should be used with caution.

```typescript
type setObserver = (observer: StateObserver) => () => void;
```

- `observer`: The [StateObserver](types.md#stateobserver) to set as the current one.
- **Returns**: A `restore` function that, when called, will restore the previous observer.

### `getObserver()`

Retrieves the currently active global observer.

```typescript
type getObserver = () => StateObserver | undefined;
```

- **Returns**: The current [StateObserver](types.md#stateobserver) instance, or `undefined` if none is active.
