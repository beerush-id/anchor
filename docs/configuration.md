---
title: 'Anchor Usage Guide: Getting Started with Anchor State Management'
description: 'Learn how to use Anchor for state management in your web applications. This guide covers basic usage, configuration options, and provides examples to get you started.'
keywords:
  - anchor usage
  - anchor guide
  - javascript state management
  - anchor configuration
  - anchor api
  - anchor examples
  - state management guide
---

# Anchor Configuration Guide

Before getting started with Anchor, ensure you have followed the [installation](/installation) instructions.
This guide will provide a basic introduction to Anchor's core functionality for state management in web applications.

## **Configuring Anchor**

Anchor works out of the box with zero configuration. However, for advanced use cases, you can customize behavior through
global configuration or per-state options:

### **Default Configuration**

You can configure Anchor's default configurations using `anchor.configure`:

```typescript
import { anchor } from '@anchorlib/core';

anchor.configure({
  immutable: true, // Enable true immutability as default
});
```

::: tip Important Note

While Anchor value and support true immutability model, its core mental is to provide an intuitive and easy-to-use API
to work with state. That's why we don't enable true immutability by default, as we don't want to force you to work with
immutable state everywhere.

:::

### **Per-State Configuration**

You can also configure options when creating individual states, overriding the default configuration:

```typescript
import { anchor } from '@anchorlib/core';

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

### **Available Configuration Options**

- **`immutable`** **_boolean_**: Enables true immutability. The returned state will become read-only (Default: `false`).
- **`observable`** **_boolean_**: Disables observation, state can be only derived (Default: `true`).
- **`recursive`** **_`true`|`false`|`'flat'`_**: Enables recursive/nested state (Default: `true`).

::: tip Flat Recursion

When a state is configured with `recursive: 'flat'`, it will only notify for array mutations while maintains nested
reactivity. This can be useful when you have a large array and you only need to react to array mutations.

**Note:** This option only applicable for derivation. Observation will always respect the fine-grained tracking.

:::

## **Anchor APIs**

Anchor provides a set of APIs to manage state. For a complete reference of the core APIs, please refer to:

- [Anchor Core API Reference](/apis/core/initialization) - Core APIs for initializing and managing state.
- [Anchor for React API Reference](/apis/react/initialization) - React APIs for integrating with React.
- [Anchor for Svelte API Reference](/apis/svelte/initialization) - Svelte APIs for integrating with Svelte.
- [Anchor for Vue API Reference](/apis/vue/initialization) - Vue APIs for integrating with Vue.

## **Example**

Below is a simple example of how to use Anchor.

::: code-group

```typescript [counter.ts]
import { anchor, subscribe } from '@anchorlib/core';

const counter = anchor({ count: 0 });

// Subscribe to changes
const view = document.getElementById('counter');
subscribe(counter, () => {
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
import { anchor } from '@anchorlib/core';
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
import { createObserver } from '@anchorlib/core';

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

Congratulations! You just created a simple custom renderer! 😏

:::
