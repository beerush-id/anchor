# Introduction to Anchor for Vue

As a Vue developer, you're already benefiting from Vue's reactivity system and component-based architecture. However,
even with Vue's excellent built-in reactivity, you might encounter challenges when building complex applications that
require sophisticated state management.

| Feature                 | Vue Built-in        | Anchor for Vue |
| ----------------------- | ------------------- | -------------- |
| Fine-grained reactivity | ✅                  | ✅             |
| Direct mutation         | ✅                  | ✅             |
| Nested reactivity       | ✅                  | ✅             |
| True immutability       | ❌                  | ✅             |
| Schema validation       | ❌                  | ✅             |
| Portability             | ❌ (limited to Vue) | ✅             |
| History Tracking        | ❌                  | ✅             |

## State Sharing

With Anchor, you can declare your state anywhere and share it across any framework since it's framework agnostic. This
makes it especially powerful for micro-frontend architectures or when migrating between frameworks.

## True Immutability

Anchor provides true immutability while still allowing direct mutations through controlled contracts. This gives you the
safety of immutable state without the performance overhead of deep cloning.

## Data Integrity

Anchor provides built-in schema validation to ensure that your data is always in a valid state. This helps prevent
bugs and makes your application more robust.
