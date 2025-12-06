---
title: "Anchor vs. Others"
description: "A detailed comparison of Anchor against Redux, Zustand, Jotai, and MobX."
keywords:
  - anchor vs redux
  - anchor vs zustand
  - anchor vs jotai
  - anchor vs mobx
---

# Comparison

Anchor is not just another state management library; it's a fundamental shift in how you build React applications. While other libraries focus on managing state *within* React's rendering model, Anchor focuses on **bypassing** that model for optimal performance and developer experience.

## Anchor vs. React

While React's built-in state management with hooks like useState, useReducer, and useContext provides basic state management capabilities, Anchor enhances these patterns with advanced features for complex applications:

| Feature                     | React Built-in                  | Anchor for React |
| --------------------------- | ------------------------------- | ---------------- |
| Fine-grained reactivity     | ❌                              | ✅               |
| Intuitive Syntax            | ❌ (requires immutable pattern) | ✅               |
| True immutability           | ❌                              | ✅               |
| Automatic memory management | ❌ (inefficient deep copy)      | ✅               |
| Schema validation           | ❌                              | ✅               |
| Portability                 | ❌ (limited to React)           | ✅               |
| History Tracking            | ❌                              | ✅               |
| Nested reactivity           | Deep                            | Deep by default  |
| Performance optimization    | Manual                          | Automatic        |
| Debugging experience        | Complex                         | Simplified       |
| Bundle size                 | -                               | Minimal overhead |

## Anchor vs. Other Libraries


| Feature | Anchor | Redux | Zustand | Jotai | MobX |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rendering Model** | **Stable Setup + Reactive Templates** | Re-render on Selectors | Re-render on Hooks | Re-render on Atoms | Re-render on Observer |
| **Mental Model** | **Gateway** | Immutable Reducer | Immutable Store | Atomic | Mutable Class |
| **Boilerplate** | **Zero** | High | Low | Medium | Medium |
| **RSC Support** | **Native (Universal)** | Library Specific | Library Specific | Library Specific | Library Specific |
| **Performance** | **O(1) Direct Updates** | O(N) Selectors | O(N) Hooks | O(N) Atoms | O(1) Observers |

## Universal Component (RSC)

In standard React, you often have to choose between a **Server Component** (for static rendering) and a **Client Component** (for interactivity). If you want both, you usually end up creating two separate components or forcing everything to be client-side.

Anchor unifies this. You write **one component** that can be rendered as:

-   **RSC (React Server Components)**: Generates static HTML. Zero JavaScript sent to the client.
-   **SSR (Server-Side Rendering)**: Generates HTML on the server, then hydrates on the client.
-   **CSR (Client-Side Rendering)**: Runs entirely in the browser.

::: code-group
```tsx [Anchor (Unified)]
// UserProfile.tsx
// ✅ Works as RSC (Server) AND RCC (Client)
export const UserProfile = setup(({ initialData }) => {
  const state = mutable(initialData);

  return render(() => (
    <div>
      <h1>{state.name}</h1>
      <input 
        defaultValue={state.name}
        value={state.name} 
        onInput={callback(e => state.name = e.target.value)} 
      />
    </div>
  ));
});
```

```tsx [Redux / Zustand (Split)]
// 1. UserProfile.server.tsx (RSC)
// ❌ Cannot use store/hooks here.
// Must fetch data and pass to client component.
export function UserProfileServer({ data }) {
  return (
    <div>
      <h1>{data.name}</h1>
      <UserProfileClient initialData={data} />
    </div>
  );
}

// 2. UserProfile.client.tsx (RCC)
'use client'; 
import { useStore } from './store';

export function UserProfileClient({ initialData }) {
  // ✅ Interactive, but must be separate.
  // ⚠️ Must manually hydrate store
  const { name, setName } = useStore(initialData);

  return (
    <input 
      value={name} 
      onChange={e => setName(e.target.value)} 
    />
  );
}
```
:::

## Deep Dives

### Anchor vs. Redux

Redux is the industry standard for predictable state management, but it comes with significant boilerplate and performance overhead due to its top-down data flow.

::: code-group
```tsx [Anchor]
// Component: Runs once. Stable.
const Counter = setup(() => {
  const state = mutable({ count: 0 });
  
  // Direct mutation. No actions/reducers.
  const increment = () => state.count++;

  // View: Updates independently.
  return render(() => (
    <button onClick={increment}>
      {state.count}
    </button>
  ));
});
```

```tsx [Redux]
// 1. Define Slice
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1 }
  }
});

// 2. Component (Re-renders on change)
function Counter() {
  const count = useSelector(state => state.counter.value);
  const dispatch = useDispatch();

  return (
    <button onClick={() => dispatch(increment())}>
      {count}
    </button>
  );
}
```
:::

**Key Differences:**
*   **Boilerplate**: Anchor eliminates actions, reducers, and selectors.
*   **Rendering**: Redux triggers a re-render of the `Counter` component. Anchor re-runs the View, keeping the component's logic stable.

### Anchor vs. Zustand

Zustand is popular for its simplicity, but it still relies on React hooks (`useStore`) to trigger re-renders.

::: code-group
```tsx [Anchor]
// Shared State
const store = mutable({ count: 0 });

const Counter = template(() => (
  // No hook needed to "subscribe".
  // Accessing 'store.count' creates subscription.
  <h1>{store.count}</h1>
));
```

```tsx [Zustand]
// Shared Store
const useStore = create(set => ({
  count: 0,
  inc: () => set(state => ({ count: state.count + 1 }))
}));

function Counter() {
  // Hook triggers re-render when 'count' changes
  const count = useStore(state => state.count);
  return <h1>{count}</h1>;
}
```
:::

**Key Differences:**
*   **Subscription**: Anchor subscriptions are automatic and fine-grained. Zustand requires manual selector selection.
*   **Stale Closures**: Zustand components suffer from stale closures if not careful. Anchor's component ensures stable closures for the View.

### Anchor vs. Jotai

Jotai offers an atomic model which is great for avoiding top-down re-renders, but managing derived state and async atoms can become complex ("Atom Hell").

::: code-group
```tsx [Anchor]
// State is just an object
const state = mutable({
  price: 10,
  quantity: 2,
  // Derived state is simple
  get total() { return this.price * this.quantity }
});

const Cart = template(() => (
  <div>Total: {state.total}</div>
));
```

```tsx [Jotai]
// Atoms
const priceAtom = atom(10);
const quantityAtom = atom(2);
// Derived Atom
const totalAtom = atom(get => get(priceAtom) * get(quantityAtom));

function Cart() {
  // Hook triggers re-render
  const [total] = useAtom(totalAtom);
  return <div>Total: {total}</div>;
}
```
:::

**Key Differences:**
*   **Simplicity**: Anchor treats state as standard JavaScript objects. Jotai requires wrapping everything in `atom()`.
*   **Performance**: Updating an atom in Jotai triggers a component re-render. Anchor re-runs only the View.

### Anchor vs. MobX

MobX is the closest to Anchor in terms of reactivity (mutable proxies), but it typically uses classes/decorators and still targets React's render cycle.

::: code-group
```tsx [Anchor]
// Component
const User = setup(() => {
  const user = mutable({ name: 'John' });
  
  // View
  return render(() => <div>{user.name}</div>);
});
```

```tsx [MobX]
// Class + Observer
class UserStore {
  constructor() {
    makeAutoObservable(this);
  }
  name = 'John';
}

const User = observer(({ store }) => {
  // Re-renders component
  return <div>{store.name}</div>;
});
```
:::

**Key Differences:**
*   **Modern API**: Anchor uses a functional `component` API, avoiding classes and `this` binding issues.
*   **Rendering**: MobX `observer` wraps the component and triggers re-renders. Anchor's `View` isolates the update.
