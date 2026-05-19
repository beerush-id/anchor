import { derived, mutable } from '@anchorlib/solid';
import { watchPrice } from '../pages/home/function.js';

export function Counter() {
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  const stream = watchPrice.once('USD');

  const count = derived(() => state.count);
  const WatchPrice = derived(() => {
    return (
      <div class="timer-display">
        {stream.data.symbol ? `[${stream.data.symbol}] ` : ''}
        {stream.data.price?.toFixed(2) ?? '0.00'}{' '}
        {stream.status === 'pending' ? '🟢' : '🛑'}
      </div>
    );
  });

  return (
    <div class="counter-demo">
      <div class="counter-row">
        <button id="counter-btn" class="btn-counter" onClick={increment}>
          <span>count is {count.value}</span>
        </button>
        {WatchPrice.value}
      </div>
      <p class="code-hint">
        Two <code>derived()</code> fragments — the IRPC stream updates the price independently.
      </p>
    </div>
  );
}

export default Counter;
