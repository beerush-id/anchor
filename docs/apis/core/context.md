# Context APIs

The Context APIs provide a dependency injection mechanism, allowing you to share data throughout your application without prop drilling. A context is a reactive `Map` that can be used to store and retrieve values by key.

## Core Context Functions

These functions form the core of Anchor's context system, allowing you to create and work with contexts.

### `createContext()`

Creates a new, empty context.

```typescript
type createContext = <K extends KeyLike, V>(init?: [K, V][]) => Map<K, V>;
```

- `init` (optional): An array of key-value pairs to initialize the context with. See [KeyLike](types.md#keylike).
- **Returns**: A new `Map` instance that serves as the context.

### `withinContext()`

Executes a function within a specific context. Any calls to [getContext()](#getcontext) or [setContext()](#setcontext) inside this function will read from or write to the provided context.

```typescript
type withinContext = <K extends KeyLike, V, T>(context: Map<K, V>, fn: () => T) => T;
```

- `context`: The context to activate for the duration of the function call.
- `fn`: The function to execute.
- **Returns**: The return value of the executed function.

### `getContext()`

Retrieves a value from the currently active context.

```typescript
type getContext = <V, K extends KeyLike = KeyLike>(key: K) => V | undefined;
```

- `key`: The key of the value to retrieve. See [KeyLike](types.md#keylike).
- **Returns**: The value associated with the key, or `undefined` if the key is not found or if no context is active.

### `setContext()`

Sets a value in the currently active context.

```typescript
type setContext = <V, K extends KeyLike = KeyLike>(key: K, value: V) => void;
```

- `key`: The key for the value being set. See [KeyLike](types.md#keylike).
- `value`: The value to set.

## Context Management Functions

These functions provide manual control over the active context. In most cases, [withinContext()](#withincontext) is preferred.

### `activateContext()`

Manually activates a context.

```typescript
type activateContext = <K extends KeyLike, V>(context: Context<K, V>) => () => void;
```

- `context`: The context to make active. See [Context](types.md#context-k-v).
- **Returns**: A `restore` function that, when called, deactivates the context and restores the previously active one.

### `getActiveContext()`

Gets the currently active context.

```typescript
type getActiveContext = () => Context<KeyLike, unknown> | undefined;
```

- **Returns**: The active [Context](types.md#context-k-v) map, or `undefined`.

## Global Context Functions

Anchor can maintain a single global context, which is useful in browser environments.

### `activateGlobalContext()`

Creates and activates a new context that is globally available. Does nothing if a global context is already active or if run outside a browser.

```typescript
type activateGlobalContext = () => void;
```

### `deactivateGlobalContext()`

Deactivates and clears the global context.

```typescript
type deactivateGlobalContext = () => void;
```
