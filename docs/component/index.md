---
title: 'AIR Stack: Component'
description: 'Autonomous, self-governing components that follow the web platform''s natural mental model.'
---

# Component

In the AIR Stack, a component is an **autonomous, self-governing unit** — each one carries its own state, its own behavior, and its own responsibility. The parent doesn't control it; it **coordinates** with it.

This follows the web platform's natural model. A native `<input>` element manages its own value — you don't need JavaScript to make it work. When the user types, it updates itself. The parent never tells it what to display. A `<select>` manages its own selection. A `<form>` collects its children's values on submit without controlling each input.

The same principle applies to every component you build with the AIR Stack. JavaScript handles logic. Elements handle presentation. Neither dictates the other — the developer decides how they collaborate.

To see how this plays out in practice, here is a typical navigation component:

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

This is one-way data flow — data flows down as props, events flow up as callbacks. For displaying data, this is the right approach.

But in this context, the `Nav` component ends up doing two jobs: tracking the current navigation **and** managing every button's active state. The `NavButton` can't determine if it's active on its own — the parent must compute `isActive` for each one. The `NavButton` can't activate itself — the parent must provide an `onClick` for each one. The parent is managing concerns that belong to the child, and this mixed concern grows with every button added.

Compare with the same component using binding:

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
import { mutable, bindable, type Bindable } from '@anchorlib/solid';

const NavButton = bindable<{ name: string; value?: Bindable<string>; onClick?: () => void }>((props) => {
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

function Nav() {
  const state = mutable({ active: 'Home' });

  return (
    <nav>
      <NavButton name="Home" value={$bind(state, 'active')} />
      <NavButton name="About" value={$bind(state, 'active')} />
      <NavButton name="Contact" value={$bind(state, 'active')} />
    </nav>
  );
}
```

:::

Each `NavButton` is autonomous. It determines its own active state by comparing `props.value` with `props.name`. It activates itself by writing to `props.value`. The `Nav` component's only job is tracking the current navigation — it binds the state and lets each button handle itself.

`value` is a **state contract**. When a `NavButton` writes to `props.value`, the binding propagates the change to `state.active` in the parent — reactively. Any component reading `state.active` sees the update automatically. There is no need for an event listener to track the change.

`onClick` is an **event** — its purpose is for side effects. It allows external code to run side effects — logging, analytics, closing a menu — when the button is clicked. It is never meant to control the component's behavior or state. The state is handled through the binding; the event is for everything else.

### The Right Tool for the Right Context

Neither one-way data flow nor two-way binding is universally "the best." Both are best in their **right context**.

When a component **displays data** — rendering a label, showing a list — one-way flow is the natural choice. Data flows down, the child renders it. When a component **drives interaction** — navigation, selections, toggles — binding is the natural choice. The component owns its behavior and the parent coordinates through a shared contract.

Forcing one-way data flow on a two-way context creates **mixed concerns** — the parent ends up managing responsibilities that belong to the child. The AIR Stack supports both patterns. The developer chooses based on what the component does.

## Learn More

- [Reactive Components](./reactive) — Designing components with intentional update boundaries
- [Data Components](./data) — Components that own and manage their server data
- [Form Components](./form) — User-driven form components with built-in validation
- [Headless Components](./headless) — Reusable logic units without a view
- [Composition](./composition) — Coordinating autonomous components into complete interfaces
