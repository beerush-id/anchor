# Composition

## Cross-Field Matching

### Equality Match

Pass a field path as a string. The engine compares the two fields and exposes `matched` as a separate signal.

```tsx
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

`valid` and `matched` are independent signals. `valid` only reflects schema validation. `matched` only reflects the match condition. The default `<Field>` component composes them: it displays the validation error first, and only displays the `mismatchLabel` if the field passes schema validation but fails the match condition.

### Custom Match

For logic beyond equality, pass a function. The function receives the form state and returns a boolean. It runs inside an Anchor `effect`, so the engine tracks which fields it reads and re-evaluates when any dependency changes.

```tsx
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

## Touched & Changed

Two signals track user interaction at the field level:

- **`touched`** — `true` once the field value is mutated for the first time. Stays `true` until reset. It answers: "did the user interact with this field?"
- **`changed`** — `true` when the current value differs from the initial value. Reverts to `false` if the user restores the original. It answers: "is this field different from what we started with?"

```tsx
<UserForm.Field name="email">
  {(field) => (
    <div>
      <EmailInput />
      {field.touched && field.error?.map(err => (
        <span key={err} className="error" role="alert">{err}</span>
      ))}
      {field.changed && <span className="badge">Modified</span>}
    </div>
  )}
</UserForm.Field>
```

At the form level, `changed` aggregates all fields:

```tsx
const form = UserForm.get();

form.changed;     // true if any field differs from initial
form.changeList;  // { email: 'new@test.com' } — changed fields and their values
```

## Async Validation

### With IRPC

Use IRPC's `.later()` to create a deferred call, and the field's `match` prop to block submission when validation fails. No manual state or `form.block()` needed.

```tsx
import { setup, render } from '@airlib/react';
import { checkUsername } from './api';

export const SignUp = setup(() => {
  const taken = checkUsername.later();

  return render(() => (
    <SignUpForm onSubmit={handleSubmit}>
      <SignUpForm.Field
        name="username"
        label="Username"
        match={() => !taken.data}
        mismatchLabel="Username is already taken"
      >
        <TextInput onBlur={(e) => taken.dispatch(e.target.value)} />
        {taken.status === 'pending' && <span className="info">Checking...</span>}
      </SignUpForm.Field>
    </SignUpForm>
  ));
});
```

### Manual (Without IRPC)

The same pattern using `mutable` state and a manual async call.

```tsx
import { setup, render, mutable } from '@airlib/react';

export const SignUp = setup(() => {
  const state = mutable({ taken: false, checking: false });

  const checkUsername = async (value: string) => {
    if (state.checking) return;
    state.checking = true;
    state.taken = await api.checkUsername(value);
    state.checking = false;
  };

  return render(() => (
    <SignUpForm onSubmit={handleSubmit}>
      <SignUpForm.Field
        name="username"
        label="Username"
        match={() => !state.taken}
        mismatchLabel="Username is already taken"
      >
        <TextInput onBlur={(e) => checkUsername(e.target.value)} />
        {state.checking && <span className="info">Checking...</span>}
      </SignUpForm.Field>
    </SignUpForm>
  ));
});
```

## Headless Fields

For full control over field rendering, pass a function as children. The function receives the field state.

```tsx
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

Field state properties:

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

```tsx
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
        <For each={() => members}>
          {(member, i) => (
            <div className="member-row">
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

`FieldList` exposes a reactive array. Use `.push()`, `.splice()`, and `.pop()` to add and remove items.

## Nested Objects

For deeply nested data, use dot-notation in field names. Dot-paths are sanitized to dashes for HTML `id` attributes: `address.city` produces `id="address-city"`.

```tsx
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

## Custom Inputs

### Factory

For standard HTML inputs, `createInput` generates a form-aware component that auto-wires to form context, handles `aria-*` attributes, and forwards HTML props.

```tsx
import { createInput } from '@airlib/react-form';

const PhoneInput = createInput('tel');
const SearchInput = createInput('search');
const URLInput = createInput('url');
```

### Manual Wiring

For inputs with custom behavior — formatted currency, rich text, third-party components — use `formInput` from the core. `parse` converts the display string to the stored value. `stringify` converts the stored value to the display string. `settled()` flushes the internal buffer back to a valid display value — call it on blur for inputs that buffer raw text (e.g., user types `"1."` then leaves, display restores to `"1"`).

```tsx
import { setup, render } from '@airlib/react';
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

## Custom Form Actions

Build custom submit or reset buttons by accessing the core form state. Use `getForm()` for a generic reusable button, or `UserForm.get()` for a button strictly typed to a specific schema.

```tsx
import { setup, render } from '@airlib/react';
import { getForm } from '@airlib/form';

// Generic (reusable across any form)
export const CustomSubmit = setup(() => {
  const form = getForm();
  
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return render(() => (
    <button type="submit" disabled={disabled()} className="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save'}
    </button>
  ));
});

// Specific (strictly typed to UserForm schema)
export const SubmitUserForm = setup(() => {
  const form = UserForm.get();
  
  const disabled = () => form.pending || !form.valid || !form.changed || form.blocked;

  return render(() => (
    <button type="submit" disabled={disabled()} className="my-custom-btn">
      {form.pending ? 'Saving...' : 'Save Profile'}
    </button>
  ));
});
```
