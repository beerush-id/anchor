---
title: 'AIR Form: Configuration'
description: 'Global configuration for form defaults, classes, and behaviors across your application.'
---

# Configuration

Building forms often involves repeating the same class names and options across multiple components. For example, every text input might need the same Tailwind classes, and every form might need the same error styling.

AIR Form provides a global configuration API through `configureForm`. This allows you to set default classes and behaviors once, and have them automatically applied to all forms, fields, and inputs in your application.

## Global Options

To avoid repeating props on every component, we can define global defaults.

::: code-group

```tsx [React]
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

```tsx [SolidJS]
import { configureForm } from '@airlib/solid-form';

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

:::

By calling `configureForm` at the root of your application, every form component will inherit these default classes. If a component encounters an error state (like invalid validation), the `errorClass` is automatically appended to its base class.

### Specific Input Configuration

Different types of inputs often require different default styling. For example, a checkbox looks very different from a text area.

::: code-group

```tsx [React]
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

```tsx [SolidJS]
import { configureForm } from '@airlib/solid-form';

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

:::

The engine automatically applies `INPUT_OPTIONS` as the base, and then merges the specific input options (like `TEXT_INPUT_OPTIONS` or `CHECKBOX_OPTIONS`) on top. This provides a granular styling system without needing to wrap every input in your own custom components.

## Local Overrides

Global defaults provide the baseline, but you often need to override them for specific use cases.

::: code-group

```tsx [React]
<UserForm.Field 
  name="email" 
  label="Email Address" 
  className="custom-field-class"
>
  <EmailInput className="custom-input-class" />
</UserForm.Field>
```

```tsx [SolidJS]
<UserForm.Field 
  name="email" 
  label="Email Address" 
  class="custom-field-class"
>
  <EmailInput class="custom-input-class" />
</UserForm.Field>
```

:::

Any class passed directly to the component will override the global default class for that specific instance. The error and pending classes from the global configuration will still be applied correctly when the state changes.
