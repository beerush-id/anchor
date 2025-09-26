# Optimistic UI with Anchor in React

Learn how to build responsive user interfaces with optimistic updates using Anchor's reactive state management and
undoable utility.

## What You'll Learn

In this tutorial, you'll learn:

1. How to implement optimistic UI patterns with Anchor
2. How to use the `undoable` utility for immediate rollback capabilities

## Understanding Optimistic UI

Optimistic UI is a pattern where the interface immediately reflects the expected result of a user action before the
actual operation completes. This approach makes applications feel faster and more responsive to users.

With Anchor's `undoable` utility, we can implement optimistic UI patterns that allow us to immediately show the result
of an action and provide an easy way to rollback if something goes wrong.

## Basic Optimistic UI Example

Here's a simple example using setTimeout to simulate an API call and optimistic UI updates:

```tsx
import { undoable } from '@anchorlib/core';
import { useAnchor } from '@anchorlib/react';
import { observer } from '@anchorlib/react/view';

const Counter = observer(() => {
  const [state] = useAnchor({ count: 0, loading: false });

  const incrementAsync = () => {
    // Prevent multiple clicks.
    if (state.loading) return;

    // Mark the operation as in progress.
    state.loading = true;

    // Optimistically update the UI.
    const [undo, clear] = undoable(() => {
      state.count += 1;
    });

    // Simulate API call with setTimeout.
    setTimeout(() => {
      // Simulate random failure 30% of the time.
      if (Math.random() < 0.3) {
        // Rollback the change if "API call" fails.
        undo();
        console.log('Operation failed! Rolled back.');
      } else {
        // Mark the operation as success/complete.
        clear();
        console.log('Operation succeeded!');
      }

      // Allow the user to click the button again.
      state.loading = false;
    }, 1000);
  };

  return (
    <div>
      <h2 className="flex items-center gap-4">
        Counter: {state.count} {state.loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
      </h2>
      <button onClick={incrementAsync}>Increment Async (Optimistic)</button>
    </div>
  );
});
```

::: tip In This Example

1. When the user clicks the button, we immediately increment the counter and show a loading indicator.
2. We use `undoable` to capture this change, allowing us to rollback if needed.
3. We simulate an `API call` using `setTimeout`.
4. If the `API call` fails (simulated 30% of the time), we rollback the change using the `undo` function.
5. If the `API call` succeeds, we mark the operation as complete and `clear` the tracked changes to prevent memory leaks.
6. We prevent multiple clicks on the button to prevent race conditions.

:::

## How `undoable` Works

The `undoable` utility captures state changes that occur during an operation and provides a way to rollback those
changes:

```typescript
import { undoable } from '@anchor/core';

// Perform an operation that can be undone
const [undo, clear] = undoable(() => {
  // Any state changes here are captured
  state.value = newValue;
});

// To rollback the changes
undo();

// To cleanup the changes
clear();
```

## Key Points for Optimistic UI

1. **Optimistic UI is for async operations**: It only makes sense when there's a delay between user action and actual
   result
2. **Use `undoable` to capture changes**: This allows you to rollback if the operation fails
3. **Rollback on failure**: Call the undo function when your async operation fails.
4. **Cleanup on succeeds**: Call the clear function when your async operation succeeds to prevent memory leaks.
