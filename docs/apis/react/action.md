# Action API (React)

This section documents the `useAction` hook, which manages actions with cleanup capabilities.

## `useAction()`

Custom hook that manages an action with cleanup capabilities. It maintains a reference to a value and runs an action function whenever the value changes, handling cleanup of previous actions and on component unmount.

```typescript
declare function useAction<T>(action: (value: T) => StateUnsubscribe): RefObject<T>;
declare function useAction<T>(init: T, action: (value: T) => StateUnsubscribe): RefObject<T>;
```

- `action`: A function that takes the current value (`T`) and returns a cleanup function (`StateUnsubscribe`).
- `init` (optional): The initial value for the state managed by the action. If a function is provided here, it's treated as the `action` function.
- **Returns**: A React `RefObject` with a `current` property that acts as both a getter and a setter for the managed value. Setting `current` triggers the `action` function with the new value and cleans up the previous action.
