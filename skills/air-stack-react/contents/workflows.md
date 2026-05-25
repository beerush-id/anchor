### 2. Workflows (`@anchorlib/core`)
Transforms deeply nested `try/catch` and manual state handling into flat, Promise-like chains that run anywhere JavaScript runs.

### Workflow: API Signatures
```typescript
type WorkflowData = Record<string, unknown>;

type WorkflowMeta = {
  name?: string;
  description?: string;
  input?: any;   // Schema validation
  output?: any;  // Schema validation
};

// Base initialization. Accepts optional base workflow to inherit.
function plan<Input extends WorkflowData>(baseFlow?: Workflow<any, any>): Workflow<Input, Input>;

interface Workflow<I extends WorkflowData, O extends WorkflowData> {
  // The pipeline is natively callable and returns a reactive Promise (WorkflowReader)
  (input: I): WorkflowReader<O>;

  // Add a sequential transform step
  then<R extends WorkflowData>(fn: (input: O) => R | Promise<R>, meta?: WorkflowMeta): Workflow<I, R>;
  
  // Add a conditional branch point using a discriminant key
  switch<K extends keyof O & string, C extends SwitchCases<O, K>>(key: K, cases: C, meta?: WorkflowMeta): Workflow<I, SwitchOutput<C>>;
  
  // Add a conditional branch point using a custom matcher
  switch<U extends string | number | boolean, C extends SwitchCasesFn<O, U>>(matcher: (input: O) => U | Promise<U>, cases: C, meta?: WorkflowMeta): Workflow<I, SwitchOutput<C>>;

  // Trap errors to safely resume execution with fallback data
  catch<R extends WorkflowData>(fn: (error: Error, input: O) => R | Promise<R>, meta?: WorkflowMeta): Workflow<I, O | R>;
  
  // Guaranteed cleanup. Does not mutate output.
  finally(fn: (input: O, error?: Error) => void | Promise<void>, meta?: WorkflowMeta): Workflow<I, O>;

  // Reactive Execution Bindings
  once(input: I): WorkflowReader<O>;
  with(getInput: () => I, debounce?: number): WorkflowReader<O>;
  when(getInput: () => I, debounce?: number): WorkflowReader<O>;
  later(debounce?: number): WorkflowReader<O> & { dispatch: (input: I) => void };
}

// WorkflowReader extends Promise, so it can be awaited normally while also exposing reactive UI properties.
interface WorkflowReader<T> extends Promise<T> {
  status: 'pending' | 'success' | 'error' | 'aborted';
  current: { name?: string; status: string; error?: Error }; // State of the currently active step
  data?: T;      // Pipeline output
  error?: Error; // Pipeline error
  close(): void; // Manually abort the pipeline
}
```

### Workflow: Planning & Composition
A Workflow pipeline accepts **exactly one argument** (the input state). They are built with sequential `.then()` blocks.

```typescript
import { plan } from '@anchorlib/core';
import { lockInventory, processPayment, releaseInventory, verifySession } from './functions.js'; // IRPC Stubs

// Standalone Pipeline
export const processOrderFlow = plan<{ cartId: string; userId: string }>()
  .then(async (input) => {
    const inventory = await lockInventory(input.cartId);
    return { ...input, inventory };
  }, { name: 'Reserving Inventory...' })
  .then(async (input) => {
    const payment = await processPayment(input.userId, input.cartId);
    return { ...input, paymentId: payment.id };
  }, { name: 'Processing Payment...' })
  .catch(async (err, input) => {
    // Return fallback data to exit the error state and resume execution, or throw to cascade
    if (input.inventory) await releaseInventory(input.inventory.id);
    throw err;
  })
  .finally((input, err) => {
    // Guaranteed cleanup regardless of success or failure. Does not mutate output.
    console.log(`Order process finished for cart ${input.cartId}. Error?`, !!err);
  });
```

```typescript
// Reusable Pipeline Composition (Optional)
// Pass an existing workflow into `plan(baseFlow)` to inherit its steps.
const authFlow = plan<{ token: string; cartId: string }>()
  .then(async (input) => {
    const session = await verifySession(input.token);
    return { ...input, session };
  });

export const secureOrderFlow = plan(authFlow)
  .then(async (input) => {
    // Inherits the state shape from authFlow, including the injected 'session'
    const inventory = await lockInventory(input.cartId);
    return { ...input, inventory };
  });
```

### Workflow: Schema Validation
Workflows natively support zero-dependency duck-typed schema validation (Zod, Valibot, custom validators). You can validate the global pipeline boundaries or strictly enforce intermediate step outputs.

```typescript
import { plan } from '@anchorlib/core';
import { z } from 'zod';
import { provisionDatabase } from './functions.js'; // IRPC Stub

const appSchema = z.object({
  name: z.string().min(3),
  region: z.enum(['us-east', 'eu-west']).default('us-east'),
});

// Global Pipeline Validation
// The pipeline input type is automatically inferred from the schema.
export const deployAppFlow = plan({
  input: appSchema,
  output: z.object({ success: z.boolean(), dbUrl: z.string() }),
})
  .then(
    async (app) => {
      // 'app' is strictly inferred as { name: string, region: 'us-east' | 'eu-west' }
      // Zod transformations (like .default) are applied BEFORE this step runs.
      
      // Orchestrating IRPC function
      const db = await provisionDatabase(app.name, app.region);
      return { success: true, dbUrl: db.url };
    },
    // Intermediate Step Validation
    // Enforce validation at the step boundary to prevent corrupted state from cascading.
    { output: z.object({ success: z.boolean(), dbUrl: z.string().url() }) }
  );
```

### Workflow: Branching Logic
When a process has multiple potential outcomes, use `.switch()` to declaratively route the execution path instead of relying on unreadable nested `if/else` statements. Each route receives an isolated branch builder to independently chain steps for that specific outcome.

```typescript
import { plan } from '@anchorlib/core';
import { processCard, processPaypal, flagForReview, autoApprove } from './functions.js'; // IRPC Stubs

// Key-Based Branching
// Routes execution based on the value of a specific property in the input state.
export const paymentFlow = plan<{ method: 'card' | 'paypal'; amount: number }>()
  .switch('method', {
    card: (resolve) => resolve(async (input) => processCard(input.amount)),
    paypal: (resolve) => resolve(async (input) => processPaypal(input.amount)),
    default: (resolve) => resolve(() => { throw new Error('Invalid method'); }),
  });

// Matcher Function Branching
// Routes execution based on a custom synchronous or asynchronous condition.
export const riskAssessmentFlow = plan<{ userId: string; score: number }>()
  .switch(
    (input) => (input.score > 90 ? 'high' : 'low'), // Custom matcher
    {
      high: (resolve) => resolve(async (input) => flagForReview(input.userId)),
      low: (resolve) => resolve(async (input) => autoApprove(input.userId)),
    }
  );
```

### Workflow: Execution
Workflows resolve natively as standard Promises when awaited. Because they are environment agnostic, they can be executed anywhere (Backend, CLI, Workers) or bound to a UI.

```typescript
// IRPC Handler Execution (Most Common Backend Pattern)
// Wrap the workflow in an IRPC handler to expose it safely to the frontend.
import { irpc } from '@irpclib/irpc';
import { processOrderFlow } from './workflow.js';
import { processOrder } from './index.js'; // IRPC Stub

irpc.construct(processOrder, async (token, cartId) => {
  // Awaits natively just like a standard async function
  const result = await processOrderFlow({ token, cartId });
  return result.paymentId;
});
```

```tsx
// UI Execution (For strictly client-safe pipelines)
import { setup, render, mutable } from '@anchorlib/react';
import { uploadFilesFlow } from './client-workflows.js'; // Purely browser-safe logic

export const UploadButton = setup<{ files: File[] }>((props) => {
  const isPending = mutable(false);

  const upload = async () => {
    isPending.value = true;
    try {
      const result = await uploadFilesFlow({ files: props.files });
      console.log('Upload complete:', result.urls);
    } finally {
      isPending.value = false;
    }
  };

  return render(() => (
    <button onClick={upload} disabled={isPending.value}>
      {isPending.value ? 'Uploading...' : 'Upload'}
    </button>
  ));
});
```

### Workflow: Reactive Tracking & UI Bindings
Executing a workflow returns a reactive `WorkflowReader` which tracks the precise state of the pipeline, including the currently executing step's name.

```tsx
import { setup, render, Show, mutable } from '@anchorlib/react';
import { searchFlow, uploadFilesFlow } from './client-workflows.js';

export const DataView = setup<{ token: string }>((props) => {
  const query = mutable('');

  // Reactive Binding: Auto-executes when the input factory tracks a state change.
  // The factory must return exactly ONE argument (the input state object).
  const searchTask = searchFlow.when(() => ({ query: query.value }), 300); // 300ms debounce

  // Manual Binding: Creates an idle task reader to dispatch imperative events.
  const uploadTask = uploadFilesFlow.later(150); // Optional 150ms debounce

  return render(() => (
    <div>
      {/* Real-time pipeline telemetry */}
      <Show when={() => searchTask.status === 'pending'}>
        {() => <span>Step: {searchTask.current?.name ?? 'Loading...'}</span>}
      </Show>

      <Show when={() => searchTask.status === 'error'}>
        {() => <span className="error">{searchTask.error?.message}</span>}
      </Show>

      <button onClick={() => uploadTask.dispatch({ files: [] })}>
        Start Upload
      </button>
      
      {/* Show the exact step name to the user natively! (e.g., "Compressing images...") */}
      <Show when={() => uploadTask.status === 'pending'}>
        {() => <span>{uploadTask.current?.name}</span>}
      </Show>
    </div>
  ));
});
```

### Workflow: Observability
Workflows are inherently observable without littering business logic with tracking code. The `WORKFLOW_STORE` maintains a live map of all pipelines and active executions.

```tsx
import { setup, render, WORKFLOW_STORE } from '@anchorlib/react';

// Telemetry / Logging
WORKFLOW_STORE.subscribe((event) => {
  if (event.type === 'DEQUEUE_WORKFLOW') {
    if (event.error) console.error(`Workflow ${event.instance.id} failed`, event.error);
    else console.log(`Workflow ${event.instance.id} completed`, event.output);
  }
});

// Reactive Dashboards (No manual subscriptions needed)
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
