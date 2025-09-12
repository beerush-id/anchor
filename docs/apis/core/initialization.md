# Core APIs

The Core API is the heart of Anchor, providing the primary `anchor` function to create and manage reactive states.

## `anchor()`

The `anchor()` function is the main entry point for creating a reactive state. It takes an initial value and an optional configuration object.

### Overloads

1.  **Basic Usage**: Creates a standard reactive state. It deeply wraps the initial object, making all its properties reactive.

    ```typescript
    type anchor = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
      init: T,
      options?: StateOptions<S>
    ) => State<T>;
    ```

    - `init`: The initial state value (e.g., an object or array).
    - `options` (optional): Configuration for the state. See [StateOptions](types.md#stateoptions) for more details.

2.  **With Schema**: Creates a reactive state that is validated against a Zod schema.

    ```typescript
    type anchor = <S extends LinkableSchema, T extends ModelInput<S>>(
      init: T,
      schema: S,
      options?: StateBaseOptions
    ) => ModelOutput<S>;
    ```

    - `init`: The initial state value.
    - `schema`: A Zod schema (`ZodObject` or `ZodArray`) for validation.
    - `options` (optional): Basic configuration for the state. See [StateBaseOptions](types.md#statebaseoptions).

3.  **Immutable with Schema**: Creates an immutable, schema-validated reactive state.

    ```typescript
    type anchor = <S extends LinkableSchema, T extends ModelInput<S>>(
      init: T,
      schema: S,
      options?: StateBaseOptions & { immutable: true }
    ) => ImmutableOutput<S>;
    ```

    - This overload is triggered when the `immutable: true` option is provided along with a schema. The returned state is deeply readonly.

## Initializer Methods

These methods are attached to the `anchor` function and provide alternative ways to create a state with specific characteristics.

### `anchor.raw()`

Creates a reactive state without cloning the initial value. This is useful for performance-critical scenarios where the original object can be safely mutated.

```typescript
type raw = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => State<T>;
```

- `init`: The initial state value. The object passed here will be directly wrapped in a proxy.
- `options` (optional): State configuration options. See [StateOptions](types.md#stateoptions).

### `anchor.flat()`

Creates a "flat" reactive state that only tracks top-level property changes. Nested objects and arrays will not be reactive.

```typescript
type flat = <T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => State<T>;
```

- `init`: The initial array state.
- `options` (optional): State configuration options. See [StateOptions](types.md#statebaseoptions).

### `anchor.ordered()`

Creates a reactive array that automatically maintains its sort order based on the provided comparison function.

```typescript
type ordered = <T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
) => State<T>;
```

- `init`: The initial array state.
- `compare`: A function that defines the sort order, following the same contract as `Array.prototype.sort()`.
- `options` (optional): State configuration options. See [StateOptions](types.md#stateoptions).

### `anchor.model()`

A convenience method for creating a schema-validated state. It is an alias for `anchor(init, schema, options)`.

```typescript
// Standard model
type model = <S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) => ModelOutput<S>;

// Immutable model
type model = <S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions & { immutable: true }
) => Immutable<ModelOutput<S>>;
```

- `schema`: The Zod schema for validation. See [LinkableSchema](types.md#linkableschema).
- `init`: The initial state value.
- `options` (optional): State configuration options. See [StateBaseOptions](types.md#statebaseoptions). If `immutable: true` is passed, the resulting state is readonly.

### `anchor.immutable()`

Creates a deeply readonly reactive state. Any attempts to mutate the state will result in an error.

```typescript
// Basic immutable
type immutable = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => Immutable<T>;

// Immutable with schema
type immutable = <S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
) => ImmutableOutput<S>;
```

- `init`: The initial state value.
- `options` (optional): State configuration options. See [StateOptions](types.md#stateoptions).
- `schema` (optional): A Zod schema for validation. See [LinkableSchema](types.md#linkableschema).

### `anchor.writable()`

Creates a new gateway that allows writing to an immutable state's underlying object. This does not modify the original immutable state, but instead provides a mutable interface to the same underlying data.

```typescript
// Make fully writable
type writable = <T extends ReadonlyLink>(state: T) => Mutable<T>;

// Make partially writable
type writable = <T extends ReadonlyLink, K extends MutationKey<T>[]>(init: T, contracts?: K) => MutablePart<T, K>;
```

- `state` / `init`: The readonly state to create a writable gateway for. See [ReadonlyLink](types.md#readonlylink) and [Mutable](types.md#mutable-t).
- `contracts` (optional): An array of keys or methods that should be made writable, while leaving the rest of the object immutable. See [MutationKey](types.md#mutationkey-t) and [MutablePart](types.md#mutablepart-t-k).
- **Returns**: A mutable gateway to the underlying object.

## Accessibility Methods

These methods provide ways to interact with and manage existing reactive states.

### `anchor.has()`

Checks if a given object is a reactive state managed by Anchor.

```typescript
type has = <T extends State>(state: T) => boolean;
```

- `state`: The object to check. See [State](types.md#state-t).
- **Returns**: `true` if the object is a reactive state, otherwise `false`.

### `anchor.get()`

Retrieves the underlying, raw value of a reactive state. This is useful for when you need to pass the state to a non-reactive context.

```typescript
type get = <T extends Linkable>(state: State<T>) => T;
```

- `state`: The reactive state. See [State](types.md#state-t).
- **Returns**: The raw, non-reactive state value.

### `anchor.find()`

Finds and returns a reactive state instance that corresponds to a given raw object.

```typescript
type find = <T extends Linkable>(init: T) => T;
```

- `init`: The original, raw object used to create the state. See [Linkable](types.md#linkable).
- **Returns**: The reactive state instance if found, otherwise the original object.

### `anchor.read()`

Creates a deeply readonly version of a reactive state. This is useful for exposing state to consumers that should not be able to mutate it.

```typescript
type read = <T extends State>(state: T) => Immutable<T>;
```

- `state`: The reactive state to make readonly. See [State](types.md#state-t).
- **Returns**: A readonly, immutable proxy of the state. See [Immutable](types.md#immutable-t).

### `anchor.catch()`

Registers an exception handler to catch errors that occur during state mutations, such as validation failures.

```typescript
type catchFn = <T extends State>(state: T, handler: StateExceptionHandler) => StateUnsubscribe;
```

- `state`: The reactive state to monitor. See [State](types.md#state-t).
- `handler`: A function to be called with the exception details. See [StateExceptionHandler](types.md#stateexceptionhandler).
- **Returns**: An `unsubscribe` function to remove the handler. See [StateUnsubscribe](types.md#stateunsubscribe).

When called with a state and no handler function, it returns a reactive map of validation errors:

```typescript
type catchFn = <T extends State>(
  state: T
) => State<{ errors: Record<string, { error: Error; message: string }>; destroy: () => void }>;
```

### `anchor.configure()`

Sets global configuration options for Anchor.

```typescript
type configure = (config: Partial<AnchorSettings>) => void;
```

- `config`: An object with the configuration settings to change. See [AnchorSettings](types.md#anchorsettings).

### `anchor.configs()`

Retrieves the current global Anchor configuration.

```typescript
type configs = () => AnchorSettings;
```

- **Returns**: The current [AnchorSettings](types.md#anchorsettings) object.

### `anchor.snapshot()`

Creates a "snapshot" or a deep clone of the state's current value.

```typescript
type snapshot = <T extends Linkable>(state: State<T>) => T;
```

- `state`: The reactive state. See [State](types.md#state-t).
- **Returns**: A deep clone of the current state value.

## Utility Methods

These are helper functions for common state manipulation tasks.

### `anchor.assign()`

Performs a bulk update on a reactive object, map, or array.

```typescript
// For Maps
type assign = <T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>) => void;

// For Arrays
type assign = <T extends unknown[]>(
  target: T,
  source: { [key: string]: T[number] } | Record<string, T[number]>
) => void;

// For Objects
type assign = <T extends object>(target: T, source: Partial<T>) => void;
```

- `target`: The reactive state to update.
- `source`: An object containing the new values to assign.

### `anchor.remove()`

Removes one or more keys from a reactive object, map, or array.

```typescript
// For Maps
type remove = <T, K>(target: Map<T, K>, ...keys: Array<T>) => void;

// For Arrays
type remove = <T extends unknown[]>(target: T, ...keys: Array<string>) => void;

// For Objects
type remove = <T extends object>(target: T, ...keys: Array<keyof T>) => void;
```

- `target`: The reactive state to update.
- `keys`: A list of keys to remove from the state.

### `anchor.clear()`

Clears all entries from a reactive object, map, or array.

```typescript
type clear = <T>(target: T) => void;
```

- `target`: The reactive state to clear.

### `anchor.destroy()`

Completely destroys a reactive state and cleans up all its associated subscribers and observers.

```typescript
type destroy = <T extends State>(state: T) => void;
```

- `state`: The reactive state to destroy. See [State](types.md#state-t).
