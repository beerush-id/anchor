---
title: "Two-Way Data Binding"
description: "Learn how to create two-way data binding between components in SolidJS using Anchor's binding system."
keywords:
  - two-way binding
  - data binding
  - component binding
  - bindable props
  - solidjs
  - anchor binding
---

# Two-Way Data Binding

Anchor provides a powerful two-way data binding system that allows parent and child components to share and synchronize state seamlessly. This enables child components to both read and modify parent state, creating truly interactive and reusable components.

## Why Two-Way Binding?

In traditional one-way data flow, parent components pass data down to children via props, and children communicate changes back up through callbacks. While this pattern works, it can become verbose for simple cases like form inputs or interactive controls.

Two-way binding simplifies this by allowing:

- **Direct state synchronization** between parent and child components
- **Reduced boilerplate** - no need for separate value and onChange props
- **Reusable components** that work with any state source
- **Type-safe bindings** with full TypeScript support

## Basic Usage

### Creating a Binding

Use the `$bind()` function to create a binding reference that can be passed to child components:

```tsx
import { mutable, $bind } from '@anchorlib/solid';

const Parent = () => {
  const state = mutable({ name: 'John', age: 30 });

  return (
    <div>
      <h1>Name: {state.name}</h1>
      <h1>Age: {state.age}</h1>
      
      {/* Bind to object properties */}
      <TextInput value={$bind(state, 'name')} />
      <NumberInput value={$bind(state, 'age')} />
    </div>
  );
};
```

### Binding to MutableRef

You can also bind directly to a `MutableRef` (primitive value):

```tsx
import { mutable, $bind } from '@anchorlib/solid';

const Parent = () => {
  const count = mutable(0);

  return (
    <div>
      <h1>Count: {count.value}</h1>
      
      {/* Bind to MutableRef - no key needed */}
      <Counter value={$bind(count)} />
    </div>
  );
};
```

## Creating Bindable Components

To create a component that accepts bindable props, use the `bindable()` higher-order component:

```tsx
import { bindable } from '@anchorlib/solid';
import type { Bindable } from '@anchorlib/solid';

interface TextInputProps {
  value: Bindable<string>;
  placeholder?: string;
}

const TextInput = bindable<TextInputProps>((props) => {
  return (
    <input
      type="text"
      value={props.value}
      onInput={(e) => (props.value = e.currentTarget.value)}
      placeholder={props.placeholder}
    />
  );
});
```

The `bindable()` HOC automatically handles binding references, allowing you to read and write to `props.value` as if it were a regular value. When the prop is a binding reference, changes are synchronized with the parent component's state.

## Complete Example

Here's a complete example showing two-way binding in action:

```tsx
import { mutable, $bind, bindable } from '@anchorlib/solid';
import type { Bindable } from '@anchorlib/solid';

// Bindable input component
interface InputProps {
  value: Bindable<string>;
  label?: string;
}

const Input = bindable<InputProps>((props) => {
  return (
    <div>
      {props.label && <label>{props.label}</label>}
      <input
        type="text"
        value={props.value}
        onInput={(e) => (props.value = e.currentTarget.value)}
      />
    </div>
  );
});

// Bindable counter component
interface CounterProps {
  value: Bindable<number>;
}

const Counter = bindable<CounterProps>((props) => {
  return (
    <div>
      <button onClick={() => props.value--}>-</button>
      <span>{props.value}</span>
      <button onClick={() => props.value++}>+</button>
    </div>
  );
});

// Parent component using bindings
const App = () => {
  const user = mutable({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  return (
    <div>
      <h1>User Profile</h1>
      
      {/* Two-way binding to object properties */}
      <Input label="First Name" value={$bind(user, 'firstName')} />
      <Input label="Last Name" value={$bind(user, 'lastName')} />
      <Counter value={$bind(user, 'age')} />
      
      {/* Display synchronized state */}
      <p>Full Name: {user.firstName} {user.lastName}</p>
      <p>Age: {user.age}</p>
    </div>
  );
};
```

::: details Try it Yourself

::: anchor-solid-sandbox

```tsx /App.tsx [active]
import { mutable, $bind, bindable } from '@anchorlib/solid';
import type { Bindable } from '@anchorlib/solid';

interface InputProps {
  value: Bindable<string>;
  label?: string;
}

const Input = bindable<InputProps>((props) => {
  return (
    <div style={{ "margin-bottom": "10px" }}>
      {props.label && <label style={{ display: "block", "margin-bottom": "5px" }}>{props.label}</label>}
      <input
        type="text"
        value={props.value}
        onInput={(e) => (props.value = e.currentTarget.value)}
        style={{ padding: "5px", width: "200px" }}
      />
    </div>
  );
});

interface CounterProps {
  value: Bindable<number>;
}

const Counter = bindable<CounterProps>((props) => {
  return (
    <div style={{ "margin-bottom": "10px" }}>
      <button onClick={() => props.value--}>-</button>
      <span style={{ margin: "0 10px" }}>{props.value}</span>
      <button onClick={() => props.value++}>+</button>
    </div>
  );
});

const App = () => {
  const user = mutable({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
  });

  return (
    <div>
      <h1>User Profile</h1>
      <Input label="First Name" value={$bind(user, 'firstName')} />
      <Input label="Last Name" value={$bind(user, 'lastName')} />
      <Counter value={$bind(user, 'age')} />
      
      <div style={{ "margin-top": "20px", padding: "10px", background: "#f0f0f0" }}>
        <p>Full Name: {user.firstName} {user.lastName}</p>
        <p>Age: {user.age}</p>
      </div>
    </div>
  );
};

export default App;
```

:::

## Advanced Usage

### Optional Bindable Props

You can make bindable props optional by allowing both bindable and regular values:

```tsx
import type { BindableProp } from '@anchorlib/solid';

interface InputProps {
  value: BindableProp<string>; // Can be string OR Bindable<string>
  placeholder?: string;
}

const Input = bindable<InputProps>((props) => {
  return (
    <input
      type="text"
      value={props.value}
      onInput={(e) => (props.value = e.currentTarget.value)}
      placeholder={props.placeholder}
    />
  );
});

// Can be used with or without binding
const App = () => {
  const state = mutable({ name: 'John' });
  
  return (
    <div>
      {/* With binding */}
      <Input value={$bind(state, 'name')} />
      
      {/* Without binding - just a regular value */}
      <Input value="Static value" />
    </div>
  );
};
```

### Props Filtering

Bindable components have access to `$omit()` and `$pick()` utility methods for filtering props:

```tsx
interface MyComponentProps {
  value: Bindable<string>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MyComponent = bindable<MyComponentProps>((props) => {
  // Omit specific props before spreading
  const inputProps = props.$omit(['label', 'className']);
  
  return (
    <div class={props.className}>
      {props.label && <label>{props.label}</label>}
      <input {...inputProps} />
    </div>
  );
});
```

**`$omit(keys)`** - Creates a new object excluding specified properties:

```tsx
// Omit label and className, spread the rest
const restProps = props.$omit(['label', 'className']);
<input {...restProps} />
```

**`$pick(keys)`** - Creates a new object including only specified properties:

```tsx
// Pick only input-related props
const inputProps = props.$pick(['value', 'placeholder', 'disabled']);
<input {...inputProps} />
```

## Type Safety

Anchor's binding system is fully type-safe. **To use `$bind()`, the component prop must be typed with `Bindable<T>`** - TypeScript will enforce this requirement.

### Bindable Type Requirement

```tsx
interface InputProps {
  value: Bindable<string>; // ← Required for $bind() to work
}

const Input = bindable<InputProps>((props) => {
  return <input value={props.value} onInput={...} />;
});

// ✅ Correct: Using $bind() with Bindable<string> prop
const state = mutable({ name: 'John' });
<Input value={$bind(state, 'name')} />

// ❌ Type Error: Cannot use $bind() with regular string prop
interface BadInputProps {
  value: string; // Not Bindable<string>
}
// <BadInput value={$bind(state, 'name')} /> // TypeScript error!
```

### Type-Safe Property Binding

TypeScript ensures you only bind to valid properties with matching types:

```tsx
interface User {
  name: string;
  age: number;
}

const user = mutable<User>({ name: 'John', age: 30 });

// ✅ Type-safe: 'name' is a valid key of User
<Input value={$bind(user, 'name')} />

// ❌ Type error: 'email' is not a key of User
// <Input value={$bind(user, 'email')} />

// ✅ Type-safe: age is number
<Counter value={$bind(user, 'age')} />

// ❌ Type error: age is number, not string
// <Input value={$bind(user, 'age')} />
```

## Best Practices

### Use Bindings for Interactive Controls

Two-way binding is ideal for form inputs, sliders, toggles, and other interactive controls:

```tsx
<TextInput value={$bind(form, 'email')} />
<Checkbox checked={$bind(settings, 'darkMode')} />
<Slider value={$bind(audio, 'volume')} />
```

### Prefer One-Way Flow for Complex Logic

For complex state transformations or validation, consider using one-way data flow with explicit callbacks:

```tsx
// Instead of binding directly
<Input 
  value={user.email}
  onInput={(value) => {
    // Validate and transform
    if (isValidEmail(value)) {
      user.email = value.toLowerCase();
    }
  }}
/>
```

### Combine with Computed Properties

Use bindings with computed properties for derived state:

```tsx
const state = mutable({
  firstName: 'John',
  lastName: 'Doe',
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
});

// Bind to individual properties
<Input value={$bind(state, 'firstName')} />
<Input value={$bind(state, 'lastName')} />

// Display computed result
<p>{state.fullName}</p>
```

## API Reference

### `$bind(source, key?)`

Creates a binding reference for two-way data binding.

> **Note:** `bind()` is also available as an alias for `$bind()`.

> **Important:** The target component prop must be typed with `Bindable<T>` for TypeScript to accept `$bind()`.

**Parameters:**
- `source` - The source object or MutableRef to bind to
- `key` (optional) - The property key to bind to (not needed for MutableRef)

**Returns:** A `BindingRef` or the original `MutableRef`

**Examples:**

```tsx
// Bind to object property
$bind(user, 'name')

// Bind to MutableRef
$bind(count)
```

### `bindable(Component)`

Higher-order component that wraps a component to handle bindable props.

**Parameters:**
- `Component` - The component to make bindable

**Returns:** A wrapped component with binding support

**Example:**

```tsx
const Input = bindable<InputProps>((props) => {
  return <input value={props.value} onInput={...} />;
});
```

### `BindingRef<S, V>`

A reference class that binds a value to a property of an object or another reference.

**Properties:**
- `source` - The source object or reference
- `key` - The property key being bound to
- `value` - Getter/setter for the bound value

### Props Utility Methods

Bindable component props include utility methods for filtering:

#### `props.$omit(keys)`

Creates a new object excluding specified properties from props.

**Parameters:**
- `keys` - Array of property keys to exclude

**Returns:** A new object with specified keys omitted

**Example:**

```tsx
const restProps = props.$omit(['label', 'className']);
<input {...restProps} />
```

#### `props.$pick(keys)`

Creates a new object including only specified properties from props.

**Parameters:**
- `keys` - Array of property keys to include

**Returns:** A new object with only specified keys

**Example:**

```tsx
const inputProps = props.$pick(['value', 'placeholder', 'disabled']);
<input {...inputProps} />
```

### Type Utilities

- `Bindable<T>` - Represents a bindable value with getter/setter
- `BindableProp<T>` - Union type: `T | Bindable<T>`
- `BindableProps<P>` - Transforms props to accept bindable values
- `BindableComponentProps<P>` - Extended props with binding support and utility methods

## Related

- [Mutable State](/solid/state/mutable) - Creating reactive state
- [API Reference](/apis/solid/) - Complete API documentation
