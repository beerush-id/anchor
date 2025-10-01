# History APIs

The history APIs in Anchor for Solid provide functions for managing state history with undo/redo functionality.

## historyRef

Creates a reactive history state that can be used to provide undo/redo functionality.

### Syntax

```ts
declare function historyRef<T extends State>(state: T, options?: HistoryOptions): HistoryState;
```

### Parameters

- `state` - The initial state value to be tracked in history
- `options` - Optional configuration for history behavior

### Returns

A HistoryState object that provides reactive access to the history state.

### Examples

```tsx
import { anchorRef, historyRef } from '@anchorlib/solid';

const state = anchorRef({ count: 0, name: 'Solid' });
const history = historyRef(state, { maxHistory: 50 });

// Make changes
state.count++;
state.name = 'Anchor Solid';

// Undo last change
history.backward();

// Redo last undone change
history.forward();

// Check if undo/redo is possible
if (history.canBackward) {
  history.backward();
}

if (history.canForward) {
  history.forward();
}
```
