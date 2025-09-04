# Usage

Before getting started with Anchor, ensure you have followed the [installation](/installation) instructions.
This guide will provide a basic introduction to Anchor's core functionality.

## Basic Usage

After installing the appropriate packages, you can start using **Anchor** in your project. Here's a basic example with
the core package:

```typescript
import { anchor, derive } from '@anchor/core';

// Create a reactive state.
const state = anchor({
  count: 0,
  name: 'Anchor',
  items: [],
});

// Logs each state change to console.
derive(state, console.log);

// Access state properties.
console.log(state.count); // 0

// Mutate state directly
state.count++;
state.name = 'Updated Name';
state.items.push({ id: 1, text: 'First item' });

// Each change above will logs the event to console.
```

> For framework-specific usage, refer to the respective framework guides.

## Configurations

Anchor works out of the box with zero configuration. However, for advanced use cases, you can customize behavior through
global configuration or per-state options:

### Default Configuration

You can configure Anchor's default configurations using `anchor.configure`:

```typescript
import { anchor } from '@anchor/core';

anchor.configure({
  immutable: true, // Enable true immutability as default
});
```

::: tip Important Note

While Anchor value and recommends the true-immutability model, its core mental is to provide an intuitive and easy-to-use API
to work with state. That's why we don't enable true immutability by default, as we don't want to force you to work with
immutable state everywhere.

:::

### Per-State Configuration

You can also configure options when creating individual states, overriding the default configuration:

```typescript
import { anchor } from '@anchor/core';

const state = anchor(
  {
    count: 0,
    name: 'Anchor',
  },
  // Options
  {
    observable: false, // Disable observation, state can be only derived.
  }
);
```

### Available Options

- **`immutable`** **_boolean_**: Enables true immutability. The returned state will become read-only (Default: `false`).
- **`observable`** **_boolean_**: Disables observation, state can be only derived (Default: `true`).
- **`recursive`** **_`true`|`false`|`'flat'`_**: Enables recursive/nested state (Default: `true`).

::: tip Flat Recursion

When a state is configured with `recursive: 'flat'`, it will only notify for array mutations while maintains nested
reactivity. This can be useful when you have a large array, and you only need to react to array mutations.

**Note:** This option only applicable for derivation. Observation will always respect the fine-grained tracking.

:::

::: details Flat Sample

```ts
import { anchor, derive } from '@anchor/core';

const state = anchor(
  [
    {
      username: 'john',
      profile: {
        name: 'John Doe',
      },
    },
  ],
  { recursive: 'flat' }
);

derive(state, console.log); // Will only log for array mutations.
derive(state[0], console.log); // Child objects remain reactive, this will log all changes.
```

:::

::: details Non Recursive Sample

```ts
import { anchor, derive } from '@anchor/core';

const state = anchor(
  [
    {
      username: 'john',
      profile: {
        name: 'John Doe',
      },
    },
  ],
  { recursive: false }
);

derive(state, console.log); // Will only log for array mutations.
derive(state[0], console.log); // Will do nothing since the child objects are not reactive.
```

:::

## APIs

Anchor provides a set of APIs to manage state:

### **`anchor`**

This function is used to creates a reactive state with optional configuration.

```ts
// Create a reactive state with optional configuration.
type anchor = <T, S>(init: T, options?: StateOptions<S>) => T;
```

```ts
// Create a reactive state with schema.
type anchor = <S, T>(init: T, schema: S, options?: StateBaseOptions) => T;
```

#### Options

Each option is optional and can be used to configure the state.

- **`immutable`** **_boolean_**: Enable/disable true immutability.
- **`observable`** **_boolean_**: Enable/disable observation.
- **`recursive`** **_`true`|`false`|`'flat'`_**: Enable/disable recursive state.
- **`schema`**: Schema to validate the state.

#### Usage

```typescript
// Create a reactive state.
const state = anchor(initialState, options);
```

```typescript
// Create a reactive state with schema.
const state = anchor(initialState, schema, options);
```

#### Parameters

- **`initialState`**: The initial object of the state.
- **`options`** **_[optional]_**: Options to configure the state.
- **`schema`** **_[optional]_**: Schema to validate the state.

### **`anchor.model`**

Creates a reactive state with schema validation.

```ts
type model = <S, T>(init: T, schema: S, options?: StateBaseOptions) => T;
```

### **`anchor.immutable`**

Creates an immutable reactive state.

```ts
// Without schema
type immutable = <T, S>(init: T, options?: StateOptions<S>) => Immutable<T>;

// With schema
type immutable = <S, T>(init: T, schema: S, options?: StateBaseOptions) => Immutable<T>;
```

### **`anchor.get`**

Gets the current state value.

```ts
type get = <T>(state: State<T>) => T;
```

### **`anchor.snapshot`**

Creates a snapshot of the current state.

```ts
type snapshot = <T>(state: State<T>) => T;
```

### **`anchor.writable`**

Create a write contract to mutate a state.

```ts
// Make entire state writable
type writable = <T>(state: T) => Mutable<T>;

// Make specific keys writable
type writable = <T, K>(state: T, contracts?: K) => MutablePart<T, K>;
```

## Batch APIs

### **`anchor.assign`**

Assigns properties from source to target object.

```ts
type assign = {
  <T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>): void;
  <T>(target: T[], source: { [key: string]: T } | Record<string, T>): void;
  <T>(target: T, source: Partial<T>): void;
};
```

### **`anchor.remove`**

Removes keys from a collection.

```ts
type remove = {
  <T, K>(target: Map<T, K>, ...keys: Array<T>): void;
  <T>(target: T[], ...keys: Array<string>): void;
  <T>(target: T, ...keys: Array<keyof T>): void;
};
```

### **`anchor.clear`**

Clears all entries from a collection.

```ts
type clear = <T>(target: T) => void;
```

## Helper APIs

### **`anchor.configure`**

Configures global Anchor settings.

```ts
type configure = (config: Partial<AnchorSettings>) => void;
```

### **`anchor.configs`**

Gets the global Anchor settings.

```ts
type configs = () => AnchorSettings;
```

### **`anchor.destroy`**

Destroys a reactive state and cleans up all associated resources.

```ts
type destroy = <T extends State>(state: T) => void;
```

::: warning Use With Caution

While it's always recommended to clean up resources when they're no longer needed, it's important to note
this helper is most relevant for a local state. Destroying a global state could lead to unexpected behavior.

**Note**: This helper is designed for internal use or library authors.

:::

## Examples

### Simple Counter

::: code-group

```typescript [counter.ts]
import { anchor, derive } from '@anchor/core';

const counter = anchor({ count: 0 });

// Subscribe to changes
const view = document.getElementById('counter');
derive(counter, () => {
  view.innerHTML = counter.count;
});

// Trigger updates
const button = document.getElementById('increment');
button.addEventListener('click', () => {
  counter.count++; // Increment the count
});
```

```html [index.html]
<div id="counter"></div>
<button id="increment">Increment</button>
```

::: info Yes

Yes, you can build custom rendering system using **Anchor**, but don't try that. ✌️

> **But I'm insisted!**

:::

::: details Okay, here we go!

### Build Your Own Rendering System

To build your own rendering system, you need to understand the component shape.

#### Component Shape

- **Setup** - A function that returns a template factory. This function is called once when the component is created.
- **Template Factory** - A function that returns the DOM Element. This function is called every time the state changes.

::: code-group

```ts [component.ts]
import { anchor } from '@anchor/core';
import { mount, type DOMFactory } from './renderer.js';

function Counter() {
  // Setup phase.
  const state = anchor({ count: 1 });

  const view = document.createElement('div');
  view.setAttribute('class', 'text-slate-300 font-bold text-lg mb-2');

  const button = document.createElement('button');
  button.setAttribute('class', 'bg-blue-500 text-blue-50 px-4 py-2 rounded-md');

  button.textContent = 'Increment';
  button.addEventListener('click', () => {
    state.count++;
  });

  console.log('Component setup done (run once).');

  // Render phase.
  return (() => {
    console.log('Rendering the view (re-run on state change).');

    view.textContent = `Count: ${state.count}`;
    return [view, button];
  }) as DOMFactory;
}

// Render component to the DOM.
mount(Counter, document.body);
```

```ts [renderer.ts]
import { createObserver } from '@anchor/core';

export type DOMFactory = () => HTMLElement | HTMLElement[];
export type ComponentFactory = () => DOMFactory;

// Create a renderer fucntion that take cares of state tracking and component setup.
function createRenderer(component: ComponentFactory): () => HTMLElement | HTMLElement[] {
  const onChange = (() => {
    // Re-render when the state changed.
    render();
  }) satisfies StateObserver['onChange'];

  const observer = createObserver(onChange); // Create the observer to track the state.
  const template = observer.run(() => component()) as DOMFactory; // Track the state read during component setup.

  const render = () => {
    // Render the template while tracking the state read.
    return observer.run(() => template()) as HTMLElement | HTMLElement[];
  };

  return render;
}

// Create a function that renders component to the target element.
export function mount(component: ComponentFactory, target: HTMLElement) {
  const render = createRenderer(component);
  const elements = render();

  if (Array.isArray(elements)) {
    for (const element of elements) {
      target.appendChild(element);
    }
  } else {
    target.appendChild(elements);
  }
}
```

Congratulations! You just created a simple custom renderer! 🤣

:::
