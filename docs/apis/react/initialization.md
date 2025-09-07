# Initialization APIs (React)

These React hooks are primarily used for creating and initializing reactive states or stable references within your components.

## `useAnchor()`

The primary hook for creating and managing reactive state within React components. It returns a tuple containing the reactive state and a setter function.

```typescript
type useAnchor = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T, S>;
```

- `init`: The initial value for the state.
- `options` (optional): Configuration options for the state.
- **Returns**: A tuple `[state, setState]` where `state` is the reactive object and `setState` is a function to update it.

## `useShortId()`

Generates a short, unique ID that remains stable across re-renders.

```typescript
type useShortId = (): string;
```

- **Returns**: The generated short ID string.

## `useRefTrap()`

Creates a ref with a custom setter handler, allowing interception and modification of the value being set.

```typescript
type useRefTrap = <T>(init: T | null, handler: (value: T | null) => T | null): RefObject<T | null>;
```

- `init`: Initial value for the ref.
- `handler`: A function that processes the value before it's set.
- **Returns**: A ref-like object with a custom setter.

## `useConstant()`

Returns a constant value that is only updated when the value changes in development mode. In production, it always returns the initial value.

```typescript
// With factory function
type useConstant = <T>(init: () => T): T;

// With value and optional cleanup
type useConstant = <T>(init: T, cleanup?: (current: T) => void): T;
```

- `init`: The initial value or a factory function.
- `cleanup` (optional): A cleanup function called when the value changes (in dev mode).
- **Returns**: The constant value.

## `useStableRef()`

Provides a stable reference to a value, updating only when specified dependencies change.

```typescript
type useStableRef = <T>(init: T | (() => T), deps: unknown[]): {
  deps: Set<unknown>;
  value: T;
  stable: boolean;
};
```

- `init`: Initial value or factory function.
- `deps`: Dependencies that trigger updates.
- **Returns**: A stable reference object.
