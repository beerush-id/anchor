# AirLib Solid Form

Handling form states, validations, and complex data structures like arrays and nested objects in standard SolidJS can be verbose and hard to optimize for performance. `@airlib/solid-form` provides reactive form components built on top of `@airlib/solid` to solve this, ensuring high performance without unnecessary re-renders while giving a deep type-safe structure.

## Creating Typed Forms

Building robust forms requires strict schema validation and type safety. Here how we define a schema and create a typed form.

```tsx
import { z } from 'zod';
import { createForm } from '@airlib/solid-form';

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

export const UserForm = createForm(userSchema);
```

The `createForm` function returns form components (`Form`, `Field`, `FieldList`) typed against the provided Zod schema, ensuring autocompletion and compile-time checks for all field names.

## Building Form Interfaces

Building the UI requires binding inputs to the form state. The typed form provides everything needed to structure the form with type safety.

```tsx
import { UserForm } from './form';
import { TextInput, EmailInput, FormSubmit, FormReset } from '@airlib/solid-form';

export function ProfileEditor() {
  return (
    <UserForm onSubmit={(data) => console.log(data)}>
      <UserForm.Field name="name" label="Name" errorClass="text-red-500">
        <TextInput placeholder="Enter name" />
      </UserForm.Field>

      <UserForm.Field name="email" label="Email" errorClass="text-red-500">
        <EmailInput placeholder="Enter email" />
      </UserForm.Field>

      <div>
        <FormReset>Reset</FormReset>
        <FormSubmit>Save Profile</FormSubmit>
      </div>
    </UserForm>
  );
}
```

The `UserForm.Field` wrapper tracks errors and provides them to the UI, while components like `TextInput` and `EmailInput` connect to the form state under the hood. The `FormSubmit` and `FormReset` buttons track form changes and validation status, enabling or disabling based on the form's readiness.

## Cross-Field Matching

Fields that must match another field (like confirm password) use the `match` prop.

```tsx
const passwordSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
});

const PasswordForm = createForm(passwordSchema);

export function ChangePassword() {
  return (
    <PasswordForm onSubmit={save}>
      <PasswordForm.Field name="password" label="Password">
        <PasswordInput />
      </PasswordForm.Field>

      <PasswordForm.Field name="confirmPassword" match="password">
        {(field) => (
          <div>
            <PasswordInput />
            {field.touched && field.error?.map(err => <span>{err}</span>)}
            {!field.matched && <span>Passwords don't match</span>}
          </div>
        )}
      </PasswordForm.Field>

      <FormSubmit>Change Password</FormSubmit>
    </PasswordForm>
  );
}
```

The `match` prop accepts a field path for equality checks, or a function for custom cross-field logic. `valid` and `matched` are separate signals — `valid` is schema-only, `matched` is match-only — the view layer decides how to compose them.

For custom logic beyond equality:

```tsx
<RangeForm.Field name="max" match={(form) => form.fields['max'] > form.fields['min']}>
```

## Accessibility

`Field` and input components handle accessibility attributes out of the box:

- `<label>` gets `for` linked to the input's auto-generated `id`
- Error messages render with `role="alert"` and a stable `id`
- Inputs get `aria-invalid` when errors exist
- Inputs get `aria-describedby` pointing to the error element

Dot-path field names are sanitized to dashes for valid HTML ids (`address.city` → `address-city`).

## Handling Form Arrays

Dealing with dynamic lists, such as arrays of objects, in a form is often complicated. The `FieldList` component abstracts this complexity.

```tsx
import { z } from 'zod';
import { createForm, TextInput } from '@airlib/solid-form';

const teamSchema = z.object({
  members: z.array(z.object({ name: z.string(), role: z.string() }))
});

const TeamForm = createForm(teamSchema);

export function TeamEditor() {
  return (
    <TeamForm>
      <TeamForm.FieldList name="members">
        {(items) => (
          <div>
            {items.map((member, i) => (
              <div>
                <TeamForm.Field name={`members.${i}.name`}>
                  <TextInput placeholder="Name" />
                </TeamForm.Field>
                <TeamForm.Field name={`members.${i}.role`}>
                  <TextInput placeholder="Role" />
                </TeamForm.Field>
              </div>
            ))}
            <button type="button" onClick={() => items.push({ name: '', role: '' })}>
              Add Member
            </button>
          </div>
        )}
      </TeamForm.FieldList>
    </TeamForm>
  );
}
```

The `FieldList` exposes the array items to the render function, allowing direct reactive mutations like `.push()` on the array. Because this uses `@airlib/solid` under the hood, these mutations are tracked without the need for verbose state management hooks.

## Working With Custom Inputs

Sometimes standard inputs are not enough. Building custom inputs that integrate with the form state is trivial using the built-in `formInput` hook or the `createInput` factory.

```tsx
import { setup } from '@airlib/solid';
import { formInput } from '@airlib/form';

export const CustomInput = setup<{ name: string }>((props) => {
  const input = formInput(props);

  return (
    <div>
      <input 
        name={input.name}
        value={input.value || ''} 
        onInput={(e) => input.value = e.currentTarget.value} 
        onBlur={() => input.settled()}
      />
      {input.error?.map(err => <span class="error">{err}</span>)}
    </div>
  );
});
```

Using `formInput()` wires up the input state, validation rules, and error tracking based on the provided `name` prop. For simpler standard inputs, use the `createInput('text')` factory.
