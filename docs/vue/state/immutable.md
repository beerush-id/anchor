---
title: "Immutable State"
description: "Safe state sharing with Read-Only Contracts in Vue."
keywords:
  - immutable
  - read-only
  - contracts
  - shared state
  - vue
  - immutableRef
---

# Immutable State

When sharing state across multiple components or modules (like a global Store), it is critical to control **who** can modify that state. Unrestricted access leads to unpredictable bugs where data is changed from unknown locations.

The architecture pattern to solve this is **Read/Write Segregation**:
- **Public Interface**: Read-Only. Safe to share anywhere.
- **Private Interface**: Writable. Kept internal to the store logic.

## Defining Read-Only Access

To share state safely, you define a read-only view using `immutableRef`. This ensures that any consumer can read the data to render the UI, but attempting to modify it will fail. This enforces the **One-Way Data Flow**.

```ts
import { immutableRef } from '@anchorlib/vue';

export const userState = immutableRef({
  name: 'John',
  role: 'Admin'
});

// Reading is allowed
console.log(userState.value.name);

// Mutation is blocked
userState.value.name = 'Jane'; // Error!
```

## Defining Write Permissions

Since the public state is read-only, you need a way to grant write permissions to specific parts of your application. This is done using the **Write Contract** (`writableRef`).

A Write Contract is a proxy that points to the same data but allows mutation.

```ts
import { immutableRef, writableRef } from '@anchorlib/vue';

// 1. Public Read-Only View
export const state = immutableRef({ count: 0 });

// 2. Write Contract
export const stateControl = writableRef(state.value);

// 3. Direct Usage
stateControl.value.count++; // Works!
```

### Shared Write Contracts

You can export a Write Contract to allow specific modules or components to update the state directly. This is often simpler than defining dedicated action functions for every possible change.

```ts
const settings = immutableRef({
  theme: 'dark',
  notifications: true
});

// Create a contract that guarantees ONLY 'theme' can be changed
export const themeControl = writableRef(settings.value, ['theme']);

// Consumers can simply assign values
themeControl.value.theme = 'light';
```

## Best Practices

### Prefer Restricted Access
For shared state, **always prefer `immutableRef` over `anchorRef`**. Exposing mutable state globally invites "spaghetti code" where any component can change the state in unpredictable ways.

- **Public**: `immutableRef` (Read-Only)
- **Private/Protected**: `writableRef` (Restricted Write)

This enforces a clear contract: "You can look, but you can't touch—unless you use the provided contract."

### Use Restricted Writers
When sharing a writer, **always provide the list of allowed keys** if possible. This creates a **Least Privilege** contract.

You can safely pass a restricted writer to a sub-component, knowing it cannot accidentally modify unrelated state.

```ts
// ✅ Prefer: Only allows changing 'theme'
const themeWriter = writableRef(settings.value, ['theme']);

// ❌ Avoid: Gives full write access to everything (unless intended)
const fullWriter = writableRef(settings.value);
```
