import { mutable, setup, snippet } from '@anchorlib/react';
import { watchPrice } from '../pages/home/function.js';

export const Counter = setup(() => {
  const state = mutable({ 
    count: 0,
    increment: () => state.count++
  });
  const stream = watchPrice.once('USD');

  const Count = snippet(
    () => (
      <button id="counter-btn" className="btn-counter" onClick={state.increment}>
        <span>count is {state.count}</span>
      </button>
    ),
    'Count'
  );

  const WatchPrice = snippet(() => {
    return (
      <div className="timer-display">
        {stream.data.symbol ? `[${stream.data.symbol}] ` : ''}${stream.data.price.toFixed(2)}{' '}
        {stream.status === 'pending' ? '🟢' : '🛑'}
      </div>
    );
  }, 'WatchPrice');

  // Static layout — never re-renders. Each snippet updates independently.
  return (
    <div className="counter-demo">
      <div className="counter-row">
        <Count />
        <WatchPrice />
      </div>
      <p className="code-hint">
        Two <code>snippet()</code> fragments — the IRPC stream updates the price independently.
      </p>
    </div>
  );
}, 'Counter');

export default Counter;
