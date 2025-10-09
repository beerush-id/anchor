# Introduction to Anchor for Svelte

As a Svelte developer, you're already benefiting from Svelte's compile-time optimizations and streamlined reactivity.
However, even with Svelte's excellent built-in reactivity system, you might encounter challenges when building complex
applications that require sophisticated state management.

| Feature                 | Svelte Built-in        | Anchor for Svelte |
| ----------------------- | ---------------------- | ----------------- |
| Fine-grained reactivity | ✅                     | ✅                |
| Direct mutation         | ✅                     | ✅                |
| Nested reactivity       | ✅                     | ✅                |
| True immutability       | ❌                     | ✅                |
| Schema validation       | ❌                     | ✅                |
| Portability             | ❌ (limited to Svelte) | ✅                |
| History Tracking        | ❌                     | ✅                |

## State Sharing

With Anchor, you can declare your state anywhere and share it across any framework since it's framework agnostic. This
makes it especially powerful for micro-frontend architectures or when migrating between frameworks.

## True Immutability

Anchor provides true immutability while still allowing direct mutations through controlled contracts. This gives you the
safety of immutable state without the performance overhead of deep cloning.

## Data Integrity

Anchor provides built-in schema validation to ensure that your data is always in a valid state. This helps prevent
bugs and makes your application more robust.
