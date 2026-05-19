---
title: 'AIR Stack: Reactive Workflows'
description: 'Learn how to bind workflows to reactive state and track pipeline progress natively in the browser.'
keywords:
  - AIR Stack
  - Anchor
  - Workflows
  - Reactive Execution
  - State Tracking
  - UI Binding
---

# Reactive Workflows

When orchestrating complex logic in the browser, you often need to bind the execution of a workflow to user state (e.g., executing a search when an input changes) and track its real-time progress.

Because Anchor workflows are natively integrated with the reactive engine, you can **defer execution** and **track step-by-step progress** without manually managing `useEffect` loops or dependency arrays.

## Reactive Tracking

When you execute a workflow, it returns a `WorkflowReader`. Because this reader is a reactive proxy, your UI can automatically track the exact status of the pipeline—down to the specific step currently being executed.

No more generic "Loading..." spinners. You can show users exactly what the pipeline is doing by reading `reader.current`.

```typescript
import { plan } from '@anchorlib/core';

export const checkoutFlow = plan<{ cartId: string }>()
  .then(validateCart, { name: 'Validating Cart...' })
  .then(processPayment, { name: 'Processing Payment...' })
  .then(generateReceipt, { name: 'Finalizing Order...' });
```

::: code-group
```tsx [React]
import { setup, render, Show } from '@anchorlib/react';
import { checkoutFlow } from './workflow.js';

export const Checkout = setup((props: { cartId: string }) => {
  const reader = checkoutFlow.when(() => ({ cartId: props.cartId }));

  return (
    <div>
      <Show when={() => reader.status === 'pending'}>
        {() => (
          <div className="flex items-center gap-2">
            <span>{reader.current?.name ?? 'Please wait...'}</span>
            <span className="spinner"></span>
          </div>
        )}
      </Show>

      <Show when={() => reader.status === 'success'}>
        {() => <div className="text-green-500">Checkout Complete!</div>}
      </Show>

      <Show when={() => reader.status === 'error'}>
        {() => <div className="text-red-500">{reader.error?.message}</div>}
      </Show>
    </div>
  );
});
```

```tsx [SolidJS]
import { setup, Show } from '@anchorlib/solid';
import { checkoutFlow } from './workflow.js';

export const Checkout = setup((props: { cartId: string }) => {
  const reader = checkoutFlow.when(() => ({ cartId: props.cartId }));

  return (
    <div>
      <Show when={reader.status === 'pending'}>
        {() => (
          <div class="flex items-center gap-2">
            <span>{reader.current?.name ?? 'Please wait...'}</span>
            <span class="spinner"></span>
          </div>
        )}
      </Show>

      <Show when={reader.status === 'success'}>
        {() => <div class="text-green-500">Checkout Complete!</div>}
      </Show>

      <Show when={reader.status === 'error'}>
        {() => <div class="text-red-500">{reader.error?.message}</div>}
      </Show>
    </div>
  );
});
```
:::

## Reactive Execution Bindings

Instead of manually invoking the workflow in an event handler, you can bind it directly to the reactive graph. By using `.once()`, `.with()`, or `.when()`, the workflow will automatically execute based on the reactive dependencies accessed inside its getter function.

This perfectly mirrors the **[IRPC Execution Pattern](../irpc/transport.md)**, allowing you to seamlessly debounce and orchestrate browser-only tasks.

### `.once(input)`

Executes the workflow exactly once, deferring evaluation until the microtask queue flushes. This is useful for initial data fetching where you want to render the UI before kicking off the pipeline.

```typescript
// Fetches the user profile once when the component mounts
const reader = fetchProfile.once({ userId: '123' });
```

### `.with(getter, debounce?)`

Executes the workflow automatically whenever any reactive state accessed inside the getter function changes. It optionally accepts a `debounce` time (in milliseconds) to coalesce rapid state mutations into a single execution.

```typescript
import { mutable } from '@anchorlib/core';

const search = mutable('Anchor framework');

// Automatically re-executes whenever `search.value` changes, 
// debouncing the execution by 300ms.
const reader = searchDocuments.with(() => ({
  query: search.value,
}), 300);
```

### `.when(getter, debounce?)`

Works identically to `.with()`, but it **defers the initial execution**. It will only execute the workflow when a dependency updates after the initial evaluation. This is ideal when the workflow should wait for the user to change an input before firing.

```typescript
import { mutable } from '@anchorlib/core';

const query = mutable('');

// Will NOT execute immediately. It will only execute when `query.value`
// changes, debouncing the execution by 300ms.
const reader = searchDocuments.when(() => ({
  query: query.value
}), 300);
```

### `.later()`

Creates a deferred `WorkflowReader` (which you can think of as an executable task) that allows you to manually dispatch the workflow execution. This is perfect for binding workflows to imperative event handlers like `onClick` while still retaining full reactive telemetry.

```typescript
const task = checkoutFlow.later();

// Bind the manual trigger directly to the UI
return () => <button onClick={() => task.dispatch({ cartId: '123' })}>Checkout</button>;
```

## Learn More

- **[Branching Logic](./switch)**: Learn how to execute isolated, conditional branches based on data states.
- **[Observability & Monitoring](./monitoring)**: Learn how to globally monitor execution states and instantly build reactive telemetry dashboards.
