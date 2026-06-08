---
title: 'AIR Form: Form Inputs'
description: 'Standard built-in input components for AIR Form. Zero-configuration wiring for every HTML input type.'
---

# Form Inputs

AIR Form ships with 14 pre-built input components covering standard HTML input types. These components are designed to be dropped directly into a `Field` component without any manual wiring.

## Context-Aware Input

Do inputs have to be used inside a `Field`? Can they be used directly inside a `Form`? What if they are used outside a form entirely? 

Like native HTML inputs, they are self-driven and can work in three different contexts:

### 1. Standalone

Use an input component without a form wrapper to get the data conversion. For example, a `NumberInput` takes a `number` and outputs a `number`.

::: code-group

```tsx [React]
<NumberInput name="age" />
```

```tsx [SolidJS]
<NumberInput name="age" />
```

:::

### 2. Direct Form

If you use an input directly inside a `<Form>`, pass the `name` prop. It connects to the form state, validates, and tracks changes. Note that because the input is used independently, the `name` prop is not fully typed against your schema.

::: code-group

```tsx [React]
<UserForm>
  <EmailInput name="email" placeholder="Enter your email" />
</UserForm>
```

```tsx [SolidJS]
<UserForm>
  <EmailInput name="email" placeholder="Enter your email" />
</UserForm>
```

:::

### 3. Field Wrapper

When placed inside a `Field`, you don't even need the `name` prop. The input automatically:
1. Connects to the nearest `FieldContext` to determine its name
2. Reads its current value from the form state
3. Buffers keystrokes and writes changes back
4. Adopts the auto-generated `id` from the field for label association
5. Sets `aria-invalid` to `"true"` when validation fails
6. Sets `aria-describedby` pointing to the field's error message element
7. Disables itself when the form is in a `pending` state

::: code-group

```tsx [React]
<UserForm>
  <UserForm.Field name="email" label="Email Address">
    <EmailInput placeholder="Enter your email" />
  </UserForm.Field>
</UserForm>
```

```tsx [SolidJS]
<UserForm>
  <UserForm.Field name="email" label="Email Address">
    <EmailInput placeholder="Enter your email" />
  </UserForm.Field>
</UserForm>
```

:::



## Text Inputs

Standard text-based inputs buffer their value as a `string`. They pair well with Zod string schemas (`z.string()`, `z.string().email()`, etc.).

::: code-group

```tsx [React]
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

```tsx [SolidJS]
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

:::

## Number Inputs

Number inputs handle the transition between string keystrokes and parsed `number` values automatically. They prevent cursor jumping while typing decimals (e.g., `"42."`) but sync a valid `number` back to the form state. They pair with `z.number()`.

::: code-group

```tsx [React]
<UserForm.Field name="age" label="Age">
  <NumberInput min={0} max={120} />
</UserForm.Field>

<UserForm.Field name="volume" label="Volume">
  <Slider min={0} max={100} />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="age" label="Age">
  <NumberInput min={0} max={120} />
</UserForm.Field>

<UserForm.Field name="volume" label="Volume">
  <Slider min={0} max={100} />
</UserForm.Field>
```

:::

## Date and Time Inputs

Date and time inputs sync their values as `string` types formatted according to the HTML specification (e.g., `"YYYY-MM-DD"` for dates).

::: code-group

```tsx [React]
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

```tsx [SolidJS]
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

:::

## Selection Inputs

For boolean flags or single-choice selections from a predefined set.

::: code-group

```tsx [React]
<UserForm.Field name="agree" label="Terms and Conditions">
  <Checkbox />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="agree" label="Terms and Conditions">
  <Checkbox />
</UserForm.Field>
```

:::

### Using Select and Radio

The `Select` component expects `<option>` children, just like a native `<select>`. It pairs with `z.string()` or `z.enum()`.

::: code-group

```tsx [React]
<UserForm.Field name="role" label="Role">
  <Select>
    <option value="">Select a role...</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
    <option value="viewer">Viewer</option>
  </Select>
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="role" label="Role">
  <Select>
    <option value="">Select a role...</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
    <option value="viewer">Viewer</option>
  </Select>
</UserForm.Field>
```

:::

For `Radio` inputs, the browser groups them by the `name` attribute. Since all radios for a given field share the same name from the `FieldContext`, grouping is automatic.

::: code-group

```tsx [React]
<UserForm.Field name="plan" label="Subscription Plan">
  {(field) => (
    <div className="radio-group">
      <label>
        <Radio value="basic" /> Basic ($9/mo)
      </label>
      <label>
        <Radio value="pro" /> Pro ($19/mo)
      </label>
      
      {field.touched && field.error?.[0] && (
        <span className="error">{field.error[0]}</span>
      )}
    </div>
  )}
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="plan" label="Subscription Plan">
  {(field) => (
    <div class="radio-group">
      <label>
        <Radio value="basic" /> Basic ($9/mo)
      </label>
      <label>
        <Radio value="pro" /> Pro ($19/mo)
      </label>
      
      {field.touched && field.error?.[0] && (
        <span class="error">{field.error[0]}</span>
      )}
    </div>
  )}
</UserForm.Field>
```

:::

## Specialized Inputs

::: code-group

```tsx [React]
<UserForm.Field name="theme" label="Theme Color">
  <ColorPicker />
</UserForm.Field>

<UserForm.Field name="avatar" label="Profile Picture">
  <FilePicker accept="image/*" />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="theme" label="Theme Color">
  <ColorPicker />
</UserForm.Field>

<UserForm.Field name="avatar" label="Profile Picture">
  <FilePicker accept="image/*" />
</UserForm.Field>
```

:::

## Passing Props

All input components forward extra props directly to the underlying DOM element. You can pass classes, placeholders, data attributes, or event listeners just like you would to a native input.

::: code-group

```tsx [React]
<UserForm.Field name="username">
  <TextInput 
    placeholder="Enter username" 
    className="bg-gray-100 rounded p-2"
    data-testid="username-input"
    onBlur={(e) => console.log('Input blurred:', e.target.value)}
  />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field name="username">
  <TextInput 
    placeholder="Enter username" 
    class="bg-gray-100 rounded p-2"
    data-testid="username-input"
    onBlur={(e) => console.log('Input blurred:', e.target.value)}
  />
</UserForm.Field>
```

:::

## Custom Inputs

If the built-in inputs don't cover your needs (e.g., a rich text editor or formatted currency input), you can build your own using the `formInput` function from the core API. 

See the [Composition](./composition#custom-inputs) page for details on wiring custom inputs.
