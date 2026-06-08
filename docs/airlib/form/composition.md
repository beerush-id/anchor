---
title: 'AIR Form: Composition'
description: 'Cross-field matching, array fields, headless rendering, custom inputs, and accessibility in AIR Form.'
---

# Composition

The [Getting Started](./getting-started) page covers the basics: schema, fields, validation, submit. This page covers the patterns that emerge when forms get complex — matching fields, dynamic arrays, custom rendering, and building your own inputs.

## Cross-Field Matching

When one field must match another — confirm password, date ranges, conditional logic — use the `match` prop on `Field`.

### Equality Match

Pass a field path as a string. The engine compares the two fields and exposes `matched` as a separate signal.

::: code-group

```tsx [React]
const schema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string().min(6, 'At least 6 characters'),
});

const PasswordForm = createForm(schema);

<PasswordForm onSubmit={changePassword}>
  <PasswordForm.Field name="password" label="Password">
    <PasswordInput />
  </PasswordForm.Field>

  <PasswordForm.Field
    name="confirmPassword"
    match="password"
    mismatchLabel="Passwords don't match"
  >
    <PasswordInput />
  </PasswordForm.Field>
</PasswordForm>
```

```tsx [SolidJS]
import { For } from 'solid-js';

const schema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string().min(6, 'At least 6 characters'),
});

const PasswordForm = createForm(schema);

<PasswordForm onSubmit={changePassword}>
  <PasswordForm.Field name="password" label="Password">
    <PasswordInput />
  </PasswordForm.Field>

  <PasswordForm.Field
    name="confirmPassword"
    match="password"
    mismatchLabel="Passwords don't match"
  >
    <PasswordInput />
  </PasswordForm.Field>
</PasswordForm>
```

:::

`valid` and `matched` are independent signals. `valid` only reflects schema validation. `matched` only reflects the match condition. The default `<Field>` component composes them for you: it will display the validation error first, and only display the `mismatchLabel` if the field passes schema validation but fails the match condition.

### Custom Match

For logic beyond equality, pass a function. The function receives the form state and returns a boolean.

::: code-group

```tsx [React]
const rangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

const RangeForm = createForm(rangeSchema);

<RangeForm.Field
  name="endDate"
  match={(form) => form.fields['endDate'] > form.fields['startDate']}
  mismatchLabel="End must be after start"
>
  <DatePicker />
</RangeForm.Field>
```

```tsx [SolidJS]
const rangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

const RangeForm = createForm(rangeSchema);

<RangeForm.Field
  name="endDate"
  match={(form) => form.fields['endDate'] > form.fields['startDate']}
  mismatchLabel="End must be after start"
>
  <DatePicker />
</RangeForm.Field>
```

:::

The function runs inside an Anchor `effect`. The engine tracks which fields it reads and re-evaluates when any dependency changes. No manual subscription needed.

## Touched & Changed

Two signals track user interaction at the field level:

**`touched`** — `true` once the field value is mutated for the first time. Stays `true` until reset. Even if the user types and then deletes back to the original value, `touched` remains `true`. It answers: "did the user interact with this field?"

**`changed`** — `true` when the current value differs from the initial value. Reverts to `false` if the user restores the original. It answers: "is this field different from what we started with?"

::: code-group

```tsx [React]
<UserForm.Field name="email">
  {(field) => (
    <div>
      <EmailInput />
      {field.touched && !field.valid && (
        <span className="error">{field.error?.[0]}</span>
      )}
      {field.changed && <span className="badge">Modified</span>}
    </div>
  )}
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="email">
  {(field) => (
    <div>
      <EmailInput />
      {field.touched && !field.valid && (
        <span class="error">{field.error?.[0]}</span>
      )}
      {field.changed && <span class="badge">Modified</span>}
    </div>
  )}
</UserForm.Field>
```

:::

At the form level, `changed` aggregates all fields:

::: code-group

```tsx [React]
const form = UserForm.get();

form.changed;     // true if any field differs from initial
form.changeList;  // { email: 'new@test.com' } — changed fields and their values
```

:::

## Async Validation

When implementing asynchronous validation, such as checking if a username is available, isolating the logic in a custom component prevents conflicts with the global form state.

::: code-group

```tsx [React]
import { setup, render, mutable } from '@anchorlib/react';

export const AsyncUsernameInput = setup(() => {
  const form = UserForm.get();
  const field = getFormField();
  const state = mutable({
    taken: false,
    checking: false,
  });

  const checkAvailability = async () => {
    if (!field.valid || state.checking) return;

    state.checking = true;
    form.block('username');
    
    state.taken = await api.checkUsername(field.value);
    
    if (!state.taken) {
      form.unblock('username');
    }
    
    state.checking = false;
  };

  return render(() => (
    <div>
      <TextInput onBlur={checkAvailability} />
      {state.checking && <span className="info">Checking availability...</span>}
      {state.taken && <span className="error">This username is already taken</span>}
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup, mutable } from '@anchorlib/solid';

export const AsyncUsernameInput = setup(() => {
  const form = UserForm.get();
  const field = getFormField();
  const state = mutable({
    taken: false,
    checking: false,
  });

  const checkAvailability = async () => {
    if (!field.valid || state.checking) return;

    state.checking = true;
    form.block('username');
    
    state.taken = await api.checkUsername(field.value);
    
    if (!state.taken) {
      form.unblock('username');
    }
    
    state.checking = false;
  };

  return (
    <div>
      <TextInput onBlur={checkAvailability} />
      {state.checking && <span class="info">Checking availability...</span>}
      {state.taken && <span class="error">This username is already taken</span>}
    </div>
  );
});
```

:::

The custom component handles its own asynchronous state and uses `form.block()` to suspend form submission until the validation is complete.

To use the component, place it inside a standard field wrapper.

::: code-group

```tsx [React]
<UserForm.Field name="username" label="Username">
  <AsyncUsernameInput />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="username" label="Username">
  <AsyncUsernameInput />
</UserForm.Field>
```

:::

## Headless Fields

By default, `Field` renders a `<div>` with a label and error display. For full control, pass a function as children.

::: code-group

```tsx [React]
<UserForm.Field name="email">
  {(field) => (
    <div className="custom-field">
      <label htmlFor="email">Email Address</label>
      <EmailInput id="email" className="custom-input" />

      <div className="field-meta">
        {field.touched && field.error?.map(err => (
          <span key={err} className="error" role="alert">{err}</span>
        ))}
        {field.changed && <span className="badge">Edited</span>}
        {!field.matched && <span className="warning">Doesn't match</span>}
      </div>
    </div>
  )}
</UserForm.Field>
```

```tsx [SolidJS]
import { For } from 'solid-js';

<UserForm.Field name="email">
  {(field) => (
    <div class="custom-field">
      <label for="email">Email Address</label>
      <EmailInput id="email" class="custom-input" />

      <div class="field-meta">
        {field.touched && (
          <For each={field.error}>
            {(err) => <span class="error" role="alert">{err}</span>}
          </For>
        )}
        {field.changed && <span class="badge">Edited</span>}
        {!field.matched && <span class="warning">Doesn't match</span>}
      </div>
    </div>
  )}
</UserForm.Field>
```

:::

The function receives the field state with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `value` | `T` | Current field value |
| `name` | `string` | Field path |
| `error` | `string[]` | Validation error messages |
| `valid` | `boolean` | Schema validation result |
| `matched` | `boolean` | Cross-field match result |
| `touched` | `boolean` | Was ever mutated |
| `changed` | `boolean` | Differs from initial value |
| `disabled` | `boolean` | Form is pending |

## Array Fields

For dynamic lists — team members, phone numbers, addresses — use `FieldList`.

::: code-group

```tsx [React]
const teamSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.object({
    name: z.string().min(1, 'Name required'),
    role: z.string().min(1, 'Role required'),
  })),
});

const TeamForm = createForm(teamSchema);

<TeamForm value={{ name: '', members: [{ name: '', role: '' }] }}>
  <TeamForm.Field name="name" label="Team Name">
    <TextInput />
  </TeamForm.Field>

  <TeamForm.FieldList name="members">
    {(members) => (
      <div>
        <h3>Members</h3>
        {members.map((member, i) => (
          <div key={i} className="member-row">
            <TeamForm.Field name={`members.${i}.name`} label="Name">
              <TextInput />
            </TeamForm.Field>
            <TeamForm.Field name={`members.${i}.role`} label="Role">
              <TextInput />
            </TeamForm.Field>
            <button type="button" onClick={() => members.splice(i, 1)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => members.push({ name: '', role: '' })}>
          Add Member
        </button>
      </div>
    )}
  </TeamForm.FieldList>
</TeamForm>
```

```tsx [SolidJS]
import { For } from 'solid-js';

const teamSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.object({
    name: z.string().min(1, 'Name required'),
    role: z.string().min(1, 'Role required'),
  })),
});

const TeamForm = createForm(teamSchema);

<TeamForm value={{ name: '', members: [{ name: '', role: '' }] }}>
  <TeamForm.Field name="name" label="Team Name">
    <TextInput />
  </TeamForm.Field>

  <TeamForm.FieldList name="members">
    {(members) => (
      <div>
        <h3>Members</h3>
        <For each={members}>
          {(member, i) => (
            <div class="member-row">
              <TeamForm.Field name={`members.${i()}.name`} label="Name">
                <TextInput />
              </TeamForm.Field>
              <TeamForm.Field name={`members.${i()}.role`} label="Role">
                <TextInput />
              </TeamForm.Field>
              <button type="button" onClick={() => members.splice(i(), 1)}>
                Remove
              </button>
            </div>
          )}
        </For>
        <button type="button" onClick={() => members.push({ name: '', role: '' })}>
          Add Member
        </button>
      </div>
    )}
  </TeamForm.FieldList>
</TeamForm>
```

:::

`FieldList` exposes the raw reactive array. Mutations like `.push()`, `.splice()`, and `.pop()` are tracked by Anchor's reactivity — the form re-validates, updates change tracking, and cleans up orphaned field state when items are removed.

## Nested Objects

For deeply nested data, use dot-notation in field names.

::: code-group

```tsx [React]
const schema = z.object({
  address: z.object({
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
    zip: z.string().regex(/^\d{5}$/, 'Invalid ZIP'),
  }),
});

const AddressForm = createForm(schema);

<AddressForm value={{ address: { street: '', city: '', zip: '' } }}>
  <AddressForm.Field name="address.street" label="Street">
    <TextInput />
  </AddressForm.Field>
  <AddressForm.Field name="address.city" label="City">
    <TextInput />
  </AddressForm.Field>
  <AddressForm.Field name="address.zip" label="ZIP Code">
    <TextInput />
  </AddressForm.Field>
</AddressForm>
```

```tsx [SolidJS]
const schema = z.object({
  address: z.object({
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
    zip: z.string().regex(/^\d{5}$/, 'Invalid ZIP'),
  }),
});

const AddressForm = createForm(schema);

<AddressForm value={{ address: { street: '', city: '', zip: '' } }}>
  <AddressForm.Field name="address.street" label="Street">
    <TextInput />
  </AddressForm.Field>
  <AddressForm.Field name="address.city" label="City">
    <TextInput />
  </AddressForm.Field>
  <AddressForm.Field name="address.zip" label="ZIP Code">
    <TextInput />
  </AddressForm.Field>
</AddressForm>
```

:::

Dot-paths are sanitized to dashes for HTML `id` attributes: `address.city` produces `id="address-city"`.

## Accessibility

Form components handle accessibility out of the box. No extra configuration needed. When you write this:

::: code-group

```tsx [React]
<UserForm.Field name="address.city" label="City" errorClass="error">
  <TextInput />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="address.city" label="City" errorClass="error">
  <TextInput />
</UserForm.Field>
```

:::

The engine automatically generates all the necessary ARIA attributes and IDs to link the label, input, and error messages together. When validation fails, the rendered HTML looks like this:

::: code-group

```html [Output]
<div class="field">
  <!-- 1. The label points to the auto-generated input ID -->
  <label htmlFor="address-city">City</label>

  <!-- 2. The input receives the ID, invalid state, and points to the error -->
  <input
    id="address-city"
    type="text"
    name="address.city"
    aria-invalid="true"
    aria-describedby="address-city-error"
  />

  <!-- 3. The error gets the matching ID and role="alert" -->
  <span id="address-city-error" class="error" role="alert">
    City is required
  </span>
</div>
```

:::

For headless fields, you are responsible for wiring these attributes yourself using the properties provided by the field state.

## Custom Inputs

### Factory

For standard HTML inputs, `createInput` generates a form-aware component.

::: code-group

```tsx [React]
import { createInput } from '@airlib/react-form';

const PhoneInput = createInput('tel');
const SearchInput = createInput('search');
const URLInput = createInput('url');
```

```tsx [SolidJS]
import { createInput } from '@airlib/solid-form';

const PhoneInput = createInput('tel');
const SearchInput = createInput('search');
const URLInput = createInput('url');
```

:::

Each generated component auto-wires to the form context, handles `aria-*` attributes, and forwards HTML props.

### Manual Wiring

For inputs with custom behavior — formatted currency, rich text, third-party components — use `formInput` from the core.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { formInput } from '@airlib/form';

const CurrencyInput = setup<{ name: string }>((props) => {
  const input = formInput(props, {
    parse: (v) => parseFloat(v.replace(/[^0-9.]/g, '')),
    stringify: (v) => v ? `$${v.toFixed(2)}` : '',
  });

  return render(() => (
    <input
      id={input.name}
      name={input.name}
      value={input.value}
      disabled={input.disabled}
      onInput={(e) => { input.value = e.currentTarget.value; }}
      onBlur={() => input.settled()}
    />
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { formInput } from '@airlib/form';

export const CurrencyInput = setup<{ name: string }>((props) => {
  const input = formInput(props, {
    parse: (v) => parseFloat(v.replace(/[^0-9.]/g, '')),
    stringify: (v) => v ? `$${v.toFixed(2)}` : '',
  });

  return (
    <input
      id={input.name}
      name={input.name}
      value={input.value}
      disabled={input.disabled}
      onInput={(e) => { input.value = e.currentTarget.value; }}
      onBlur={() => input.settled()}
    />
  );
});
```

:::

`parse` converts the display string to the stored value. `stringify` converts the stored value to the display string. `settled()` signals that the user finished editing — typically called on blur.

## Custom Form Actions

If the built-in `<FormSubmit>` or `<FormReset>` components don't fit your needs, you can build highly custom buttons by accessing the core form state. 

Because a form's readiness depends on validation, changes, and network state, writing robust action buttons by hand requires checking multiple signals.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { getForm } from '@airlib/form';

// Generic Button (Reusable across any form)
export const CustomSubmit = setup(() => {
  // Reads the nearest generic form context
  const form = getForm();
  
  // Derived state function
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return render(() => (
    <button type="submit" disabled={disabled()} className="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save'}
    </button>
  ));
});

// Specific Button (Strictly typed to UserForm schema)
export const SubmitUserForm = setup(() => {
  // Reads the specific UserForm context
  const form = UserForm.get();
  
  // Derived state function
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return render(() => (
    <button type="submit" disabled={disabled()} className="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save Profile'}
    </button>
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { getForm } from '@airlib/form';

// Generic Button (Reusable across any form)
export const CustomSubmit = setup(() => {
  // Reads the nearest generic form context
  const form = getForm();
  
  // Derived state function
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return (
    <button type="submit" disabled={disabled()} class="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save'}
    </button>
  );
});

// Specific Button (Strictly typed to UserForm schema)
export const SubmitUserForm = setup(() => {
  // Reads the specific UserForm context
  const form = UserForm.get();
  
  // Derived state function
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return (
    <button type="submit" disabled={disabled()} class="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save Profile'}
    </button>
  );
});
```

:::

## What's Next

- [Core API](./core-api) — Use the engine directly, without components
- [Getting Started](./getting-started) — Back to the basics
