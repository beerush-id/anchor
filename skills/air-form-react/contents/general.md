# General Form

The `createForm` factory generates components strictly typed against your Zod schema. If you try to render `<UserForm.Field name="typo">`, the TypeScript compiler throws an error. This is the recommended approach for forms with static, known shapes.

For dynamic forms built from server responses, JSON schemas, or user configuration, AIR Form provides the general-purpose, untyped `<Form>` and `<Field>` components.

## The Form Component

The general `<Form>` component takes the schema and initial value as props. It creates the reactive form state and provides it to all child fields.

```tsx
import { setup, render, mutable } from '@anchorlib/react';
import { z } from 'zod';
import { Form, Field, TextInput, FormSubmit } from '@airlib/react-form';

const dynamicSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const DynamicForm = setup(() => {
  const profile = mutable({ firstName: '', lastName: '' });

  return render(() => (
    <Form
      schema={dynamicSchema}
      value={profile}
      onSubmit={(data, changes) => console.log('Saved:', changes)}
    >
      <Field name="firstName" label="First Name">
        <TextInput />
      </Field>

      <Field name="lastName" label="Last Name">
        <TextInput />
      </Field>

      <FormSubmit>Save</FormSubmit>
    </Form>
  ));
});
```

## The Field Component

The general `<Field>` component accepts any `string` as its `name` prop. It functions exactly like a typed field — providing label association, error rendering, and context for nested inputs.

```tsx
import { setup, render } from '@anchorlib/react';

const RenderDynamicField = setup<{ name: string; label: string; type: string }>((props) => {
  return render(() => (
    <Field name={props.name} label={props.label}>
      {props.type === 'email' ? <EmailInput /> : <TextInput />}
    </Field>
  ));
});

export const DynamicFormRenderer = setup<{ fields: any[]; schema: any; initialValue: any }>((props) => {
  return render(() => (
    <Form schema={props.schema} value={props.initialValue}>
      {props.fields.map(f => (
        <RenderDynamicField key={f.name} {...f} />
      ))}
      <FormSubmit>Submit</FormSubmit>
    </Form>
  ));
});
```

## Trade-offs

When you use the general `<Form>` instead of `createForm`, you trade compile-time safety for runtime flexibility.

1. **No Autocomplete** — Typing `name="` in your editor won't suggest valid field paths.
2. **Runtime Errors** — If you misspell a field name, TypeScript won't warn you. The input simply won't connect to the expected schema path.
3. **Submit Typing** — The `onSubmit` handler will infer `data` based on the schema prop, but if the schema is `ZodType<any>`, the data will be `any`.

For 90% of forms, use `createForm`. Reserve the general `<Form>` for form builders, CMS interfaces, and heavily data-driven views.
