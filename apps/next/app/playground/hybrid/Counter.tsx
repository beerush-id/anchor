import { callback, mutable, setup, snippet } from '@anchorlib/react';

export const Counter = setup(() => {
  const state = mutable({ count: 0 });

  const increment = () => state.count++;

  const CountView = snippet(() => <p>Count: {state.count}</p>);

  return (
    <div>
      <CountView />
      <button type="button" onClick={callback(increment)}>
        Increment
      </button>
    </div>
  );
}, 'Counter');
