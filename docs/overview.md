---
title: 'Overview - Anchor State Management Library'
description: 'Discover Anchor, a revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. Learn about the DSV (Data-State-View) model.'
keywords: 'anchor overview, state management, reactivity, immutability, dsv model, data state view, enterprise apps, javascript, typescript'
---

# **Overview**

State Management for Humans, Built for Enterprise Apps. Anchor values the AX (All eXperience) philosophy. Anchor not just makes apps work, but also efficient. Intuitive
code makes developers happy, high performance makes users happy.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/dsv-model.webp" alt="DSV (Data-State-View) Model Schema" />
</div>

## **Introduction**

Welcome to Anchor, a revolutionary state management framework for modern web applications. Anchor introduces the **DSV (
Data-State-View) model**, a new architectural philosophy that redefines how you build reactive user interfaces. Our
mission is to solve the complex challenges of state management by focusing on the **AX (All eXperience) philosophy**,
which aims to empower developers with intuitive code and provide users with a blazing-fast, fluid experience.

::: tip Declarative Syntax

```tsx {17}
import { editorApp, TOOL_ICON_SIZE } from '../lib/editor.js';
import { useObserved, useWriter } from '@anchor/react';

export function DisplayPanel() {
  // SETUP PHASE.
  const style = useObserved(() => editorApp.currentStyle);  // 1. Observe the currentStyle
  const styleWriter = useWriter(style, [ 'display' ]);      // 2. Create a writer for the display property

  // REACTIVE PHASE.
  return (
    <ToggleGroup>
      <Toggle bind={ styleWriter } name="display" value="block" className="toggle-btn">
        <Square size={ TOOL_ICON_SIZE } />
        <Tooltip>Block</Tooltip>
      </Toggle>

      <!-- Your IDE will warn you about this line because the `position` is not in contract.  -->
      <Toggle bind={ styleWriter } name="position" value="grid" className="toggle-btn"> // [!code error]
        <LayoutGrid size={ TOOL_ICON_SIZE } />
        <Tooltip>Grid</Tooltip>
      </Toggle>
    </ToggleGroup>
  );
}
```

<img src="/images/contract-violation.webp" alt="Write Contract Violation" />

:::

## **Background Problem**

In many traditional frameworks and libraries, state management often leads to a series of escalating problems:

- **Prop Drilling & Context Hell:** As applications grow, sharing state across components becomes a messy tangle of
  props and providers, making code hard to reason about and maintain.
- **Wasted Renders:** The classic "copy-on-mutation" approach often triggers unnecessary re-renders across large parts
  of the application, leading to performance degradation and a choppy user experience.
- **High Mental Overhead:** Developers are forced to manage boilerplate code for immutability, data fetching, and
  storage, which distracts from building core business logic.

These issues create a significant divide between **Developer Experience (DX)** and **User Experience (UX)**. An
application might be easy to build initially, but it often becomes slow and unmanageable at scale.

## **Solutions**

Anchor solves these problems by providing a new, integrated approach to application architecture: the DSV model.

1. **DSV (Data-State-View):** We replace the scattered "Data-UI" flow with a single, stable, immutable **State** that
   acts as the source of truth for your entire application. Components simply read from this state, and Anchor handles
   the rest. This creates a clean, predictable, and scalable architecture.
2. **Fine-Grained Reactivity:** At its core, Anchor tracks dependencies at a granular level. When a piece of state
   changes, only the exact components that depend on that specific piece of state are re-rendered. This eliminates
   wasted renders and is the secret to Anchor's superior performance.
3. **True Immutability:** Anchor allows you to use a powerful "direct mutation" syntax within controlled "write
   contracts". This gives you the safety of immutability without the performance overhead of deep cloning objects and
   arrays.
4. **Integrated Built-ins:** Anchor is not just a state manager. It's a complete toolkit that includes powerful
   built-ins for:
   - **Optimistic UI:** Instant UI updates that feel blazing-fast to the user.
   - **History:** Out-of-the-box undo/redo functionality.
   - **Reactive Storage:** Seamless two-way binding with `localStorage` and `IndexedDB`.
   - **Reactive Requests:** Simple, reactive handling of `fetch` and real-time streams.
