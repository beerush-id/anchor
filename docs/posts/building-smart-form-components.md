---
title: Building A Smart Form Component in AIR Stack
description: Learn how to scale form architecture from simple two-way inputs to a strongly typed form factory that saves hours of development.
sidebar: false
next: false
prev: false
---

# Building A Smart Form Component in AIR Stack

[← Back to Posts](/posts/index.html) | **`AIR Stack`** **`Inputs`**

Building forms in React often starts simple but quickly spirals out of control. Once you add validation, error tracking, and layout components, you end up repeating the same manual update loops and prop-drilling state everywhere.

```tsx
export function UserProfile() {
  const [data, setData] = useState({ email: "", age: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const update = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
  const submit = async (e: React.FormEvent) => { ... };

  return (
    <form onSubmit={submit}>
      <FieldLayout label="Email">
        <input name="email" value={data.email} onChange={update} disabled={isLoading} />
        {errors.email && <span className="error">{errors.email}</span>}
      </FieldLayout>
      
      {/* Repeat this exact pattern for 20 more fields... */}
      <button type="submit" disabled={isLoading}>Save</button>
    </form>
  );
}
```

In this tutorial, we will rethink this architecture using AIR Stack. We will build a smart form system that eliminates this boilerplate, starting from a basic smart input to a complete, type-safe form factory.

Here is the architectural journey we will take:

- **[Smart Inputs](#smart-inputs)** (~2 min read): Making our inputs self-managing ("live inputs") to eliminate `onChange` boilerplate, unlocking implicit two-way binding as a free bonus.
- **[Internal Parse Buffers](#internal-parse-buffers)** (~3 min read): Solving the tricky problem of parsing complex inputs (like decimals) without hijacking the user's cursor.
- **[Smart Form](#smart-form)** (~3 min read): Building a central State Owner that orchestrates `zod` validation across multiple fields.
- **[Context-Aware Fields](#context-aware-fields)** (~4 min read): Eliminating prop-drilling by creating a Context Bridge, allowing deeply nested components to tap directly into the State Owner.
- **[Smart Form Factory](#smart-form-factory)** (~4 min read): Encapsulating the architecture into a strictly-typed Factory function that locks component props directly to your validation schema.
- **[Unleashing Factory](#unleashing-factory)** (~2 min read): The final payoff: stamping out multiple distinct forms in seconds with zero boilerplate and seamless end-to-end data flow.

## Smart Inputs

The root problem of React form boilerplate is that inputs are **dumb** and must be controlled, tying their state directly to the parent component's state. You cannot mutate a single field without triggering an update cycle across the entire form.

To solve this, we first need to make our inputs **smart** so they can handle their own behavior.

```tsx {10}
import type { EventHandler, ChangeEvent } from 'react';
import { setup, render, type Bindable } from '@anchorlib/react';

export const InputField = setup<{
  type?: string, 
  value?: Bindable<string>
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

Because component props in AIR Stack are a reactive state, the input now can read from and write to its own state without needing to know if anyone will use it or not. This also unlocks the ability to create implicit two-way binding components. Here is how a parent component uses it:

```tsx {8}
import { setup, render, mutable, $bind } from '@anchorlib/react';
import { InputField } from './inputs';

export const ParentForm = setup(() => {
  const data = mutable({ username: '' });

  return render(() => (
    <InputField value={$bind(data, 'username')} onInput={console.log} />
  ));
});
```

With two-way binding via `$bind()`, parent component no longer need to dictate child component's behavior. Its job is coordinating data flow between parent and child components, handling side-effect using *event* when needed.

::: tip What you learn?
- Creating a smart component that only cares about its job and do it well.
- Two-way binding via **`$bind`** that link child state to parent state without boilerplate code.
- Event handler (e.g. `onInput`) is back to its own nature: **a side effect**, not the way to write a state.
:::

## Internal Parse Buffers

While smart inputs work perfectly for strings, specialized fields like numbers break when users type decimals (e.g., `1.`). Premature parsing strips the decimal, instantly resetting the field and jumping the cursor. 

To solve this, we need the input to hold an internal parse buffer while the user is actively typing, decoupling the visual state from the actual value state.

```tsx {10,13,18,32}
import type { EventHandler, ChangeEvent, FocusEvent } from 'react';
import { setup, render, mutable, effect, type Bindable } from '@anchorlib/react';

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

Using a local `mutable` state, the input buffers the raw string while the user types. The `locked` flag acts as a guard, ensuring the parent cannot overwrite the user's keystrokes mid-typing, while the `effect` actively synchronizes top-down changes when the lock is lifted. It only syncs the parsed number to `props.value` when it is mathematically valid, and gracefully restores formatting on blur.

::: tip What you learn?
- Decoupling visual state (the raw string) from the actual data state (the parsed number).
- Using a `locked` guard combined with `effect` to sync top-down data without destroying active typing.
- Ensuring the parent state only ever receives clean, validated data without dealing with parse errors.
- Restoring visual state on blur to clean up dangling invalid inputs.
:::

## Smart Form

Smart inputs solve field-level updates, but forms rarely exist in isolation. You cannot easily run cross-field validations or coordinate a unified submission if every field is completely independent. 

To solve this, we need a central Form Coordinator to act as the **State Owner**.

```tsx {25,30,32,36}
import type { ReactNode, FormEvent } from 'react';
import { setup, render, createContext, form, snapshot, type Bindable } from '@anchorlib/react';
import type { ZodType } from 'zod';
import type { ExceptionMap } from '@anchorlib/react';

export type FormContext = {
  state: Record<string, any>;
  errors: ExceptionMap<any>;
  get pending(): boolean;
};

export const formContext = createContext<FormContext>();

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

The `Form` component acts as the State Owner. It runs the validation schema and distributes the resulting state and errors through the context. Notice the use of `get pending()` inside the context map—because AIR Stack state is natively reactive, you can finally use standard JavaScript getters to pass live primitive values into context, completely eliminating the need for `useMemo` or dependency arrays.

::: tip What you learn?
- Creating a component that dictates its own behavior and side effects, only cares about its job and do it well.
- Creating an isolated state collector (the Form) that doesn't care if parent component provide data or not, using it or not, just like native `<form>` element.
- Using native JavaScript getters (`get`) to create reactive context values, a paradigm previously impossible in standard React land.
- Creating a structural State Owner that coordinates child components through Context.
- Managing asynchronous submission locks natively without forcing parent state overhead.
:::

## Context-Aware Fields

Connecting deeply nested layout inputs to the central coordinator usually requires tedious prop-drilling, forcing intermediary components to pass along props they don't actually care about. 

To solve this, we build a **Context Bridge** to make our inputs context-aware, allowing them to tap directly into the central state.

```tsx {7,15,29,35,56}
import type { EventHandler, ChangeEvent, ReactNode } from 'react';
import { setup, render, derived, type Bindable } from '@anchorlib/react';
import { formContext, fieldContext } from './form';

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

export const InputField = setup<{ 
  type?: string, 
  value?: Bindable<string>,
  onInput?: EventHandler<ChangeEvent<HTMLInputElement>> 
}>((props) => {
  const formState = formContext.get();
  const field = fieldContext.get();
  const withForm = formState && field;

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

The `InputField` dynamically checks if it is inside a form context. If it is, it bypasses local props and uses the `derived` primitive to subscribe directly to the central state. The layout wrapper (`FormField`) just provides the bridge, completely eliminating prop-drilling across layout components. Similarly, the `SubmitButton` automatically wires itself up to the form's `pending` state without any parent coordination.

::: tip What you learn?
- Building Context-Aware components that adapt their behavior based on their structural position.
- Using `derived` state to selectively subscribe to deeply nested object properties without triggering full re-renders.
- Eliminating prop-drilling by bridging layout wrappers directly to the central State Owner.
- Adding a Smart Button (`Submit`) that automatically tracks parent async operations to prevent double-submissions.
:::

## Smart Form Factory

Relying on string-based context keys (like `name="email"`) is inherently brittle. A single typo will silently break your data flow and validation without triggering any compile-time warnings. 

To solve this, we wrap our coordinator in a strictly typed Form Factory to lock the entire component tree to the validation schema.

```tsx
import type { ReactNode, FormEvent } from 'react';
import { setup, render, createContext, form, snapshot, type Bindable } from '@anchorlib/react';
import { type ZodType, z } from 'zod';

export function createForm<T extends ZodType>(schema: T, init?: z.infer<T>) {
  type FormData = z.infer<T>;

  const formContext = createContext<{ 
    state: FormData, 
    errors: Record<string, any>,
    get pending(): boolean
  }>();
  const fieldContext = createContext<{ name: string }>();

  const Form = setup<{ 
    data?: Partial<FormData>, 
    pending?: Bindable<boolean>,
    onSubmit?: (data: FormData, e: FormEvent) => void | Promise<void>, 
    children?: ReactNode 
  }>((props) => {
    // Escape hatch: bypass strict mapped type collapse inside generics
    const $props = props as any;

    const [state, errors] = form(schema as any, () => $props.data ?? init ?? {});
    
    formContext.set({ 
      state, 
      errors, 
      get pending() { return !!$props.pending; } 
    });
    
    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if ($props.pending || Object.keys(errors).length > 0) return;
      
      $props.pending = true;
      try {
        await $props.onSubmit?.(snapshot(state), e);
      } finally {
        $props.pending = false;
      }
    };
    
    return render(() => <form onSubmit={handleSubmit}>{$props.children}</form>);
  });

  const Field = setup<{ name: keyof FormData, label?: string, children?: ReactNode }>((props) => {
    const $props = props as any;
    const ctx = formContext.get();
    const error = derived(() => ctx?.errors[$props.name]?.message);

    fieldContext.set({ name: $props.name });
    
    return render(() => (
      <div className="field">
        {$props.label && <label>{$props.label}</label>}
        {$props.children}
        {error.value && <span className="error">{error.value}</span>}
      </div>
    ));
  });

  const Submit = setup<{ disabled?: Bindable<boolean>, children?: ReactNode }>((props) => {
    const $props = props as any;
    const ctx = formContext.get();
    
    return render(() => (
      <button type="submit" disabled={$props.disabled || ctx?.pending}>
        {$props.children}
      </button>
    ));
  });

  return Object.assign(Form, { Field, Submit });
}
```

This factory pattern enforces strict type safety on every field name. It binds the context directly to the inferred Zod schema (`z.infer<T>`), meaning your `Field` components will throw a type error if you try to use a name that doesn't exist in the schema. The factory also exports a context-aware `Submit` button that wires up loading states automatically.

::: tip What you learn?
- Encapsulating complex architecture into a strongly typed factory function.
- Leveraging `z.infer` to lock component props (`keyof FormData`) directly to your validation schema.
- Creating foolproof developer experiences that catch errors at compile-time instead of runtime.
:::

## Unleashing Factory

While building a factory might sound like an "advanced" concept, it is actually the secret to saving hours of development time. Here is what it looks like when you actually use it in your application:

```tsx {12,16}
import { z } from 'zod';
import { setup, render } from '@anchorlib/react';
import { createForm } from './form-factory';
import { InputField, NumberInput } from './inputs';
import { createProfile } from './function';

const userSchema = z.object({ 
  email: z.string().email(), 
  age: z.number().min(18) 
});

const UserForm = createForm(userSchema);

export const Profile = setup(() => {
  return render(() => (
    <UserForm onSubmit={async (data) => await createProfile(data)}>
      <UserForm.Field name="email" label="Email Address">
        <InputField type="email" />
      </UserForm.Field>
      
      <UserForm.Field name="age" label="Age">
        <NumberInput min={18} />
      </UserForm.Field>
      
      <UserForm.Submit>Save Profile</UserForm.Submit>
    </UserForm>
  ));
});
```

Notice how clean the implementation is. There are no `useState` hooks, no explicit `onChange` handlers, and no string typos. The inputs handle their own values and parse buffers automatically. When you pass an asynchronous function to `onSubmit`, the Smart Button automatically disables itself while the network request is pending. The parent form only coordinates the schema and the final submission.

### Infinite Scalability

While generating one form is nice, a factory's true power is reusability. We can instantly generate another completely distinct, strictly-typed form without duplicating a single line of boilerplate.

```tsx {12,16}
import { z } from 'zod';
import { setup, render } from '@anchorlib/react';
import { createForm } from './form-factory';
import { InputField } from './inputs';
import { createPost } from './function';

const postSchema = z.object({
  title: z.string().min(5),
  content: z.string()
});

const PostForm = createForm(postSchema);

export const Editor = setup(() => {
  return render(() => (
    <PostForm onSubmit={async (data) => await createPost(data)}>
      <PostForm.Field name="title" label="Post Title">
        <InputField type="text" />
      </PostForm.Field>
      
      <PostForm.Field name="content" label="Content">
        <InputField type="text" />
      </PostForm.Field>
      
      <PostForm.Submit>Publish Post</PostForm.Submit>
    </PostForm>
  ));
});
```

Because the `createForm` factory is strongly typed with `z.infer`, both `UserForm` and `PostForm` natively understand their own structures. You now have a complete, production-ready form system that scales infinitely with your application. 

Creating this factory might take an hour upfront (even less if you copy-paste the code above), but it will save you a lifetime of development hours by eliminating form boilerplate forever.

### Interactive Demonstration

Here is the complete, working implementation of the architecture we just built. Try interacting with the form below to see the Smart Inputs buffer their state, and notice the `Save Profile` button disable itself automatically during the mocked 1.5-second network request!

::: anchor-react-sandbox {class="sp-grid"}

```tsx App.tsx
import '@anchorlib/react/client';
import '@tailwindcss/browser';
import { Profile } from './SmartFormDemo';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>Smart Form Demo</h2>
      <Profile />
    </div>
  );
}
```

<<< ./SmartFormDemo.tsx{#active}

:::

::: tip What you learn?
- Why "Advanced" architectural patterns under the hood make application-level code incredibly simple and foolproof.
- How smart inputs completely eliminate state and event handler boilerplate from consumer components.
- Creating a seamless, end-to-end data flow from user input straight to the server.
- That the true value of AIR Stack is empowering components to manage themselves.
:::
