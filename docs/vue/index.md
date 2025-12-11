---
title: 'Introduction to Anchor for Vue: Enhanced State Management'
description: "Discover how Anchor enhances Vue's reactivity system with intuitive direct mutation, true immutability, and data integrity."
keywords:
  - anchor for vue
  - vue state management
  - anchor introduction
  - vue performance
  - fine-grained reactivity vue
  - immutable state vue
  - vue state management library
---

# Introduction to Anchor for Vue

Anchor enhances Vue's already excellent reactivity system by providing intuitive direct mutation for complex objects, true immutability, and data integrity.

| Feature                 | Vue                   | Anchor for Vue   |
| ----------------------- | --------------------- | ---------------- |
| Fine-grained reactivity | ✅                    | ✅               |
| Direct mutation         | ✅ (reactive())       | ✅ (anchorRef()) |
| Nested reactivity       | ✅                    | ✅               |
| True immutability       | ❌ (limited readonly) | ✅               |
| Schema validation       | ❌                    | ✅               |
| Data integrity          | ❌                    | ✅               |
| Portability             | ❌ (limited to Vue)   | ✅               |
| History Tracking        | ❌                    | ✅               |

## Why Anchor for Vue?

Vue's Composition API and Reactivity system are top-tier. However, for complex business logic, large applications often require more structure:

- Managing complex nested state structures with validation
- Ensuring true immutability for safe state sharing
- Creating portable business logic that can be tested outside of Vue components
- History tracking (undo/redo)

Anchor addresses these challenges while integrating seamlessly with Vue's `ref` system.

## Key Benefits

### 1. Unified Reactivity and Refs

Anchor for Vue wraps its reactive proxies in standard Vue Refs using `anchorRef`. This means you can use them exactly like any other Ref in your components, but with supercharged capabilities.

```ts
import { anchorRef } from '@anchorlib/vue';

const state = anchorRef({ count: 0, name: 'Vue' });

// Use standard .value access
state.value.count++;
```

- [Getting Started](/vue/getting-started) - Get started with Anchor for Vue.
- [Core API Reference](/apis/vue/initialization) - API reference for the core APIs.

### 2. True Immutability

Anchor provides true immutability throughout your application. Using `immutableRef`, you can expose safe, read-only versions of your state that cannot be mutated by consumers.

- [Immutability](/vue/state/immutable) - Learn more about immutability.
- [Immutability API Reference](/apis/vue/initialization#immutable-apis) - API reference for immutability.

### 3. Data Integrity

With schema support and runtime validation, Anchor ensures your state maintains its structure and data types.

- [Schema Support](/vue/getting-started#schema-support) - Learn more about schema support.
- [Schema API Reference](/apis/vue/initialization#data-integrity-apis) - API reference for schema support.

## Vue Integration

Anchor's Vue integration effectively bridges Anchor's universal reactivity with Vue's render cycle:

- `anchorRef`: Creates a Vue Ref backed by Anchor state.
- `derivedRef`: Creates optimized computed properties.
- Automatic cleanup on component unmount.

## Learning Investment

If you know Vue's Composition API, you already know 90% of Anchor for Vue. The main difference is the enhanced capabilities of the state objects you create.
