---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'AIR Stack: Cost Efficient, AI-Native Web Development Libraries'
description: 'The complete stack for modern web applications: Anchor (fine-grained state management), IRPC (type-safe APIs with automatic batching), and Reactive UI (React, Solid, Svelte, Vue). Build faster, ship cheaper, scale effortlessly.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Reactive UI
  - state management
  - RPC framework
  - API batching
  - React
  - Solid
  - Vue
  - Svelte
  - TypeScript
  - Bun
  - performance
  - enterprise

hero:
  name: 'AIR Stack'
  text: 'Cost Efficient, AI-Native'
  tagline: 'The Complete Stack for Modern Web Development'
  image: /icon.svg

  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/beerush-id/anchor

features:
  - icon: ⚡
    title: Fine-Grained Reactivity
    details: Anchor's fine-grained reactivity ensures only affected components re-render, eliminating wasted renders for optimal performance.
  - icon: 🚀
    title: Faster API Transport
    details: IRPC's automatic batching dramatically reduces network overhead by combining multiple requests into a single HTTP connection.
  - icon: 🎨
    title: Universal Reactive UI
    details: Works seamlessly with React, Solid, Svelte, Vue, and vanilla JavaScript. One state management solution for all frameworks.
  - icon: 📦
    title: Intelligent Caching
    details: Built-in intelligent caching with configurable TTL and manual invalidation ensures data freshness without redundant calls.
  - icon: 🔧
    title: Zero Boilerplate
    details: Auto-import constructors, type-safe APIs, and automatic versioning. No routes, no endpoints, just write functions and ship.
  - icon: 💰
    title: Cost Efficiency
    details: Reduced HTTP connections translate directly to lower infrastructure costs and reduced token usage in generative AI applications.
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
