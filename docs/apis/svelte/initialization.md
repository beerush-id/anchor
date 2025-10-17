# Initialization APIs (Svelte)

These Svelte functions are primarily used for creating and initializing reactive states within your components.

## Core State APIs

These are the primary APIs for creating reactive state in your Svelte components.

### `anchorRef()`

The primary function for creating and managing reactive state within Svelte components. It returns a Svelte-compatible store.

```typescript
// Basic usage
function anchorRef<T, S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): T;

// With schema
function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions
): ModelOutput<S>;

// With schema and immutable option
function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions & { immutable: true }
): Immutable<ModelOutput<S>>;
```

- `init`: The initial value for the state.
- `schema` (optional): Schema to validate and structure the state.
- `options` (optional): Configuration options for the state.
- **Returns**: A reactive state.

### `orderedRef()`

Creates a reactive state that maintains a sorted array state based on a comparison function.

```typescript
function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): T;
```

- `init`: The initial array value for the state.
- `compare`: A function that defines the sort order of elements.
- `options` (optional): Optional state options for the state.
- **Returns**: A reactive state containing the sorted array.

### `flatRef()`

Creates a reactive state that maintains a flat array state.

```typescript
function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(init: T, options?: StateOptions<S>): T;
```

- `init`: The initial array value for the state.
- `options` (optional): Optional state options for the state.
- **Returns**: A reactive state containing the flat array.

### `rawRef()`

Creates a reactive state that mutates the underlying object.

Unless you set the global options to `cloned: true`, you don't want to use this.

```typescript
function rawRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): T;
```

- `init`: The initial value for the state.
- `options` (optional): Optional state options for the state.
- **Returns**: A reactive state containing the raw value.

## Data Integrity APIs

These APIs provide schema-based validation and data integrity features for your state.

### `modelRef()`

Creates a model with mutable state.

```typescript
// Mutable model
function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): ModelOutput<S>;

// Immutable model
function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
): ImmutableOutput<S>;
```

- `schema`: The schema defining the structure and types of the model.
- `init`: The initial data for the model.
- `options` (optional): Optional configuration for the model state.
- **Returns**: A model output.

## Immutability APIs

These APIs provide immutability features for your state, ensuring controlled mutations.

### `immutableRef()`

Creates an immutable state from a state object.

```typescript
// Basic usage
function immutableRef<T extends State, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): Immutable<T>;

// With schema
function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): ImmutableOutput<S>;
```

- `init`: The initial state object.
- `schema` (optional): The linkable schema.
- `options` (optional): Optional state options.
- **Returns**: An immutable state.

### `writableRef()`

Creates a writable state from a state object.

```typescript
// Basic usage
function writableRef<T extends State>(state: T): Mutable<T>;

// With contracts
function writableRef<T extends State, K extends MutationKey<T>[]>(state: T, contracts: K): MutablePart<T, K>;
```

- `state`: The initial state object.
- `contracts` (optional): A list of mutation keys.
- **Returns**: A mutable state.

## History APIs

These APIs provide undo/redo functionality for your state.

### `historyRef()`

Creates a reactive state that reflects the history state of a given Anchor state.

```typescript
function historyRef<T extends State>(state: T, options?: HistoryOptions): HistoryState;
```

- `state`: The initial Anchor state.
- `options` (optional): Optional history options.
- **Returns**: A [HistoryState](/apis/core/types.html#historystate).

## Request APIs

These APIs provide reactive data fetching and streaming functionalities.

### `fetchRef()`

Creates a reactive state that manages the state of a fetch request.

```typescript
// GET or DELETE
function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): FetchState<R>;

// POST, PUT, PATCH
function fetchRef<R, P>(init: R, options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }): FetchState<R>;
```

- `init`: The initial value for the fetch state.
- `options`: The options for the fetch request, including the URL and method.
- **Returns**: A [FetchState](/apis/core/types.html#fetchstate).

### `streamRef()`

Creates a reactive state that manages the state of a streaming request.

```typescript
// GET or DELETE
function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): FetchState<R>;

// POST, PUT, PATCH
function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;
```

- `init`: The initial value for the fetch state.
- `options`: The options for the stream request, including the URL and method.
- **Returns**: A [FetchState](/apis/core/types.html#fetchstate).

## Reference APIs

These APIs provide utilities for working with references.

### `variableRef()`

Creates a readable reference that can be subscribed to for reactive updates.

```typescript
// Writable reference
function variableRef<T>(init: T, updater?: (value: T) => T): VariableRef<T>;

// Constant (read-only) reference
function variableRef<T>(init: T, constant: true): ConstantRef<T>;
```

- `init`: The initial value for the reference.
- `updater` (optional): Function to update the value.
- `constant` (optional): If true, the reference will be read-only.
- **Returns**: A [VariableRef](#variableref-t) or [ConstantRef](#constantref-t) containing the reactive state.

### `constantRef()`

Creates a constant (read-only) reference that can be subscribed to for reactive updates.

```typescript
function constantRef<T>(init: T): ConstantRef<T>;
```

- `init`: The initial value for the constant reference.
- **Returns**: A [ConstantRef](#constantref-t) containing the reactive state.

### `isRef()`

Checks if a given value is a writable reference.

```typescript
function isRef<T>(ref: unknown): ref is VariableRef<T>;
```

- `ref`: The value to check.
- **Returns**: True if the value is a writable reference, false otherwise.

## Type References

Before diving into the APIs, let's understand the key types used throughout these functions:

### `VariableRef<T>`

```typescript
type VariableRef<T> = ConstantRef<T> & {
  set(value: T): void;
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

### `StateRef<T>`

```typescript
type StateRef<T> = {
  value: T;
};
```

A simple reference object containing a value.

### `RefSubscriber<T>`

```typescript
type RefSubscriber<T> = (current: T) => void;
```

A function that handles updates to a reference's value.

### `RefUnsubscribe`

```typescript
type RefUnsubscribe = () => void;
```

A function that unsubscribes from reference updates.

### `HistoryState`

Represents the state of history tracking for undo/redo functionality.

### `FetchState`

Represents the state of a fetch request, including loading, data, and error states.
