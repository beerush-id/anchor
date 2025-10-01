import { observer, useAnchor } from '@anchorlib/react';

export const Counter = observer(() => {
  const [counter] = useAnchor({ count: 0 });

  return (
    <div>
      <h1>Counter: {counter.count}</h1>
      <button onClick={() => counter.count++}>Increment</button>
      <button onClick={() => counter.count--}>Decrement</button>
      <button onClick={() => (counter.count = 0)}>Reset</button>
    </div>
  );
});
