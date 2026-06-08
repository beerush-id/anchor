# Form Inputs

AIR Form ships with 14 pre-built input components. They can work in three contexts.

## Standalone

Use an input component without a form wrapper to get the data conversion.

```tsx
<NumberInput name="age" />
```

## Direct Form

Use an input directly inside a `<Form>` with the `name` prop. It connects to the form state, validates, and tracks changes. The `name` prop is not fully typed against your schema in this mode.

```tsx
<UserForm>
  <EmailInput name="email" placeholder="Enter your email" />
</UserForm>
```

## Field Wrapper

When placed inside a `Field`, the `name` prop is not needed. The input automatically:
1. Connects to the nearest `FieldContext` to determine its name
2. Reads its current value from the form state
3. Buffers keystrokes and writes changes back
4. Adopts the auto-generated `id` from the field for label association
5. Sets `aria-invalid` to `"true"` when validation fails
6. Sets `aria-describedby` pointing to the field's error message element
7. Disables itself when the form is in a `pending` state

```tsx
<UserForm>
  <UserForm.Field name="email" label="Email Address">
    <EmailInput placeholder="Enter your email" />
  </UserForm.Field>
</UserForm>
```

## Text Inputs

Standard text-based inputs buffer their value as a `string`. They pair with Zod string schemas (`z.string()`, `z.string().email()`, etc.).

```tsx
<UserForm.Field name="firstName" label="First Name">
  <TextInput placeholder="John Doe" />
</UserForm.Field>

<UserForm.Field name="email" label="Email">
  <EmailInput placeholder="john@example.com" />
</UserForm.Field>

<UserForm.Field name="password" label="Password">
  <PasswordInput placeholder="Enter secure password" />
</UserForm.Field>

<UserForm.Field name="bio" label="Biography">
  <Textarea placeholder="Tell us about yourself" rows={4} />
</UserForm.Field>
```

## Number Inputs

Number inputs handle the transition between string keystrokes and parsed `number` values automatically. They prevent cursor jumping while typing decimals (e.g., `"42."`) but sync a valid `number` back to the form state. They pair with `z.number()`.

```tsx
<UserForm.Field name="age" label="Age">
  <NumberInput min={0} max={120} />
</UserForm.Field>

<UserForm.Field name="volume" label="Volume">
  <Slider min={0} max={100} />
</UserForm.Field>
```

## Date and Time Inputs

Date and time inputs sync their values as `string` types formatted according to the HTML specification (e.g., `"YYYY-MM-DD"` for dates).

```tsx
<UserForm.Field name="birthday" label="Birthday">
  <DatePicker />
</UserForm.Field>

<UserForm.Field name="alarm" label="Alarm Time">
  <TimePicker />
</UserForm.Field>

<UserForm.Field name="meeting" label="Meeting Time">
  <DateTimePicker />
</UserForm.Field>
```

## Selection Inputs

```tsx
<UserForm.Field name="agree" label="Terms and Conditions">
  <Checkbox />
</UserForm.Field>
```

### Select

The `Select` component expects `<option>` children, just like a native `<select>`. It pairs with `z.string()` or `z.enum()`.

```tsx
<UserForm.Field name="role" label="Role">
  <Select>
    <option value="">Select a role...</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
    <option value="viewer">Viewer</option>
  </Select>
</UserForm.Field>
```

### Radio

The browser groups radios by the `name` attribute. Since all radios for a given field share the same name from the `FieldContext`, grouping is automatic.

```tsx
<UserForm.Field name="plan" label="Subscription Plan">
  {(field) => (
    <div className="radio-group">
      <label>
        <Radio value="basic" /> Basic ($9/mo)
      </label>
      <label>
        <Radio value="pro" /> Pro ($19/mo)
      </label>
      
      {field.touched && field.error?.map(err => (
        <span key={err} className="error" role="alert">{err}</span>
      ))}
    </div>
  )}
</UserForm.Field>
```

## Specialized Inputs

```tsx
<UserForm.Field name="theme" label="Theme Color">
  <ColorPicker />
</UserForm.Field>

<UserForm.Field name="avatar" label="Profile Picture">
  <FilePicker accept="image/*" />
</UserForm.Field>
```

## Passing Props

All input components forward extra props directly to the underlying DOM element.

```tsx
<UserForm.Field name="username">
  <TextInput 
    placeholder="Enter username" 
    className="bg-gray-100 rounded p-2"
    data-testid="username-input"
    onBlur={(e) => console.log('Input blurred:', e.target.value)}
  />
</UserForm.Field>
```
