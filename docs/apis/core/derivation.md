# Subscription APIs

The Subscription APIs provide powerful tools for reacting to state changes. The primary function is `derive`, which allows you to subscribe to updates, log changes, and synchronize states.

## Core Subscription Functions

These functions form the core of Anchor's derivation system, allowing you to create subscriptions and react to state changes.

### `subscribe()`

The `subscribe()` function is the main way to subscribe to changes in an anchored state. It takes a state and a handler function that will be executed whenever the state is modified.

```typescript
type derive = <T>(state: T, handler: StateSubscriber<T>, recursive?: boolean) => StateUnsubscribe;
```

- `state`: The anchored state to observe. See [State](types.md#state-t).
- `handler`: A callback function that receives the new state snapshot, the change event details, and an optional emitter ID. See [StateSubscriber](types.md#statesubscriber-t).
  - `snapshot`: The latest value of the state.
  - `event`: An object detailing the change (`type`, `keys`, etc.). See [StateChange](types.md#statechange).
- `recursive` (optional): If `true`, the handler will also be triggered for changes in nested child states. Defaults to `false`.
- **Returns**: An [StateUnsubscribe](types.md#stateunsubscribe) function to stop listening for changes.

### `derive()` **`DEPRECATED`**

::: danger Deprecated Symbol

The `derive()` function and `derive.*` functions are deprecated and will be removed in the next stable release. Use [subscribe()](#subscribe) instead.

:::

### `subscribe.log()`

A convenience method for debugging. It subscribes to a state and logs any changes to the console.

```typescript
type log = <T extends Linkable>(state: State<T>) => StateUnsubscribe;
```

- `state`: The anchored state to log. See [State](types.md#state-t) and [Linkable](types.md#linkable).
- **Returns**: An [StateUnsubscribe](types.md#stateunsubscribe) function to stop logging.

## State Synchronization Functions

These functions allow you to synchronize states with each other, with optional transformations.

### `subscribe.pipe()`

Synchronizes changes from a source state to a target state, with an optional transformation step.

```typescript
type pipe = <Source extends State, Target extends Linkable>(
  source: Source,
  target: Target,
  transform?: PipeTransformer<Source, Target>
) => StateUnsubscribe;
```

- `source`: The state to listen for changes on. See [State](types.md#state-t).
- `target`: The state to apply changes to. See [Linkable](types.md#linkable).
- `transform` (optional): A function that receives the source state's value and can return a modified value to be applied to the target. See [PipeTransformer](types.md#pipetransformer-t-u).
- **Returns**: An [StateUnsubscribe](types.md#stateunsubscribe) function to stop the synchronization.

### `subscribe.bind()`

Creates a two-way binding between two states. Changes in one state are reflected in the other, and vice-versa.

```typescript
type bind = <Left extends State, Right extends State>(
  left: Left,
  right: Right,
  transformLeft?: PipeTransformer<Left, Right>,
  transformRight?: PipeTransformer<Right, Left>
) => StateUnsubscribe;
```

- `left`: The first state in the binding. See [State](types.md#state-t).
- `right`: The second state in the binding. See [State](types.md#state-t).
- `transformLeft` (optional): A function to transform the value from the `left` state before applying it to the `right` state. See [PipeTransformer](types.md#pipetransformer-t-u).
- `transformRight` (optional): A function to transform the value from the `right` state before applying it to the `left` state. See [PipeTransformer](types.md#pipetransformer-t-u).
- **Returns**: An [StateUnsubscribe](types.md#stateunsubscribe) function to remove the binding.

## Utility Functions

These are utility functions for advanced use cases and debugging.

### `subscribe.resolve()`

Retrieves the internal `StateController` for a given state. This is an advanced feature for direct interaction with the state's metadata and lifecycle.

```typescript
type resolve = <T extends Linkable>(state: State<T>) => StateController<T> | undefined;
```

- `state`: The anchored state. See [State](types.md#state-t) and [Linkable](types.md#linkable).
- **Returns**: The [StateController](types.md#statecontroller-t-s) instance for the state, or `undefined` if not found.
