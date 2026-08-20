## Form Architecture

Form components scale based on coordination requirements.

### Isolated Two-Way Inputs
For standalone fields, the component owns its own state mutations internally and syncs with the parent via two-way binding (`$bind()`).

```tsx
import type { EventHandler, ChangeEvent } from 'react';
import { setup, render, type Bindable } from '@airlib/react';

// Single-purpose autonomous wrapper
export const InputField = setup<{ 
  type?: string, 
  value?: Bindable<string>,
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>>
}>((props) => {
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
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
import type { EventHandler, ChangeEvent, FocusEvent } from 'react';
import { setup, render, mutable, effect, type Bindable } from '@airlib/react';

export const NumberInput = setup<{ 
  value?: Bindable<number>, 
  min?: number,
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>>,
  onBlur?: EventHandler<FocusEvent<HTMLInputElement>>
}>((props) => {
  const raw = mutable({ value: String(props.value ?? ''), locked: false });

  effect(() => {
    if (raw.locked) return;
    raw.value = String(props.value ?? '');
  });

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    raw.locked = true;

    try {
      raw.value = e.currentTarget.value;
      if (!(/\d+$/.test(raw.value))) return;

      const parsed = parseFloat(raw.value);
      
      if (!isNaN(parsed)) {
        props.value = parsed;
      } else if (raw.value === '') {
        props.value = props.min ?? 0;
      }

      raw.locked = false;
    } finally {
      props.onInput?.(e);
    }
  };

  const restore = (e: FocusEvent<HTMLInputElement>) => {
    raw.value = String(props.value ?? '');
    raw.locked = false;
    props.onBlur?.(e);
  };

  return render(() => (
    <input 
      type="text" 
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
import { setup, render, createContext, form, snapshot, type Bindable } from '@airlib/react';
import type { ReactNode, FormEvent } from 'react';
import type { ZodType } from 'zod';
import type { ExceptionMap } from '@airlib/react';

// Define explicit context shapes
export type FormContext = {
  state: Record<string, any>;
  errors: ExceptionMap<any>;
  get pending(): boolean;
};

export type FieldContext = {
  name: string;
};

export const formContext = createContext<FormContext>();
export const fieldContext = createContext<FieldContext>();

// The State Coordinator
export const Form = setup<{
  schema: ZodType, 
  data?: Record<string, any>, 
  pending?: Bindable<boolean>,
  onSubmit?: (data: Record<string, unknown>, e: FormEvent) => void | Promise<void>,
  children?: ReactNode 
}>((props) => {
  const [state, errors] = form(props.schema, () => props.data ?? {});
  
  formContext.set({ 
    state, 
    errors,
    get pending() { return !!props.pending; }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (props.pending) return;
    
    props.pending = true;
    try {
      await props.onSubmit?.(snapshot(state), e);
    } finally {
      props.pending = false;
    }
  };

  return render(() => <form onSubmit={handleSubmit}>{props.children}</form>);
});
```

### Reactive Source Binding
When the form's initial data comes from a reactive source that may change (e.g., a selected record, a route parameter lookup), pass a function as `init`. The form state will re-sync whenever the source changes.

```tsx
// Source changes → form re-syncs
const Form = setup<{ schema: ZodType, data: Record<string, any>, children?: ReactNode }>((props) => {
  const [state, errors] = form(props.schema, () => props.data ?? {});
  formContext.set({ state, errors, get pending() { return false; } });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // props.onSubmit?.(snapshot(state), e);
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
    <div className="field">
      {props.label && <label>{props.label}</label>}
      {props.children}
      {error.value && <span className="error">{error.value}</span>}
    </div>
  ));
});
```

### Context-Aware Inputs
Inputs use `formContext.get()` and `fieldContext.get()` to completely bypass the need for explicit props when placed inside a `FormField`, reading and writing directly to the form's state.

```tsx
// The Context-Aware Input
export const InputField = setup<{ 
  type?: string, 
  value?: Bindable<string>,
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>> 
}>((props) => {
  const formState = formContext.get();
  const field = fieldContext.get();
  const withForm = formState && field;

  // Derive value from Form Context if available, fallback to props
  const output = derived(() => withForm ? formState.state[field.name] : props.value);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    
    if (withForm) {
      formState.state[field.name] = val;
    } else {
      props.value = val;
    }
    
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

export const SubmitButton = setup<{ disabled?: boolean, children?: ReactNode }>((props) => {
  const formState = formContext.get();
  
  return render(() => (
    <button type="submit" disabled={props.disabled || formState?.pending}>
      {props.children}
    </button>
  ));
});
```

### Strictly Typed Form Factory
To enforce type safety on field names (`name` prop matching schema keys), graduate to a Form Factory function.

```tsx
import { setup, render, createContext, form, derived, snapshot } from '@airlib/react';
import type { ReactNode, FormEvent } from 'react';
import { z, type ZodType } from 'zod';

export function createForm<T extends ZodType>(schema: T, init?: z.infer<T>) {
  type FormData = z.infer<T>;

  // Strongly type the context for THIS specific schema
  type FormContextType = {
    state: FormData;
    errors: Record<string, { message: string }>;
  };

  const formContext = createContext<FormContextType>();
  const fieldContext = createContext<{ name: string }>();

  const Form = setup<{ onSubmit?: (data: FormData, e: FormEvent<HTMLFormElement>) => void, children?: ReactNode }>((props) => {
    const [state, errors] = form(schema, init);
    formContext.set({ state, errors });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      props.onSubmit?.(snapshot(state), e);
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
