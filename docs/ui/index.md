---
title: 'User Interface'
description: 'Discover the AIR Stack User Interface architecture. Build fast, maintainable web applications using autonomous components.'
---

# User Interface

In the **AIR Stack**, the User Interface is built from **autonomous, self-governing components** — each one carries its own **state**, its own **behavior**, and its own **responsibility**. The parent doesn't control it; it **coordinates** with it.

This follows the web platform's natural model:
- A native `<input>` element **manages its own value** — you don't need JavaScript to make it work. When the user types, it updates itself.
- A `<select>` element **manages its own selection state** without parent intervention.
- A `<form>` element **collects its children's values** on submit without controlling each input individually.

The same principle applies to every component you build with the **AIR Stack**. JavaScript handles logic. **Elements handle presentation.** Neither dictates the other.

To keep your application **fast** and **maintainable** while building these autonomous units, we categorize UI elements by the level of power they need:

## Static UI

- **Reactivity:** None (Never changes)
- **Data Flow:** Static (Hardcoded attributes)

Static UI is just standard markup (`<h1>`, `<p>`, `<div>`). It renders once, has no state or behavior, and never updates. It belongs inline wherever you need it.

::: code-group

```tsx [React]
// Native elements belong inline. No component needed.
<div className="header">
  <h1>Dashboard</h1>
</div>
```

```tsx [SolidJS]
// Native elements belong inline. No component needed.
<div class="header">
  <h1>Dashboard</h1>
</div>
```

:::

## Reactive UI

- **Reactivity:** Reactive (Updates when data changes)
- **Data Flow:** Read-Only (One-Way)

A Reactive UI is a piece of UI that presents reactive data without owning it (e.g., a simple `Label`). It reads data from a source (a `prop`, a global `store`, or a `context`) and updates itself when that data changes, but it never modifies the data or maintains its own internal state.

::: code-group

```tsx [React]
import { $use } from '@anchorlib/react';

// Passes data by reference ($use). Reactive UI updates automatically when `userName` changes.
<Label text={$use(appState, 'userName')} type="primary" />
```

```tsx [SolidJS]
// Expressions are automatically tracked. Reactive UI updates automatically when `userName` changes.
<Label text={appState.userName} type="primary" />
```

:::

## Component

- **Reactivity:** Reactive (Updates itself)
- **Data Flow:** Read & Write (Two-Way or Autonomous)

A Component is a fully autonomous, self-governing unit. It has its own **state** (e.g., `loading`, `selected`), its own **behavior** (formatting, validating), and triggers its own **side-effects** (fetching, syncing).

A Component can use two-way binding (`Bindable`) to automatically sync state with a shared source without requiring manual event callbacks.

::: code-group

```tsx [React]
import { $bind } from '@anchorlib/react';

// Connects the prop to the parent's state. Writes propagate automatically.
<Toggle value={$bind(settings, 'notifications')} />
```

```tsx [SolidJS]
import { $bind } from '@anchorlib/solid';

// Connects the prop to the parent's state. Writes propagate automatically.
<Toggle value={$bind(settings, 'notifications')} />
```

:::

## The Problem: Mixed Concerns

To see how this plays out in practice, let's look at how a Component differs from a standard Reactive UI. In a strictly one-way data flow model, a parent often ends up micromanaging its children:

::: code-group

```tsx [React]
import { useState } from 'react';

function NavButton({ label, isActive, onClick }: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button className={isActive ? 'active' : ''} onClick={onClick}>
      {label}
    </button>
  );
}

function Nav() {
  const [active, setActive] = useState('home');

  return (
    <nav>
      <NavButton label="Home" isActive={active === 'home'} onClick={() => setActive('home')} />
      <NavButton label="About" isActive={active === 'about'} onClick={() => setActive('about')} />
      <NavButton label="Contact" isActive={active === 'contact'} onClick={() => setActive('contact')} />
    </nav>
  );
}
```

```tsx [SolidJS]
import { createSignal } from 'solid-js';

function NavButton(props: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button classList={{ active: props.isActive }} onClick={props.onClick}>
      {props.label}
    </button>
  );
}

function Nav() {
  const [active, setActive] = createSignal('home');

  return (
    <nav>
      <NavButton label="Home" isActive={active() === 'home'} onClick={() => setActive('home')} />
      <NavButton label="About" isActive={active() === 'about'} onClick={() => setActive('about')} />
      <NavButton label="Contact" isActive={active() === 'contact'} onClick={() => setActive('contact')} />
    </nav>
  );
}
```

:::

This is one-way data flow — data flows down as props, events flow up as callbacks. For displaying static data, this is the right approach.

But in this interactive context, the `Nav` component ends up doing two jobs: tracking the current navigation **and** managing every button's active state. The `NavButton` can't determine if it's active on its own — the parent must compute `isActive` for each one. The `NavButton` can't activate itself — the parent must provide an `onClick` for each one. The parent is managing concerns that belong to the child, and this mixed concern grows with every button added.

## The Solution: Autonomous Components

Compare with the same component using two-way binding:

::: code-group

```tsx [React]
import { setup, render, mutable, type Bindable } from '@anchorlib/react';

const NavButton = setup<{ name: string; value?: Bindable<string>; onClick?: () => void }>((props) => {
  return render(() => (
    <button
      className={props.value === props.name ? 'active' : ''}
      onClick={() => {
        props.value = props.name;
        props.onClick?.();
      }}
    >
      {props.name}
    </button>
  ));
});

const Nav = setup(() => {
  const state = mutable({ active: 'Home' });

  return render(() => (
    <nav>
      <NavButton name="Home" value={$bind(state, 'active')} />
      <NavButton name="About" value={$bind(state, 'active')} />
      <NavButton name="Contact" value={$bind(state, 'active')} />
    </nav>
  ));
});
```

```tsx [SolidJS]
import { setup, mutable, type Bindable } from '@anchorlib/solid';

const NavButton = setup<{ name: string; value?: Bindable<string>; onClick?: () => void }>((props) => {
  return (
    <button
      classList={{ active: props.value === props.name }}
      onClick={() => {
        props.value = props.name;
        props.onClick?.();
      }}
    >
      {props.name}
    </button>
  );
});

const Nav = setup(() => {
  const state = mutable({ active: 'Home' });

  return (
    <nav>
      <NavButton name="Home" value={$bind(state, 'active')} />
      <NavButton name="About" value={$bind(state, 'active')} />
      <NavButton name="Contact" value={$bind(state, 'active')} />
    </nav>
  );
});
```

:::

Each `NavButton` is autonomous. It determines its own active state by comparing `props.value` with `props.name`. It activates itself by writing to `props.value`. The `Nav` component's only job is tracking the current navigation — it binds the state and lets each button handle itself.

`value` is a **state contract**. When a `NavButton` writes to `props.value`, the binding propagates the change to `state.active` in the parent — reactively. Any component reading `state.active` sees the update automatically. There is no need for an event listener to track the change.

`onClick` is an **event** — its purpose is for side effects. It allows external code to run side effects — logging, analytics, closing a menu — when the button is clicked. It is never meant to control the component's behavior or state. The state is handled through the binding; the event is for everything else.



## Learn More

- [Styling](./styling) — How to manage visual reuse and conditional states
- [Static UI](./static) — When UI should remain inline, and when it should graduate
- [Reactive UI](./view) — Presenting reactive data without owning it
- [Component](./component) — When a concern needs its own state, behavior, and reactivity
- [Data Components](./data) — Components that own and manage their server data
- [Form Components](./form) — User-driven form components with built-in validation
- [Headless Components](./headless) — Reusable logic units without a view
- [Composition](./composition) — Coordinating autonomous components into complete interfaces
