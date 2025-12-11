---
title: "Immutable State"
description: "Safe state sharing with Read-Only Contracts in SolidJS."
keywords:
  - immutable
  - read-only
  - contracts
  - shared state
  - solidjs
---

# Immutable State

When sharing state across multiple components or modules (like a global Store), it is critical to control **who** can modify that state. Unrestricted access leads to unpredictable bugs where data is changed from unknown locations.

The architecture pattern to solve this is **Read/Write Segregation**:
- **Public Interface**: Read-Only. Safe to share anywhere.
- **Private Interface**: Writable. Kept internal to the store logic.

## Defining Read-Only Access

To share state safely, you define a read-only view. This ensures that any consumer can read the data to render the UI, but attempting to modify it will fail. This enforces the **One-Way Data Flow**.

```ts
import { immutable } from '@anchorlib/solid';

export const userState = immutable({
  name: 'John',
  role: 'Admin'
});

// Reading is allowed
console.log(userState.name);

// Mutation is blocked
userState.name = 'Jane'; // Error!
```

## Defining Write Permissions

Since the public state is read-only, you need a way to grant write permissions to specific parts of your application. This is done using the **Write Contract** (`writable`).

A Write Contract is a proxy that points to the same data but allows mutation.

```ts
import { immutable, writable } from '@anchorlib/solid';

// 1. Public Read-Only View
export const state = immutable({ count: 0 });

// 2. Write Contract
export const stateControl = writable(state);

// 3. Direct Usage
stateControl.count++; // Works!
```

### Shared Write Contracts

You can export a Write Contract to allow specific modules or components to update the state directly. This is often simpler than defining dedicated action functions for every possible change.

```ts
const settings = immutable({
  theme: 'dark',
  notifications: true
});

// Create a contract that guarantees ONLY 'theme' can be changed
export const themeControl = writable(settings, ['theme']);

// Consumers can simply assign values
themeControl.theme = 'light';
```

## Best Practices

### Prefer Restricted Access
For shared state, **always prefer `immutable` over `mutable`**. Exposing mutable state globally invites "spaghetti code" where any component can change the state in unpredictable ways.

- **Public**: `immutable` (Read-Only)
- **Private/Protected**: `writable` (Restricted Write)

This enforces a clear contract: "You can look, but you can't touch—unless you use the provided contract."

### Use Restricted Writers
When sharing a writer, **always provide the list of allowed keys** if possible. This creates a **Least Privilege** contract.

You can safely pass a restricted writer to a sub-component, knowing it cannot accidentally modify unrelated state.

```ts
// ✅ Prefer: Only allows changing 'theme'
const themeWriter = writable(settings, ['theme']);

// ❌ Avoid: Gives full write access to everything (unless intended)
const fullWriter = writable(settings);
```
