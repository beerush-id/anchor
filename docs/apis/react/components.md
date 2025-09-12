# Components (React)

These are UI components that integrate directly with Anchor's reactive state.

## `Checkbox`

A React component for a checkbox input, binding directly to a reactive state property.

```typescript
type Checkbox = <T extends Bindable, K extends WritableKeys<T>>(props: InputProps<T, K>) => JSX.Element;
```

- `props`: Standard input props, plus `bind` (the reactive state) and `name` (the property key).

## `ColorPicker`

A React component for a color input, binding directly to a reactive state property.

```typescript
type ColorPicker = <T extends Bindable, K extends WritableKeys<T>>(props: InputProps<T, K>) => JSX.Element;
```

- `props`: Standard input props, plus `bind` and `name`.

## `Input`

A React component for a text input, binding directly to a reactive state property.

```typescript
type Input = <T extends Bindable, K extends WritableKeys<T>>(props: InputProps<T, K>) => JSX.Element;
```

- `props`: Standard input props, plus `bind` and `name`.

## `Radio`

A React component for a radio button input, binding directly to a reactive state property.

```typescript
type Radio = <T extends Bindable, K extends WritableKeys<T>>(props: InputProps<T, K>) => JSX.Element;
```

- `props`: Standard input props, plus `bind` and `name`.

## `Select`

A React component for a select dropdown, binding directly to a reactive state property.

```typescript
type Select = <T extends Bindable, K extends WritableKeys<T>>(props: SelectProps<T, K>) => JSX.Element;
```

- `props`: Standard select props, plus `bind` and `name`.

## `Toggle`

A React component for a toggle button, binding directly to a reactive state property.

```typescript
type Toggle = <T, K extends WritableKeys<T>>(props: ToggleProps<T, K>) => JSX.Element;
```

- `props`: Standard button props, plus `bind`, `name`, and optionally `value`.
