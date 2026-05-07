import { derived, mutable } from '@anchorlib/solid';
import { onCleanup, onMount } from 'solid-js';

export function Counter() {
  const state = mutable({ count: 0, seconds: 0 });
  const increment = () => state.count++;

  onMount(() => {
    const id = setInterval(() => state.seconds++, 1000);
    onCleanup(() => clearInterval(id));
  });

  const count = derived(() => state.count);
  const seconds = derived(() => state.seconds);

  return (
    <div class="counter-demo">
      <div class="counter-row">
        <button id="counter-btn" class="btn-counter" onClick={increment}>
          <span>count is {count.value}</span>
        </button>
        <div class="timer-display">{seconds.value}s elapsed</div>
      </div>
      <p class="code-hint">
        Two <code>derived()</code> fragments — the timer ticks without touching the counter.
      </p>
    </div>
  );
}

export default Counter;
