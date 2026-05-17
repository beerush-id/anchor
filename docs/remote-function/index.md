---
title: 'AIR Stack: Remote Function'
description: 'Learn how to define and execute isomorphic remote functions using IRPC in the AIR Stack.'
---

# Remote Function

Building full-stack applications requires **seamless communication** between your UI and your server logic without getting bogged down by network plumbing.

Traditional architectures force you to stitch together a million libraries—one for REST routes, another for WebSockets, and custom parsers for streaming data. You spend more time managing endpoints and deserialization than writing actual business logic.

The AIR Stack solves this with **IRPC**: a universal reactive network abstraction. 

You don't make HTTP requests; you just call **isomorphic functions**. The framework batches the calls, executes them globally, and dynamically mutates the connected UI hooks.

IRPC completely separates the function **signature** from its **implementation** and its **transport**.

::: tip Server and Client
In IRPC, "server" doesn't mean a remote machine, and "client" doesn't mean a browser. The **server** is any execution context that implements the handler — a remote server, a WebWorker, or even the same thread. The **client** is whatever calls the stub.
:::

## **Declaration (Stub)**

First, define the type-safe contract that both the client and server will use. This is your **isomorphic function** that runs anywhere.

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;

// The signature is registered, but the logic is empty.
export const hello = irpc.declare<HelloFn>({ name: 'hello' });
```

## **Implementation (Handler)**

To fulfill the stub's contract, you **construct** the actual logic that handles the execution. The constructor automatically infers the types from the stub.

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

// The types are inferred automatically from the signature
irpc.construct(hello, (name: string) => {
  return `Hello, ${name}!`;
});
```

## **Execution (Call)**

On the client, you just import the signature and call it inside your component logic. No `fetch`, no routes, no manual serialization.

::: code-group

```tsx [React]
import { setup, render, mutable } from '@anchorlib/react';
import { hello } from './rpc/hello/index.js';

export const Greeting = setup(() => {
  const state = mutable({ message: '' });

  const fetchGreeting = async () => {
    state.message = await hello('John');
  };

  return render(() => (
    <div>
      <button onClick={fetchGreeting}>Say Hello</button>
      <p>{state.message}</p>
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup, mutable } from '@anchorlib/solid';
import { hello } from './rpc/hello/index.js';

export const Greeting = setup(() => {
  const state = mutable({ message: '' });

  const fetchGreeting = async () => {
    state.message = await hello('John');
  };

  return (
    <div>
      <button onClick={fetchGreeting}>Say Hello</button>
      <p>{state.message}</p>
    </div>
  );
});
```

:::

## **Reactive Streaming**

The true power of IRPC in the AIR Stack is its ability to handle **continuous data streams** using the exact same architecture.

Instead of returning a static `Promise<T>`, you return a `RemoteState<T>`. The UI binds directly to the returned `IRPCReader`, which hydrates progressively as the server yields data chunks over the wire.

### **1. Declare the Stream (Stub)**

When declaring a reactive stream, set `{ stream: true }`. Optionally provide an `init()` factory to seed client-side data before the server responds.

```typescript
import { irpc } from '../lib/module.js';
import type { RemoteState } from '@irpclib/irpc';

export type GeneratePoemFn = (prompt: string) => RemoteState<string>;

export const generatePoem = irpc.declare<GeneratePoemFn>({
  name: 'generatePoem',
  stream: true,
  init: () => '', // Optional: initial empty state
});
```

### **2. Yield the Stream (Handler)**

Use the `stream` wrapper to continuously push mutations back to the client.

```typescript
import { irpc, stream } from '@irpclib/irpc';
import { generatePoem } from './index.js';

irpc.construct(generatePoem, (prompt) => {
  return stream<string>(async (state, resolve) => {
    const response = await ai.generate({ prompt, stream: true });
    
    // Continuously mutate the state
    for await (const chunk of response) {
      if (state.status !== 'pending') break;
      state.data = (state.data || '') + chunk.text;
    }
    
    resolve();
  });
});
```

### **3. Bind the Stream (Call)**

Every call returns an `IRPCReader<T>` — a reactive proxy with `.data`, `.status`, and `.error` properties. UI frameworks bind directly to it. The UI re-renders surgically as data chunks arrive.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { generatePoem } from './rpc/poem/index.js';

export const PoemWidget = setup(() => {
  const poem = generatePoem.with(() => ['Space']);

  // Bind directly — re-renders as data arrives
  return render(() => <div>{poem.data}</div>);
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { generatePoem } from './rpc/poem/index.js';

export const PoemWidget = setup(() => {
  const poem = generatePoem.with(() => ['Space']);

  // Bind directly — natively reactive
  return <div>{poem.data}</div>;
});
```

:::

## **Architectural Superpowers**

Because IRPC abstracts the network layer into executable function blocks, it simplifies distributed workflows that would normally require tedious, multi-step configurations in traditional REST or GraphQL architectures.

- **Automatic Batching**: If your application invokes `getUser()`, `getPosts()`, and `getStats()` simultaneously on mount, IRPC automatically batches them into a **single HTTP request** without any extra configuration.
- **Transport Agnosticism**: Want to migrate your backend from HTTP to WebSockets for lower latency? Just change the `transport` configuration in `module.ts`. Your thousands of function calls and component bindings remain **100% untouched**.
- **Edge Distribution**: By assigning different transports to different packages, you can dynamically route certain functions (like image processing) to run on powerful cloud servers, while routing others (like form validation) to run locally in a Web Worker using `BroadcastChannel`.
- **Zero-Boilerplate Security**: Because the declaration (`index.ts`) is completely isolated from the implementation (`constructor.ts`), you can safely publish your `index.ts` API stubs to NPM. Client teams install the package for perfect autocomplete, while your proprietary server logic remains absolutely private.
