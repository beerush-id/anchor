# Anchor Namespace

The `anchor` function is the low-level core of the library. While most users should prefer `mutable()` or `immutable()`, `anchor` provides advanced configuration options and a namespace for powerful utility functions.

## `anchor()`

Creates a reactive proxy for a given value.

```typescript
export function anchor<T>(init: T, options?: StateOptions): State<T>;
```

- `init`: The initial value to make reactive.
- `options`: Configuration options (recursive, immutable, etc.).

## Creation Utilities

### `anchor.raw()`

Creates a reactive state without cloning the initial value. This modifies the original object in place.

```typescript
anchor.raw<T>(init: T, options?: StateOptions): State<T>;
```

### `anchor.flat()`

Creates a "flat" reactive state. Only top-level properties are tracked; nested objects remain non-reactive.

```typescript
anchor.flat<T>(init: T, options?: StateOptions): State<T>;
```

### `anchor.ordered()`

Creates a reactive array that maintains a sorted order.

```typescript
anchor.ordered<T>(init: T[], compare: (a: T, b: T) => number): State<T[]>;
```

### `anchor.model()`

Creates a state validated by a schema (e.g., Zod).

```typescript
anchor.model<S extends LinkableSchema>(
  schema: S,
  init: ModelInput<S>,
  options?: StateOptions
): ModelOutput<S>;
```

### `anchor.catch()`

Registers an exception handler for a state.

```typescript
anchor.catch<T>(state: T, handler: (error: Error) => void): void;
```

## State Utilities

### `anchor.has()`

Checks if an object is a reactive state managed by Anchor.

```typescript
anchor.has(value: unknown): boolean;
```

### `anchor.get()`

Retrieves the underlying raw value of a state.

```typescript
anchor.get<T>(state: T, silent?: boolean): T;
```

- `silent`: If `true`, accessing the value won't trigger dependency tracking (equivalent to `untrack`).

### `anchor.find()`

Finds the existing reactive proxy for a given raw object, if one exists.

```typescript
anchor.find<T>(init: T): State<T> | undefined;
```

### `anchor.read()`

Creates a readonly proxy for an existing state. This is a shallow readonly view, unlike `immutable()` which is deeply immutable.

```typescript
anchor.read<T>(state: T): ReadonlyState<T>;
```

### `anchor.snapshot()`

Creates a deep clone (snapshot) of the state's current value.

```typescript
anchor.snapshot<T>(state: T): T;
```

### `anchor.destroy()`

Destroys a state and all its associated subscriptions and observers.

```typescript
anchor.destroy(state: Linkable): void;
```

## Mutation Utilities

### `anchor.writable()`

Creates a writable interface for a state (usually an immutable one), optionally restricted by contracts.

```typescript
anchor.writable<T>(state: T, contracts?: Contracts<T>): Writable<T>;
```

### `anchor.assign()`

Object.assign equivalent for reactive states.

```typescript
anchor.assign<T>(state: T, partial: Partial<T>): T;
```

### `anchor.remove()`

Removes properties from a state object.

```typescript
anchor.remove<T>(state: T, ...keys: (keyof T)[]): void;
```

### `anchor.clear()`

Clears the state. Supports objects, arrays, Maps, and Sets.

```typescript
anchor.clear<T>(state: T): void;
```

### `anchor.append()`

Appends a string to an existing string property.

```typescript
anchor.append<T, K extends keyof T>(state: T, prop: K, value: T[K]): void;
```

### `anchor.prepend()`

Prepends a string to an existing string property.

```typescript
anchor.prepend<T, K extends keyof T>(state: T, prop: K, value: T[K]): void;
```
