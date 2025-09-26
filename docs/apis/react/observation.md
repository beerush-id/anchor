# Observation APIs (React)

These React hooks and components are used for observing changes in reactive states and triggering component re-renders.

## Hook APIs

These are the primary React hooks for observing reactive state changes.

### `useObservedRef()`

Creates a reactive reference to a computed value. It automatically tracks reactive dependencies accessed within the observe function and updates the reference value when those dependencies change.

This hook is particularly useful for creating computed values that depend on multiple reactive states without manually specifying them as dependencies. The computation is automatically re-executed when any of the accessed reactive states change.

The returned ref is itself a reactive state that can be consumed by other observers or displayed in views (`observer()` or `observe()`).

```typescript
function useObservedRef<T, D extends unknown[] = []>(observe: RefInitializer<T>, deps?: D): ConstantRef<T>;
```

- `observe`: A function that computes and returns the desired value. Any reactive state accessed within this function will be automatically tracked, and the function will re-run when that state changes.
- `deps` (optional): Additional dependencies. This is useful for computation that also depends on external state such as props.
- **Returns**: A constant reference (`ConstantRef<T>`) to the computed value. The reference object remains stable, but its `.value` property updates when the computed value changes.

### `useObserver()`

A custom React hook that creates a computed value by running the provided observe function within a reactive tracking context. It automatically tracks reactive dependencies accessed within the observe function and triggers re-rendering when those dependencies change.

This hook is particularly useful for creating computed values that depend on multiple reactive states without manually specifying them as dependencies. The computation is automatically re-executed when any of the accessed reactive states change.

```typescript
function useObserver<R, D extends unknown[]>(observe: () => R, deps?: D): R;
```

- `observe`: A function that computes and returns the desired value. Any reactive state accessed within this function will be automatically tracked, and the function will re-run when that state changes.
- `deps` (optional): Additional dependencies. This is useful for computations that also depend on external state such as props. These dependencies are used to determine when the computation should be re-executed.
- **Returns**: The computed value returned by the observe function. This value is memoized and will only be recomputed when the tracked reactive dependencies or the additional dependencies change.

### `useObserved()` **`DEPRECATED`**

::: danger Deprecated Symbol

This API is deprecated and will be removed in the next major release. Use [**`useObserver`**](#useobserver) instead.

:::

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
function observe<R>(factory: (ref: RefObject<R | null>) => ReactNode, displayName?: string): ComponentType;
function observe<R>(factory: ViewRendererFactory<R>, displayName?: string): ComponentType;
```

- `factory`: A callback function that returns a `ReactNode` or a renderer factory object with lifecycle methods. This function will be executed within an observing context.
- `displayName` (optional): A string to be used as the display name for the returned component in React DevTools.
- **Returns**: A new React component that is reactive to observable state changes.

#### Factory Object Properties

When using a factory object, the following properties are supported:

- `name` (optional): A string to be used as the display name for the returned component in React DevTools.
- `render`: A function that returns a `ReactNode`. This function will be executed within an observing context.
- `onMounted` (optional): A function that is called when the component is mounted.
- `onUpdated` (optional): A function that is called when the component is updated due to reactive state changes.
- `onDestroy` (optional): A function that is called when the component is unmounted.

### `observer()`

A Higher-Order Component (HOC) that wraps a React component to make it reactive to changes in observable state. It automatically sets up and manages a `StateObserver` instance for the wrapped component.

```typescript
function observer<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string): ComponentType<T>;
```

- `Component`: The React component to be made observable. It should accept its original props `T`.
- `displayName` (optional): A string to be used as the display name for the wrapped component in React DevTools. If not provided, it will derive from the original component's display name or name.
- **Returns**: A new React component that is reactive to observable state changes.

::: tip Difference between `observer()` and `observe()`

The key difference lies in their approach and use cases:

- **`observer(Component)`:** Wraps an existing component and is best for full component re-renders, especially when working with third-party components or when you need a simple setup without selective rendering.
- **`observe(factory)`:** Creates a new component from a factory function and is best for selective rendering within the DSV pattern, where you want fine-grained control over what gets re-rendered.
  :::

### `observable()` **`DEPRECATED`**

::: danger Deprecated Symbol

This API is deprecated and will be removed in the next major release. Use [**`observer()`**](#observer) instead.

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
