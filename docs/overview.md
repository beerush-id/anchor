---
title: 'AIR Stack: A Technical Overview'
description: 'Get a high-level overview of the AIR Stack - Anchor (state management), IRPC (type-safe APIs with automatic batching), and Reactive UI (React, Solid, Svelte, Vue). The complete stack for modern web development.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Reactive UI
  - state management
  - RPC framework
  - API batching
  - fine-grained reactivity
  - type-safe APIs
  - enterprise web development
---

# AIR Stack: A Technical Overview

**The Complete Stack for Modern Web Development**

AIR Stack is a revolutionary approach to building web applications that eliminates complexity while delivering exceptional performance. It consists of three integrated components:

- **A** = **Anchor** (Fine-grained state management)
- **I** = **IRPC** (Type-safe APIs with automatic batching)
- **R** = **Reactive UI** (React, Solid, Svelte, Vue, vanilla JS)

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/dsv-model.webp" alt="DSV (Data-State-View) Model Schema" />
</div>

## **The Problem**

Modern web development forces you to juggle multiple concerns:

### **State Management**
- **Prop Drilling & Context Hell:** Sharing state becomes a tangled mess of props and providers
- **Wasted Renders:** Traditional approaches trigger unnecessary re-renders across large parts of the app
- **High Mental Overhead:** Managing immutability, data fetching, and storage distracts from business logic

### **API Development**
- **Boilerplate Overload:** REST requires routes, serialization, client code, and manual type definitions
- **Performance Bottlenecks:** Multiple API calls mean multiple HTTP connections, slowing down your app
- **Type Safety Gaps:** Keeping client and server types in sync is manual and error-prone

### **Framework Lock-in**
- **Vendor Lock-in:** State management solutions are often tied to a specific framework
- **Migration Pain:** Switching frameworks means rewriting your entire state layer

These issues create a divide between **Developer Experience (DX)** and **User Experience (UX)**. Apps might be easy to build initially, but they become slow and unmanageable at scale.

## **The Solution: AIR Stack**

AIR Stack solves these problems with three integrated components:

### **1. Anchor: Fine-Grained State Management**

Anchor introduces the **DSV (Data-State-View) model**, replacing scattered data flows with a single, stable state that acts as the source of truth.

**Key Features:**
- **Fine-Grained Reactivity:** Only components that depend on changed state re-render
- **Flexible State Primitives:** Direct mutation syntax with proxy-based write contracts for safety
- **Framework Agnostic:** Works with React, Solid, Svelte, Vue, and vanilla JS
- **Built-in Toolkit:** Optimistic UI, history tracking, reactive storage, and async state

**Example:**
```typescript
import { mutable, effect } from '@anchorlib/core';

const user = mutable({ name: 'John', age: 30 });

// Only this effect re-runs when age changes
effect(() => {
  console.log('Age changed:', user.age);
});

user.age++; // Triggers effect
user.name = 'Jane'; // Does NOT trigger effect
```

### **2. IRPC: Type-Safe APIs**

IRPC (Isomorphic Remote Procedure Call) eliminates API boilerplate by making remote functions look and feel like local functions.

**Key Features:**
- **Zero Boilerplate:** No routes, no endpoints, no client code
- **Automatic Batching:** Intelligent request batching with configurable debounce reduces network overhead
- **Intelligent Caching:** Built-in caching with configurable TTL and manual invalidation
- **Timeout Management:** Configurable timeouts per function or globally
- **Schema Validation:** Optional Zod integration for runtime input/output validation
- **Context Management:** Built-in async context support for request-scoped data
- **Type-Safe:** End-to-end TypeScript with zero manual type definitions

**Example:**
```typescript
// Declare once
const hello = irpc.declare<(name: string) => Promise<string>>({
  name: 'hello',
  maxAge: 60000 // Cache for 1 minute
});

// Implement on server
irpc.construct(hello, async (name) => `Hello ${name}`);

// Call from client
const message = await hello('John'); // "Hello John"
```

### **3. Reactive UI: Universal Framework Support**

AIR Stack works seamlessly with any reactive UI framework, providing a consistent state management and API layer regardless of your view technology.

**Supported Frameworks:**
- React
- Solid
- Svelte
- Vue
- Vanilla JavaScript/TypeScript

**Example (React):**
```tsx
import { setup, snippet, mutable } from '@anchorlib/react';
import { getUser } from './api'; // IRPC function

const UserProfile = setup<{ id: string }>((props) => {
  const user = mutable({ name: '', email: '' });

  // Fetch user data
  getUser(props.id).then(data => Object.assign(user, data));

  // Only this part re-renders when user changes
  const UserInfo = snippet(() => (
    <>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </>
  ));

  return (
    <div className="profile">
      <header>User Profile</header>
      <UserInfo />
      <footer>Last updated: {new Date().toLocaleDateString()}</footer>
    </div>
  );
});
```

## **Architecture Overview**

### **DSV (Data-State-View) Model**

Anchor's DSV model creates a clean separation of concerns:

1. **Data:** External sources (APIs via IRPC, databases, user input)
2. **State:** Central state managed by Anchor
3. **View:** Components that observe and render state

This architecture eliminates prop drilling, context hell, and state synchronization issues while providing predictable, scalable state management.

### **IRPC Protocol**

IRPC's automatic batching protocol:

1. **Client:** Multiple function calls made simultaneously
2. **Transport:** Calls batched into a single HTTP request
3. **Server:** Requests processed in parallel
4. **Response:** Results streamed back as they complete
5. **Client:** Promises resolve individually

This reduces network overhead specifically for modern, component-based applications where multiple components might request data simultaneously.

## **Next Steps**

- [Anchor Getting Started](/getting-started) - Set up state management
- [IRPC Overview](/irpc/index.html) - Build type-safe APIs
- [React Guide](/react/getting-started) - Framework-specific integration
- [IRPC Specification](/irpc/specification) - Protocol details

**AIR Stack: Build faster, ship cheaper, scale effortlessly.** 🚀
