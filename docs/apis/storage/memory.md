# In-Memory Storage APIs

## `MemoryStorage` Class

A lower-level, in-memory key-value store that can be used for creating custom storage solutions.

```typescript
class MemoryStorage<T extends Record<string, unknown>> {
  constructor(init?: T);

  get length(): number;
  get keys(): (keyof T)[];

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
