---
title: 'AIR Form: Core API'
description: 'Use the AIR Form engine directly — formState, formField, formInput — without framework-specific components.'
---

# Core API

The core `@airlib/form` package provides the reactive form engine without UI components. Use it when you need direct control — building framework integrations, custom component libraries, or working outside React/Solid.

## formState

Creates the reactive form store from a Zod schema. This is the foundation — all field states, validation, change tracking, and submission lifecycle live here.

::: code-group

```ts [Core]
import { formState } from '@airlib/form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18),
});

const form = formState(schema, { value: { name: '', email: '', age: 0 } });
```

:::

The returned form state is a reactive object. Reading a property inside an Anchor `effect` or `render` creates a subscription — the effect re-runs when the property changes.

### Reading State

::: code-group

```ts [Core]
// Per-field access
form.fields['name'];       // current value
form.errors['name'];       // string[] of validation errors (empty if valid)
form.touched['name'];      // boolean — was this field ever mutated?

// Form-level signals
form.valid;                // boolean — all fields pass schema validation
form.changed;              // boolean — any field differs from initial
form.changeSize;           // number — count of changed fields
form.changeList;           // Record<string, value> — changed fields and values
form.pending;              // boolean — submission in progress
form.status;               // 'idle' | 'pending' | 'success' | 'error'
form.canSubmit;            // valid && changed && !pending
```

:::

### Writing State

Mutate fields by assigning to `form.fields`. Validation runs on every write.

::: code-group

```ts [Core]
form.fields['name'] = 'Alice';    // triggers validation, marks touched
form.fields['age'] = 25;          // same — granular per field
```

:::

### Submitting

The `.submit()` method manages the full lifecycle.

::: code-group

```ts [Core]
await form.submit(async (data, changes) => {
  await fetch('/api/user', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
});

// Or check readiness first
if (form.canSubmit) {
  form.submit(saveProfile);
}
```

:::

During submission:
- `form.status` moves to `'pending'`
- `form.pending` becomes `true`
- All field `disabled` states become `true`
- Concurrent `.submit()` calls are blocked
- On success: `form.status` → `'success'`, change state resets
- On error: `form.status` → `'error'`, error captured in `form.error`

### Resetting

::: code-group

```ts [Core]
form.reset();  // reverts all fields to initial values, clears touched/changed
```

:::

## formField

Creates a reactive reference to a single field within the nearest form context. When used inside a component tree with an active form provider, it connects to that form.

::: code-group

```ts [Core]
import { formField } from '@airlib/form';

const name = formField('name');
```

:::

### Field State

::: code-group

```ts [Core]
name.value;      // current value
name.error;      // string[] of validation errors
name.valid;      // schema validation result
name.touched;    // was ever mutated
name.changed;    // differs from initial value
name.matched;    // cross-field match result (true if no match configured)
name.disabled;   // form is pending
name.name;       // field path string
```

:::

### Cross-Field Matching

Pass a second argument to configure matching. String for equality, function for custom logic.

::: code-group

```ts [Core]
// Equality: matched is true when confirmPassword === password
const confirm = formField('confirmPassword', 'password');

// Custom: matched is true when the function returns true
const endDate = formField('endDate', (form) =>
  form.fields['endDate'] > form.fields['startDate']
);
```

:::

The match function runs inside an Anchor `effect`. Dependencies are tracked — when `startDate` or `endDate` change, the function re-evaluates.

## formInput

Creates an input controller that handles string buffering and type conversion. Useful for building input components that need to bridge between display strings and typed values.

::: code-group

```ts [Core]
import { formInput } from '@airlib/form';

const input = formInput({ name: 'age', type: 'number' });
```

:::

### Input State

::: code-group

```ts [Core]
input.value;       // string — buffered display value
input.name;        // string — field name
input.type;        // string — input type
input.disabled;    // boolean — form pending state
input.error;       // string[] — validation errors
input.valid;       // boolean — schema validation
input.touched;     // boolean — was ever mutated
input.changed;     // boolean — differs from initial
input.matched;     // boolean — cross-field match result

input.settled();   // signal that editing is complete (call on blur)
```

:::

### Parse & Stringify

For non-string field types, provide `parse` and `stringify` options to convert between the display string and the stored value.

::: code-group

```ts [Core]
const priceInput = formInput(
  { name: 'price', type: 'text' },
  {
    parse: (display) => parseFloat(display.replace(/[^0-9.]/g, '')),
    stringify: (value) => value ? `$${value.toFixed(2)}` : '',
  }
);

// User types "$42.50" → stored as 42.5
// Value 42.5 → displayed as "$42.50"
```

:::

## formFactory

Wraps `formState` with a factory pattern for reusable, typed form creation. Useful when the same schema is used across multiple components.

::: code-group

```ts [Core]
import { formFactory } from '@airlib/form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

const createUserForm = formFactory(schema);

// Inside a component's setup phase:
const form = createUserForm({ value: { name: '', email: '' } });
```

:::

The factory also provides `.get()` to read the current form from context, and `.field()` as a shorthand for `formField`.

::: code-group

```ts [Core]
// Read the nearest form from context
const form = createUserForm.get();

// Create a field reference
const name = createUserForm.field('name');
```

:::

## Context Bridge

The core engine uses Anchor's `setContext` / `getContext` for the component tree. If your framework uses a different context system, set a bridge.

::: code-group

```ts [Core]
import { setContextBridge } from '@airlib/form';

setContextBridge({
  read: (key) => /* your framework's getContext */,
  write: (key, value) => /* your framework's setContext */,
});
```

:::

## Constants

The core exports constants used for context keys and status values.

::: code-group

```ts [Core]
import {
  FORM_SYMBOL,         // Symbol for form context
  FORM_FIELD_SYMBOL,   // Symbol for field context
  FORM_STATUS,         // { IDLE, PENDING, SUCCESS, ERROR }
  FORM_INPUT,          // { text, email, number, ... } input type map
} from '@airlib/form';
```

:::

## Learn More

- [Getting Started](./getting-started) — Build forms with components
- [Composition](./composition) — Cross-field matching, arrays, headless mode
