---
title: 'AIR Stack: Workflow Branching Logic'
description: 'Declaratively route asynchronous execution paths based on state, replacing complex if/else trees with isolated, type-safe workflow branches.'
keywords:
  - AIR Stack
  - Anchor
  - Workflows
  - Branching
  - State Machine
  - Conditional Execution
---

# Branching Logic

When a process has **multiple potential outcomes**—like a payment succeeding or failing—handling them with **nested `if/else` statements** quickly makes the code **impossible to read** and track.

To solve this, you need a way to **declaratively route the execution path** based on the state of the data, ensuring only the relevant sequence of steps is executed.

You can achieve this using the **`.switch()`** method. It accepts either a **key name** or a custom **matcher function** to cleanly handle **conditional routing**.

## Key-Based Branching

Each route in a switch block receives an **isolated branch builder**, allowing you to independently chain steps for that specific outcome.

```typescript
import { plan } from '@irpclib/irpc';

const paymentFlow = plan<{ method: 'card' | 'paypal'; amount: number }>()
  .switch('method', {
    card: (resolve) => resolve((input) => processCard(input.amount)),
    paypal: (resolve) => resolve((input) => processPaypal(input.amount)),
    default: (resolve) => resolve(() => { throw new Error('Invalid method'); }),
  });

irpc.construct(processPayment, (method, amount) => {
  return paymentFlow({ method, amount });
});
```

::: code-group
```tsx [React]
import { setup, render, mutable } from '@anchorlib/react';
import { processPayment } from './function.js';

export const PaymentForm = setup(() => {
  const isPending = mutable(false);

  const pay = async () => {
    isPending.value = true;
    try {
      const result = await processPayment('card', 100);
      console.log(result);
    } finally {
      isPending.value = false;
    }
  };

  return render(() => (
    <button onClick={pay} disabled={isPending.value}>
      {isPending.value ? 'Processing...' : 'Pay Now'}
    </button>
  ));
});
```

```tsx [SolidJS]
import { setup, mutable } from '@anchorlib/solid';
import { processPayment } from './function.js';

export const PaymentForm = setup(() => {
  const isPending = mutable(false);

  const pay = async () => {
    isPending.value = true;
    try {
      const result = await processPayment('card', 100);
      console.log(result);
    } finally {
      isPending.value = false;
    }
  };

  return (
    <button onClick={pay} disabled={isPending.value}>
      {isPending.value ? 'Processing...' : 'Pay Now'}
    </button>
  );
});
```
:::

## Matcher Function Branching

For complex conditions, supply a synchronous or asynchronous matcher function.

```typescript
import { plan } from '@irpclib/irpc';

const riskAssessmentFlow = plan<{ userId: string }>()
  .switch(
    async (input) => {
      const score = await getRiskScore(input.userId);
      return score > 90 ? 'high' : 'low';
    },
    {
      high: (resolve) => resolve(() => flagForReview()),
      low: (resolve) => resolve(() => approveInstantly()),
    }
  );

irpc.construct(assessRisk, (userId) => riskAssessmentFlow({ userId }));
```

::: code-group
```tsx [React]
import { setup, render, mutable } from '@anchorlib/react';
import { assessRisk } from './function.js';

export const RiskPanel = setup((props: { userId: string }) => {
  const isPending = mutable(false);

  const check = async () => {
    isPending.value = true;
    try {
      const result = await assessRisk(props.userId);
      console.log(result);
    } finally {
      isPending.value = false;
    }
  };

  return render(() => (
    <button onClick={check} disabled={isPending.value}>
      {isPending.value ? 'Assessing...' : 'Assess Risk'}
    </button>
  ));
});
```

```tsx [SolidJS]
import { setup, mutable } from '@anchorlib/solid';
import { assessRisk } from './function.js';

export const RiskPanel = setup((props: { userId: string }) => {
  const isPending = mutable(false);

  const check = async () => {
    isPending.value = true;
    try {
      const result = await assessRisk(props.userId);
      console.log(result);
    } finally {
      isPending.value = false;
    }
  };

  return (
    <button onClick={check} disabled={isPending.value}>
      {isPending.value ? 'Assessing...' : 'Assess Risk'}
    </button>
  );
});
```
:::

## Learn More

- **[Observability & Monitoring](./monitoring)**: Learn how to instantly build reactive telemetry dashboards for your workflows.
- **[Plan & Recover](./plan)**: Understand the core pipeline orchestration primitives.
