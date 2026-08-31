# AirLib Form

AirLib Form is a reactive, framework-agnostic form engine powered by Zod schemas.

## AirLib Integration

To use AirLib Form inside a reactive component, create a typed form factory outside the component, and initialize the form state within the component's `setup` phase.

```tsx
import { setup, render } from '@airlib/react';
import { formState } from '@airlib/form';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  age: z.number().min(18, 'Must be an adult'),
});

export const UserForm = setup((props) => {
  const form = formState(userSchema, { 
    value: { name: '', age: 0 } 
  });

  return render(() => (
    <form>
      {/* UI logic goes here */}
    </form>
  ));
});
```

The `formState` function creates a reactive store typed to the schema and integrated with the reactive rendering cycle.

## Field Selection

To access a specific field within the form, use the `formField` function or the `.field()` method.

```tsx
import { formField } from '@airlib/form';

export const UserForm = setup((props) => {
  const form = formState(userSchema, { value: { name: '', age: 0 } });
  const name = formField('name');

  return render(() => (
    <div>
      <input 
        value={name.value} 
        onInput={(e) => { name.value = e.currentTarget.value; }} 
      />
      {!name.valid && <span>{name.error}</span>}
    </div>
  ));
});
```

Each field provides reactive access to `value`, `error`, `valid`, `changed`, `touched`, `matched`, and `disabled`.

## Touched Tracking

Fields are marked as touched when their value is first mutated. This happens inside the form's setter, requiring no manual `onBlur` handlers.

```tsx
const name = formField('name');

// Before any mutation
name.touched; // false

// After value change
name.value = 'Alice';
name.touched; // true — stays true until reset
```

Touched state persists even if the value reverts to its original. A field can be `changed: false` but `touched: true` — "you were here."

## Cross-Field Matching

To validate that one field equals another, pass a `match` parameter to `formField`.

```tsx
const confirm = formField('confirmPassword', 'password');

confirm.matched; // true when values are equal
confirm.valid;   // schema validation only — independent of matched
```

For custom cross-field logic beyond equality, pass a function.

```tsx
const endDate = formField('endDate', (form) =>
  form.fields['endDate'] > form.fields['startDate']
);
```

The function runs inside an `effect`, so Anchor tracks which fields it reads and re-evaluates when any of them change.

`valid` and `matched` are separate signals. `valid` is schema-only. `matched` is match-only. The view layer composes them however it wants.

## Input Controllers

To bind a field to a UI input, use the `.input()` method to generate an input controller.

```tsx
export const UserForm = setup<UserFormProps>((props) => {
  const form = formState(userSchema, props);
  
  const name = form.field('name').input({ type: 'text' });
  const age = form.field('age').input({ type: 'number' });

  return render(() => (
    <form>
      <input 
        type={name.type} 
        name={name.name}
        value={name.value}
        disabled={name.disabled}
        onInput={(e) => { name.value = e.currentTarget.value; }}
        onBlur={() => { name.settled(); }}
      />
      
      <input 
        type={age.type} 
        name={age.name}
        value={age.value}
        disabled={age.disabled}
        onInput={(e) => { age.value = e.currentTarget.value; }}
        onBlur={() => { age.settled(); }}
      />
    </form>
  ));
});
```

The input controller handles two-way data binding, string parsing, event synchronization, and inherits the form's `pending` state via the `disabled` property to lock inputs during network submission.

## Form Context

To build composable input components without passing props, use the `formField` API to inherit the form context.

```tsx
import { formField, FormInputType } from '@airlib/form';
import { setup, render } from '@airlib/react';

export const TextInput = setup<{ name: string, label: string, type?: FormInputType }>((props) => {
  const input = formField<string>(props.name).input(props);

  return render(() => (
    <div className="field-group">
      <label>{props.label}</label>
      <input 
        type={input.type}
        name={input.name}
        value={input.value}
        disabled={input.disabled}
        onInput={(e) => { input.value = e.currentTarget.value; }}
        onBlur={() => { input.settled(); }}
      />
      {!input.valid && <span className="error">{input.error}</span>}
    </div>
  ));
});
```

The `formField` function discovers the closest form provider in the component tree.

## Form Submission

The `.submit()` method handles the complete submission lifecycle. It executes the provided handler, tracks the network status (`IDLE`, `PENDING`, `SUCCESS`, `ERROR`), prevents concurrent race conditions by locking the form, and maps its `pending` status down to the `disabled` state of all connected input fields. 

On a successful submission, the form cleans up its dirty state (dropping `form.changed` to `false`) making the submitted data the new baseline.

```tsx
export const ProfileForm = setup(() => {
  const form = formState(userSchema, { value: { name: '', age: 0 } });

  const saveProfile = async (data: { name: string, age: number }) => {
    await fetch('/api/user', { method: 'POST', body: JSON.stringify(data) });
  };

  return render(() => (
    <form>
      {/* ... Form inputs ... */}

      <button 
        disabled={!form.canSubmit}
        onClick={(e) => {
          e.preventDefault();
          form.submit(saveProfile);
        }}
      >
        {form.pending ? 'Saving...' : 'Save Profile'}
      </button>

      {form.status === 'error' && (
        <div className="error-banner">{form.error?.message}</div>
      )}
    </form>
  ));
});
```

By relying on `.submit(handler)`, developers avoid boilerplate loading-states, manual network try/catch blocks, and dirty-state reset procedures across the application.
