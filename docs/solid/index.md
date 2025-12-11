---
title: 'Introduction to Anchor for Solid: Enhanced State Management'
description: "Discover how Anchor enhances Solid's reactivity system with intuitive direct mutation, true immutability, and data integrity."
keywords:
  - anchor for solid
  - solid state management
  - anchor introduction
  - solid performance
  - fine-grained reactivity solid
  - immutable state solid
  - solid state management library
---

# Introduction to Anchor for Solid

Anchor enhances Solid's already excellent reactivity system by providing intuitive direct mutation, true immutability,
and data integrity. While Solid's fine-grained reactivity is powerful, Anchor adds additional capabilities that make
state management even more intuitive and robust.

| Feature                 | Solid                 | Anchor for Solid |
| ----------------------- | --------------------- | ---------------- |
| Fine-grained reactivity | ✅                    | ✅               |
| Direct mutation         | ❌                    | ✅               |
| Nested reactivity       | ✅                    | ✅               |
| True immutability       | ❌                    | ✅               |
| Schema validation       | ❌                    | ✅               |
| Data integrity          | ❌                    | ✅               |
| Portability             | ❌ (limited to Solid) | ✅               |
| History Tracking        | ❌                    | ✅               |

## Why Anchor for Solid?

Solid's reactivity system is built on signals and effects, providing excellent performance through fine-grained updates.
However, as applications grow in complexity, developers often face challenges:

- Managing complex nested state structures
- Ensuring true immutability without performance penalties
- Maintaining data integrity across state mutations
- Creating derived state that stays consistent with source data
- Working with structured data that requires validation

Anchor addresses these challenges while maintaining full compatibility with Solid's reactivity model.

## Key Benefits

### 1. Intuitive Direct Mutation

Unlike traditional immutable patterns, Anchor allows you to mutate state directly while maintaining reactivity:

```tsx
import { anchorRef } from '@anchorlib/solid';

const state = anchorRef({ count: 0, name: 'Solid' });

// Direct mutation instead of immutable patterns
state.count++;
state.name = 'Anchor Solid';
```

- [Getting Started](/solid/getting-started) - Get started with Anchor for Solid.
- [Core API Reference](/apis/solid/initialization) - API reference for the core APIs.

### 2. True Immutability

Anchor provides true immutability through controlled mutations. State objects are genuinely immutable except through
defined contracts, preventing accidental mutations while maintaining performance.

- [Immutability](/solid/immutability) - Learn more about immutability.
- [Immutability API Reference](/apis/solid/initialization#immutable-apis) - API reference for immutability.

### 3. Data Integrity

With schema support and runtime validation, Anchor ensures your state maintains its structure and data types, catching
errors early in development.

- [Schema Support](/solid/getting-started#schema-support) - Learn more about schema support.
- [Schema API Reference](/apis/solid/initialization#data-integrity-apis) - API reference for schema support.

## Solid Integration

Anchor's Solid integration is designed to be lightweight and seamless:

- Automatic tracking binding with Solid's reactivity system
- Proper cleanup when components are destroyed
- No additional providers or setup required
- Full compatibility with Solid's component lifecycle

The integration works by setting up a global tracker that binds Anchor's observer system with Solid's component
instances, ensuring that components re-render only when the specific state they access changes.

## Learning Investment

While Solid's reactivity system is already powerful, Anchor provides additional tools that enhance the developer
experience:

- Reduced boilerplate for complex state operations
- Better debugging through explicit mutation contracts
- Enhanced performance through smart tracking
- Improved maintainability with structured state

Anchor is designed for developers who want to leverage Solid's excellent reactivity while benefiting from additional
features that enhance code quality and maintainability.
