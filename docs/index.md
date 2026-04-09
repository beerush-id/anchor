---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'AIR Stack: The Zero-Boilerplate, AI-Native Stack'
description: 'Eliminate the network layer. Eliminate React Query. Eliminate re-render cascades. Build type-safe, real-time web applications instantly with Anchor and IRPC.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Zero Boilerplate
  - Full-stack React
  - RPC framework
  - API batching
  - React Query alternative
  - tRPC alternative
  - AI Native
  - TypeScript

hero:
  name: 'AIR Stack'
  text: 'Zero-Boilerplate, AI-Native'
  tagline: 'Eliminate the network layer. Eliminate complex caching. Eliminate re-render cascades. Build type-safe, real-time apps instantly.'
  image: /icon.svg

  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/beerush-id/anchor

features:
  - icon: 🤖
    title: AI-Native Architecture
    details: Eliminates opaque boilerplate and implicit rendering lifecycles. Less "glue code" means AI assistants generate correct, deterministic components without hallucinating dependencies.
  - icon: 🔌
    title: Zero Network Plumbing
    details: No tRPC routers. No manual fetchers. IRPC seamlessly syncs your backend to a RemoteState over HTTP or WebSockets.
  - icon: ⚡
    title: Kill Subscriptions
    details: Get real-time streaming natively over standard HTTP. Use the exact same function signature for a simple query as you do for a live dashboard.
  - icon: ⚛️
    title: Kill React Query
    details: You don't need heavy query libraries. IRPC handles intelligent caching, loading states, retry logic, and call coalescing automatically.
  - icon: 🛑
    title: Kill Re-Render Cascades
    details: Anchor separates logic from presentation. Fetch data once without useEffect loops, and bind it directly to fine-grained DOM snippets.
  - icon: 🌐
    title: Universal Reactive UI
    details: Works perfectly with React, Solid, Svelte, Vue, and vanilla JavaScript. One cohesive reactive architecture for any framework.
---

::: anchor-react-sandbox {class="sp-grid"}

```tsx /App.tsx [active]
import '@tailwindcss/browser';
import '@anchorlib/react/client';
import { setup, snippet, mutable } from '@anchorlib/react';

const Counter = setup(() => {
  const counter = mutable({ count: 0 });

  // 😏 Only this tiny part of the UI that need to be updated!
  const CounterView = snippet(() => <h1>Counter: {counter.count}</h1>);

  return (
    <div className="flex flex-col w-screen h-screen justify-center items-center gap-6">
      <img src="https://anchorlib.dev/docs/icon.svg" alt="Anchor Logo" className="w-24" />
      <CounterView />
      <div className="flex items-center gap-2">
        <button
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 font-semibold rounded-sm"
          onClick={() => counter.count++}>
          Increment
        </button>
        <button
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 font-semibold rounded-sm"
          onClick={() => counter.count--}>
          Decrement
        </button>
        <button
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 font-semibold rounded-sm"
          onClick={() => (counter.count = 0)}>
          Reset
        </button>
      </div>
    </div>
  );
});

export default Counter;
```
