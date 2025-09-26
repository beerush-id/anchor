---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'Anchor: Human-Friendly State Management for Enterprise Web Apps'
description: 'Discover Anchor, a state management library designed for humans but built for enterprise-scale applications. Get the power of fine-grained reactivity and true immutability in React, Vue, Svelte, or plain JavaScript.'
keywords:
  - anchor state management
  - javascript state management
  - enterprise state management
  - react state management
  - vue state management
  - svelte state management
  - fine-grained reactivity
  - immutable state
  - typescript state management

hero:
  name: 'Anchor'
  text: 'State Management For Humans, Built For Enterprise Apps'
  tagline: 'Fine-Grained Reactivity with True Immutability for Modern Web Applications'
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
    title: Blazingly Fast
    details: Fine-grained reactivity ensures only affected components re-render, eliminating wasted renders.
  - icon: 🔒
    title: True Immutability
    details: Direct mutation syntax with proxy-based write contracts for safety without performance penalties.
  - icon: 🧠
    title: Developer Experience
    details: Intuitive APIs with strong typing, eliminating prop drilling and context hell.
  - icon: 📦
    title: Framework Agnostic
    details: First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript.
  - icon: 🔧
    title: Built-in Features
    details: Includes optimistic UI, history tracking, reactive storage, and reactive requests out of the box.
  - icon: 🛡️
    title: Data Integrity
    details: Schema validation with Zod and TypeScript ensures your state always conforms to expectations.
---

::: anchor-react-sandbox {class="sp-grid"}

```tsx /App.tsx [active]
import '@tailwindcss/browser';
import { useRef } from 'react';
import { useAnchor } from '@anchorlib/react';
import { observe } from '@anchorlib/react/view';

const Counter = () => {
  const [counter] = useAnchor({ count: 0 });

  // 😏 Only this tiny part of the UI that need to updated!
  const CounterView = observe(() => <h1>Counter: {counter.count}</h1>);

  return (
    <div className="flex flex-col w-screen h-screen justify-center items-center gap-6">
      <img src="https://anchor.mahdaen.name/docs/icon.svg" alt="Anchor Logo" className="w-24" />
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
};

export default Counter;
```

:::

## **Enterprise-Grade State Management for Modern Web Applications**

Anchor is a revolutionary state management framework designed for developers who demand both performance and developer
experience. Built on the **DSV (Data-State-View) model**, Anchor eliminates the complexity of traditional state
management while delivering unmatched performance.

### **Why Choose Anchor?**

- **Fine-Grained Reactivity**: Only components that depend on changed state re-render
- **True Immutability**: Direct mutation syntax without deep cloning overhead
- **Zero Configuration**: Works out of the box with optional advanced configuration
- **Framework Integration**: Native support for React, Vue, Svelte, and vanilla JS
- **Built-in Toolkit**: Optimistic UI, history tracking, reactive storage, and more
- **TypeScript First**: Comprehensive type definitions for enhanced developer experience

### **Performance Benchmarks**

In benchmark tests, Anchor outperforms traditional state management solutions by significant margins, especially as
applications scale in complexity. The fine-grained reactivity model ensures consistent performance regardless of state
tree size.

### **Getting Started**

1. [Install Anchor](/installation) in your project
2. Follow the [Getting Started Guide](/getting-started) to create your first reactive state
3. Explore [Reactivity](/reactivity) and [Immutability](/immutability) concepts
4. Learn about [Data Integrity](/data-integrity) with schema validation
5. Check framework-specific guides for [React](/react/getting-started), [Vue](/vue/getting-started),
   or [Svelte](/svelte/getting-started)

### **Architecture Overview**

Anchor's revolutionary **DSV (Data-State-View) model** replaces scattered data flows with a single, stable, immutable
State that acts as the source of truth for your entire application:

1. **Data**: External data sources (APIs, databases, user input)
2. **State**: Central immutable state managed by Anchor
3. **View**: Components that observe and render state

This architecture eliminates prop drilling, context hell, and state synchronization issues while providing predictable,
scalable state management.
