'use client';

import { callback, mutable, setup, snippet, undoable } from '@anchorlib/react';
import { LoaderCircle } from 'lucide-react';

const Counter = setup(() => {
  const state = mutable({ count: 0, loading: false });

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

  const Template = snippet(() => (
    <h2 className="flex items-center gap-4">
      Counter: {state.count} {state.loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
    </h2>
  ));

  return (
    <div>
      <Template />
      <button type={'button'} onClick={callback(incrementAsync)}>
        Increment Async (Optimistic)
      </button>
    </div>
  );
});

export default Counter;
