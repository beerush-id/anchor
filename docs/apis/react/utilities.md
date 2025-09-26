# Utility APIs (React)

These React hooks and utility functions provide general utility functions for working with Anchor's reactive system.

## Hooks

These are React hooks that provide various utility functionalities.

### `useSnapshot()`

A React hook that creates a snapshot of a reactive state.

The snapshot is a plain object that reflects the current state at the time of creation. It does not update automatically when the state changes. It can optionally transform the snapshot using a transform function.

```typescript
// Without transform
function useSnapshot<T extends Linkable>(state: T): T;

// With transform
function useSnapshot<T extends Linkable, R>(state: T, transform: TransformSnapshotFn<T, R>): R;
```

- `state`: The reactive state to create a snapshot from.
- `transform` (optional): A function that transforms the snapshot before it is returned.
- **Returns**: A snapshot of the reactive state, or a transformed snapshot.

### `useMicrotask()`

A React hook that provides a microtask function with an optional timeout.

This hook uses the **microtask** utility from the Anchor core library to create a function that executes a callback in a microtask. The created microtask function is memoized using **useRef** to ensure it remains stable across re-renders.

```typescript
type useMicrotask = (timeout?: number) => TaskScheduler<unknown>;
```

- `timeout` (optional): Delay in milliseconds.
- **Returns**: A memoized microtask function.

### `useMicrobatch()`

A React hook that provides a microbatch function with an optional delay.

This hook uses the **microbatch** utility from the Anchor core library to create a function that executes a callback in a microtask with batching capabilities. The created microbatch function is memoized using **useRef** to ensure it remains stable across re-renders.

```typescript
type useMicrobatch = (delay?: number) => BatchScheduler;
```

- `delay` (optional): Delay in milliseconds.
- **Returns**: A memoized microbatch function.

### `useStableRef()`

A React hook that provides a stable reference to a value, updating only when specified dependencies change.

This hook ensures that the returned reference object remains stable across re-renders, only updating its value and dependencies when the provided dependencies change. It supports both direct values and factory functions for initialization.

```typescript
function useStableRef<T>(
  init: T | (() => T),
  deps: unknown[]
): {
  deps: Set<unknown>;
  value: T;
};
```

- `init`: The initial value or a factory function that returns the initial value.
- `deps`: An array of dependencies that, when changed, will trigger an update of the ref's value.
- **Returns**: A stable reference object containing the current value and a Set of dependencies.

### `useShortId()`

A React hook that generates a short, unique identifier string.

This hook uses the **shortId** function from the Anchor core library to generate a unique ID that remains stable across re-renders.

```typescript
function useShortId(): string;
```

- **Returns**: The generated short ID string.

### `useRefTrap()`

A React hook that creates a ref with a custom setter handler.

This hook returns a ref-like object that allows you to intercept and modify the value being set through a handler function. The handler function is called whenever the current property is set, enabling you to apply custom logic (e.g., validation, transformation) before updating the ref's value.

```typescript
function useRefTrap<T>(
  init: T | null,
  handler: (value: T | null) => T | null
): {
  current: T | null;
};
```

- `init`: The initial value for the ref.
- `handler`: A function that processes the value before it's set. It receives the new value and returns the value to be stored.
- **Returns**: A ref-like object with a custom setter.

## Dev Tools

These are development tools that help with debugging and development.

### `setDevMode()`

Sets the development mode and strict mode flags.

```typescript
function setDevMode(enabled: boolean, strict?: boolean): void;
```

- `enabled`: Whether to enable development mode.
- `strict` (optional): Whether to enable strict mode.

### `isDevMode()`

Checks if development mode is enabled.

```typescript
function isDevMode(): boolean;
```

- **Returns**: True if development mode is enabled, false otherwise.

### `isStrictMode()`

Checks if strict mode is enabled.

```typescript
function isStrictMode(): boolean;
```

- **Returns**: True if strict mode is enabled, false otherwise.

### `setDebugRenderer()`

Sets the debug renderer flags to visualize component renders.

```typescript
function setDebugRenderer(enabled: boolean, duration?: number): void;
```

- `enabled`: Whether to enable debug rendering.
- `duration` (optional): Duration in milliseconds to show the debug visualization.

### `isDebugRenderer()`

Checks if debug renderer is enabled.

```typescript
function isDebugRenderer(): boolean;
```

- **Returns**: True if debug renderer is enabled, false otherwise.

### `debugRender()`

Highlights an element to visualize when it's rendered or updated.

```typescript
function debugRender<T extends HTMLElement>(element: RefObject<T | null>): void;
```

- `element`: A ref to the element to highlight.

## Utility Functions

These are utility functions that are not React hooks but are useful when working with Anchor's reactive system.

### `depsChanged()`

Compares two arrays for shallow equality, ignoring the order of elements.

This function checks if two arrays contain the same elements by comparing:

1. Their lengths
2. Whether all elements in one array exist in the other array

It's used to determine if the dependencies of an observer have changed, where the position of elements doesn't matter but their presence does.

```typescript
function depsChanged(prev: Set<unknown>, next: unknown[]): Set<unknown> | void;
```

- `prev`: The previous array of dependencies.
- `next`: The next array of dependencies.
- **Returns**: A new Set if the dependencies changed, or void if they're the same.

### `pickValues()`

Helper function that extracts specific properties from a reactive state object.

It returns a tuple containing:

1. An object with the picked properties and their values
2. An array of the values corresponding to the picked keys

```typescript
function pickValues<T extends State>(state: T, keys: (keyof T)[]): [T, T[keyof T][]];
```

- `state`: The reactive state object to pick values from.
- `keys`: An array of keys to pick from the state object.
- **Returns**: A tuple containing the picked object and values array.

### `isMutationOf()`

Checks if a state change event is a mutation of a specific key.

```typescript
function isMutationOf(event: StateChange, key: KeyLike): boolean;
```

- `event`: The state change event.
- `key`: The key to check for mutation.
- **Returns**: True if the event is a mutation of the specified key, false otherwise.

### `mutationKeys()`

Extracts the keys that were mutated in a state change event.

```typescript
function mutationKeys(event: StateChange): string[];
```

- `event`: The state change event.
- **Returns**: An array of keys that were mutated.
