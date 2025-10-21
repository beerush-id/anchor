# Initialization APIs (React)

These React hooks are primarily used for creating and initializing reactive states or stable references within your components.

## Lifecycle APIs

These APIs provide component lifecycle management capabilities, allowing you to handle component mounting, cleanup, and side effects within your components.

### `setup()`

A Higher-Order Component (HOC) that wraps a React component to provide lifecycle management capabilities. It creates a component with built-in mount and cleanup handling, making it suitable for components that need to manage resources or side effects.

The wrapped component will have access to lifecycle hooks like [`onMount()`](#onmount) and [`onCleanup()`](#oncleanup), and can register effects with [`effect()`](#effect).

```typescript
function setup<C>(Component: C, displayName?: string): C;
```

- `Component`: The React component to be wrapped with lifecycle management.
- `displayName` (optional): A string to be used as the display name for the wrapped component in React DevTools. If not provided, it will derive from the original component's display name or name.
- **Returns**: A new React component with lifecycle management capabilities.

### `view()`

A higher-order component (HOC) that creates a React component which automatically re-renders when any observable state accessed within the provided `factory` callback changes. It uses an internal `StateObserver` to track dependencies and trigger updates.

```typescript
function view<P>(factory: ViewRenderer<P> | ViewRendererFactory<P>, displayName?: string): FunctionComponent<P>;
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

### `effect()`

Registers an effect handler function that will be executed during the component's lifecycle.

Effects are used for side effects that need to be cleaned up, such as subscriptions or timers. They are executed after the component is mounted and will re-run when any state accessed within the effect handler changes. Effects can optionally return a cleanup function which will be executed before the effect runs again or when the component is unmounted.

Note: Effects should typically not mutate state that they also observe, as this can lead to circular updates and infinite loops.

```typescript
function effect(fn: EffectHandler): void;
```

- `fn`: The effect handler function to register
- **Throws**: {Error} If called outside of a Setup component context

### `onMount()`

Registers a mount handler function that will be executed when the component is mounted.

Mount handlers are executed when the component is being set up and can optionally return a cleanup function that will be called when the component is unmounted.

```typescript
function onMount(fn: MountHandler): void;
```

- `fn`: The mount handler function to register
- **Throws**: {Error} If called outside of a Setup component context

### `onCleanup()`

Registers a cleanup handler function that will be executed when the component is cleaned up.

Cleanup handlers are executed when the component is being torn down, typically to clean up resources like event listeners, timers, or subscriptions.

```typescript
function onCleanup(fn: CleanupHandler): void;
```

- `fn`: The cleanup handler function to register
- **Throws**: {Error} If called outside of a Setup component context

### `named()`

A utility function that assigns a display name to a React functional component. This is primarily used for debugging purposes in React DevTools to provide a meaningful name for components that might otherwise appear as "Anonymous" components.

```typescript
function named<P>(Component: FunctionComponent<P>, name: string): FunctionComponent<P>;
```

- `Component`: The React functional component to be named.
- `name`: The display name to assign to the component.
- **Returns**: The same component with the assigned display name.

## Core State APIs

These are the primary APIs for creating reactive state in your React components.

### `useAnchor()`

The primary hook for creating and managing reactive state within React components. It returns a tuple containing the reactive state and a setter function.

```typescript
// Basic usage
function useAnchor<T, S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): AnchorState<T>;

// With schema
function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>>;

// With schema and immutable option
function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): AnchorState<ImmutableOutput<T>>;
```

- `init`: The initial value for the state.
- `schema` (optional): Schema to validate and structure the state.
- `options` (optional): Configuration options for the state.
- **Returns**: A tuple `[state, stateRef, setState]` where `state` is the reactive object, `stateRef` is a reference to the state, and `setState` is a function to update it. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

### `useConstant()`

Creates a constant reference that never changes its value or only updates when dependencies change.

```typescript
// Basic usage
function useConstant<T>(init: T): [ConstantRef<T>];

// With dependencies
function useConstant<T>(init: RefInitializer<T>, deps: unknown[]): [ConstantRef<T>];
```

- `init`: The initial value or initializer function.
- `deps` (optional): Dependency array that determines when the constant should be recalculated.
- **Returns**: A tuple containing the constant reference. See [ConstantState&lt;T&gt;](#constantstate-t) for more information.

### `useVariable()`

Creates a reactive variable with update capabilities.

```typescript
// Basic usage
function useVariable<T>(init: T): [VariableRef<T>, RefUpdater<T>];

// As constant
function useVariable<T>(init: T, constant: true): [ConstantRef<T>];

// With dependencies
function useVariable<T>(init: RefInitializer<T>, deps: unknown[]): [VariableRef<T>, RefUpdater<T>];

// With dependencies as constant
function useVariable<T>(init: RefInitializer<T>, deps: unknown[], constant: true): [ConstantRef<T>];
```

- `init`: Initial value or initializer function.
- `deps` (optional): Dependencies that trigger updates.
- `constant` (optional): Whether to treat as constant.
- **Returns**: A tuple with either `[variableRef, updater]` or `[constantRef]`. See [VariableRef&lt;T&gt;](#variableref-t) and [RefUpdater&lt;T&gt;](#refupdater-t) for more information.

## Data Integrity APIs

These APIs provide schema-based validation and data integrity features for your state.

### `useModel()`

Creates a reactive model based on the provided schema and initial data.

```typescript
// Mutable model
function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>>;

// Immutable model
function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions & { immutable: true }
): AnchorState<ImmutableOutput<S>>;
```

- `schema`: The schema defining the structure and types of the model.
- `init`: The initial data for the model.
- `options` (optional): Optional configuration for the model state.
- **Returns**: An AnchorState object containing the model output. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

### `useImmutableModel()`

Creates an immutable reactive model based on the provided schema and initial data.

```typescript
function useImmutableModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ImmutableOutput<S>>;
```

- `schema`: The schema defining the structure and types of the model.
- `init`: The initial data for the model.
- `options` (optional): Optional configuration for the model state.
- **Returns**: An AnchorState object containing the immutable model output. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

## Immutability APIs

These APIs provide immutability features for your state, ensuring controlled mutations.

### `useImmutable()`

A React hook that creates an immutable state from a linkable object or model input.

```typescript
// Basic usage
function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<Immutable<T>>;

// With schema
function useImmutable<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateBaseOptions
): AnchorState<ImmutableOutput<T>>;
```

- `init`: The initial linkable object to make immutable.
- `schema` (optional): Schema to apply to the model input.
- `options` (optional): Optional anchor configuration options.
- **Returns**: An anchor state containing the immutable version of the input object. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

### `useWriter()`

A React hook that creates a mutable version of an immutable state.

```typescript
// Basic usage
function useWriter<T extends Linkable>(state: T): Mutable<T>;

// With contracts
function useWriter<T extends Linkable, K extends MutationKey<T>[]>(state: T, contracts: K): MutablePart<T, K>;
```

- `state`: The immutable state to make mutable.
- `contracts` (optional): Mutation key contracts that define allowed mutations.
- **Returns**: A mutable version of the input state.

## Array APIs

These APIs provide specialized state management for array-based data.

### `useOrderedList()`

Creates a reactive ordered list state using Anchor's state management.

```typescript
function useOrderedList<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): AnchorState<T>;
```

- `init`: The initial array state.
- `compare`: A comparison function that defines the sort order.
- `options` (optional): Optional state configuration options.
- **Returns**: A reactive state object with methods to interact with the ordered list. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

### `useFlatList()`

Creates a reactive flat list state using Anchor's state management.

```typescript
function useFlatList<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T>;
```

- `init`: The initial array state.
- `options` (optional): Optional state configuration options.
- **Returns**: A reactive state object with methods to interact with the flat list. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

## History APIs

These APIs provide undo/redo functionality for your state.

### `useHistory()`

Provides history management (undo/redo) for a given reactive state.

```typescript
function useHistory<T extends State>(state: T, options?: HistoryOptions): HistoryState;
```

- `state`: The reactive state to track history for.
- `options` (optional): History configuration options.
- **Returns**: The `HistoryState` object.

## Request APIs

These APIs provide reactive data fetching and streaming functionalities.

### `useFetch()`

Provides reactive data fetching functionality, managing the state of an HTTP request.

```typescript
// GET or DELETE
function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'GET' | 'DELETE' }
): AnchorState<FetchState<R>>;

// POST, PUT, PATCH
function useFetch<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): AnchorState<FetchState<R>>;

// General
function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S>
): AnchorState<FetchState<R>>;
```

- `init`: Initial data value.
- `options`: Fetch configuration options.
- **Returns**: A `FetchState` object. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

### `useStream()`

Provides reactive streaming data fetch functionality, updating incrementally as chunks are received.

```typescript
// GET or DELETE
function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'GET' | 'DELETE' }
): AnchorState<FetchState<S>>;

// POST, PUT, PATCH
function useStream<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): AnchorState<FetchState<S>>;

// General
function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S>
): AnchorState<FetchState<R>>;
```

- `init`: Initial data value.
- `options`: Stream configuration options.
- **Returns**: A `FetchState` object. See [AnchorState&lt;T&gt;](#anchorstate-t) for more information.

## Type References

Before diving into the APIs, let's understand the key types used throughout these hooks:

### `AnchorState<T>`

```typescript
type AnchorState<T> = [T, VariableRef<T>, RefUpdater<T>];
```

A tuple containing:

- `T`: The reactive state value
- `VariableRef<T>`: A reference object to the state
- `RefUpdater<T>`: A function to update the state

### `ConstantState<T>`

```typescript
type ConstantState<T> = [T, ConstantRef<T>];
```

A tuple containing:

- `T`: The constant state value
- `ConstantRef<T>`: A reference object to the constant state

### `VariableRef<T>`

```typescript
type VariableRef<T> = {
  get value(): T;
  set value(value: T);
};
```

A reference object that allows getting and setting the value.

### `ConstantRef<T>`

```typescript
type ConstantRef<T> = {
  get value(): T;
};
```

A reference object that only allows getting the value.

### `RefUpdater<T>`

```typescript
type RefUpdater<T> = (value: T) => void;
```

A function that updates the referenced value.
