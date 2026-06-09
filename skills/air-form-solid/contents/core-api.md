# Core API

The core `@airlib/form` package provides the reactive form engine without UI components. Use it when you need direct control — building custom component libraries or working outside the standard component tree.

## formState

Creates the reactive form store from a Zod schema. All field states, validation, change tracking, and submission lifecycle live here.

```ts
import { formState } from '@airlib/form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18),
});

const form = formState(schema, { value: { name: '', email: '', age: 0 } });
```

The returned form state is a reactive object. Reading a property inside an Anchor `effect` or Solid's tracking scopes creates a subscription — the effect re-runs when the property changes.

### Reading State

```ts
// Per-field access
form.fields['name'];       // current value
form.errors['name'];       // string[] of validation errors (empty if valid)
form.touched['name'];      // boolean — was this field ever mutated?

// Form-level signals
form.valid;                // boolean — all fields pass schema validation
form.changed;              // boolean — any field differs from initial
form.blocked;              // boolean — submission is blocked by a condition
form.changes;              // Record<string, value> — nested object of changed fields
form.changeList;           // Record<string, value> — flat map of changed fields and values
form.pending;              // boolean — submission in progress
form.status;               // 'idle' | 'pending' | 'success' | 'error'
form.canSubmit;            // valid && changed && !blocked && !pending
```

### Writing State

Mutate fields by assigning to `form.fields`. Validation runs on every write.

```ts
form.fields['name'] = 'Alice';    // triggers validation, marks touched
form.fields['age'] = 25;          // same — granular per field
```

### Submitting

The `.submit()` method manages the full lifecycle.

```ts
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

During submission:
- `form.status` moves to `'pending'`
- `form.pending` becomes `true`
- All field `disabled` states become `true`
- Concurrent `.submit()` calls are blocked
- On success: `form.status` → `'success'`, change state resets
- On error: `form.status` → `'error'`, error captured in `form.error`

### Resetting and Clearing

```ts
form.reset();            // reverts all fields to initial values, clears touched/changed
form.clear();            // clears all fields to empty values
form.resetField('name'); // reverts a specific field to its initial value
form.clearField('name'); // clears a specific field
```

### Blocking Submission

Manually block and unblock form submissions. Useful for async validation or complex state conditions. When blocked, `canSubmit` is false.

```ts
form.block('async-check');   // adds a block condition
form.unblock('async-check'); // removes a block condition
```

## formField

Creates a reactive reference to a single field within the nearest form context.

```ts
import { formField } from '@airlib/form';

const name = formField('name');
```

### Field State

```ts
name.value;      // current value
name.error;      // string[] of validation errors
name.valid;      // schema validation result
name.required;   // boolean — is field required by schema
name.touched;    // was ever mutated
name.changed;    // differs from initial value
name.matched;    // cross-field match result (true if no match configured)
name.disabled;   // form is pending
name.name;       // field path string

// Methods
name.input(props, options); // creates a FormInput for this field
name.reset();               // reverts this field to initial value
name.clear();               // clears this field
name.remove();              // if array item, removes it from the array
name.moveUp(count?);        // if array item, moves it up
name.moveDown(count?);      // if array item, moves it down
```

### Cross-Field Matching

Pass a second argument to configure matching. String for equality, function for custom logic. The match function runs inside an Anchor `effect`. Dependencies are tracked — when any referenced field changes, the function re-evaluates.

```ts
// Equality: matched is true when confirmPassword === password
const confirm = formField('confirmPassword', 'password');

// Custom: matched is true when the function returns true
const endDate = formField('endDate', (form) =>
  form.fields['endDate'] > form.fields['startDate']
);
```

## formInput

Creates an input controller that handles string buffering and type conversion. Useful for building input components that need to bridge between display strings and typed values.

```ts
import { formInput } from '@airlib/form';

const input = formInput({ name: 'age', type: 'number' });
```

### Input State

```ts
input.value;       // string — buffered display value
input.checked;     // boolean — checked state for boolean inputs
input.name;        // string — field name
input.type;        // string — input type
input.required;    // boolean — is field required by schema
input.disabled;    // boolean — form pending state
input.error;       // string[] — validation errors
input.valid;       // boolean — schema validation
input.matched;     // boolean — cross-field match result
input.touched;     // boolean — was ever mutated
input.changed;     // boolean — differs from initial

input.settled();   // signal that editing is complete (call on blur)
```

### Parse & Stringify

For non-string field types, provide `parse` and `stringify` options to convert between the display string and the stored value.

```ts
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

## formFactory

Wraps `formState` with a factory pattern for reusable, typed form creation. Useful when the same schema is used across multiple components.

```ts
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

The factory also provides `.get()` to read the current form from context, and `.field()` as a shorthand for `formField`.

```ts
// Read the nearest form from context
const form = createUserForm.get();

// Create a field reference
const name = createUserForm.field('name');
```

## Context Bridge

The core engine uses Anchor's `setContext` / `getContext` for the component tree. If your framework uses a different context system, set a bridge.

```ts
import { setContextBridge } from '@airlib/form';

setContextBridge({
  read: (key) => /* your framework's getContext */,
  write: (key, value) => /* your framework's setContext */,
});
```

## Constants

```ts
import {
  FORM_SYMBOL,         // Symbol for form context
  FORM_FIELD_SYMBOL,   // Symbol for field context
  FORM_STATUS,         // { IDLE, PENDING, SUCCESS, ERROR }
  FORM_INPUT,          // { text, email, number, ... } input type map
} from '@airlib/form';
```
