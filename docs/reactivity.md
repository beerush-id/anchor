# **Fine-Grained Reactivity in Anchor - Efficient State Management**

Anchor's reactivity system is built on a fine-grained observation model that enables efficient state management with
minimal overhead. This document explains the core concepts of Anchor's reactivity: Observation, Derivation, and History
Tracking.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/reactivity.webp" alt="Reactivity Schema" />
</div>

::: tip Mental Model

Anchor's state is a gateway to the underlying state data. By default, Anchor is neither make a copy of the state data,
nor modifying its signature.
You can think it as an assistant of your state data. It will help you to manage it and notify anyone that depend on it.

:::

## **Observation - Foundation of Fine-Grained Reactivity**

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
import { anchor, createObserver, withinObserver } from '@anchor/core';

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
import { anchor, createObserver, withinObserver, outsideObserver } from '@anchor/core';

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

### **`createObserver`**

Creates a new observer instance for tracking state changes. An observer manages subscriptions and provides lifecycle
hooks for state tracking.

```ts
type createObserver = (
  onChange: (event: StateChange) => void,
  onTrack?: (state: State, key: KeyLike) => void
) => StateObserver;
```

**Parameters:**

- `onChange`: Callback function that is called when observed state changes
- `onTrack`: Optional callback that is called when state properties are tracked

**Returns:** A new `StateObserver` instance

### **`withinObserver`**

Executes a function within a specific observer context. This function temporarily sets the provided observer as the
current context, executes the provided function, and then restores the previous observer context.

```ts
type withinObserver = {
  <R>(fn: () => R, observer: StateObserver): R;
  <R>(observer: StateObserver, fn: () => R): R;
};
```

**Parameters:**

- `fn`: The function to execute within the observer context
- `observer`: The observer to use for tracking

**Returns:** The result of the executed function

**Example:**

```ts
const result = withinObserver(observer, () => {
  // Access tracked state properties here
  return state.profile.name;
});
```

### **`outsideObserver`**

Executes a function outside any observer context. This function temporarily removes the current observer context,
executes the provided function, and then restores the previous observer context.

```ts
type outsideObserver = <R>(fn: () => R) => R;
```

**Parameters:**

- `fn`: The function to execute outside observer context

**Returns:** The result of the executed function

**Example:**

```ts
const untrackedValue = outsideObserver(() => {
  // This code won't track dependencies
  return state.profile.age;
});
```

## Derivation (Subscription)

While Observation handles fine-grained reactivity at the property level, Derivation provides a mechanism for creating
reactions to state changes at a higher level, recursively. This means that when a state changes at the deeper level,
the higher-level derivation is also gets notified.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/derivation.webp" alt="Derivation Schema" />
</div>

::: tip Use Cases

Derivation is useful when you want to work with state regardless of which props that are used such as mirroring state or
binding to another source. You have full control of what you want to do with each change.

:::

### Basic Derivation Usage

Derivation is a powerful mechanism for creating reactions to state changes. It allows you to create a higher-level
reaction to state changes.

```typescript
import { anchor, derive } from '@anchor/core';

const state = anchor({
  count: 0,
});

// Subscribe to state changes
const unsubscribe = derive(state, (current, event) => {
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
import { anchor, derive } from '@anchor/core';

const source = anchor({ count: 0 });
const target = anchor({ value: 0 });

// Pipe changes from source to target
derive.pipe(source, target, (snapshot) => ({
  value: snapshot.count * 2,
}));

source.count = 5; // This will update target.value to 10
```

:::

## Derivation APIs

### **`derive`**

Subscribes to changes in a reactive state.

```ts
type derive = <T>(state: T, handler: StateSubscriber<T>) => StateUnsubscribe;
```

#### **`derive.pipe`**

Pipe changes of the source state to a target state.

```ts
type pipe = <Source, Target>(
  source: Source,
  target: Target,
  transform?: PipeTransformer<Source, Target>
) => StateUnsubscribe;
```

#### **`derive.bind`**

Create a two-way binding between two states.

```ts
type bind = <Left, Right>(
  left: Left,
  right: Right,
  transformLeft?: PipeTransformer<Left, Right>,
  transformRight?: PipeTransformer<Right, Left>
) => StateUnsubscribe;
```

## History Tracking

Anchor provides built-in history tracking that enables undo/redo functionality with minimal setup.

### Basic History Usage

```typescript
import { anchor, history } from '@anchor/core';

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
state
such subscribing to it or observing it. The difference is, history state is not recursive. You only get notified
for changes related to the history data.

:::

## History APIs

### **`history`**

Creates a history management system for a reactive state object with undo/redo functionality.

```ts
type history = <T>(state: T, options?: HistoryOptions) => HistoryState;
```

**Parameters**

- **`state`**: The reactive state object to be managed.
- **`options`**: (Optional) An object containing the following properties:

**Options**

- **`maxHistory`**: (Optional) The maximum number of history states to keep. Defaults to 100.
- **`debounce`**: (Optional) The debounce time in milliseconds. Defaults to 100ms.
- **`resettable`**: (Optional) Whether the history state should be resettable. Defaults to false.

::: warning Resettable History

If the history is configured as **resettable**, the engine will keep track every change to the object.
While this is useful for resetting the object, it can also be a performance issue if you have a large object.

:::

The history function returns a HistoryState object with the following properties and methods:

| Property/Method  | Description                             |
| ---------------- | --------------------------------------- |
| `backwardList`   | Array of previous states (readonly)     |
| `forwardList`    | Array of future states (readonly)       |
| `canBackward`    | Boolean indicating if undo is possible  |
| `canForward`     | Boolean indicating if redo is possible  |
| `canReset`       | Boolean indicating if reset is possible |
| **`backward()`** | Undo the last change                    |
| **`forward()`**  | Redo the last undone change             |
| **`clear()`**    | Clear the history                       |
| **`reset()`**    | Reset history to initial state          |
| **`destroy()`**  | Clean up history tracking               |

## Utility APIs

Utility APIs are meant for internal use, or advanced use cases such as when you build a library. Mostly
you don't need them for daily use.

### **`setObserver`**

Sets the current observer context for state tracking. This function is used internally to manage the observer stack
during state derivation.

```ts
type setObserver = (observer: StateObserver) => () => void;
```

**Parameters:**

- `observer`: The observer to set as current context

**Returns:** A function that restores the previous observer context when called

### **`getObserver`**

Gets the current observer context.

```ts
type getObserver = () => StateObserver | undefined;
```

**Returns:** The current observer context or `undefined` if no observer is active

#### **`derive.log`**

Subscribe to changes in the provided state and log it to the console.

```ts
type log = <T>(state: T) => StateUnsubscribe;
```

#### **`derive.resolve`**

Resolves the `StateController` for a given state.

```ts
type resolve = <T>(state: State<T>) => StateController<T> | undefined;
```

## Best Practices

1. **Minimize Observer Scope**: Keep observer contexts as small as possible.
2. **Use Derivation for Computed Values**: Use derivation for computed values if possible, as it gives you raw
   performance by bypassing the traps.
3. **Batch Changes**: When making multiple changes, consider batching them (**`anchor.assign()`**) to reduce
   notifications.
4. **Clean Up Observers**: Always clean up observers when they're no longer needed to prevent memory leaks.
5. **Avoid Mutating The Underlying State Object Directly**: Mutating the underlying state object directly can lead to
   unexpected behavior.
6. **Don't Mutate Events**: Don't mutate events passed to observers, subscribers, or histories. Events are the source of truth.
   Mutating it can lead to unexpected behavior. We can make event immutable, but we don't want to add another overhead
   for this.
