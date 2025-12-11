---
title: "FAQ"
description: "Frequently Asked Questions about Anchor for React."
---

# Frequently Asked Questions

## General

::: details Does Anchor replace React? { open }
No. It acts as an **Enhancement Layer**. It gives React a stable **[Logic Layer](/react/component/setup)** (which runs once) while preserving React's powerful rendering engine for the **[Presentation Layer](/react/component/template)**.
:::

::: details Why do I need Anchor if React already has hooks? { open }
Hooks suffer from the **Re-render Cascade** because they mix logic and view in the same function. Anchor separates them, preventing performance issues and "stale closures" by design.
:::

::: details Doesn't mutating state directly break React? { open }
It would if you did it directly. But Anchor uses the **Gateway Pattern**. Your state is a **[Gateway](/react/state/mutable)** that intercepts changes and triggers updates only for the affected **[View](/react/component/template)** (Presentation Layer), ensuring React stays happy.
:::

## Performance

::: details Doesn't adding a layer on top of React introduce overhead? { open }
Technically, yes, but it results in **Net Performance Gains**. The minimal cost of Anchor's runtime is vastly outweighed by the savings from stopping React's **Re-render Cascades**. You trade a tiny library footprint for massive CPU savings by ensuring only the exact DOM nodes that change are updated.
:::

::: details How does Fine-Grained Reactivity work? { open }
It bypasses React's "Re-render Everything" model. Dependencies are tracked at the property level, so updating `state.value` only re-runs the specific View displaying it, leaving the rest of the component untouched.
:::

::: details When does it bypass React entirely? { open }
Only when using **Direct DOM Binding** ([`nodeRef`](/react/component/binding)) for high-frequency updates like animations.
:::

## Business & Impact

::: details Is it hard to learn? { open }
No. Because Anchor uses standard JavaScript patterns (objects, functions) instead of complex hooks (`useEffect`, `useMemo`), new developers can be onboarded in days, not weeks.
:::

::: details Does Anchor reduce development costs? { open }
Yes. By eliminating `useEffect` dependency arrays, `useMemo`, and `useCallback`, teams spend less time debugging complex hooks and more time building features.
:::

::: details How does it affect AI coding? { open }
Anchor is **AI-First**. Its boilerplate-free syntax significantly reduces token consumption and context window usage compared to standard React/Redux patterns.
:::

::: details Is maintenance cheaper? { open }
Yes. The separation of **Stable Logic** and **Reactive View** reduces technical debt by eliminating the "Re-render Cascade" that often makes legacy React codebases fragile.
:::

## Comparison

::: details How is this different from Redux/Zustand? { open }
Redux and Zustand store state *outside* components but still trigger **Component Re-renders** on change. Anchor triggers updates only for the specific **[View](/react/component/template)** (Presentation Layer), keeping the Logic Layer stable.
:::

::: details Is this like MobX? { open }
Similar mental model (mutable proxies), but simpler execution. MobX wraps the *entire component* in an observer (HOC). Anchor splits the component into Logic and View, so only the View part is observed.
:::

::: details Is this like SolidJS? { open }
Yes. Both share the **"Run Once"** philosophy and **Fine-Grained Reactivity**. Anchor essentially brings SolidJS's performance model into the React ecosystem, allowing you to use it alongside standard React components.
:::

## Component Architecture

::: details Why is the Component Logic stable? { open }
Because it runs exactly once during initialization. Unlike React's "Re-render" model, Anchor treats the component function as a **Constructor**, ensuring your functions and side effects are stable forever.
:::

::: details Why do I need both Templates and Snippets? { open }
- **[Template](/react/component/template#template)**: Use for reusable, props-driven UI.
- **[Snippet](/react/component/template#snippet)**: Use for scoped UI inside a Component.
:::

::: details Can I use React Hooks inside setup? { open }
You can, but you shouldn't. Using `useState` or `useReducer` would trigger the component to re-render, breaking Anchor's **Stable Logic** model. The goal is to run the component logic once and never re-render it.
:::

## State Management

::: details Is mutable state safe? { open }
Yes. Anchor uses **[Immutable State](/react/state/immutable)** (Read-Only Gateway) and **Write Contracts** to enforce safe, unidirectional data flow for shared state.
:::

::: details Does it track nested properties? { open }
Yes. **[Mutable State](/react/state/mutable)** is deep by default.
:::

::: details Can I validate my state? { open }
Yes. Anchor supports **Schema-Driven State**. You can define a schema to strictly enforce **Data Integrity**, preventing invalid data from ever entering your state at runtime.
:::

## Reactivity System

::: details How do Props work? { open }
Props are **[Reactive Proxies](/react/component/setup#reactive-props)**. Unlike React's immutable snapshots, they update in-place. **Note**: Destructuring them breaks reactivity because it extracts the current value once.
:::

::: details Do I need dependency arrays? { open }
No. **[Effects](/react/component/side-effect)** track dependencies automatically based on what you *actually read* during execution.
:::

::: details How do I stop tracking? { open }
Use **[`untrack()`](/react/component/side-effect#untracking-dependencies)** to read data without subscribing to it.
:::

::: details What if I need a copy of the state? { open }
Use **[`snapshot()`](/react/component/side-effect#snapshots)** to create a non-reactive clone.
:::

## DOM & Ecosystem

::: details How do I do two-way binding? { open }
Use the **[`bind()`](/react/component/binding)** helper to pass a writeable reference to a child component.
:::

::: details When should I use nodeRef? { open }
Only for **high-frequency updates** (like animations) where you need to bypass the Virtual DOM entirely. For standard updates, normal JSX binding is sufficient.
:::

::: details Does it work with Server Components? { open }
Yes. Anchor logic runs once on the server to generate HTML, making it **Universal by default**.
:::
