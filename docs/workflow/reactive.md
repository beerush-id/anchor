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

When you execute a workflow, it returns a `WorkflowStepper`. Because this stepper is a reactive proxy, your UI can automatically track the exact status of the pipeline—down to the specific step currently being executed.

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

This perfectly mirrors the **[IRPC Execution Pattern](/remote-function/transport)**, allowing you to seamlessly debounce and orchestrate browser-only tasks.

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

### `.later(debounce?)`

Creates a deferred `WorkflowStepper` that can be manually dispatched. It accepts an optional `debounce` time (in milliseconds). This is perfect for binding workflows to imperative event handlers like `onClick` while still retaining full reactive telemetry.

```typescript
const task = checkoutFlow.later(150); // Optional 150ms debounce

// Bind the manual trigger directly to the UI
return () => <button onClick={() => task.dispatch({ cartId: '123' })}>Checkout</button>;
```

## Manual Stepping

For wizard-style UIs or approval workflows where each step requires user interaction before proceeding, use `.step()` and `.run()` on the `WorkflowStepper` directly.

| Method | Description |
|--------|-------------|
| `step()` | Advance one step. Returns when that step completes. |
| `step(path, input?)` | Jump to and execute a specific step by path. |
| `run(input)` | Run all remaining steps to completion. |
| `reset()` | Reset the stepper for re-execution. |
| `skip()` | Skip remaining steps and finalize. |

```typescript
import { plan } from '@anchorlib/core';

const onboardingFlow = plan<{ name: string }>()
  .then((input) => ({ ...input, profile: createProfile(input.name) }), { name: 'Creating Profile...' })
  .then((input) => ({ ...input, workspace: createWorkspace(input.profile) }), { name: 'Setting Up Workspace...' })
  .then((input) => ({ ...input, invite: sendWelcomeEmail(input.profile) }), { name: 'Sending Welcome Email...' });

// Create a stepper without auto-running
const stepper = onboardingFlow({ name: 'Alice' });

// Advance one step at a time
await stepper.step(); // Creates profile
await stepper.step(); // Sets up workspace
await stepper.step(); // Sends welcome email

// Or run all remaining steps at once
await stepper.run({ name: 'Alice' });
```

## Persistence

For wizard-style flows or long-running processes where a browser crash or page reload could lose progress, use `snapshot()` and `hydrate()` to persist and restore the stepper's state.

`snapshot()` captures the full state of every step — status, output, and branch state for switches — as a plain, serializable object. `hydrate()` restores the stepper from that snapshot, skipping already-completed steps so execution resumes from where it left off.

```typescript
import { plan } from '@anchorlib/core';

const onboardingFlow = plan<{ name: string }>()
  .then((input) => ({ ...input, profile: createProfile(input.name) }), { name: 'Creating Profile...' })
  .then((input) => ({ ...input, workspace: createWorkspace(input.profile) }), { name: 'Setting Up Workspace...' })
  .then((input) => ({ ...input, invite: sendWelcomeEmail(input.profile) }), { name: 'Sending Welcome Email...' });

// Save progress after each step
const stepper = onboardingFlow({ name: 'Alice' });

stepper.subscribe(() => {
  localStorage.setItem('onboarding', JSON.stringify(stepper.snapshot()));
});

// On page reload, restore from the snapshot
const saved = localStorage.getItem('onboarding');

if (saved) {
  const stepper = onboardingFlow({ name: 'Alice' });
  stepper.hydrate(JSON.parse(saved));
  
  // Continues from the next incomplete step
  await stepper.step();
}
```

## Learn More

- **[Branching Logic](./switch)**: Learn how to execute isolated, conditional branches based on data states.
- **[Observability & Monitoring](./monitoring)**: Learn how to globally monitor execution states and instantly build reactive telemetry dashboards.
