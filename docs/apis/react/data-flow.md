# Data Flow & Binding APIs (React)

These React hooks facilitate data flow and binding between reactive states.

## `usePipe()`

Establishes a one-way data flow from a source reactive state to a target reactive state. Changes in the source are automatically applied to the target.

```typescript
type usePipe = <T extends State, R extends State>(source: T, target: R, transform?: TransformFn<T, R>): void;
```

- `source`: The source reactive state.
- `target`: The target reactive state.
- `transform` (optional): A function to transform data during piping.

## `useBind()`

Creates a bidirectional binding between two reactive states, synchronizing changes in both directions.

```typescript
type useBind = <T extends State, R extends State>(
  left: T,
  right: R,
  transformLeft?: TransformFn<T, R>,
  transformRight?: TransformFn<R, T>
): void;
```

- `left`: The first reactive state.
- `right`: The second reactive state.
- `transformLeft` (optional): Transforms data from `left` to `right`.
- `transformRight` (optional): Transforms data from `right` to `left`.

## `useInherit()`

Creates a new reactive object by picking specific properties from an existing reactive state. Changes to the source properties will update the inherited object.

```typescript
type useInherit = <T extends State, K extends keyof T>(state: T, picks: K[]): { [key in K]: T[key] };
```

- `state`: The source reactive state.
- `picks`: An array of keys to pick from the state.
- **Returns**: A new reactive object with the picked properties.
