### 2. Workflows
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

// Context passed to step handlers as the second (or last) argument.
type WorkflowStepContext = {
  stepper: WorkflowStepper<WorkflowData, WorkflowData>;
  step: WorkflowRunner<WorkflowData, WorkflowData>;
  signal: AbortSignal;
};

interface Workflow<I extends WorkflowData, O extends WorkflowData> {
  // The pipeline is natively callable and returns a reactive Promise (WorkflowStepper).
  (input: I, seed: O): WorkflowStepper<I, O, O>;
  (input: I): WorkflowStepper<I, O>;

  // Add a sequential transform step
  then<R extends WorkflowData>(fn: (input: O, ctx: WorkflowStepContext) => R | Promise<R>, meta?: WorkflowMeta): Workflow<I, R>;
  
  // Add a conditional branch point using a discriminant key
  switch<K extends keyof O & string, C extends SwitchCases<O, K>>(key: K, cases: C, meta?: WorkflowMeta): Workflow<I, SwitchOutput<C>>;
  
  // Add a conditional branch point using a custom matcher
  switch<U extends string | number | boolean, C extends SwitchCasesFn<O, U>>(matcher: (input: O) => U | Promise<U>, cases: C, meta?: WorkflowMeta): Workflow<I, SwitchOutput<C>>;

  // Trap errors to safely resume execution with fallback data
  catch<R extends WorkflowData>(fn: (error: Error, input: O, ctx: WorkflowStepContext) => R | Promise<R>, meta?: WorkflowMeta): Workflow<I, O | R>;
  
  // Guaranteed cleanup. Does not mutate output.
  finally(fn: (input: O, error: Error | undefined, ctx: WorkflowStepContext) => void | Promise<void>, meta?: WorkflowMeta): Workflow<I, O>;

  // Reactive Execution Bindings
  once(input: I, seed: O): WorkflowStepper<I, O, O>;
  once(input: I): WorkflowStepper<I, O>;

  with(getInput: () => I, seed: O, debounce?: number): WorkflowStepper<I, O, O>;
  with(getInput: () => I, debounce?: number): WorkflowStepper<I, O>;

  when(getInput: () => I, seed: O, debounce?: number): WorkflowStepper<I, O, O>;
  when(getInput: () => I, debounce?: number): WorkflowStepper<I, O>;

  later(seed: O, debounce?: number): WorkflowStepper<I, O, O> & { dispatch: (input: I) => void };
  later(debounce?: number): WorkflowStepper<I, O> & { dispatch: (input: I) => void };
}

interface WorkflowStepper<I, O, D = O | undefined> extends Promise<O> {
  status: 'idle' | 'pending' | 'success' | 'error' | 'aborted' | 'skipped';
  data: D;           // Pipeline output (falls back to seed if not yet resolved)
  error?: Error;
  input: I;          // Current input
  output: O;         // Current output
  current?: WorkflowRunner;  // Currently active step runner

  // Step introspection
  get(name: string): WorkflowRunner | undefined;

  // Execution control
  run(input: I): Promise<O>;      // Run all remaining steps
  step(input?: WorkflowData): Promise<O>;  // Advance one step
  step(path: string, input?: WorkflowData): Promise<O>;  // Jump to a specific step
  reset(): this;                 // Reset for re-execution
  skip(error?: Error): this;     // Skip remaining steps

  // Lifecycle
  abort(reason?: unknown): void;
  close(status?: WorkflowStatus): void;
  subscribe(handler: StateSubscriber<O>): () => void;
  pipeTo(target: WorkflowStepper<I, O>): this;

  // Persistence
  snapshot(): StepperSnapshot;
  hydrate(snapshot: StepperSnapshot): this;
}
```

> **Reactivity Note:** Workflow state is not recursively reactive. Only top-level properties (e.g., `status`, `error`, `data`, `current`) trigger reactive updates. The `data`/`output` object itself is a plain value. If you need reactive properties inside the output, return a reactive state (e.g., `mutable()`) from your step handler.

### Workflow: Planning & Composition
A Workflow pipeline accepts **exactly one argument** (the input state). They are built with sequential `.then()` blocks.

```typescript
import { plan } from '@anchorlib/react';
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
import { plan } from '@anchorlib/react';
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
import { plan } from '@anchorlib/react';
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
// UI Execution
import { setup, render, mutable } from '@anchorlib/react';
import { uploadFilesFlow } from './workflows.js';

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
Executing a workflow returns a reactive `WorkflowStepper` which tracks the precise state of the pipeline, including the currently executing step's name and per-step introspection.

```tsx
import { setup, render, Show, mutable } from '@anchorlib/react';
import { searchFlow, uploadFilesFlow } from './workflows.js';

export const DataView = setup<{ token: string }>((props) => {
  const query = mutable('');

  // Reactive Binding: Auto-executes when the input factory tracks a state change.
  // The factory must return exactly ONE argument (the input state object).
  const searchTask = searchFlow.when(() => ({ query: query.value }), 300); // 300ms debounce

  // Manual Binding: Creates an idle stepper to dispatch imperative events.
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

### Workflow: Manual Stepping
For wizard-style UIs or approval flows, use `.step()` to advance one step at a time. Use `.run()` to execute all remaining steps.

```typescript
import { plan } from '@anchorlib/react';

const onboardingFlow = plan<{ name: string }>()
  .then((input) => ({ ...input, profile: createProfile(input.name) }), { name: 'Creating Profile...' })
  .then((input) => ({ ...input, workspace: createWorkspace(input.profile) }), { name: 'Setting Up Workspace...' })
  .then((input) => ({ ...input, invite: sendWelcomeEmail(input.profile) }), { name: 'Sending Welcome Email...' });

const stepper = onboardingFlow({ name: 'Alice' });

await stepper.step(); // Creates profile
await stepper.step(); // Sets up workspace
await stepper.step(); // Sends welcome email

// Or run all remaining steps at once
await stepper.run({ name: 'Alice' });
```

### Workflow: Persistence
Use `snapshot()` and `hydrate()` to persist and restore workflow progress across page reloads or browser crashes.

```typescript
const stepper = onboardingFlow({ name: 'Alice' });

// Save progress after each state change
stepper.subscribe(() => {
  localStorage.setItem('onboarding', JSON.stringify(stepper.snapshot()));
});

// On page reload, restore from snapshot
const saved = localStorage.getItem('onboarding');

if (saved) {
  const stepper = onboardingFlow({ name: 'Alice' });
  stepper.hydrate(JSON.parse(saved));
  await stepper.step(); // Continues from the next incomplete step
}
```

### Workflow: State Seeding
Passing `seed` to an execution binding seeds `stepper.data` with an initial value, making it typed as `O` instead of `O | undefined`. This avoids null guards in the UI when the data shape is known upfront.

```tsx
import { setup, render, Show, mutable } from '@anchorlib/react';
import { searchFlow } from './workflows.js';

export const SearchView = setup(() => {
  const query = mutable('');

  // Seeded: searchTask.data is typed as { results: SearchResult[] }, never undefined.
  const searchTask = searchFlow.when(() => ({ query: query.value }), { results: [] }, 300);

  return render(() => (
    <div>
      <input value={query.value} onInput={(e) => (query.value = e.target.value)} />

      <ul>
        {searchTask.data.results.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  ));
});
```

### Workflow: State Piping
A deferred stepper can serve as a stable UI binding target while imperative executions pipe their state into it. The UI stays bound to one stepper, each execution's status, data, and errors flow through automatically.

```tsx
import { setup, render, Show } from '@anchorlib/react';
import { processOrderFlow } from './workflow.js';

export const OrderButton = setup<{ cartId: string; userId: string }>((props) => {
  const task = processOrderFlow.later();

  const handleClick = () => {
    processOrderFlow({ cartId: props.cartId, userId: props.userId })
      .pipeTo(task)
      .then(() => toast('Order complete'));
  };

  return render(() => (
    <div>
      <button onClick={handleClick} disabled={task.status === 'pending'}>
        Place Order
      </button>

      <Show when={() => task.status === 'pending'}>
        {() => <span>{task.current?.name}</span>}
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
