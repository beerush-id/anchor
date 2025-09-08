# In-Memory Storage APIs

## `MemoryStorage`

A lower-level, in-memory key-value store that can be used for creating custom storage solutions.

```typescript
interface MemoryStorage<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly length: number;
  readonly keys: (keyof T)[];

  get(key: keyof T): T[keyof T] | undefined;
  set(key: keyof T, value: T[keyof T]): void;
  delete(key: keyof T): void;
  assign(data: Record<string, unknown>): void;
  clear(): void;

  subscribe(callback: StorageSubscriber): () => void;
  publish(event: StorageEvent): void;

  json(space?: string | number, replacer?: (key: string, value: unknown) => unknown): string;
}
```

### `new MemoryStorage()`

Creates a new `MemoryStorage` instance.

```typescript
interface MemoryStorageConstructor {
  new <T extends Record<string, unknown>>(init?: T): MemoryStorage<T>;
}
```

- `init` (optional): Initial data to populate the storage.

### `MemoryStorage.length`

Gets the number of items in the storage.

```typescript
interface MemoryStorage<T> {
  readonly length: number;
}
```

- **Returns**: The number of stored items.

### `MemoryStorage.keys`

Gets all the keys in the storage.

```typescript
interface MemoryStorage<T> {
  readonly keys: (keyof T)[];
}
```

- **Returns**: An array of all storage keys.

### `MemoryStorage.get()`

Gets a value from storage by key.

```typescript
interface MemoryStorage<T> {
  get(key: keyof T): T[keyof T] | undefined;
}
```

- `key`: The key to retrieve.
- **Returns**: The stored value or `undefined` if not found.

### `MemoryStorage.set()`

Sets a value in storage by key.

```typescript
interface MemoryStorage<T> {
  set(key: keyof T, value: T[keyof T]): void;
}
```

- `key`: The key to set.
- `value`: The value to store.

### `MemoryStorage.delete()`

Deletes a value from storage by key.

```typescript
interface MemoryStorage<T> {
  delete(key: keyof T): void;
}
```

- `key`: The key to delete.

### `MemoryStorage.assign()`

Assigns multiple values to the storage.

```typescript
interface MemoryStorage<T> {
  assign(data: Record<string, unknown>): void;
}
```

- `data`: The data to merge into storage.

### `MemoryStorage.clear()`

Clears all values from the storage.

```typescript
interface MemoryStorage<T> {
  clear(): void;
}
```

### `MemoryStorage.subscribe()`

Subscribes to storage events.

```typescript
interface MemoryStorage<T> {
  subscribe(callback: StorageSubscriber): () => void;
}
```

- `callback`: The function to call when storage events occur.
- **Returns**: A function to unsubscribe from events.

### `MemoryStorage.publish()`

Publishes a storage event to all subscribers.

```typescript
interface MemoryStorage<T> {
  publish(event: StorageEvent): void;
}
```

- `event`: The event to publish.

### `MemoryStorage.json()`

Converts the storage to a JSON string.

```typescript
interface MemoryStorage<T> {
  json(space?: string | number, replacer?: (key: string, value: unknown) => unknown): string;
}
```

- `space` (optional): Adds indentation, white space, and line break characters to the return-value JSON text.
- `replacer` (optional): A function that alters the behavior of the stringification process.
- **Returns**: A JSON string representation of the storage.
