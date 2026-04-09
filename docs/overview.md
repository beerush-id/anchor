---
title: 'AIR Stack: A Technical Overview'
description: 'The Zero-Boilerplate, AI-Native Stack. Eliminate the network layer, React Query, and re-render cascades with Anchor and IRPC.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Zero Boilerplate
  - React Query alternative
  - tRPC alternative
  - API batching
  - fine-grained reactivity
  - enterprise web development
---

# AIR Stack: A Technical Overview

**The Zero-Boilerplate, AI-Native Stack**

The modern web development ecosystem is fragmented. You use React for UI, Zustand for state, tRPC for API contracts, React Query for caching, and Socket.io for live streaming.

You spend 70% of your time writing "glue code" to wire these disparate systems together. 

The **AIR Stack** is a fundamental architectural shift. It fuses state management, network transport, and reactive rendering into a single, cohesive pipeline:

- **A** = **Anchor** (Fine-grained reactive view binding)
- **I** = **IRPC** (Universal Remote Procedure Calls & Streaming)
- **R** = **Reactive UI** (React, Solid, Svelte, Vue, vanilla JS)

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/dsv-model.webp" alt="DSV (Data-State-View) Model Schema" />
</div>

## **The Problem: Boilerplate Fatigue**

Traditional stacks force you to juggle immense cognitive load just to get data onto the screen:

### **1. The API & Network Burden (The tRPC / REST problem)**
- **Boilerplate Routing:** You must define explicit routes, endpoints, or tRPC router trees just to expose a single function.
- **The Subscription Nightmare:** Want real-time data? Standard API calls won't work. You have to set up entirely separate WebSocket infrastructure and write different "subscription" procedures.

### **2. The Caching Burden (The React Query problem)**
- **Heavy Dependencies:** You wrap your app in massive provider libraries just to avoid fetching the same resource twice.
- **Manual Invalidation:** You have to manually track query keys and trigger invalidations when data changes.

### **3. The Rendering Burden (The React problem)**
- **Re-render Cascades:** When your API data updates, React re-renders the entire component tree.
- **useEffect Hell:** Fetching data safely requires managing `useEffect` dependency arrays, leading to infinite loops and stale closures.
- **AI Hallucinations:** Because the rendering lifecycle is implicit and highly dependent on glue code, AI coding assistants struggle to generate correct, bug-free components.

## **The Solution: End-to-End Reactivity**

The AIR Stack completely eliminates the glue code. 

**Server Mutation → IRPC Transport → Anchor DOM Binding.**

The pipeline handles caching, loading states, chunk streaming, and UI updates invisibly.

### **1. IRPC: Zero-Plumbing Network Transport**

IRPC makes remote functions feel local. It handles the transport layer entirely. 

**Key Features:**
- **Zero Boilerplate:** Declare the function, construct the handler. No routes, no controllers.
- **Native Streaming:** Return `RemoteState` instead of a Promise to seamlessly yield chunks over standard HTTP (SSE). **No WebSockets required for real-time dashboards.**
- **Automatic Batching:** Simultaneous calls are batched into a single request with 6.96x faster throughput.
- **Intelligent Caching:** Built right into the protocol. Bypasses the need for React Query.

```typescript
// Define it (Shared)
const getPrice = irpc.declare<PriceFn>({ name: 'getPrice' });

// Implement it (Server)
irpc.construct(getPrice, async (ticker) => db.prices.find(ticker));
```

### **2. Anchor: Fine-Grained View Binding**

Anchor introduces the **DSV (Data-State-View)** model. Logic runs exactly once, and data is bound directly to fine-grained DOM snippets.

**Key Features:**
- **Logic Runs Once:** Your component wrapper runs once. No `useState`, no `useEffect` loops, no stale variables.
- **Surgical DOM Updates:** Only the exact `snippet` that depends on changed data will re-render. The rest of your app remains perfectly still.
- **AI-Native:** Deterministic logic flows are trivial for AI assistants to generate without bugs.

```tsx
import { setup, snippet } from '@anchorlib/react';

const Profile = setup(() => {
  // Logic runs once.
  const user = getPrice('AAPL'); // Call the IRPC remote function

  // Only this exact snippet re-renders when data streams in.
  const PriceView = snippet(() => <span>${user.data.current}</span>);

  return (
    <div>
      <Header />
      <PriceView />
    </div>
  );
});
```

### **3. Universal Reactive UI Support**

Because the AIR Stack handles the state and network layers natively, your business logic is completely portable. The View layer acts simply as a rendering surface.

**Supported Interfaces:**
- React (replaces React Query & Redux/Zustand)
- Svelte (enhances standard stores with Zod integrity and immutability)
- SolidJS
- Vue 
- Vanilla TypeScript

## **The "Aha!" Moment**

In a traditional stack, building a live-streaming dashboard requires:
`WebSocket Server` + `tRPC Subscription Procedure` + `React Query Provider` + `useEffect Data Loading` + `useMemo Layout Optimization`.

In the AIR Stack, it requires:
**Calling a function.**

```typescript
// Client
const prices = streamPrices(); 
call.subscribe(state => console.log(state.data)); // Streams natively.
```

## **Next Steps**

- [Anchor Getting Started](/getting-started) - Set up state management
- [IRPC Overview](/irpc/index.html) - Build type-safe APIs
- [React Guide](/react/getting-started) - Framework-specific integration
- [Svelte Guide](/svelte/getting-started) - True Immutability for Svelte
