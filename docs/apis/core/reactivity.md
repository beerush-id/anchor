# Reactivity APIs

The Reactivity APIs are the foundation of Anchor, allowing you to create and manage state that automatically tracking dependencies and notifying observers of changes.

## Core Functions

### `mutable()`

Creates a mutable reactive state. It can wrap both primitive values and linkable objects (Arrays, Objects, Maps, Sets).

```typescript
// For Objects/Arrays/Maps/Sets
export function mutable<T extends Linkable>(init: T, options?: StateOptions): T;

// For Primitives
export function mutable<T>(init: T): MutableRef<T>;
```

- `init`: The initial value.
- `options` (optional): Configuration options. See [StateOptions](types.md#stateoptions).
- **Returns**: A reactive state (proxy) for objects, or a `MutableRef` for primitives.

#### Primitive Usage (Ref)

```typescript
const count = mutable(0);
console.log(count.value); // 0
count.value++;
```

### `immutable()`

Creates an immutable reactive state. The returned state is deeply readonly.

```typescript
// For Objects/Arrays/Maps/Sets
export function immutable<T extends Linkable>(init: T, options?: StateOptions): Immutable<T>;

// For Primitives
export function immutable<T extends Primitive>(init: T): ImmutableRef<T>;
```

- `init`: The initial value.
- `options` (optional): Configuration options.
- **Returns**: A readonly reactive state or `ImmutableRef`.

### `derived()`

Creates a derived state that automatically updates when its dependencies change.

```typescript
export function derived<T>(derive: () => T): DerivedRef<T>;
```

- `derive`: A function that computes the value.
- **Returns**: A `DerivedRef` whose `.value` is the result of the computation.

### `writable()`

Creates a writable interface for an immutable state (or restricts a mutable one). This facilitates controlled mutations by optionally allowing only specific properties or methods to be modified.

```typescript
export function writable<T extends Linkable, K extends MutationKey<T>[]>(
  state: T,
  contracts?: K
): MutablePart<T, K>;
```

- `state`: The state object to create a writable proxy for.
- `contracts` (optional): An array of property names or method names that are allowed to be mutated/called.
- **Returns**: A proxy that allows mutations only on the specified contract keys. If no contract is provided, it returns a fully mutable proxy.

## Effect & Tracking

### `effect()`

Creates a reactive side-effect that runs immediately and re-runs whenever its dependencies change.

```typescript
export function effect<T>(fn: EffectHandler<T>, displayName?: string): StateUnsubscribe;
```

- `fn`: The effect function to execute.
- `displayName` (optional): Name for debugging purposes.
- **Returns**: A cleanup function to stop the effect.

### `untrack()`

Executes a function without tracking dependencies. Useful for reading state inside an effect without triggering re-runs.

```typescript
export function untrack<R>(fn: () => R): R;
```

- `fn`: The function to execute.
- **Returns**: The result of `fn`.

## Error Handling

### `exception()`

Registers an error handler for a specific state. This handler will capture any validation errors or exceptions related to that state.

```typescript
export function exception<T>(state: T, handler?: (error: Error) => void): ExceptionMap;
```

- `state`: The state object to attach the exception handler to.
- `handler` (optional): A callback function that receives the error. If omitted, it returns an `ExceptionMap` containing reactive errors.
- **Returns**: If a handler is provided, it returns an unsubscribe function. If no handler is provided, it returns an `ExceptionMap` object.
