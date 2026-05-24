import { mutable } from '@anchorlib/solid';
import { watchPrice } from '../pages/home/function.js';

export function Counter() {
  const state = mutable({
    count: 0,
    increment() {
      this.count++;
    },
  });

  const stream = watchPrice.once('USD');

  return (
    <div class="counter-demo">
      <div class="counter-row">
        <button id="counter-btn" class="btn-counter" onClick={() => state.increment()}>
          <span>count is {state.count}</span>
        </button>
        <div class="timer-display">
          {stream.data.symbol ? `[${stream.data.symbol}] ` : ''}
          {stream.data.price?.toFixed(2) ?? '0.00'} {stream.status === 'pending' ? '🟢' : '🛑'}
        </div>
      </div>
      <p class="code-hint">
        Two <code>derived()</code> fragments — the IRPC stream updates the price independently.
      </p>
    </div>
  );
}

export default Counter;
