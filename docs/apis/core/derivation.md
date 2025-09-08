# Derivation APIs

The Derivation APIs provide powerful tools for reacting to state changes. The primary function is `derive`, which allows you to subscribe to updates, log changes, and synchronize states.

## `derive()`

The `derive()` function is the main way to subscribe to changes in an anchored state. It takes a state and a handler function that will be executed whenever the state is modified.

```typescript
type derive = <T>(state: T, handler: StateSubscriber<T>, recursive?: boolean) => StateUnsubscribe;
```

- `state`: The anchored state to observe.
- `handler`: A callback function that receives the new state snapshot, the change event details, and an optional emitter ID.
  - `snapshot`: The latest value of the state.
  - `event`: An object detailing the change (`type`, `keys`, etc.).
- `recursive` (optional): If `true`, the handler will also be triggered for changes in nested child states. Defaults to `false`.
- **Returns**: An `unsubscribe` function to stop listening for changes.

## Derivation Utilities

There are several utility functions available for deriving and managing state.

## `derive.pipe()`

Synchronizes changes from a source state to a target state, with an optional transformation step.

```typescript
type pipe = <Source extends State, Target extends Linkable>(
  source: Source,
  target: Target,
  transform?: PipeTransformer<Source, Target>
) => StateUnsubscribe;
```

- `source`: The state to listen for changes on.
- `target`: The state to apply changes to.
- `transform` (optional): A function that receives the source state's value and can return a modified value to be applied to the target.
- **Returns**: An `unsubscribe` function to stop the synchronization.

## `derive.bind()`

Creates a two-way binding between two states. Changes in one state are reflected in the other, and vice-versa.

```typescript
type bind = <Left extends State, Right extends State>(
  left: Left,
  right: Right,
  transformLeft?: PipeTransformer<Left, Right>,
  transformRight?: PipeTransformer<Right, Left>
) => StateUnsubscribe;
```

- `left`: The first state in the binding.
- `right`: The second state in the binding.
- `transformLeft` (optional): A function to transform the value from the `left` state before applying it to the `right` state.
- `transformRight` (optional): A function to transform the value from the `right` state before applying it to the `left` state.
- **Returns**: An `unsubscribe` function to remove the binding.

## `derive.resolve()`

Retrieves the internal `StateController` for a given state. This is an advanced feature for direct interaction with the state's metadata and lifecycle.

```typescript
type resolve = <T extends Linkable>(state: State<T>) => StateController<T> | undefined;
```

- `state`: The anchored state.
- **Returns**: The `StateController` instance for the state, or `undefined` if not found.

## `derive.log()`

A convenience method for debugging. It subscribes to a state and logs any changes to the console.

```typescript
type log = <T extends Linkable>(state: State<T>) => StateUnsubscribe;
```

- `state`: The anchored state to log.
- **Returns**: An `unsubscribe` function to stop logging.
