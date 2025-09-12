# Utility APIs

The Utility APIs provide a collection of helper functions for common tasks like cloning, asynchronous operations, and debugging.

## Cloning & Comparison Functions

These APIs are used for cloning and comparing values.

### `softClone()`

Creates a deep clone of a given value, correctly handling various data types and circular references.

```typescript
type softClone = <T>(source: T, recursive?: Recursive) => T;
```

- `source`: The value to clone. See [Recursive](types.md#recursive).
- **Returns**: A deep clone of the source value.

### `softEqual()`

Performs a shallow or deep equality comparison between two values.

```typescript
type softEqual = <A, B>(a: A, b: B, deep?: boolean) => boolean;
```

- `a`: The first value.
- `b`: The second value.
- `deep` (optional): If `true`, performs a deep comparison. Defaults to `false`.
- **Returns**: `true` if the values are equal, otherwise `false`.

## Object Helper Functions

These helpers work with objects, Maps, and Sets, and correctly handle symbol-based keys.

### `softEntries()`

Gets the `[key, value]` pairs of an object, including symbol keys.

```typescript
type softEntries = <T extends ObjLike>(obj: T) => Array<[keyof T, T[keyof T]]>;
```

- `obj`: The object to get entries from. See [ObjLike](types.md#objlike).
- **Returns**: An array of key-value pairs.

### `softKeys()`

Gets the keys of an object, including symbol keys.

```typescript
type softKeys = <T extends ObjLike>(obj: T) => Array<keyof T>;
```

- `obj`: The object to get keys from. See [ObjLike](types.md#objlike).
- **Returns**: An array of keys.

### `softValues()`

Gets the values of an object, including properties with symbol keys.

```typescript
type softValues = <T extends ObjLike>(obj: T) => Array<T[keyof T]>;
```

- `obj`: The object to get values from. See [ObjLike](types.md#objlike).
- **Returns**: An array of values.

## Asynchronous Helper Functions

These helpers are used for asynchronous operations.

### `microtask()`

Creates a scheduler that batches multiple function calls within a timeout period into a single execution.

```typescript
type microtask = <T = undefined>(timeout?: number) => [TaskScheduler<T>, TaskDestroyer];
```

- `timeout` (optional): The timeout in milliseconds. Defaults to `10`.
- **Returns**: A tuple containing:
  - `schedule`: A function to schedule a task. See [TaskScheduler](types.md#taskscheduler-t).
  - `destroy`: A function to cancel any pending task. See [TaskDestroyer](types.md#taskdestroyer).

### `microbatch()`

Creates a scheduler that executes a batch of functions after a delay.

```typescript
type microbatch = (delay?: number) => [BatchScheduler, BatchResetter];
```

- `delay` (optional): The delay in milliseconds. Defaults to `10`.
- **Returns**: A tuple containing:
  - `schedule`: A function to add a handler to the batch. See [BatchScheduler](types.md#batchscheduler).
  - `reset`: A function to clear the pending batch. See [BatchResetter](types.md#batchresetter).

### `microloop()`

Creates a function that executes repeatedly with a fixed time delay.

```typescript
type microloop = (timeout: number, steps: number) => [LoopFn, StopFn];
```

- `timeout`: The interval in milliseconds between each execution.
- `steps`: The maximum number of iterations.
- **Returns**: A tuple containing:
  - `loop`: The function to start the loop. See [LoopFn](types.md#loopfn).
  - `stop`: The function to stop the loop. See [StopFn](types.md#stopfn).

## Debugging Functions

These are the debugging functions available in Anchor:

### `createDebugger()`

Creates a new debugger instance with a specific prefix and logger.

```typescript
type createDebugger = (prefix?: string, logger?: DebugFn) => Debugger;
```

- `prefix` (optional): A string to prepend to all log messages.
- `logger` (optional): A custom logging function. See [DebugFn](types.md#debugfn).
- **Returns**: A `Debugger` instance with methods like `.ok()`, `.info()`, `.error()`, etc.

### `debug`

A default, pre-configured `Debugger` instance.

### `setDebugger()`

Sets the current debugger function and returns a restore function.

```typescript
type setDebugger = (debugFn: DebugFn | undefined) => () => void;
```

- `debugFn`: The debugger function to set, or undefined to disable debugging. See [DebugFn](types.md#debugfn).
- **Returns**: A function that restores the previous debugger when called.

### `getDebugger()`

Gets the current debugger function.

```typescript
type getDebugger = () => DebugFn | undefined;
```

- **Returns**: The current debugger function, or undefined if debugging is disabled. See [DebugFn](types.md#debugfn).

### `withDebugger()`

Executes a function within the context of a specific, temporary debugger.

```typescript
type withDebugger = <R>(fn: () => R, debugFn: DebugFn) => R;
```

- `fn`: The function to execute with the custom debugger.
- `debugFn`: The debugger function to use during execution. See [DebugFn](types.md#debugfn).
- **Returns**: The result of the executed function.

## ID Generation Functions

Functions to generate short IDs.

### `shortId()`

Generates a short, unique ID based on the current timestamp, a sequence number, and a random component.

```typescript
type shortId = () => string;
```

- **Returns**: A unique string ID.
