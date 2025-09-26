# Dev Tools API

::: warning Advanced Usage
This documentation is intended for advanced users, especially library authors who want to create development tools for Anchor. It requires deep understanding of Anchor's internals and reactive system.
:::

The Dev Tools API provides a powerful mechanism for integrating custom debugging and inspection tools with Anchor's reactive system. By implementing the `DevTool` interface and registering it with `setDevTool()`, you can tap into Anchor's internal operations and observe state changes, property access, and lifecycle events.

## `DevTool` Interface

This interface defines a set of optional callback methods that are invoked by Anchor during various state management operations. You can implement this interface to create your own custom development tools.

::: danger Memory Leak Warning
Never hold a stable reference to the emitted objects (meta, init, handler, etc.) as this will violate Anchor's efficiency principle and could lead to memory leaks. The garbage collector cannot collect these objects when there is still a stable reference to them.

If you need to implement something like a state tree or graph, use the `id` as the reference and make a copy of the state object.
:::

```typescript
interface DevTool {
  onGet?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  onSet?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    prop: KeyLike,
    value: unknown
  ) => void;
  onDelete?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  onCall?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    method: string,
    args: unknown[]
  ) => void;
  onInit?: <T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) => void;
  onAssign?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, source: ObjLike) => void;
  onRemove?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, props: KeyLike[]) => void;
  onClear?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>) => void;
  onDestroy?: <T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) => void;
  onSubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  onUnsubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  onLink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  onUnlink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  onTrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver,
    key: KeyLike
  ) => void;
  onUntrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver
  ) => void;
}
```

### Methods

- `onGet(meta, prop)`: Called when a property is accessed.
- `onSet(meta, prop, value)`: Called when a property is set.
- `onDelete(meta, prop)`: Called when a property is deleted.
- `onCall(meta, method, args)`: Called when a method is invoked on a state (e.g., array methods like `push`, map methods like `set`).
- `onInit(init, meta)`: Called when a state is initialized.
- `onAssign(meta, source)`: Called when a bulk assignment is performed (e.g., `anchor.assign()`).
- `onRemove(meta, props)`: Called when multiple properties are removed (e.g., `anchor.remove()`).
- `onClear(meta)`: Called when a state is cleared (e.g., `anchor.clear()`).
- `onDestroy(init, meta)`: Called when a state is destroyed.
- `onSubscribe(meta, handler, receiver)`: Called when a subscriber is added to a state.
- `onUnsubscribe(meta, handler, receiver)`: Called when a subscriber is removed from a state.
- `onLink(meta, child)`: Called when a child state is linked to a parent state.
- `onUnlink(meta, child)`: Called when a child state is unlinked from a parent state.
- `onTrack(meta, observer, key)`: Called when a state property is tracked by an observer.
- `onUntrack(meta, observer)`: Called when a state is no longer tracked by an observer.

## Registering a Custom DevTool

To use a custom `DevTool` implementation, you register it using `setDevTool()` from `@anchorlib/core`:

```typescript
import { setDevTool } from '@anchorlib/core';

class MyCustomDevTool implements DevTool {
  onInit(init, meta) {
    console.log('State initialized:', meta.id);
    // Good: Only using the id for reference
    // Bad: Storing reference to init or meta objects
  }

  onSet(meta, prop, value) {
    console.log(`Property ${prop.toString()} set to`, value);
  }

  onGet(meta, prop) {
    console.log(`Property ${prop.toString()} accessed`);
  }
  // ... implement other callbacks
}

// Register the dev tool
setDevTool(new MyCustomDevTool());
```

The `setDevTool` function returns a function that can be called to restore the previous dev tool:

```typescript
import { setDevTool } from '@anchorlib/core';

class MyCustomDevTool implements DevTool {
  // ... implementation
}

// Register the dev tool
const restorePreviousDevTool = setDevTool(new MyCustomDevTool());

// Later, if you want to restore the previous dev tool:
restorePreviousDevTool();
```

## DevTool Lifecycle

DevTools receive notifications throughout the lifecycle of Anchor states:

1. **Initialization**: `onInit` is called when a new state is created
2. **Access**: `onGet` is called when properties are accessed
3. **Mutation**: `onSet` is called when properties are set
4. **Deletion**: `onDelete` is called when properties are deleted
5. **Method Calls**: `onCall` is called when methods are invoked on collections (arrays, maps, sets)
6. **Bulk Operations**: `onAssign`, `onRemove`, and `onClear` handle bulk operations
7. **Subscription**: `onSubscribe` and `onUnsubscribe` track observer subscriptions
8. **Linking**: `onLink` and `onUnlink` track parent-child state relationships
9. **Observation**: `onTrack` and `onUntrack` track property observation
10. **Destruction**: `onDestroy` is called when a state is destroyed

## Example Implementation

Here's a more complete example of a DevTool that logs operations to the console:

```typescript
import { setDevTool } from '@anchorlib/core';

class LoggingDevTool {
  onInit(init, meta) {
    console.log(`[INIT] State ${meta.id} initialized with:`, init);
  }

  onGet(meta, prop) {
    console.log(`[GET] Property "${prop.toString()}" accessed in state ${meta.id}`);
  }

  onSet(meta, prop, value) {
    console.log(`[SET] Property "${prop.toString()}" set to`, value, `in state ${meta.id}`);
  }

  onCall(meta, method, args) {
    console.log(`[CALL] Method "${method}" called with args:`, args, `in state ${meta.id}`);
  }

  onDestroy(init, meta) {
    console.log(`[DESTROY] State ${meta.id} destroyed with final value:`, init);
  }
}

// Register the dev tool
setDevTool(new LoggingDevTool());
```

## Built-in DevTool Implementation

The Anchor core package includes a reference implementation of the DevTool interface that can serve as an example for building your own tools. This implementation provides basic logging to the console and can be used as a starting point for more advanced debugging tools.
