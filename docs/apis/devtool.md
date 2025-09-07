# Dev Tools API

The Dev Tools API provides a powerful mechanism for integrating custom debugging and inspection tools with Anchor's reactive system. By implementing the `DevTool` interface and registering it with `anchor.configure()`, you can tap into Anchor's internal operations and observe state changes, property access, and lifecycle events.

## `DevTool` Interface

This interface defines a set of optional callback methods that are invoked by Anchor during various state management operations. You can implement this interface to create your own custom development tools.

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
- `onCall(meta, method, args)`: Called when a method is invoked on a state.
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

To use a custom `DevTool` implementation, you register it using `anchor.configure()`:

```typescript
import { anchor } from '@anchor/core';

class MyCustomDevTool implements DevTool {
  onInit(init, meta) {
    console.log('State initialized:', meta.id, init);
  }
  // ... implement other callbacks
}

anchor.configure({
  devTool: new MyCustomDevTool(),
});
```

## `StateDevTool` (Reference Implementation)

The `StateDevTool` class (exported from `@anchor/devtool`) is a built-in reference implementation of the `DevTool` interface. It provides basic logging to the console and maintains an internal representation of the state tree, which can be useful for building visualizers or more advanced debugging interfaces.
