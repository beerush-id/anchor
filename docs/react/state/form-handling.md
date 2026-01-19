---
title: "Form Handling"
description: "Learn how to build reactive forms with built-in validation support."
keywords:
  - form form-handling
  - validation
  - zod
  - reactivity
---

# Form Handling

Managing form state and validation is a common requirement in modern web applications. Anchor provides a built-in `form` primitive that combines reactivity with **Zod** schema validation to simplify this process.

It automatically handles state tracking, validation feedback, and error mapping without requiring complex boilerplate.

## Defining a Form

The `form` function takes a Zod schema and an initial value. It returns a tuple containing the **State** and the **Errors** map.

```ts
import { form } from '@anchorlib/react';
import { z } from 'zod';

// Define Validation Schema
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Create Form State
const [state, errors] = form(schema, {
  email: '',
  password: '',
});
```

- **`state`**: A mutable reactive object containing the form values.
- **`errors`**: A reactive map containing validation issues for each field.

## Binding to Input

Since the form state is mutable, you can bind it directly to input elements. Changes to the input will update the state, and validation runs automatically.

```tsx
import { setup, render } from '@anchorlib/react';

export const LoginForm = setup(() => {
  const [state, errors] = form(schema, { email: '', password: '' });

  return render(() => (
    <form>
      <div>
        <label>Email</label>
        <input
          value={state.email}
          onInput={(e) => (state.email = e.currentTarget.value)}
        />
        {/* Display Error Message */}
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          value={state.password}
          onInput={(e) => (state.password = e.currentTarget.value)}
        />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>
    </form>
  ));
});
```

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, render, form, snippet, derived } from '@anchorlib/react';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginForm = setup(() => {
  const [state, errors] = form(schema, { email: '', password: '' });

  // Efficiently track validity using the existing errors map
  // This avoids re-running schema validation on every render
  const isValid = derived(() => Object.keys(errors).length === 0 && state.email !== '' && state.password !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid.value) {
      alert(`Login successful!\nEmail: ${state.email}\nPassword: ${'*'.repeat(state.password.length)}`);
    }
  };

  // Snippet for email field (updates only when email or email error changes)
  const EmailField = snippet(() => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Email</label>
      <input
        value={state.email}
        onInput={(e) => state.email = e.currentTarget.value}
        placeholder="Enter your email"
        style={{ 
          width: '100%', 
          padding: '8px',
          border: errors.email ? '2px solid #f44336' : '1px solid #ddd',
          borderRadius: '4px'
        }}
      />
      {errors.email && (
        <span style={{ display: 'block', marginTop: '4px', color: '#f44336', fontSize: '14px' }}>
          {errors.email.message}
        </span>
      )}
    </div>
  ), 'EmailField');

  // Snippet for password field (updates only when password or password error changes)
  const PasswordField = snippet(() => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Password</label>
      <input
        type="password"
        value={state.password}
        onInput={(e) => state.password = e.currentTarget.value}
        placeholder="Enter your password"
        style={{ 
          width: '100%', 
          padding: '8px',
          border: errors.password ? '2px solid #f44336' : '1px solid #ddd',
          borderRadius: '4px'
        }}
      />
      {errors.password && (
        <span style={{ display: 'block', marginTop: '4px', color: '#f44336', fontSize: '14px' }}>
          {errors.password.message}
        </span>
      )}
    </div>
  ), 'PasswordField');

  // Snippet for submit button (updates when validity changes)
  const SubmitButton = snippet(() => (
    <button 
      type="submit"
      disabled={!isValid.value}
      style={{ 
        width: '100%',
        padding: '12px',
        background: isValid.value ? '#4CAF50' : '#cccccc',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: isValid.value ? 'pointer' : 'not-allowed',
        fontWeight: 'bold',
        transition: 'background 0.3s'
      }}
    >
      Login
    </button>
  ), 'SubmitButton');

  // Static form structure
  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px', maxWidth: '400px' }}>
      <h3>Login Form</h3>
      <EmailField />
      <PasswordField />
      <SubmitButton />
      <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Try it:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Type an invalid email to see validation</li>
          <li>Password must be at least 8 characters</li>
          <li>Button disables automatically when invalid</li>
        </ul>
      </div>
    </form>
  );
}, 'LoginForm');

export default LoginForm;
```

:::


## Validation Logic

Validation is **Safe by Default**. This means:

1.  **Initial State**: The form starts without errors (unless `safeInit: false` is passed).
2.  **On Change**: When a field is updated, it is validated against the schema.
3.  **Error Mapping**: If validation fails, the `errors` object is updated with the specific issue for that field.

### Checking Validity

You can check if the form is valid by inspecting the `errors` object. If a field is valid, its corresponding entry in `errors` will be `undefined`.

```ts
// Check if a specific field has errors
if (errors.email) {
  console.log('Email error:', errors.email.message);
}
```

## Form Submission

When submitting the form, you can validate the entire state at once using `schema.safeParse(state)`.

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const result = schema.safeParse(state);

  if (!result.success) {
    // Validation failed
    console.error('Form is invalid');
    return;
  }

  // Validation succeeded
  console.log('Submitting:', result.data);
};

return render(() => (
  <form onSubmit={handleSubmit}>
    {/* ... inputs ... */}
    <button type="submit">Login</button>
  </form>
));
```

## Configuration

The `form` function accepts an optional configuration object as the third argument.

```ts
const [state, errors] = form(schema, init, {
  // Options
  safeInit: true, // Default: true. Set to false to validate validating initial values immediately.
  onChange: (event) => {
    // Callback triggered whenever the form state changes
    console.log('Form changed:', event);
  },
});
```
