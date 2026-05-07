import { mutable, onCleanup, onMount, setup, snippet } from '@anchorlib/react';

export const Counter = setup(() => {
  const state = mutable({ count: 0, seconds: 0 });
  const increment = () => state.count++;

  onMount(() => {
    const id = setInterval(() => state.seconds++, 1000);
    onCleanup(() => clearInterval(id));
  });

  const Count = snippet(() => (
    <button id="counter-btn" className="btn-counter" onClick={increment}>
      <span>count is {state.count}</span>
    </button>
  ), 'Count');

  const Timer = snippet(() => (
    <div className="timer-display">{state.seconds}s elapsed</div>
  ), 'Timer');

  // Static layout — never re-renders. Each snippet updates independently.
  return (
    <div className="counter-demo">
      <div className="counter-row">
        <Count />
        <Timer />
      </div>
      <p className="code-hint">
        Two <code>snippet()</code> fragments — the timer ticks without touching the counter.
      </p>
    </div>
  );
}, 'Counter');

export default Counter;
