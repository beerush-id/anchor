import { createSignal, onCleanup } from 'solid-js';
import solidLogo from './assets/solid.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { anchor, subscribe } from '@anchorlib/core';

function anchorRef<T>(init: T): [{ value: T }] {
  const [count, setCount] = createSignal(0);
  const state = anchor({ value: init });
  const unsubscribe = subscribe(state, (_, event) => {
    if (event.type === 'init') return;
    setCount(count() + 1);
  });

  onCleanup(() => unsubscribe());

  return [
    {
      get value() {
        count();
        return state.value;
      },
      set value(value: T) {
        state.value = value;
      },
    },
  ];
}

function App() {
  const [counter] = anchorRef(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a href="https://solidjs.com" target="_blank">
          <img src={solidLogo} class="logo solid" alt="Solid logo" />
        </a>
      </div>
      <h1>Vite + Solid</h1>
      <div class="card">
        <button onClick={() => counter.value++}>count is {counter.value}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">Click on the Vite and Solid logos to learn more</p>
    </>
  );
}

export default App;
