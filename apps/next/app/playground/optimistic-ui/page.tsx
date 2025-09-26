'use client';

import { useAnchor } from '@anchorlib/react';
import { observable } from '@anchorlib/react/view';
import { undoable } from '@anchorlib/core';
import { LoaderCircle } from 'lucide-react';

const Counter = observable(() => {
  const [state] = useAnchor({ count: 0, loading: false });

  const incrementAsync = () => {
    if (state.loading) return;

    state.loading = true;

    // Optimistically update the UI
    const [undo, clear] = undoable(() => {
      state.count += 1;
    });

    // Simulate API call with setTimeout
    setTimeout(() => {
      // Simulate random failure 30% of the time
      if (Math.random() < 0.3) {
        // Rollback the change if "API call" fails
        undo();
        console.log('Operation failed! Rolled back.');
      } else {
        // Mark the operation as success/complete.
        clear();
        console.log('Operation succeeded!');
      }

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

export default Counter;
