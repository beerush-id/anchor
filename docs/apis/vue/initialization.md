# Initialization APIs (Vue)

These Vue composables are primarily used for creating and initializing reactive states within your components.

### `anchorRef()`

Creates a reactive Anchor state that can be used in Vue components. It returns a Vue `Ref` containing the Anchor state.

```typescript
// Basic usage
type anchorRef = <T extends Linkable>(init: T, options?: StateOptions) => Ref<T>;

// With schema
type anchorRef = <S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
) => Ref<ModelOutput<S>>;

// Immutable with schema
type anchorRef = <S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
) => Ref<ImmutableOutput<T>>;
```

- `init`: The initial value for the Anchor state.
- `schema` (optional): A Zod schema for validation.
- `options` (optional): Configuration options for the state.
- **Returns**: A Vue `Ref` containing the Anchor state.

## `flatRef()`

Creates a reactive array that only reacts to changes in the array itself (not its nested properties). This is a Vue wrapper around `anchor.flat` that returns a `Ref`.

```typescript
type flatRef = <T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => Ref<T>;
```

- `init`: Initial array value.
- `options` (optional): Configuration options.
- **Returns**: A Vue `Ref` containing the flat reactive array.

## `rawRef()`

Creates a reactive object that mutates the original object directly (without cloning). This is a Vue wrapper around `anchor.raw` that returns a `Ref`.

```typescript
type rawRef = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => Ref<T>;
```

- `init`: Initial object value.
- `options` (optional): Configuration options.
- **Returns**: A Vue `Ref` containing the raw reactive object.

## `immutableRef()`

Creates an immutable reactive state from the provided initial value. This integrates with Vue's reactivity system to provide a type-safe immutable state.

```typescript
type immutableRef = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
) => Ref<Immutable<T>>;
```

- `init`: The initial value to create an immutable state from.
- `options` (optional): Anchor options to configure the immutable state.
- **Returns**: A Vue `Ref` containing the immutable state.

## `writableRef()`

Creates a writable version of a readonly state. This is a Vue wrapper around `anchor.writable` that returns a `Ref`.

```typescript
type writableRef = <T extends Linkable>(state: T) => Ref<T>;
```

- `state`: The readonly state to make writable.
- **Returns**: A Vue `Ref` containing the writable state.

## `modelRef()`

Creates a reactive reference to a model state that can be used in Vue components. This wraps the Anchor model with Vue's reactivity system.

```typescript
// Basic model
type modelRef = <S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) => Ref<ModelOutput<S>>;

// Immutable model
type modelRef = <S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
) => Ref<ImmutableOutput<S>>;
```

- `schema`: The schema definition for the model.
- `init`: The initial state value for the model.
- `options` (optional): Configuration for the Anchor model.
- **Returns**: A Vue `Ref` containing the model state.
