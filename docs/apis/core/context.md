# Context APIs

The Context APIs provide a dependency injection mechanism.

## `createContext()`

Creates a new context map.

```typescript
export function createContext<K, V>(init?: [K, V][]): Map<K, V>;
```

## `withContext()`

Runs a function within a given context.

```typescript
export function withContext<R>(ctx: Context, fn: () => R): R;
```

## `getContext()`

Retrieves a value from the active context.

```typescript
export function getContext<V>(key: KeyLike, fallback?: V): V | undefined;
```

## `setContext()`

Sets a value in the active context.

```typescript
export function setContext<V>(key: KeyLike, value: V): void;
```