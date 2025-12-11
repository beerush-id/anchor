---
title: 'Introduction to Anchor for Svelte: Enhanced State Management'
description: "Discover how Anchor enhances Svelte's reactivity system with intuitive direct mutation, true immutability, and data integrity."
keywords:
  - anchor for svelte
  - svelte state management
  - anchor introduction
  - svelte performance
  - fine-grained reactivity svelte
  - immutable state svelte
  - svelte state management library
---

# Introduction to Anchor for Svelte

Anchor enhances Svelte's already excellent reactivity system by providing intuitive direct mutation, true immutability,
and data integrity. While Svelte's reactivity is powerful, Anchor adds additional capabilities that make
state management even more intuitive and robust.

| Feature                 | Svelte                | Anchor for Svelte |
| ----------------------- | --------------------- | ---------------- |
| Fine-grained reactivity | ✅                    | ✅               |
| Direct mutation         | ✅                    | ✅               |
| Nested reactivity       | ✅                    | ✅               |
| True immutability       | ❌                    | ✅               |
| Schema validation       | ❌                    | ✅               |
| Data integrity          | ❌                    | ✅               |
| Portability             | ❌ (limited to Svelte)| ✅               |
| History Tracking        | ❌                    | ✅               |

## Why Anchor for Svelte?

Svelte's reactivity system is built for performance and simplicity. However, as applications grow in complexity, developers often face challenges:

- Managing complex nested state structures
- Ensuring true immutability without performance penalties
- Maintaining data integrity across state mutations
- Creating derived state that stays consistent with source data
- Working with structured data that requires validation

Anchor addresses these challenges while maintaining full compatibility with Svelte's reactivity model.

## Key Benefits

### 1. Intuitive Direct Mutation

Anchor allows you to mutate state directly while maintaining reactivity, similar to Svelte 5's runes but universally portable:

```ts
import { mutable } from '@anchorlib/svelte';

const state = mutable({ count: 0, name: 'Svelte' });

// Direct mutation
state.count++;
state.name = 'Anchor Svelte';
```

- [Getting Started](/svelte/getting-started) - Get started with Anchor for Svelte.
- [Core API Reference](/apis/svelte/initialization) - API reference for the core APIs.

### 2. True Immutability

Anchor provides true immutability through controlled mutations. State objects are genuinely immutable except through
defined contracts, preventing accidental mutations while maintaining performance.

- [Immutability](/svelte/state/immutable) - Learn more about immutability.
- [Immutability API Reference](/apis/svelte/initialization#immutable-apis) - API reference for immutability.

### 3. Data Integrity

With schema support and runtime validation, Anchor ensures your state maintains its structure and data types, catching
errors early in development.

- [Schema Support](/svelte/getting-started#schema-support) - Learn more about schema support.
- [Schema API Reference](/apis/svelte/initialization#data-integrity-apis) - API reference for schema support.

## Svelte Integration

Anchor's Svelte integration is designed to be lightweight and seamless:

- Automatic tracking binding with Svelte's reactivity system
- Proper cleanup when components are destroyed
- No additional providers or setup required for basic usage

## Learning Investment

While Svelte's reactivity system is already powerful, Anchor provides additional tools that enhance the developer
experience:

- Reduced boilerplate for complex state operations
- Better debugging through explicit mutation contracts
- Enhanced performance through smart tracking
- Improved maintainability with structured state

Anchor is designed for developers who want to leverage Svelte's excellent reactivity while benefiting from additional
features that enhance code quality and maintainability.
