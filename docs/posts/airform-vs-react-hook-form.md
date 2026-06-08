---
title: 'AIR Form vs. React Hook Form'
description: "Comparing declarative schema-driven components with imperative register calls."
sidebar: false
prev: false
next: false
---

# AIR Form vs. React Hook Form

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`React Hook Form`** **`AIR Form`**

[React Hook Form](https://react-hook-form.com/) (RHF) is one of the most popular form libraries in the React ecosystem. It gained popularity by reducing renders compared to older libraries (like Formik) through uncontrolled inputs and refs. 

**AIR Form** takes a fundamentally different approach. It builds on Anchor's fine-grained reactivity graph, meaning it doesn't need to bypass React's render lifecycle with uncontrolled inputs to achieve performance. Instead, AIR Form provides schema-driven, autonomous components that manage themselves.

## Framework comparison

Both libraries aim to build performant forms with deep schema validation, but their developer experience and mental models diverge significantly.

| Aspect | React Hook Form | AIR Form |
|---|---|---|
| **API** | Hooks (`useForm`, `register`) | Components from `createForm()` |
| **State** | Uncontrolled inputs + `watch` | Anchor reactive proxy (`mutable()`) |
| **Validation** | Schema resolvers (`@hookform/resolvers/zod`) | Zod schema (`createForm(zod)`) |
| **Component API** | `FormProvider` & `<Controller>` | `<Field>` / `<MyForm.Field>` |

## Application Setup

Both libraries allow you to define a schema and use it to type your form state. 

### React Hook Form Setup

In RHF, the schema is passed to a resolver, and the `useForm` hook returns an object packed with methods (`register`, `handleSubmit`, `formState`) that you must wire to your DOM elements.

```tsx
// components/user-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export function UserForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormValues) => {
    await saveUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>
      
      <div>
        <label>Email</label>
        <input type="email" {...register("email")} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      
      <button disabled={isSubmitting}>Save</button>
    </form>
  );
}
```

Every input must be explicitly registered, and error states must be manually extracted and rendered.

### AIR Form Setup

In AIR Form, the schema *is* the form. You pass the schema to `createForm`, which returns a namespace of components (`Form`, `Field`, etc.) that are already wired to the schema's types and rules.

```tsx
// components/user-form.tsx
import { setup, render, mutable } from '@anchorlib/react';
import { createForm, TextInput, EmailInput, FormSubmit } from '@airlib/react-form';
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});

const UserForm = createForm(schema);

export const ProfileEditor = setup(() => {
  const state = mutable({ name: '', email: '' });

  return render(() => (
    <UserForm value={state} onSubmit={(data) => saveUser(data)}>
      <UserForm.Field name="name" label="Name">
        <TextInput />
      </UserForm.Field>

      <UserForm.Field name="email" label="Email">
        <EmailInput />
      </UserForm.Field>
      
      <FormSubmit>Save</FormSubmit>
    </UserForm>
  ));
});
```

The `<TextInput />` and `<EmailInput />` components automatically inherit context from `<UserForm.Field>`. There is no `register` call; the component knows its name and its validation rules, and the `<Field>` component handles error rendering automatically.

## Reactivity Paradigms

Form libraries must balance reactivity (updating UI based on state) with performance (not re-rendering the whole page on every keystroke).

### RHF's Uncontrolled Approach

RHF achieves performance by leaving inputs uncontrolled. To trigger re-renders for specific values (like showing a dependent field), you must explicitly `watch()` that value, which opts that component into re-rendering.

```tsx
import { useForm, useWatch } from "react-hook-form";

export function ConditionalForm() {
  const { register, control, formState: { errors } } = useForm();
  const showExtra = useWatch({ control, name: "showExtra" });

  return (
    <form>
      <div>
        <label>
          <input type="checkbox" {...register("showExtra")} />
          Show Extra
        </label>
        {errors.showExtra && <span>{errors.showExtra.message as string}</span>}
      </div>
      
      {showExtra && (
        <div>
          <label>Extra Field</label>
          <input {...register("extraField")} />
          {errors.extraField && <span>{errors.extraField.message as string}</span>}
        </div>
      )}
    </form>
  );
}
```

### AIR Form's Fine-Grained Binding

Because AIR Form is built on Anchor's reactive proxy engine, the form state is a reactive proxy. You don't need special `watch` hooks; you just read the state. Only the DOM node observing that specific state re-renders.

```tsx
import { setup, render, mutable } from '@anchorlib/react';
import { Checkbox, TextInput } from '@airlib/react-form';

export const ConditionalForm = setup(() => {
  const state = mutable({ showExtra: false, extraField: '' });

  return render(() => (
    <MyForm value={state}>
      <MyForm.Field name="showExtra" label="Show Extra">
        <Checkbox />
      </MyForm.Field>
      
      {state.showExtra && (
        <MyForm.Field name="extraField" label="Extra Field">
          <TextInput />
        </MyForm.Field>
      )}
    </MyForm>
  ));
});
```

## Deeply Nested & Custom Components

When building complex UIs, you rarely use raw HTML `<input>` tags. You use custom design systems (e.g., Radix, Material UI).

### RHF's Controller

RHF cannot `register()` custom components that don't expose a standard `ref`. You must wrap them in a `<Controller>` component.

```tsx
import { useForm, Controller } from "react-hook-form";
import { Select } from "./my-ui-library";

export function CustomInputForm() {
  const { control } = useForm();

  return (
    <form>
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <div>
            <label>Status</label>
            <Select
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={['active', 'archived']}
            />
            {fieldState.error && <span>{fieldState.error.message}</span>}
          </div>
        )}
      />
    </form>
  );
}
```

The boilerplate scales linearly with every custom input in your application.

### AIR Form's Standalone Inputs

In AIR Form, any component can become a form input by accepting a `Bindable` value. You don't wrap them; you just bind them. In fact, if placed inside a `<Form>`, they auto-detect their context.

```tsx
// my-ui-library/Select.tsx
import { setup, render } from '@anchorlib/react';
import { formInput } from '@airlib/form';

export const Select = setup<{ name: string, options: string[] }>((props) => {
  const input = formInput(props);

  return render(() => (
    <select 
      value={input.value as string} 
      onChange={(e) => input.value = e.target.value}
      onBlur={() => input.settled()}
    >
      {props.options.map(opt => <option key={opt}>{opt}</option>)}
    </select>
  ));
});
```

```tsx
// components/CustomInputForm.tsx
export const CustomInputForm = setup(() => {
  const state = mutable({ status: 'active' });

  return render(() => (
    <MyForm value={state}>
      <MyForm.Field name="status" label="Status">
        <Select options={['active', 'archived']} />
      </MyForm.Field>
    </MyForm>
  ));
});
```

## Field Arrays and Dynamic Forms

Dynamic forms (adding and removing fields) expose the differences between tracking uncontrolled inputs versus mutating a reactive proxy.

### RHF's useFieldArray

RHF requires a specialized hook `useFieldArray` to manage dynamic fields because the core library relies on static paths for uncontrolled inputs. You must use the provided `append` and `remove` helpers instead of standard JavaScript array methods.

```tsx
import { useForm, useFieldArray } from "react-hook-form";

export function InviteFriends() {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { friends: [{ name: "" }] }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "friends" });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <label>Friend Name</label>
          <input {...register(`friends.${index}.name` as const)} />
          {errors.friends?.[index]?.name && <span>{errors.friends[index].name.message}</span>}
          <button type="button" onClick={() => remove(index)}>X</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "" })}>
        Add Friend
      </button>
    </form>
  );
}
```

Because RHF intercepts the array operations, it must generate a unique `id` for each field to track re-renders correctly. This prevents you from simply mutating your own arrays.

### AIR Form's Native Array Mutation

Because AIR Form state is a mutable proxy, there are no special hooks or array helpers. You just mutate the array directly using standard JavaScript array methods.

```tsx
import { setup, render, mutable, For } from '@anchorlib/react';
import { createForm, TextInput } from '@airlib/react-form';
import { z } from 'zod';

const InviteForm = createForm(z.object({
  friends: z.array(z.object({ name: z.string() }))
}));

export const InviteFriends = setup(() => {
  const state = mutable({ friends: [{ name: '' }] });

  return render(() => (
    <InviteForm value={state}>
      <For each={() => state.friends}>
        {(friend, index) => (
          <div>
            <InviteForm.Field name={`friends.${index}.name`} label="Friend Name">
              <TextInput />
            </InviteForm.Field>
            <button type="button" onClick={() => {
              state.friends.splice(index, 1);
            }}>X</button>
          </div>
        )}
      </For>
      
      <button type="button" onClick={() => {
        state.friends.push({ name: '' });
      }}>
        Add Friend
      </button>
    </InviteForm>
  ));
});
```

When `friends.push()` is called, Anchor's reactivity graph detects the array mutation and updates the DOM via the `<For>` component automatically.

## Submitting Changed Data

A common requirement for settings or profile forms is to submit only the fields the user actually modified (a `PATCH` request) rather than sending the entire payload.

### RHF's Dirty Fields

React Hook Form tracks modified fields via `formState.dirtyFields`, but it only returns boolean flags, not the actual values. You must manually iterate through the dirty fields and extract the corresponding data to construct your payload.

```tsx
export function Profile() {
  const { register, handleSubmit, formState: { dirtyFields } } = useForm();

  const submit = async (data) => {
    // Manually construct the diff payload
    const changes = Object.keys(dirtyFields).reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
    
    await api.patch('/profile', changes);
  };

  return <form onSubmit={handleSubmit(submit)} />;
}
```

### AIR Form's Native Diffing

AIR Form's `onSubmit` handler natively provides a `changes` parameter as its second argument. The proxy engine automatically calculates the exact diff against the initial state and provides an object containing only the mutated data.

```tsx
<ProfileForm 
  value={state} 
  onSubmit={async (data, changes) => {
    // `changes` natively contains only the modified fields
    await api.patch('/profile', changes);
  }}
>
```

## Boilerplate and Configuration

When scaling a form library, you face two distinct configuration challenges: wiring the validation behavior (the "logic") and standardizing the design system (the "UI").

### Behavioral Configuration

**React Hook Form** requires explicit configuration during initialization to wire up its validation logic. You must define the validation mode, pass the external resolver adapter, and provide default values directly to the hook to ensure it tracks correctly.

```tsx
const { register, handleSubmit } = useForm({
  mode: "onChange",
  resolver: zodResolver(schema),
  defaultValues: { email: "" }
});
```

**AIR Form**, conversely, requires zero behavioral configuration. Because it inherently understands Zod and relies on the reactive proxy for state, there are no adapters or modes to configure. You pass the schema to `createForm`, and the form autonomously knows how to validate continuously.

```tsx
const Form = createForm(schema);
```

### UI and Styling Configuration

**React Hook Form** does not provide a global styling engine. To achieve UI consistency (e.g., standard Tailwind classes for all text inputs), you are forced to build custom wrapper components for every input type.

```tsx
// RHF forces you to build wrappers like this everywhere
export function CustomInput({ name, label }) {
  const { register, formState } = useFormContext();
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      <input className="px-3 py-2 border rounded" {...register(name)} />
      {formState.errors[name] && <span className="text-red-500 text-xs">{formState.errors[name]?.message as string}</span>}
    </div>
  );
}
```

**AIR Form** solves this at the engine level using a global `configureForm` API. You define your design system's classes and error states once at the root of your application.

```tsx
import { configureForm } from '@airlib/react-form';

// Defined once at the root of your application
configureForm({
  field: { class: 'flex flex-col gap-1', errorClass: 'text-red-500 text-xs' },
  textInput: { class: 'px-3 py-2 border rounded', errorClass: 'border-red-500 bg-red-50' }
});
```

When you use `<TextInput />` anywhere in your app, it automatically inherits these classes and applies the `errorClass` when the schema validation fails, completely eliminating the need for custom wrappers.

## Final thoughts

React Hook Form and AIR Form are both highly performant, but their architectures cater to different mental models.

**Choose React Hook Form if:** You have a massive legacy React codebase, heavily rely on uncontrolled inputs and DOM refs, and want an imperative API that works identically across any standard React component tree without introducing a new reactivity engine.

**Choose AIR Form if:** You prefer a declarative, schema-first approach where components govern themselves. If you want two-way binding without the performance penalty of virtual DOM diffing, and hate writing `register()` and `<Controller>` boilerplate for every custom input, AIR Form's reactive engine is superior.
