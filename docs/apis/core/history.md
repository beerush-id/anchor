# History APIs

The History APIs allow you to track changes to a reactive state and implement undo/redo functionality.

## `history()`

Creates a history manager for a given anchored state. It records mutations and provides methods to move backward and forward through the change history.

```typescript
type history = <T extends State>(state: T, options?: HistoryOptions): HistoryState;
```

- `state`: The anchored state to track.
- `options` (optional): Configuration for the history manager.
  - `debounce` (number): The time in milliseconds to wait before grouping rapid changes into a single history entry. Defaults to `100`.
  - `maxHistory` (number): The maximum number of history entries to store. Defaults to `100`.
  - `resettable` (boolean): If `true`, allows the state to be fully reset to its initial condition. Defaults to `false`.
- **Returns**: A `HistoryState` object to control and inspect the history.

---

## `HistoryState` Object

The `history()` function returns a `HistoryState` object, which is itself a reactive state. It contains the following properties and methods:

### Properties

- `backwardList`: `StateChange[]`
  - An array of the changes that can be undone. (Readonly)
- `forwardList`: `StateChange[]`
  - An array of the changes that can be redone. (Readonly)
- `canBackward`: `boolean`
  - `true` if there are changes that can be undone.
- `canForward`: `boolean`
  - `true` if there are changes that can be redone.
- `canReset`: `boolean`
  - `true` if the history is `resettable` and changes have been made.

### Methods

- `backward(): void`
  - Undoes the most recent change.
- `forward(): void`
  - Redoes the most recently undone change.
- `reset(): void`
  - Reverts the state to its original value by undoing all changes. Only works if `resettable` was set to `true`.
- `clear(): void`
  - Clears both the undo and redo history without changing the current state.
- `destroy(): void`
  - Stops listening for state changes and clears all history.

---

## Global Configuration

You can set global default options that will apply to all `history` instances.

### `setDefaultOptions()`

Sets the default options for all new history managers.

```typescript
type setDefaultOptions = (options: HistoryOptions): void;
```

- `options`: An object with any of the `HistoryOptions` to set as global defaults.

### `getDefaultOptions()`

Retrieves the current global default options.

```typescript
type getDefaultOptions = (): HistoryOptions;
```

- **Returns**: The current default `HistoryOptions` object.
