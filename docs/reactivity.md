# **Fine-Grained Reactivity in Anchor**

Anchor's reactivity system is built on a fine-grained observation model that enables efficient state management with
minimal overhead. This document explains the core concepts of Anchor's reactivity: Observation, Subscription, and History
Tracking.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/reactivity.webp" alt="Reactivity Schema" />
</div>

## **Observation**

Observation is the foundation of Anchor's fine-grained reactivity. It maintains direct connections between specific
pieces of state and their observers (components or functions). When a piece of state changes, only the observers that
directly depend on that state are notified.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/observation.webp" alt="Observation Schema" />
</div>

### **How Observation Works in Anchor**

When you access a property of a reactive state object within an observer context, Anchor automatically tracks this
dependency. Later, when that property is modified, only the relevant observers are re-executed.

```typescript
import { anchor, createObserver, withinObserver } from '@anchorlib/core';

const user = anchor({
  profile: {
    name: 'John',
    age: 30,
  },
});

// Creating an observer that will be used for state observation
const observer = createObserver((change) => {
  console.log('State changed:', change);
});

// Within this observer context, accessing state.user.name creates a dependency
const name = withinObserver(observer, () => {
  return user.profile.name; // This creates a tracked dependency
});

console.log(name); // This will log the name

// Later, when we update the tracked property:
user.profile.name = 'Jane'; // This will trigger the observer callback
```

::: details Observation Shortcut

You can also use the `observer.run` method instead of `withinObserver`. For Example:

```ts
observer.run(() => {
  console.log(state.profile.name);
});
```

:::

### **Key Benefits of Anchor's Observation System**

1. **Efficiency**: Only relevant observers are notified of changes
2. **Automatic Dependency Tracking**: Dependencies are tracked automatically when accessed within an observer context
3. **Dynamic Dependencies**: Dependencies can change based on code execution paths

::: warning Clean Up

When you create an observer, you need to clean up after yourself after it's no longer needed to avoid memory leaks.
This is done by calling the `observer.destroy()` method. While internally it uses weak references allowing GC to
collect them, it's always good practice to clean up early.

:::

### **Bypassing Observation**

Sometimes, you may want to bypass observation of some state properties within an observation context to prevent some
property
to being tracked. To bypass observation, you can use the `outsideObserver` method.

::: details Bypass Sample

```typescript
import { anchor, createObserver, withinObserver, outsideObserver } from '@anchorlib/core';

const state = anchor({
  profile: {
    name: 'John',
    age: 30,
    settings: {
      darkMode: true,
    },
  },
});

const observer = createObserver((change) => {
  console.log('State changed:', change);
});

const user = withinObserver(observer, () => {
  const name = state.profile.name; // This will be tracked
  const age = outsideObserver(() => state.profile.age); // Bypass tracking of age as you don't expect age to change

  return { name, age };
});

user.name = 'Jane'; // This will trigger the observer callback
user.age = 40; // This will not trigger the observer callback (accessed with bypass)
user.settings.darkMode = false; // This will not trigger the observer callback (not accessed during observation)
```

:::

## Observation APIs

Anchor provides a set of APIs for observing state changes. Please refer to the API Reference section for more details:

- [Anchor Core Observation APIs](/apis/core/observation) - Core APIs for creating and managing observers.
- [Anchor for React Observation APIs](/apis/react/observation) - Reactivity APIs for creating and managing observers.
- [Anchor for Svelte Observation APIs](/apis/svelte/observation) - Svelte reactivity APIs for creating and managing
  observers.
- [Anchor for Vue Observation APIs](/apis/vue/observation) - Vue reactivity APIs for creating and managing observers.

## Subscription

While Observation handles fine-grained reactivity at the property level, Subscription provides a mechanism for creating
reactions to state changes at a higher level, recursively. This means that when a state changes at the deeper level,
the higher-level subscription is also gets notified.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/derivation.webp" alt="Subscription Schema" />
</div>

::: tip Use Cases

Subscription is useful when you want to work with state regardless of which props that are used such as mirroring state or
binding to another source. You have full control of what you want to do with each change.

:::

### Basic Subscription Usage

Subscription is a powerful mechanism for creating reactions to state changes. It allows you to create a higher-level
reaction to state changes.

```typescript
import { anchor, subscribe } from '@anchorlib/core';

const state = anchor({
  count: 0,
});

// Subscribe to state changes
const unsubscribe = subscribe(state, (current, event) => {
  console.log('Current state:', current, event);
});

// Update the state
state.count++; // This will trigger the subscription callback

// Unsubscribe when no longer needed
unsubscribe();
```

::: warning Snapshot Understanding

The object passed to the callback **`IS NOT`** a snapshot. It's the underlying state object to give you
raw performance access to the state data without going through the traps. It's important to be cautious
when using the object passed to the callback, since mutating it can lead to unexpected behavior.

:::

::: info Callback Invocation

The given callback will be executed not just when a state changes, but also during the registration.
This means that the callback will be invoked with the initial state snapshot with initial event.

:::

### Piping Changes

You can pipe changes from one state to another, optionally transforming the data:

::: details Piping Sample

```typescript
import { anchor, subscribe } from '@anchorlib/core';

const source = anchor({ count: 0 });
const target = anchor({ value: 0 });

// Pipe changes from source to target
subscribe.pipe(source, target, (snapshot) => ({
  value: snapshot.count * 2,
}));

source.count = 5; // This will update target.value to 10
```

:::

## Subscription & Derivation APIs

Anchor provides a set of APIs for deriving state changes. Please refer to the API Reference section for more details:

- [Anchor Core Subscription APIs](/apis/core/derivation)
- [Anchor for React Derivation APIs](/apis/react/derivation)
- [Anchor for Svelte Derivation APIs](/apis/svelte/derivation)
- [Anchor for Vue Derivation APIs](/apis/vue/derivation)

## History Tracking

Anchor provides built-in history tracking that enables undo/redo functionality with minimal setup.

### Basic History Usage

```typescript
import { anchor, history } from '@anchorlib/core';

const state = anchor({
  todos: [{ id: 1, text: 'Learn Anchor', done: false }],
  filter: 'all',
});

// Enable history tracking
const historyState = history(state, {
  maxHistory: 50, // Keep up to 50 history states
  debounce: 200, // Debounce changes by 200ms
});

// Now you can undo/redo changes
state.todos.push({ id: 2, text: 'Build an app', done: false });
state.todos[0].done = true;

// Undo the last change
historyState.backward();

// Redo the change
historyState.forward();

// Check if you can undo/redo
if (historyState.canBackward) {
  console.log('Can undo');
}

if (historyState.canForward) {
  console.log('Can redo');
}
```

::: tip FYI

The returned object from `history` is an Anchor (reactive) state. This means you can use it like any other reactive
state such subscribing to it or observing it. The difference is, history state is not recursive. You only get notified
for changes related to the history data.

:::

### Undoable Operations

In addition to the history tracking system, Anchor provides an `undoable` function that allows you to create operations that can be undone immediately without setting up a full history tracker.

This is useful for cases where you want to perform a set of operations and potentially revert them, without keeping a long-term history. The `undoable` function executes the operation immediately and returns an undo function that can be called to revert the changes.

```typescript
import { anchor, undoable } from '@anchorlib/core';

const state = anchor({ count: 0, name: 'John' });

// Create an undoable operation
const [undo] = undoable(() => {
  state.count = 1;
  state.name = 'Jane';
});

// State is now { count: 1, name: 'Jane' }

// Undo the changes
undo();
// State is now { count: 0, name: 'John' }
```

## History APIs

Anchor provides a set of APIs for managing history:

- [Anchor Core History APIs](/apis/core/history)
- [Anchor React History APIs](/apis/react/initialization#history-apis)
- [Anchor Svelte History APIs](/apis/svelte/initialization#history-apis)
- [Anchor Vue History APIs](/apis/vue/initialization#history-apis)

## Best Practices

1. **Minimize Observer Scope**: Keep observer contexts as small as possible.
2. **Use Derivation for Computed Values**: Use derivation for computed values if possible, as it gives you raw
   performance by bypassing the traps.
3. **Batch Changes**: When making multiple changes, consider batching them (**`anchor.assign()`**) to reduce
   notifications.
4. **Clean Up Observers**: Always clean up observers when they're no longer needed to prevent memory leaks.
5. **Avoid Mutating The Underlying State Object Directly**: Mutating the underlying state object directly can lead to
   unexpected behavior.
6. **Don't Mutate Events**: Don't mutate events passed to observers, subscribers, or histories. Events are the source of
   truth. Mutating it can lead to unexpected behavior. We can make event immutable, but we don't want to add another overhead
   for this.

## Anchor vs Friends

When choosing a state management solution for your React application, it's important to understand how Anchor compares to other popular options. Here's a comparison of Anchor with other state management libraries:

| Feature                | Anchor                        | Redux                                   | Zustand                            | Jotai                              | MobX                          |
| ---------------------- | ----------------------------- | --------------------------------------- | ---------------------------------- | ---------------------------------- | ----------------------------- |
| **Reactivity Model**   | Fine-grained, proxy-based     | Centralized store, manual subscriptions | Atomic state, manual subscriptions | Atomic state, manual subscriptions | Observable, fine-grained      |
| **Boilerplate**        | Minimal                       | High                                    | Low                                | Low                                | Low                           |
| **Learning Curve**     | Low                           | High                                    | Low                                | Medium                             | Medium                        |
| **Performance**        | Automatic optimizations       | Manual optimizations                    | Manual optimizations               | Manual optimizations               | Automatic optimizations       |
| **Bundle Size**        | Small                         | Large                                   | Very small                         | Small                              | Medium                        |
| **Type Safety**        | Full TypeScript support       | Full TypeScript support                 | Full TypeScript support            | Full TypeScript support            | Full TypeScript support       |
| **Middleware Support** | Built-in hooks system         | Extensive middleware ecosystem          | Custom middleware                  | Custom middleware                  | Limited                       |
| **DevTools**           | Built-in devtools             | Redux DevTools                          | Limited                            | Limited                            | MobX DevTools                 |
| **Async Handling**     | Native async support          | Thunk/middleware required               | Native async support               | Native async support               | Native async support          |
| **Immutability**       | Automatic                     | Manual                                  | Manual                             | Manual                             | Automatic                     |
| **Observation**        | Automatic dependency tracking | Manual subscription                     | Manual subscription                | Manual subscription                | Automatic dependency tracking |

### Key Advantages of Anchor

1. **Fine-Grained Reactivity**: Unlike Redux which requires manual subscription and updates entire components, Anchor automatically tracks dependencies and only updates the specific parts of your UI that actually depend on changed state.

2. **Zero Boilerplate**: Anchor eliminates the need for action types, action creators, and reducers that are required in Redux, making state management much simpler.

3. **Automatic Performance**: With built-in dependency tracking, Anchor automatically optimizes your application's performance without requiring manual memoization or selector patterns.

4. **Simple API**: Anchor's API is designed to be intuitive and minimal, allowing developers to focus on building features rather than managing state.

5. **Built-in History Tracking**: Anchor comes with built-in undo/redo functionality through the `history()` and `undoable()` APIs, which requires additional middleware in other solutions.

6. **Schema Validation**: Anchor provides built-in schema validation capabilities that help ensure data integrity at runtime.

### When to Choose Anchor

Choose Anchor when you want:

- A minimal, intuitive API for state management
- Automatic performance optimizations
- Fine-grained reactivity without manual subscription
- Built-in history tracking and undo/redo capabilities
- Schema validation for data integrity
- A solution that works out of the box with minimal configuration

### When to Consider Alternatives

Consider Redux if you:

- Have a large, complex application with many developers
- Need the extensive middleware ecosystem
- Require time-travel debugging capabilities
- Have existing knowledge investment in Redux patterns

Consider Zustand or Jotai if you:

- Want the smallest possible bundle size
- Prefer atomic state management patterns
- Have simple state management needs

Consider MobX if you:

- Prefer class-based observable patterns
- Want automatic change tracking
- Are already familiar with MobX concepts
