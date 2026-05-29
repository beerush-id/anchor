## Form Architecture

Form components scale based on coordination requirements.

### Isolated Two-Way Inputs
For standalone fields, the component owns its own state mutations internally and syncs with the parent via two-way binding (`$bind()`).

```tsx
import { setup, render, type Bindable } from '@anchorlib/react';

// Single-purpose autonomous wrapper
export const InputField = setup<{ 
  type?: string, 
  value?: Bindable<string>,
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void
}>((props) => {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.value = e.currentTarget.value;
    props.onInput?.(e);
  };

  return render(() => (
    <input 
      type={props.type || 'text'} 
      value={props.value ?? ''} 
      onInput={handleInput}
    />
  ));
});
```

### Internal Parse Buffers
For specialized inputs (e.g., number, date), use a local `mutable` state to buffer the raw text (preventing cursor jumping) while syncing the final parsed value to the `Bindable` prop.

```tsx
import { setup, render, mutable, effect, type Bindable } from '@anchorlib/react';

export const NumberInput = setup<{ 
  value?: Bindable<number>, 
  min?: number,
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}>((props) => {
  // Local buffer state prevents cursor jump on decimals, locked while typing
  const raw = mutable({ value: String(props.value ?? ''), locked: false });

  // Sync top-down changes from parent unless actively typing
  effect(() => {
    if (raw.locked) return;
    raw.value = String(props.value ?? '');
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    raw.locked = true;
    try {
      const parsed = parseFloat(raw.value = e.currentTarget.value);

      if (!isNaN(parsed)) {
        props.value = parsed;
      } else if (raw.value === '') {
        props.value = props.min ?? 0;
      }
    } finally {
      raw.locked = false;
    }
    props.onInput?.(e);
  };

  const restore = (e: React.FocusEvent<HTMLInputElement>) => {
    raw.value = String(props.value ?? '');
    props.onBlur?.(e);
  };

  return render(() => (
    <input 
      type="number" 
      value={raw.value} 
      onInput={handleInput} 
      onBlur={restore}
    />
  ));
});
```

### Form Coordinators
When multiple inputs must be validated and submitted together, use a `Form` component as the State Owner, coordinating state via Context.

```tsx
import { setup, render, createContext, form, derived, snapshot } from '@anchorlib/react';
import type { ReactNode } from 'react';
import { z, type ZodSchema } from 'zod';

// Define explicit context shapes
export type FormContext = {
  state: Record<string, unknown>;
  errors: Record<string, { message: string }>;
};

export type FieldContext = {
  name: string;
};

export const formContext = createContext<FormContext>();
export const fieldContext = createContext<FieldContext>();

// The State Coordinator
export const Form = setup<{ 
  schema: ZodSchema, 
  data: Record<string, unknown>, 
  onSubmit?: (data: Record<string, unknown>) => void, 
  children?: ReactNode 
}>((props) => {
  const [state, errors] = form(props.schema, props.data);
  formContext.set({ state, errors });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    props.onSubmit?.(snapshot(state));
  };

  return render(() => <form onSubmit={handleSubmit}>{props.children}</form>);
});
```

### Reactive Source Binding
When the form's initial data comes from a reactive source that may change (e.g., a selected record, a route parameter lookup), pass a function as `init`. The form state will re-sync whenever the source changes.

```tsx
// Source changes → form re-syncs
const Form = setup<{ schema: ZodSchema, data: Record<string, unknown>, children?: ReactNode }>((props) => {
  const [state, errors] = form(props.schema, () => props.data);
  formContext.set({ state, errors });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    props.onSubmit?.(snapshot(state));
  };

  return render(() => <form onSubmit={handleSubmit}>{props.children}</form>);
});
```

Use a plain value when the init is static. Use a function when the init is reactive and the form should follow changes from the source.

### Form Field Bridge
The `FormField` acts as a structural bridge, using `formContext.get()` to connect to the `Form` and setting a local `FieldContext` for the underlying input.

```tsx
// The Structural Bridge
export const FormField = setup<{ name: string, label?: string, children?: ReactNode }>((props) => {
  const formState = formContext.get();
  const error = derived(() => formState?.errors[props.name]?.message);
  
  fieldContext.set({ name: props.name });

  return render(() => (
    <div>
      {props.label && <label>{props.label}</label>}
      {props.children}
      {error.value && <span>{error.value}</span>}
    </div>
  ));
});
```

### Context-Aware Inputs
Inputs use `formContext.get()` and `fieldContext.get()` to completely bypass the need for explicit props when placed inside a `FormField`, reading and writing directly to the form's state.

```tsx
// The Context-Aware Input
export const Input = setup<{ 
  type?: string, 
  value?: string, 
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void
}>((props) => {
  const formState = formContext.get();
  const field = fieldContext.get();
  const withForm = formState && field;

  // Derive value from Form Context if available, fallback to props
  const output = derived(() => withForm ? formState.state[field.name] : props.value);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    if (withForm) formState.state[field.name] = val;
    else props.value = val;
    props.onInput?.(e);
  };

  return render(() => (
    <input 
      type={props.type || 'text'} 
      value={output.value ?? ''} 
      onInput={handleInput} 
    />
  ));
});
```

### Strictly Typed Form Factory
To enforce type safety on field names (`name` prop matching schema keys), graduate to a Form Factory function.

```tsx
import { setup, render, createContext, form, derived, snapshot } from '@anchorlib/react';
import type { ReactNode } from 'react';
import { z, type ZodSchema } from 'zod';

export function createForm<T extends ZodSchema>(schema: T, init: z.infer<T>) {
  type FormData = z.infer<T>;

  // Strongly type the context for THIS specific schema
  type FormContextType = {
    state: FormData;
    errors: Record<string, { message: string }>;
  };

  const formContext = createContext<FormContextType>();
  const fieldContext = createContext<{ name: string }>();

  const Form = setup<{ onSubmit?: (data: FormData) => void, children?: ReactNode }>((props) => {
    const [state, errors] = form(schema, init);
    formContext.set({ state, errors });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      props.onSubmit?.(snapshot(state));
    };

    return render(() => <form onSubmit={handleSubmit}>{props.children}</form>);
  });

  const Field = setup<{ name: keyof FormData, label?: string, children?: ReactNode }>((props) => {
    const formState = formContext.get();
    const error = derived(() => formState?.errors[props.name as string]?.message);
    fieldContext.set({ name: props.name as string });

    return render(() => (
      <div>
        {props.label && <label>{props.label}</label>}
        {props.children}
        {error.value && <span>{error.value}</span>}
      </div>
    ));
  });

  // Attach Field to Form for namespacing (<Form.Field>)
  Form.Field = Field;
  return Form;
}
```
