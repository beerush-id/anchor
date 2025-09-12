# Data Flow & Binding APIs (React)

These React hooks are used for creating data flow relationships between states without triggering component re-renders.

## Primary Data Flow APIs

These are the main APIs for creating data flow relationships between reactive states.

### `usePipe()`

Creates a derivation pipe between a source and target reactive state. Changes from the source state are automatically piped to the target state.

```typescript
function usePipe<T extends State, R extends State>(source: T, target: R, transform?: TransformFn<T, R>): void;
```

- `source`: The source reactive state to pipe from.
- `target`: The target reactive state to pipe to.
- `transform` (optional): Function to transform the data during piping.
- **Returns**: `void`

### `useBind()`

Creates a bidirectional binding between two reactive states. Changes from either state are automatically synchronized to the other state.

```typescript
function useBind<T extends State, R extends State>(
  left: T,
  right: R,
  transformLeft?: TransformFn<T, R>,
  transformRight?: TransformFn<R, T>
): void;
```

- `left`: The left reactive state to bind.
- `right`: The right reactive state to bind.
- `transformLeft` (optional): Function to transform data from left to right.
- `transformRight` (optional): Function to transform data from right to left.
- **Returns**: `void`

### `useFormWriter()`

Provides a comprehensive form management solution that automatically pipes valid form data back to a source state.

```typescript
function useFormWriter<T extends State, K extends keyof T>(state: T, keys: K[]): FormState<T, K>;
```

- `state`: The reactive state object to which form data will be piped.
- `keys`: An array of keys that represent the fields managed by this form.
- **Returns**: A form state object with `data`, `errors`, `isValid`, `isDirty`, and `reset()` properties.

## Advanced Data Flow APIs

These APIs provide more specialized data flow capabilities.

### `useAction()`

Allows immediate reaction to value assignments, typically used with the ref pattern `<div ref={action}>` to manipulate DOM elements (adding classes, getting bounding rectangles, adding event listeners, etc.) immediately as they are created, before they are painted to the browser. This avoids the noticeable repaint that occurs when making DOM changes inside effects, which run only after the browser has completely painted the DOM. It also manages side effects with automatic cleanup capabilities.

```typescript
// Without initial value
function useAction<T>(action: Action<T>): RefObject<T>;

// With initial value
function useAction<T>(init: T, action: Action<T>): RefObject<T>;
```

- `init` (optional): The initial value, can be null.
- `action`: A function that takes the current value and returns a cleanup function.
- **Returns**: An object with getter and setter for the current value.

### `useDerivedRef()`

Creates a React `RefObject` that stays synchronized with a reactive state. Whenever the state changes, a handler function is called with the current state and the ref value. This is useful for integrating reactive state with non-reactive APIs, such as DOM manipulation or third-party libraries that require direct references.

```typescript
function useDerivedRef<S extends State, R>(state: S, handle: (current: S, ref: R | null) => void): RefObject<R | null>;
```

- `state`: The reactive state to synchronize with.
- `handle`: A function called when the state changes or the ref value is set. It receives the current state and the current ref value.
- **Returns**: A `RefObject` that stays synchronized with the state.
