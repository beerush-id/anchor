# Observation APIs

The observation APIs in Anchor for Solid provide functions for creating derived state and observing changes in reactive
states.

## observedRef

Creates a reactive reference that automatically updates when its dependencies change.

### Syntax

```ts
declare function observedRef<R>(observe: () => R): ConstantRef<Immutable<R>>;
```

### Parameters

- `observe` - A function that returns the value to be observed

### Returns

A ConstantRef object with a reactive value property that updates automatically.

### Examples

```tsx
import { anchorRef, observedRef } from '@anchorlib/solid';

const state = anchorRef({ count: 0 });

const doubled = observedRef(() => state.count * 2);

console.log(doubled.value); // 0
state.count = 5;
console.log(doubled.value); // 10
```

## derivedRef

Creates a derived reference that transforms the value of a source state.

### Syntax

```ts
declare function derivedRef<T, R>(state: T, transform: (current: T) => R): ConstantRef<Immutable<R>>;
```

### Parameters

- `state` - The source state to derive from
- `transform` - A function that transforms the source state value into the derived value

### Returns

A constant reference containing the transformed value.

::: warning Important

Derived state will listen to any changes to the source state recursively. It might cause performance issues if the
source state is large or has many dependencies.

:::

### Examples

```tsx
import { anchorRef, derivedRef } from '@anchorlib/solid';

const todos = anchorRef([
  { id: 1, text: 'Learn Anchor', completed: true },
  { id: 2, text: 'Build an app', completed: false },
]);

const completedCount = derivedRef(todos, (items) => items.filter((item) => item.completed).length);

console.log(completedCount.value); // 1
```

## Utilities

### isRef

Checks if a given value is a reactive reference created by variableRef or constantRef.

### Syntax

```ts
declare function isRef(state: unknown): state is VariableRef<unknown> | ConstantRef<unknown>;
```

### Parameters

- `state` - The value to check

### Returns

true if the value is a reactive reference, false otherwise.

### Examples

```tsx
import { variableRef, constantRef, isRef } from '@anchorlib/solid';

const varRef = variableRef(42);
const constRef = constantRef(42);
const plainObj = { value: 42 };

console.log(isRef(varRef)); // true
console.log(isRef(constRef)); // true
console.log(isRef(plainObj)); // false
```
