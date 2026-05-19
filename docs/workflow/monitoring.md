---
title: 'AIR Stack: Workflow Observability'
description: 'Monitor execution states globally and build instant reactive telemetry dashboards for your Anchor workflows without explicit instrumentation.'
keywords:
  - AIR Stack
  - Anchor
  - Workflows
  - Observability
  - Telemetry
  - Dashboard
  - Reactivity
---

# Observability

Monitoring complex pipelines in production often requires manually littering your business logic with telemetry and tracking code.

To keep logic clean, workflows are **inherently observable**. The `WorkflowStore` acts as a **centralized, event-driven observer**, maintaining a live map of all pipelines, their steps, and active execution instances **without requiring explicit developer instrumentation**.

## Logging and Telemetry

To send telemetry data (like execution times or errors) to external services without polluting your pipeline steps, you can globally subscribe to the store.

::: code-group
```typescript [React]
import { WORKFLOW_STORE } from '@anchorlib/react';

WORKFLOW_STORE.subscribe((event) => {
  if (event.type === 'DEQUEUE_WORKFLOW') {
    if (event.error) {
      Datadog.logError(`Workflow ${event.instance.id} failed`, event.error);
    } else {
      Datadog.logSuccess(`Workflow ${event.instance.id} completed`, event.output);
    }
  }
});
```

```typescript [SolidJS]
import { WORKFLOW_STORE } from '@anchorlib/solid';

WORKFLOW_STORE.subscribe((event) => {
  if (event.type === 'DEQUEUE_WORKFLOW') {
    if (event.error) {
      Datadog.logError(`Workflow ${event.instance.id} failed`, event.error);
    } else {
      Datadog.logSuccess(`Workflow ${event.instance.id} completed`, event.output);
    }
  }
});
```
:::

## Dashboard Integration

If you are building an admin dashboard to monitor system health, you can directly access the currently executing pipelines. Because the store collections are built with **Anchor's `mutable` primitive**, they are natively reactive. You do not need manual subscriptions or state synchronization.

::: code-group
```tsx [React]
import { setup, render, WORKFLOW_STORE } from '@anchorlib/react';

export const WorkflowDashboard = setup(() => {
  const { workflows, steps, runningWorkflows } = WORKFLOW_STORE;

  return render(() => (
    <div className="dashboard-stats">
      <span>Total Workflows: {workflows.size}</span>
      <span>Total Steps: {steps.size}</span>
      <span>Active Jobs: {runningWorkflows.size}</span>
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup, WORKFLOW_STORE } from '@anchorlib/solid';

export const WorkflowDashboard = setup(() => {
  const { workflows, steps, runningWorkflows } = WORKFLOW_STORE;

  return (
    <div class="dashboard-stats">
      <span>Total Workflows: {workflows.size}</span>
      <span>Total Steps: {steps.size}</span>
      <span>Active Jobs: {runningWorkflows.size}</span>
    </div>
  );
});
```
:::

## Learn More

- **[Plan & Recover](./plan)**: Revisit the foundational pipeline primitives.
- **[IRPC Overview](../irpc/index.html)**: Learn how workflows integrate seamlessly as remote functions in the IRPC ecosystem.
