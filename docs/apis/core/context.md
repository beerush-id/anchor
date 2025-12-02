# Context APIs

The Context APIs provide a dependency injection mechanism, allowing you to share data throughout your application without prop drilling. A context is a reactive `Map` that can be used to store and retrieve values by key.

## Core Context Functions

These functions form the core of Anchor's context system, allowing you to create and work with contexts.

### `createContext()`

Creates a new, empty context.

```typescript
export function createContext<K extends KeyLike, V>(init?: [K, V][])
```

- `init` (optional): An array of key-value pairs to initialize the context with. See [KeyLike](types.md#keylike).
- **Returns**: A new `Map` instance that serves as the context.

### `withContext()`

Executes a function within a specific context. Any calls to [getContext()](#getcontext) or [setContext()](#setcontext) inside this function will read from or write to the provided context.

```typescript
export function withContext<R>(ctx: Context<KeyLike, unknown>, fn: () => R): R
```

- `ctx`: The context to activate for the duration of the function call.
- `fn`: The function to execute.
- **Returns**: The return value of the executed function.

### `getContext()`

Retrieves a value from the currently active context.

```typescript
export function getContext<V, K extends KeyLike = KeyLike>(key: K, fallback?: V): V | undefined
```

- `key`: The key of the value to retrieve. See [KeyLike](types.md#keylike).
- `fallback` (optional): A fallback value to return if the key is not found.
- **Returns**: The value associated with the key, or `undefined` if the key is not found or if no context is active.

### `setContext()`

Sets a value in the currently active context.

```typescript
export function setContext<V, K extends KeyLike = KeyLike>(key: K, value: V): void
```

- `key`: The key for the value being set. See [KeyLike](types.md#keylike).
- `value`: The value to set.