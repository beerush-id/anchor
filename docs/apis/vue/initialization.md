# Initialization APIs (Vue)

These Vue composables are primarily used for creating and initializing reactive states or stable references within your components.

## Core State APIs

These are the primary APIs for creating reactive state in your Vue components.

### `anchorRef()`

The primary function for creating and managing reactive state within Vue components. It returns a ref containing the reactive state.

```typescript
// Basic usage
function anchorRef<T extends Linkable>(init: T, options?: StateOptions): VariableRef<T>;

// With schema
function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): VariableRef<ModelOutput<S>>;

// With schema and immutable option
function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): VariableRef<ImmutableOutput<T>>;
```

- `init`: The initial value for the state.
- `schema` (optional): Schema to validate and structure the state.
- `options` (optional): Configuration options for the state.
- **Returns**: A ref containing the reactive object. See [VariableRef&lt;T&gt;](#variableref-t) for more information.

### `flatRef()`

Creates a reactive array that only reacts to changes in the array.

```typescript
function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T>;
```

- `init`: Initial array value.
- `options` (optional): Configuration options.
- **Returns**: A ref containing the flat reactive array.

### `orderedRef()`

Creates a reactive array that maintains a sorted order based on a comparison function.

```typescript
function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): VariableRef<T>;
```

- `init`: Initial array value.
- `compare`: Comparison function to determine the order of elements.
- `options` (optional): Configuration options.
- **Returns**: A ref containing the ordered reactive array.

### `rawRef()`

Creates a reactive object that mutates the original object.

```typescript
function rawRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T>;
```

- `init`: Initial object value.
- `options` (optional): Configuration options.
- **Returns**: A ref containing the raw reactive object.

## Data Integrity APIs

These APIs provide schema-based validation and data integrity features for your state.

### `modelRef()`

Creates a reactive model based on the provided schema and initial data.

```typescript
// Mutable model
function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): VariableRef<ModelOutput<S>>;

// Immutable model
function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions & { immutable: true }
): VariableRef<ImmutableOutput<S>>;
```

- `schema`: The schema defining the structure and types of the model.
- `init`: The initial data for the model.
- `options` (optional): Optional configuration for the model state.
- **Returns**: A ref containing the model output. See [VariableRef&lt;T&gt;](#variableref-t) for more information.

## Immutability APIs

These APIs provide immutability features for your state, ensuring controlled mutations.

### `immutableRef()`

A Vue composable that creates an immutable state from a linkable object or model input.

```typescript
// Basic usage
function immutableRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<Immutable<T>>;

// With schema
function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateBaseOptions
): VariableRef<ImmutableOutput<T>>;
```

- `init`: The initial linkable object to make immutable.
- `schema` (optional): Schema to apply to the model input.
- `options` (optional): Optional anchor configuration options.
- **Returns**: A ref containing the immutable version of the input object. See [VariableRef&lt;T&gt;](#variableref-t) for more information.

### `writableRef()`

A Vue composable that creates a mutable version of an immutable state.

```typescript
// Basic usage
function writableRef<T extends Linkable>(state: T): VariableRef<Mutable<T>>;

// With contracts
function writableRef<T extends Linkable, K extends MutationKey<T>[]>(
  state: T,
  contracts: K
): VariableRef<MutablePart<T, K>>;
```

- `state`: The immutable state to make mutable.
- `contracts` (optional): Mutation key contracts that define allowed mutations.
- **Returns**: A mutable version of the input state.

## Ref APIs

These are low-level APIs for creating and managing refs directly.

### `variableRef()`

Creates a reactive variable reference that can be used in Vue components.

```typescript
// Standard variable reference
function variableRef<T>(init: T): VariableRef<T>;

// Constant (readonly) reference
function variableRef<T>(init: T, constant: true): ConstantRef<T>;
```

- `init`: The initial value for the reactive variable
- `constant`: When true, creates a constant (readonly) reference
- **Returns**: Either a [VariableRef](#variableref-t) or [ConstantRef](#constantref-t) depending on the constant parameter

### `constantRef()`

Creates a constant reactive reference that cannot be modified after creation.

```typescript
function constantRef<T>(init: T): ConstantRef<T>;
```

- `init`: The initial value for the constant reference
- **Returns**: A constant (readonly) reference to the value. See [ConstantRef&lt;T&gt;](#constantref-t) for more information.

## Request APIs

These APIs provide reactive data fetching and streaming functionalities.

### `fetchRef()`

Provides reactive data fetching functionality, managing the state of an HTTP request.

```typescript
// GET or DELETE
function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): ConstantRef<FetchState<R>>;

// POST, PUT, PATCH
function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): ConstantRef<FetchState<R>>;

// General
function fetchRef<R>(init: R, options: FetchOptions): ConstantRef<FetchState<R>>;
```

- `init`: Initial data value.
- `options`: Fetch configuration options.
- **Returns**: A ref containing the `FetchState` object. See [ConstantRef&lt;T&gt;](#constantref-t) for more information.

### `streamRef()`

Provides reactive streaming data fetch functionality, updating incrementally as chunks are received.

```typescript
// GET or DELETE
function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): ConstantRef<FetchState<R>>;

// POST, PUT, PATCH
function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): ConstantRef<FetchState<R>>;

// General
function streamRef<R>(init: R, options: StreamOptions<R>): ConstantRef<FetchState<R>>;
```

- `init`: Initial data value.
- `options`: Stream configuration options.
- **Returns**: A ref containing the `FetchState` object. See [ConstantRef&lt;T&gt;](#constantref-t) for more information.

## History APIs

These APIs provide undo/redo functionality for your state.

### `historyRef()`

Provides history management (undo/redo) for a given reactive state.

```typescript
function historyRef<T extends State>(state: T, options?: HistoryOptions): ConstantRef<HistoryState>;
```

- `state`: The reactive state to track history for.
- `options` (optional): History configuration options.
- **Returns**: A ref containing the `HistoryState` object. See [ConstantRef&lt;T&gt;](#constantref-t) for more information.

## Type References

Before diving into the APIs, let's understand the key types used throughout these composables:

### `VariableRef<T>`

```typescript
type VariableRef<T> = Ref<T, T>;
```

A ref object that allows getting and setting the value.

### `ConstantRef<T>`

```typescript
type ConstantRef<T> = Ref<T> & {
  get value(): T;
};
```

A ref object that only allows getting the value.
