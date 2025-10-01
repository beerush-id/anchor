# Initialization APIs

The initialization APIs in Anchor for Solid provide functions for creating reactive states that integrate seamlessly
with Solid's reactivity system.

## Core APIs

These are the primary APIs for creating reactive state in your Solid applications.

### anchorRef

Creates a reactive reference to an object with automatic tracking setup.

#### Syntax

```ts
declare function anchorRef<T>(init: T, options?: StateOptions): T;
declare function anchorRef<S, T>(init: T, schema: S, options?: StateBaseOptions): ModelOutput<T>;
declare function anchorRef<S, T>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): ImmutableOutput<T>;
```

#### Parameters

- `init` - The initial value for the reactive state
- `schema` - Optional schema for validation and type inference
- `options` - Configuration options for the state

#### Returns

A reactive reference to the initialized state.

#### Examples

```tsx
import { anchorRef } from '@anchorlib/solid';

// Simple object
const state = anchorRef({ count: 0, name: 'Solid' });
state.count++; // Direct mutation
```

### reactive

An alias for [anchorRef](#anchorRef).

#### Syntax

```ts
declare function reactive<T>(init: T, options?: StateOptions): T;
declare function reactive<S, T>(init: T, schema: S, options?: StateBaseOptions): ModelOutput<T>;
```

#### Examples

```tsx
import { reactive } from '@anchorlib/solid';

const state = reactive({ count: 0 });
state.count++;
```

### variableRef

Creates a reactive variable reference with getter and setter.

#### Syntax

```ts
declare function variableRef<T>(init: T): VariableRef<T>;
declare function variableRef<T>(init: T, constant: true): ConstantRef<T>;
```

#### Parameters

- `init` - The initial value
- `constant` - If true, creates a read-only reference

#### Returns

A reactive reference with `value` getter and optionally setter.

#### Examples

```tsx
import { variableRef } from '@anchorlib/solid';

const count = variableRef(0);
console.log(count.value); // 0
count.value = 42;
console.log(count.value); // 42

// Constant reference
const constant = variableRef(42, true);
console.log(constant.value); // 42
// constant.value = 100; // TypeScript error
```

### constantRef

Creates a constant (read-only) reactive reference.

#### Syntax

```ts
declare function constantRef<T>(init: T): ConstantRef<T>;
```

#### Parameters

- `init` - The initial value

#### Returns

A read-only reactive reference with `value` getter.

#### Examples

```tsx
import { constantRef } from '@anchorlib/solid';

const PI = constantRef(3.14159);
console.log(PI.value); // 3.14159
// PI.value = 3.14; // TypeScript error
```

## Immutable APIs

These APIs provide immutability features for your state, ensuring controlled mutations.

### immutableRef

Creates an immutable reactive reference to an object with automatic tracking setup.

#### Syntax

```ts
declare function immutableRef<T>(init: T, options?: StateOptions): Immutable<T>;
declare function immutableRef<S, T>(init: T, schema: S, options?: StateBaseOptions): ImmutableOutput<T>;
```

#### Parameters

- `init` - The initial value
- `schema` - Optional schema for validation
- `options` - Configuration options

#### Returns

An immutable state of the input type.

#### Examples

```tsx
import { immutableRef } from '@anchorlib/solid';

const config = immutableRef({ theme: 'dark', version: '1.0' });
// config.theme = 'light'; // Trapped and logs error
```

### writableRef

Create a write interface for an immutable state.

#### Syntax

```ts
declare function writableRef<T>(state: T): Mutable<T>;
declare function writableRef<T, K>(state: T, contracts: K): MutablePart<T, K>;
```

#### Parameters

- `state` - The reactive state to make mutable
- `contracts` - Optional array of mutation keys that define which mutations are allowed

#### Returns

A mutable version of the input state.

#### Examples

```tsx
import { anchorRef, writableRef } from '@anchorlib/solid';

const immutableState = anchorRef({ count: 0 }, { immutable: true });
// immutableState.count++; // Error

const writable = writableRef(immutableState);
writable.count++; // Works
```

## Data Integrity APIs

These APIs provide schema-based validation and data integrity features for your state.

### modelRef

Creates a reactive model reference based on a schema.

#### Syntax

```ts
declare function modelRef<S, T>(schema: S, init: T, options?: StateBaseOptions): ModelOutput<S>;
declare function modelRef<S, T>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
): ImmutableOutput<S>;
```

#### Parameters

- `schema` - The schema defining the structure
- `init` - The initial value
- `options` - Configuration options

#### Returns

A reactive model output that conforms to the provided schema.

#### Examples

```tsx
import { modelRef } from '@anchorlib/solid';
import { z } from 'zod/v4';

const userSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
});

const user = modelRef(userSchema, { name: 'John', age: 30 });
user.name = 'Jane'; // Valid
// user.age = 'thirty'; // Validation error
```

## Array APIs

These APIs provide specialized state management for array-based data.

### flatRef

Creates a reactive array that only reacts to changes in the array structure, not individual elements.

#### Syntax

```ts
declare function flatRef<T>(init: T, options?: StateOptions): T;
```

#### Parameters

- `init` - The initial array value
- `options` - Configuration options for the state

#### Returns

A flattened reactive reference to the array.

#### Examples

```tsx
import { flatRef } from '@anchorlib/solid';

const items = flatRef([1, 2, 3, { name: 'John' }]);
items.push(4); // Triggers reactivity
// items[3].name = 'Jane'; // Does not trigger reactivity on the array itself
```

### orderedRef

Creates a reactive array that maintains sorted order based on a comparison function.

#### Syntax

```ts
declare function orderedRef<T>(init: T, compare: (a: T[number], b: T[number]) => number, options?: StateOptions): T;
```

#### Parameters

- `init` - The initial array value
- `compare` - A function that defines the sort order
- `options` - Configuration options for the state

#### Returns

A sorted reactive reference to the array.

#### Examples

```tsx
import { orderedRef } from '@anchorlib/solid';

const numbers = orderedRef([3, 1, 4, 1, 5], (a, b) => a - b);
// Result: [1, 1, 3, 4, 5]

numbers.push(2);
// Result: [1, 1, 2, 3, 4, 5] - automatically sorted
```
