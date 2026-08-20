# Getting Started

## Installation

```bash
bun add @airlib/core @airlib/form @airlib/solid-form zod
```

## Defining Schema and Form Factory

```tsx
import { z } from 'zod';
import { createForm } from '@airlib/solid-form';

const signUpSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(8, 'At least 8 characters'),
});

const SignUpForm = createForm(signUpSchema);
```

`SignUpForm` is both a component and a namespace. It provides:
- `<SignUpForm>` — The form wrapper
- `<SignUpForm.Field>` — Typed field wrapper (compile error on invalid `name`)
- `<SignUpForm.FieldList>` — Array field wrapper

## New Form (e.g., Sign Up)

```tsx
import { setup, navigate } from '@airlib/solid';
import { TextInput, EmailInput, PasswordInput, FormSubmit } from '@airlib/solid-form';

export const SignUp = setup(() => {
  const handleSubmit = async (data: z.infer<typeof signUpSchema>) => {
    await api.createUser(data);
    navigate('/dashboard');
  };

  return (
    <SignUpForm onSubmit={handleSubmit}>
      <SignUpForm.Field name="name" label="Name">
        <TextInput placeholder="Enter name" />
      </SignUpForm.Field>

      <SignUpForm.Field name="email" label="Email">
        <EmailInput placeholder="Enter email" />
      </SignUpForm.Field>

      <SignUpForm.Field name="password" label="Password">
        <PasswordInput />
      </SignUpForm.Field>

      <SignUpForm.Field
        name="confirmPassword"
        label="Confirm Password"
        match="password"
        mismatchLabel="Passwords don't match"
      >
        <PasswordInput />
      </SignUpForm.Field>

      <FormSubmit>Create Account</FormSubmit>
    </SignUpForm>
  );
});
```

## Edit Form (e.g., Profile Settings)

```tsx
import { z } from 'zod';
import { createForm } from '@airlib/solid-form';
import { template } from '@airlib/solid';
import { TextInput, EmailInput, NumberInput, FormSubmit } from '@airlib/solid-form';

const profileSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18'),
});

const ProfileForm = createForm(profileSchema);

export const ProfileEditor = template<{ user: User }>((props) => (
  <ProfileForm
    value={props.user}
    onSubmit={async (data, changes) => {
      await fetch('/api/user', {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
    }}
  >
    <ProfileForm.Field name="name" label="Name">
      <TextInput placeholder="Enter name" />
    </ProfileForm.Field>

    <ProfileForm.Field name="email" label="Email">
      <EmailInput placeholder="Enter email" />
    </ProfileForm.Field>

    <ProfileForm.Field name="age" label="Age">
      <NumberInput />
    </ProfileForm.Field>

    <FormSubmit>Save Profile</FormSubmit>
  </ProfileForm>
));
```

Each `Field` handles label rendering, error display, and accessibility attributes automatically. Input components connect to the field context — no `onChange` or `value` prop needed.

## Handling Submission

The `onSubmit` handler receives three arguments: the full data, the changed fields, and the original event.

```tsx
<UserForm
  value={existingUser}
  onSubmit={async (data, changes, event) => {
    await fetch('/api/user', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  }}
>
```

During submission:
1. The form enters `pending` state
2. All inputs become `disabled`
3. Concurrent submissions are blocked
4. On success, the changed state resets — submitted data becomes the new baseline
5. On error, the form captures it in `form.error`

## Submit & Reset Components

`FormSubmit` and `FormReset` automatically connect to the form state.

```tsx
import { FormSubmit, FormReset } from '@airlib/solid-form';

<div>
  <FormReset class="btn-secondary">Undo Changes</FormReset>
  <FormSubmit class="btn-primary">Save Profile</FormSubmit>
</div>
```

`FormSubmit` disables itself when the form is `pending`, invalid, or unchanged. `FormReset` reverts all fields to their initial values and disables itself when the form is unchanged.

Both accept a function as `children` for dynamic content:

```tsx
<FormSubmit class="btn-primary">
  {(form) => (
    <>
      {form?.pending && <Spinner />}
      <span>{form?.pending ? 'Saving...' : 'Save Profile'}</span>
    </>
  )}
</FormSubmit>
```
