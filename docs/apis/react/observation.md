# Observation APIs (React)

These React hooks and components are used for observing changes in reactive states and triggering component re-renders.

## Hook APIs

These are the primary React hooks for observing reactive state changes.

### `useObserved()`

The primary hook for creating a reactive computation that automatically re-runs when its observed dependencies change. It combines `useObserverRef` and `useMemo`.

```typescript
function useObserved<R, D extends unknown[]>(observe: () => R, deps?: D): R;
```

- `observe`: A function containing the reactive computation.
- `deps` (optional): Additional dependencies.
- **Returns**: The result of the `observe` function.

### `useObservedList()`

Derives a list of objects from a reactive array state, providing stable keys for rendering.

```typescript
// Using index as key
function useObservedList<T extends ObjLike[]>(state: T): Array<{ key: number; value: T[number] }>;

// Using custom property as key
function useObservedList<T extends ObjLike[], K extends keyof T[number]>(
  state: T,
  key: K
): Array<{ key: T[number][K]; value: T[number] }>;
```

- `state`: The reactive array state.
- `key` (optional): A property name to use as the key for each item.
- **Returns**: An array of objects with `key` and `value` properties.

## Higher-Order Components (HOCs)

These are Higher-Order Components that make React components reactive to Anchor's state changes.

### `observe()`

A higher-order component (HOC) that creates a React component which automatically re-renders when any observable state accessed within the provided `factory` callback changes. It uses an internal `StateObserver` to track dependencies and trigger updates.

```typescript
function observe<R>(factory: (ref: Ref<R>) => ReactNode, displayName?: string): ComponentType;
```

- `factory`: A function that receives a `Ref` object and returns a `ReactNode`. The `Ref` object can be used to access the component's instance.
- `displayName` (optional): A name for the component, useful for debugging.
- **Returns**: A new React component that is reactive.

### `observable()`

A Higher-Order Component (HOC) that wraps a React component to make it reactive to changes in observable state. It automatically sets up and manages a `StateObserver` instance for the wrapped component.

```typescript
function observable<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string): ComponentType<T>;
```

- `Component`: The React component to be made observable. It should accept its original props `T` plus an internal `_state_version` prop.
- `displayName` (optional): A name for the wrapped component, useful for debugging.
- **Returns**: A new React component that is reactive to observable state changes.

::: tip Difference between `observable()` and `observe()`

Both `observable()` and `observe()` are Higher-Order Components (HOCs) that make React components reactive to Anchor's state changes. The key difference lies in their primary use case:

- **`observable(Component)`:** Use this when you have an _existing React component_ (class or functional) that you want to make reactive. It wraps your component and passes an internal `_state_version` prop to trigger re-renders.
- **`observe(factory)`:** Use this when you want to create a reactive _render function_ directly, often for inline rendering or when you don't need a separate component definition. It takes a `factory` function that returns JSX and makes that function reactive.
  :::

## Low Level APIs

These are lower-level APIs primarily intended for internal use or advanced scenarios.

### `useObserverRef()`

Provides a stable `StateObserver` instance for tracking reactive dependencies. This is a low-level hook.

```typescript
function useObserverRef(deps?: Linkable[], displayName?: string): [StateObserver, number];
```

- `deps` (optional): Dependencies that, when changed, re-establish the observer.
- `displayName` (optional): Name for debugging.
- **Returns**: A tuple `[observer, version]`.

### `useObservedRef()`

Creates a mutable ref object whose `current` property is reactive, updating automatically based on reactive state.

```typescript
function useObservedRef<T>(init: T | null, observe: (value: T | null) => T | null): RefObject<T | null>;
```

- `init`: Initial value for the ref.
- `observe`: A function that returns the new value for the ref reactively.
- **Returns**: A mutable `RefObject`.
