---
title: 'AIR Form vs. Formik'
description: "Comparing fine-grained proxy reactivity against top-down virtual DOM re-renders."
sidebar: false
prev: false
next: false
---

# AIR Form vs. Formik

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`Formik`** **`AIR Form`**

[Formik](https://formik.org/) revolutionized React forms by providing a declarative way to manage form state, validation, and submission. For a long time, it was the gold standard for building forms in React.

**AIR Form** approaches the same problem space but with modern reactivity paradigms. Instead of relying on React state and virtual DOM diffing to manage the form, AIR Form uses Anchor's fine-grained reactive proxies. This eliminates the performance bottlenecks that Formik historically struggled with on large forms.

## Framework comparison

Both libraries provide a top-down `<Form>` component and manage form values, touched states, and validation errors. The primary difference lies in how state changes trigger UI updates.

| Aspect | Formik | AIR Form |
|---|---|---|
| **State** | React local state (`useState`) | Anchor reactive proxy (`mutable()`) |
| **Re-renders** | The entire form tree on every keystroke | Only the mutated field |
| **Component API** | `<Field name="email">` | `<Field>` / `<MyForm.Field>` |
| **Validation** | Yup / Custom Functions | Zod schema (`createForm`) |

## Application Setup

Both libraries use a wrapper component to provide form state to child inputs.

### Formik Setup

In Formik, you define your initial values, validation schema (usually Yup), and an `onSubmit` handler, passing them all into the `<Formik>` wrapper.

```tsx
// components/checkout-form.tsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  firstName: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
});

export function CheckoutForm() {
  return (
    <Formik
      initialValues={{ firstName: '', email: '' }}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting }) => {
        saveOrder(values).then(() => setSubmitting(false));
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <div>
            <label>First Name</label>
            <Field type="text" name="firstName" />
            <ErrorMessage name="firstName" component="span" />
          </div>

          <div>
            <label>Email</label>
            <Field type="email" name="email" />
            <ErrorMessage name="email" component="span" />
          </div>

          <button type="submit" disabled={isSubmitting}>
            Submit
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

The `<Field>` component automatically hooks into Formik's internal state via React Context, injecting `value`, `onChange`, and `onBlur`.

### AIR Form Setup

In AIR Form, you construct the form from a Zod schema using `createForm`. This generates a type-safe namespace containing the form components.

```tsx
// components/checkout-form.tsx
import { setup, render, mutable } from '@anchorlib/react';
import { createForm, TextInput, EmailInput, FormSubmit } from '@airlib/react-form';
import { z } from 'zod';

const CheckoutForm = createForm(z.object({
  firstName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
}));

export const Checkout = setup(() => {
  const state = mutable({ firstName: '', email: '' });

  return render(() => (
    <CheckoutForm value={state} onSubmit={(data) => saveOrder(data)}>
      <CheckoutForm.Field name="firstName" label="First Name">
        <TextInput />
      </CheckoutForm.Field>

      <CheckoutForm.Field name="email" label="Email">
        <EmailInput />
      </CheckoutForm.Field>

      <FormSubmit>Submit</FormSubmit>
    </CheckoutForm>
  ));
});
```

Because the `<CheckoutForm.Field>` components are generated from the schema, TypeScript knows exactly which `name` props are valid.

## Performance and Reactivity

The defining difference between the two libraries is performance at scale.

### Formik's Top-Down Re-renders

Formik stores its state in the root `<Formik>` component. Because React propagates state changes downwards, every time a user types a single character, Formik calls `setState` at the root. To prevent the entire form tree from re-rendering, developers must manually wrap every component in `React.memo` or use `<FastField>`.

```tsx
import { memo } from 'react';
import { Formik, Form, Field } from 'formik';

const MemoizedInput = memo(({ name }: { name: string }) => {
  console.log(`Rendered ${name}`);
  return <Field name={name} />;
});

export function HeavyForm() {
  return (
    <Formik initialValues={{ a: '', b: '' }} onSubmit={console.log}>
      <Form>
        <MemoizedInput name="a" />
        <MemoizedInput name="b" />
      </Form>
    </Formik>
  );
}
```

Every new input component must be carefully memoized. If you forget, typing one character virtual-DOM-diffs the entire form tree. This manual optimization creates a fragmented mental model and boilerplate overhead.

### AIR Form's Fine-Grained Updates

AIR Form uses Anchor's reactive state engine. When you type into an `<TextInput>`, it mutates the reactive proxy directly. 

Because Anchor tracks dependencies at the property level, **only the specific input node** that changed will re-render. The root `<CheckoutForm>` does not re-render. The other 99 inputs do not re-render. 

```tsx
<CheckoutForm.Field name="firstName" label="First Name">
  <TextInput />
</CheckoutForm.Field>

<CheckoutForm.Field name="lastName" label="Last Name">
  <TextInput />
</CheckoutForm.Field>
```

Performance remains `O(1)` regardless of whether your form has 5 fields or 500 fields.

## Field Arrays and Dynamic Forms

Dynamic forms (adding and removing fields) expose API differences.

### Formik's FieldArray

Formik provides a `<FieldArray>` component using a render-prop pattern. You receive an array helper object with methods like `push` and `remove`.

```tsx
import { Formik, Form, FieldArray, Field, ErrorMessage } from 'formik';

export function InviteFriends() {
  return (
    <Formik initialValues={{ friends: [{ name: '' }] }} onSubmit={console.log}>
      <Form>
        <FieldArray name="friends">
          {({ push, remove, form }) => (
            <div>
              {form.values.friends.map((friend, index) => (
                <div key={index}>
                  <label>Friend Name</label>
                  <Field name={`friends.${index}.name`} />
                  <ErrorMessage name={`friends.${index}.name`} component="span" />
                  <button type="button" onClick={() => remove(index)}>X</button>
                </div>
              ))}
              <button type="button" onClick={() => push({ name: '' })}>
                Add Friend
              </button>
            </div>
          )}
        </FieldArray>
      </Form>
    </Formik>
  );
}
```

### AIR Form's Native Array Mutation

Because AIR Form state is a mutable proxy, there are no special `<FieldArray>` components or array helpers. You just mutate the array directly using standard JavaScript array methods.

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

## Deeply Nested & Custom Components

When building complex UIs, you rarely use raw HTML `<input>` tags. You use custom design systems (e.g., Radix, Material UI) that need to hook into the form.

### Formik's useField

Formik allows you to wire custom components to the nearest `<Formik>` context using the `useField` hook.

```tsx
import { useField } from 'formik';

export function Select({ label, ...props }: { label: string, name: string, options: string[] }) {
  const [field, meta] = useField(props);

  return (
    <div>
      <label>{label}</label>
      <select {...field} {...props}>
        {props.options.map(opt => <option key={opt}>{opt}</option>)}
      </select>
      {meta.touched && meta.error ? (
        <span className="error">{meta.error}</span>
      ) : null}
    </div>
  );
}
```

The component must manually read `meta.error` and `meta.touched` from the context, requiring every custom component to duplicate its own error rendering logic.

### AIR Form's Standalone Inputs

In AIR Form, custom inputs just bind values. The field context handles the labels and errors automatically.

```tsx
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

Because error rendering and labels are abstracted by the `<CheckoutForm.Field>` parent, the `Select` component only concerns itself with reading and writing values to the core engine.

## Submitting Changed Data

A common requirement for settings or profile forms is to submit only the fields the user actually modified (a `PATCH` request) rather than sending the entire payload.

### Formik's Manual Diffing

Formik's `onSubmit` provides the current `values`, but does not provide a native diff of what changed. Developers are forced to either write or import custom deep-diffing utility functions to compare `values` against `initialValues`.

```tsx
<Formik
  initialValues={initialState}
  onSubmit={async (values) => {
    // You must write your own deep-diffing logic
    const changes = deepDiff(initialState, values);
    await api.patch('/profile', changes);
  }}
>
```

### AIR Form's Native Diffing

AIR Form's `onSubmit` handler natively provides a `changes` parameter as its second argument. The proxy engine automatically tracks state mutations and provides an object containing only the modified data.

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

**Formik** provides multiple local boolean flags to control when validation fires because its top-down architecture makes continuous validation expensive. You configure these behaviors on every `<Formik>` instance.

```tsx
<Formik 
  initialValues={{ email: '' }} 
  validateOnBlur={true}
  validateOnChange={false} // Disabled for performance
  onSubmit={console.log}
  validate={(values) => schema.parse(values)}
>
```

**AIR Form**, conversely, requires zero validation configuration. The reactive proxy continuously triggers Zod validation in `O(1)` time for the specific field you mutate. There are no boolean flags to toggle or manual `schema.parse` calls.

```tsx
const Form = createForm(schema);
```

### UI and Styling Configuration

**Formik** does not provide a global styling engine. To achieve global UI consistency, developers must manually wrap `<Field>` inside custom components to append classes and render error states.

```tsx
// Formik forces you to build wrappers like this everywhere
export function CustomInput({ name, label }) {
  const [field, meta] = useField(name);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      <input className="px-3 py-2 border rounded" {...field} />
      {meta.touched && meta.error ? <span className="text-red-500 text-xs">{meta.error}</span> : null}
    </div>
  );
}
```

**AIR Form** solves this at the engine level using a global `configureForm` API. You define your design system's classes and error states once at the root of your application.

```tsx
import { configureForm } from '@airlib/react-form';

configureForm({
  field: { class: 'flex flex-col gap-1', errorClass: 'text-red-500 text-xs' },
  textInput: { class: 'px-3 py-2 border rounded', errorClass: 'border-red-500 bg-red-50' }
});
```

When you use `<TextInput />` anywhere in your app, it automatically inherits these classes and switches to the `errorClass` states independently.

## Final thoughts

Formik was an incredible step forward for React forms, but its reliance on React's top-down rendering model makes it difficult to scale for massive, highly dynamic forms.

**Choose Formik if:** You are maintaining an older React application that already uses Formik, or you are deeply tied to Yup for validation and prefer the render-prop patterns popularized in older React ecosystems.

**Choose AIR Form if:** You want the declarative, schema-first developer experience of Formik but with the `O(1)` performance characteristics of fine-grained reactivity. If you prefer directly mutating arrays and objects over calling `push()` and `setFieldValue()` helpers, AIR Form provides a significantly simpler mental model.
