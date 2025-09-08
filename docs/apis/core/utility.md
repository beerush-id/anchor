# Utility APIs

The Utility APIs provide a collection of helper functions for common tasks like cloning, asynchronous operations, and debugging.

## Cloning & Comparison

These APIs are used for cloning and comparing values.

## `softClone()`

Creates a deep clone of a given value, correctly handling various data types and circular references.

```typescript
type softClone = <T>(source: T, recursive?: Recursive) => T;
```

- `source`: The value to clone.
- `recursive` (optional): If `false`, performs a shallow clone. Defaults to `true`.
- **Returns**: A deep clone of the source value.

## `softEqual()`

Performs a shallow or deep equality comparison between two values.

```typescript
type softEqual = <A, B>(a: A, b: B, deep?: boolean) => boolean;
```

- `a`: The first value.
- `b`: The second value.
- `deep` (optional): If `true`, performs a deep comparison. Defaults to `false`.
- **Returns**: `true` if the values are equal, otherwise `false`.

## Object Helpers

These helpers work with objects, Maps, and Sets, and correctly handle symbol-based keys.

## `softEntries()`

Gets the `[key, value]` pairs of an object, including symbol keys.

```typescript
type softEntries = <T extends ObjLike>(obj: T) => Array<[keyof T, T[keyof T]]>;
```

## `softKeys()`

Gets the keys of an object, including symbol keys.

```typescript
type softKeys = <T extends ObjLike>(obj: T) => Array<keyof T>;
```

## `softValues()`

Gets the values of an object, including properties with symbol keys.

```typescript
type softValues = <T extends ObjLike>(obj: T) => Array<T[keyof T]>;
```

## Asynchronous Helpers

These helpers are used for asynchronous operations.

## `microtask()`

Creates a scheduler that batches multiple function calls within a timeout period into a single execution.

```typescript
type microtask = <T = undefined>(timeout?: number) => [TaskScheduler<T>, TaskDestroyer];
```

- `timeout` (optional): The timeout in milliseconds. Defaults to `10`.
- **Returns**: A tuple containing:
  - `schedule`: A function to schedule a task.
  - `destroy`: A function to cancel any pending task.

## `microbatch()`

Creates a scheduler that executes a batch of functions after a delay.

```typescript
type microbatch = (delay?: number) => [BatchScheduler, BatchResetter];
```

- `delay` (optional): The delay in milliseconds. Defaults to `10`.
- **Returns**: A tuple containing:
  - `schedule`: A function to add a handler to the batch.
  - `reset`: A function to clear the pending batch.

## `microloop()`

Creates a function that executes repeatedly with a fixed time delay.

```typescript
type microloop = (timeout: number, steps: number) => [LoopFn, StopFn];
```

- `timeout`: The interval in milliseconds between each execution.
- `steps`: The maximum number of iterations.
- **Returns**: A tuple containing:
  - `loop`: The function to start the loop.
  - `stop`: The function to stop the loop.

## Debugging

These are the debugging functions available in Anchor:

## `createDebugger()`

Creates a new debugger instance with a specific prefix and logger.

```typescript
type createDebugger = (prefix?: string, logger?: DebugFn) => Debugger;
```

- `prefix` (optional): A string to prepend to all log messages.
- `logger` (optional): A custom logging function.
- **Returns**: A `Debugger` instance with methods like `.ok()`, `.info()`, `.error()`, etc.

## `debug`

A default, pre-configured `Debugger` instance.

## `setDebugger()` / `getDebugger()`

Functions to manually set and get the current global debugger function.

```typescript
type setDebugger = (debugFn: DebugFn | undefined) => () => void;
type getDebugger = () => DebugFn | undefined;
```

## `withDebugger()`

Executes a function within the context of a specific, temporary debugger.

```typescript
type withDebugger = <R>(fn: () => R, debugFn: DebugFn) => R;
```

## ID Generation

Functions to generate short IDs.

## `shortId()`

Generates a short, unique ID based on the current timestamp, a sequence number, and a random component.

```typescript
type shortId = () => string;
```

- **Returns**: A unique string ID.
