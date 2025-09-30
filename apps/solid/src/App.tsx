import solidLogo from './assets/solid.svg';
import viteLogo from '/vite.svg';
import './App.css';
import '@anchorlib/solid/binding';
import { observedRef, variableRef } from '@anchorlib/solid';
import { anchor } from '@anchorlib/core';

const state = anchor({ count: 0 });

function App() {
  const counter = variableRef(0);
  const doubled = observedRef(() => state.count * 2);

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
        <button onClick={() => counter.value++}>Count is {counter.value}</button>
        <button onClick={() => state.count++}>Count is {state.count}</button>
        <button>Doubled is {doubled.value}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">Click on the Vite and Solid logos to learn more</p>
    </>
  );
}

export default App;
