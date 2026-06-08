# Configuration

Building forms often involves repeating the same class names and options across multiple components. `configureForm` allows you to set default classes and behaviors once, and have them automatically applied to all forms, fields, and inputs in your application.

## Global Options

```tsx
import { configureForm } from '@airlib/react-form';

configureForm({
  form: {
    class: 'space-y-4',
    errorClass: 'border-red-500',
    strict: true,
  },
  field: {
    class: 'flex flex-col gap-1',
    labelClass: 'text-sm font-medium',
    errorClass: 'text-xs text-red-500',
    requiredLabel: '*',
    requiredClass: 'text-red-500 ml-1',
    mismatchLabel: 'Passwords don\'t match',
  },
  input: {
    class: 'px-3 py-2 border rounded',
    errorClass: 'border-red-500 bg-red-50',
  },
  submit: {
    class: 'bg-blue-500 text-white px-4 py-2 rounded',
    pendingClass: 'opacity-50 cursor-not-allowed',
  }
});
```

Every form component inherits these default classes. When a component encounters an error state, the `errorClass` is automatically appended to its base class.

### Specific Input Configuration

Different types of inputs often require different default styling.

```tsx
import { configureForm } from '@airlib/react-form';

configureForm({
  textInput: {
    class: 'w-full px-3 py-2 border rounded',
  },
  checkbox: {
    class: 'w-4 h-4 text-blue-600 rounded',
  },
  file: {
    class: 'file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700',
  }
});
```

The engine automatically applies `input` as the base, then merges specific input options (like `textInput` or `checkbox`) on top.

## Local Overrides

Any class passed directly to a component overrides the global default class for that specific instance. The error and pending classes from the global configuration are still applied correctly when the state changes.

```tsx
<UserForm.Field 
  name="email" 
  label="Email Address" 
  className="custom-field-class"
>
  <EmailInput className="custom-input-class" />
</UserForm.Field>
```

## API Reference

### Structural Components

| Key | Properties | Description |
|---|---|---|
| `form` | `class`, `errorClass`, `strict` | Configuration for the main `<Form>` container. |
| `field` | `class`, `labelClass`, `errorClass`, `requiredLabel`, `requiredClass`, `mismatchLabel` | Configuration for the `<Field>` wrapper, including its internal label and error display. |

### Action Buttons

| Key | Properties | Description |
|---|---|---|
| `submit` | `class`, `pendingClass` | Default classes for `<FormSubmit>` buttons. |
| `reset` | `class`, `pendingClass` | Default classes for `<FormReset>` buttons. |

### Input Components

All input configuration keys share the same property shape: `{ class: string, errorClass: string }`. When validation fails, the `errorClass` is merged with the base `class`.

| Key | Component | Description |
|---|---|---|
| `input` | **Base** | Fallback defaults applied to *all* inputs if a specific type is missing. |
| `textInput` | `<TextInput>` | Standard single-line text fields. |
| `emailInput` | `<EmailInput>` | Email entry fields. |
| `passwordInput` | `<PasswordInput>` | Password entry fields. |
| `numberInput` | `<NumberInput>` | Number entry fields with automatic type conversion. |
| `textarea` | `<Textarea>` | Multi-line text boxes. |
| `checkbox` | `<Checkbox>` | Boolean toggle inputs. |
| `radio` | `<Radio>` | Single-choice inputs from a group. |
| `select` | `<Select>` | Dropdown selection menus. |
| `file` | `<FilePicker>` | File upload inputs. |
| `datePicker` | `<DatePicker>` | Standard HTML date picker. |
| `timePicker` | `<TimePicker>` | Standard HTML time picker. |
| `dateTimePicker` | `<DateTimePicker>` | Combined date and time picker. |
| `colorPicker` | `<ColorPicker>` | Color selection input. |
| `slider` | `<Slider>` | Range slider input. |
