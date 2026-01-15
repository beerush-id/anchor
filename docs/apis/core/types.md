# Type Definitions

This page provides comprehensive documentation of the type definitions used throughout the Anchor Core package. Understanding these types is essential for working effectively with the library.

## Core Types

### `Linkable`

The foundational type for values that can be made reactive by Anchor. This includes objects, arrays, maps, and sets.

### `State<T>`

Represents a reactive state object of type `T`. This is the main type returned by the [anchor()](anchor.md#anchor) function.

```typescript
type State<T extends Linkable> = T;
```

### `Immutable<T>`

Creates a deeply readonly version of a type. This is used for creating immutable snapshots of state.

```typescript
type Immutable<T> = T extends Primitive
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<Immutable<K>, Immutable<V>>
    : T extends Set<infer U>
      ? ReadonlySet<Immutable<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<Immutable<U>>
        : T extends object
          ? { readonly [P in keyof T]: Immutable<T[P]> }
          : T;
```

### `Mutable<T>`

The inverse of [Immutable&lt;T&gt;](#immutable-t), creates a mutable version of a readonly type.

```typescript
type Mutable<T> =
  T extends ReadonlyMap<infer K, infer V>
    ? Map<K, V>
    : T extends ReadonlySet<infer U>
      ? Set<U>
      : T extends ReadonlyArray<infer U>
        ? {
            -readonly [P in keyof T]: P extends keyof Array<U> ? Array<U>[P] : never;
          }
        : {
            -readonly [P in keyof T]: T[P];
          };
```

### `MutablePart<T, K>`

Creates a partially mutable version of a readonly type, where only the specified keys are made mutable.

```typescript
type MutablePart<T, K extends MutationKey<T>[]> =
  T extends ReadonlyMap<infer M, infer V>
    ? T & {
        -readonly [P in K[number]]: P extends keyof Map<M, V> ? Map<M, V>[P] : never;
      }
    : T extends ReadonlySet<infer U>
      ? T & {
          -readonly [P in K[number]]: P extends keyof Set<U> ? Set<U>[P] : never;
        }
      : T extends ReadonlyArray<infer U>
        ? T & {
            -readonly [P in K[number]]: P extends keyof Array<U> ? Array<U>[P] : never;
          }
        : MergedType<
            Omit<T, K[number]> & {
              -readonly [P in K[number]]: P extends keyof T ? T[P] : never;
            }
          >;
```

## State Management Types

### `StateChange`

Represents a change event in a reactive state.

```typescript
type StateChange = {
  type: 'init' | StateMutation;
  keys: KeyLike[];
  prev?: unknown;
  value?: unknown;
  emitter?: string;
};
```

### `StateMetadata`

Contains metadata about a reactive state, including its configuration and relationships.

```typescript
type StateMetadata<
  T extends Linkable = Linkable,
  S extends LinkableSchema = LinkableSchema,
  RootType extends Linkable = Linkable,
  RootSchema extends LinkableSchema = LinkableSchema,
  ParentType extends Linkable = Linkable,
  ParentSchema extends LinkableSchema = LinkableSchema,
> = {
  id: string;
  type: Linkables;
  cloned: boolean;
  configs: StateBaseOptions;
  observers: StateObserverList;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
  exceptionHandlers: StateExceptionHandlerList;
  root?: StateMetadata<RootType, RootSchema>;
  parent?: StateMetadata<ParentType, ParentSchema>;
  schema?: S;
};
```

### `StateController`

Controls a reactive state, providing methods to manage its lifecycle.

```typescript
type StateController<T extends Linkable = Linkable, S extends LinkableSchema = LinkableSchema> = {
  meta: StateMetadata<T, S>;
  destroy: StateDestroyer;
  subscribe: StateSubscribeFn<T>;
};
```

## Function Types

### `StateSubscriber<T>`

Function type for state subscription handlers.

```typescript
type StateSubscriber<T> = (snapshot: T, event: StateChange, emitter?: string) => void;
```

### `StateUnsubscribe`

Function type for unsubscribing from state changes.

```typescript
type StateUnsubscribe = () => void;
```

### `StateDestroyer`

Function type for destroying a state.

```typescript
type StateDestroyer = () => void;
```

### `StateSubscribeFn<T>`

Function type for subscribing to state changes.

```typescript
type StateSubscribeFn<T> = ((
  handle: StateSubscriber<T>,
  receiver?: Linkable,
  recursive?: boolean
) => StateUnsubscribe) & {
  all: (handle: StateSubscriber<T>, receiver?: Linkable, recursive?: boolean) => StateUnsubscribe;
};
```

## Schema Types

### `LinkableSchema`

Represents a schema that can be used to validate linkable objects.

### `ModelError`

Represents a validation error from a schema.

## Collection Types

### `MapMutator<K, V>`

Defines mutation methods for a Map.

```typescript
type MapMutator<K, V> = {
  set(key: K, value: V): void;
  delete(key: K): void;
  clear(): void;
};
```

### `SetMutator<V>`

Defines mutation methods for a Set.

```typescript
type SetMutator<V> = {
  add(value: V): void;
  delete(value: V): void;
  clear(): void;
};
```

### `ArrayMutator<T>`

Defines mutation methods for an Array.

```typescript
type ArrayMutator<T> = {
  push(...items: T[]): void;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): void;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  reverse(): T[];
  sort(compareFn?: (a: T, b: T) => number): T[];
  fill(value: T, start?: number, end?: number): T[];
  copyWithin(target: number, start: number, end?: number): T[];
};
```

### `StateMutator<T>`

Union type of all collection mutators.

```typescript
type StateMutator<T extends Linkable> =
  T extends Set<infer U>
    ? SetMutator<U>
    : T extends Map<infer K, infer V>
      ? MapMutator<K, V>
      : T extends Array<infer U>
        ? ArrayMutator<U>
        : never;
```

## Observer Types

### `StateObserver`

Represents an observer that tracks state access.

### `StateObserverList`

A set of state observers.

```typescript
type StateObserverList = Set<StateObserver>;
```

### `StateSubscriberList`

A set of state subscribers.

```typescript
type StateSubscriberList<T extends Linkable = Linkable> = Set<StateSubscriber<T>>;
```

## Utility Types

### `KeyLike`

Represents a property key, which can be a string, number, or symbol.

### `MethodLike`

Represents a method function.

### `ObjLike`

Represents an object-like value.

### `AnchorSettings`

Global configuration options for Anchor.

```typescript
type AnchorSettings = StateBaseOptions & {
  production: boolean;
  safeObservation: boolean;
  safeObservationThreshold: number;
};
```

### `StateBaseOptions`

Base configuration options for a state.

```typescript
type StateBaseOptions = {
  cloned?: boolean;
  deferred?: boolean;
  strict?: boolean;
  ordered?: boolean;
  recursive?: boolean;
  immutable?: boolean;
  observable?: boolean;
  silentInit?: boolean;
};
```

### `StateOptions`

Extended configuration options for a state with schema support.

```typescript
type StateOptions<S extends LinkableSchema = LinkableSchema> = StateBaseOptions & {
  schema?: S;
};
```

### Utility Function Types

These types are used in various utility functions throughout the Anchor library.

#### `BatchHandler`

Function type for batch handlers.

```typescript
type BatchHandler = () => void;
```

#### `BatchScheduler`

Function type for scheduling batch operations.

```typescript
type BatchScheduler = (fn: BatchHandler) => void;
```

#### `BatchResetter`

Function type for resetting batch operations.

```typescript
type BatchResetter = () => void;
```

#### `TaskHandler<T>`

Function type for task handlers with context.

```typescript
type TaskHandler<T> = (init: T, current: T) => Promise<void> | void;
```

#### `TaskScheduler<T>`

Function type for scheduling tasks.

```typescript
type TaskScheduler<T> = (fn: TaskHandler<T>, context?: T) => void;
```

#### `TaskDestroyer`

Function type for destroying tasks.

```typescript
type TaskDestroyer = () => void;
```

#### `LoopFn`

Function type for loop operations.

```typescript
type LoopFn = (fn: () => void) => Promise<number>;
```

#### `StopFn`

Function type for stopping loops.

```typescript
type StopFn = () => void;
```

#### `DebugFn`

Function type for debug logging.

```typescript
type DebugFn = (...args: unknown[]) => void;
```

#### `Context<K, V>`

Type for context objects, which are reactive Maps.

```typescript
type Context<K extends KeyLike, V> = Map<K, V>;
```

## Fetch Types

### `RequestOptions`

Extended RequestInit with URL property.

```typescript
type RequestOptions = RequestInit & {
  url: string | URL;
};
```

### `FetchOptions`

Extended state options with request options.

```typescript
type FetchOptions<S extends LinkableSchema = LinkableSchema> = StateOptions<S> & RequestOptions;
```

### `StreamOptions`

Extended fetch options with transform function for streaming data.

```typescript
type StreamOptions<T, S extends LinkableSchema = LinkableSchema> = FetchOptions<S> & {
  transform?: (current: T, chunk: T) => T;
};
```

### `FetchState`

Reactive fetch state object containing data, status, error and response.

```typescript
type FetchState<T> = {
  data: T;
  status: FetchStatus;
  error?: Error;
  response?: Response;
  fetch: () => void;
  abort: () => void;
};
```

### `FetchFn`

Interface for the fetchState function.

```typescript
interface FetchFn {
  <T, S extends LinkableSchema = LinkableSchema>(init: T, options: FetchOptions<S>): FetchState<T>;

  promise<T, S extends FetchState<T>>(state: S): Promise<S>;
}
```

### `StreamFn`

Interface for the streamState function.

```typescript
interface StreamFn {
  <T, S extends LinkableSchema = LinkableSchema>(init: T, options?: StreamOptions<T, S>): FetchState<T>;

  promise<T, S extends FetchState<T>>(state: S): Promise<S>;
}
```

## History Types

### `HistoryOptions`

Configuration options for the history management system.

```typescript
type HistoryOptions = {
  debounce?: number;
  maxHistory?: number;
  resettable?: boolean;
};
```

### `HistoryState`

History management object with methods and properties for undo/redo functionality.

```typescript
type HistoryState = {
  readonly backwardList: StateChange[];
  readonly forwardList: StateChange[];
  canBackward: boolean;
  canForward: boolean;
  canReset: boolean;
  backward(): void;
  forward(): void;
  destroy(): void;
  clear(): void;
  reset(): void;
};
```

## Enums

### `ArrayMutations`

Enumeration of array mutation methods.

```typescript
export enum ArrayMutations {
  POP = 'pop',
  SORT = 'sort',
  PUSH = 'push',
  FILL = 'fill',
  SHIFT = 'shift',
  SPLICE = 'splice',
  UNSHIFT = 'unshift',
  REVERSE = 'reverse',
  COPY_WITHIN = 'copyWithin',
}
```

### `ObjectMutations`

Enumeration of object mutation methods.

```typescript
export enum ObjectMutations {
  SET = 'set',
  DELETE = 'delete',
}
```

### `BatchMutations`

Enumeration of batch mutation methods.

```typescript
export enum BatchMutations {
  CLEAR = 'clear',
  ASSIGN = 'assign',
  REMOVE = 'remove',
}
```

### `MapMutations`

Enumeration of Map mutation methods.

```typescript
export enum MapMutations {
  SET = 'map:set',
  CLEAR = 'map:clear',
  DELETE = 'map:delete',
}
```

### `SetMutations`

Enumeration of Set mutation methods.

```typescript
export enum SetMutations {
  ADD = 'set:add',
  CLEAR = 'set:clear',
  DELETE = 'set:delete',
}
```

### `Linkables`

Enumeration of linkable types.

```typescript
export enum Linkables {
  MAP = 'map',
  SET = 'set',
  ARRAY = 'array',
  OBJECT = 'object',
}
```

### `FetchStatus`

Enumeration of fetch request statuses.

```typescript
export enum FetchStatus {
  Idle = 'idle',
  Pending = 'pending',
  Success = 'success',
  Error = 'error',
}
```
