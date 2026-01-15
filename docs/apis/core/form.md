# Form APIs

The Form API simplifies the creation of reactive forms with schema validation.

## `form()`

Creates a form state with built-in validation.

```typescript
export function form<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: FormOptions
): [ModelOutput<S>, ExceptionMap<ModelOutput<S>>];
```

- `schema`: A Zod schema (or compatible `LinkableSchema`) for validation.
- `init`: Initial form values.
- `options` (optional): [FormOptions](#formoptions).
- **Returns**: A tuple `[state, errors]`.
  - `state`: The reactive form state (mutable).
  - `errors`: A reactive map of validation errors.

### `FormOptions`

```typescript
type FormOptions = {
  onChange?: (event: StateChange) => void;
  safeInit?: boolean; // If false, performs validation on init.
};
```
