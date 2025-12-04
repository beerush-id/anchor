# Evolving React Components

This documentation outlines the architecture and patterns for using Anchor with React. Anchor is a library that enhances
React by providing a more performant and intuitive component model, designed to solve the common challenges of React's
default rendering architecture.

## Background Problem: React's Rendering Model

React's core model, while declarative, creates several well-known challenges:

1. **Costly Re-Renders:** By default, when a component's state changes, React re-runs the entire component function and
   its children, relying on a VDOM "diff" to determine what changed. This is an O(N) operation that can become a
   performance bottleneck.
2. **Complex Manual Optimizations:** To combat this, React provides hooks like `useMemo` and `useCallback`. This forces
   the developer to manually memoize functions and values, adding significant boilerplate and cognitive load. Forgetting
   them leads to performance issues; using them incorrectly leads to stale data.
3. **Difficult Side Effects:** The `useEffect` hook combines component mount, change, and unmount logic into a single
   API. Its dependency array is a common source of bugs, from infinite loops to missed updates.
4. **Boilerplate-Heavy State:** Sharing state often requires "Provider Hell"—wrapping components in multiple
   `Context.Provider` components—and managing complex state with `useState` or `useReducer` can be verbose.

Anchor solves these problems at their root by introducing a new, fine-grained component architecture.

## Solution: Fine-Grained Model

Anchor doesn't replace React's renderer. It provides a more efficient way to build components. It does this by
separating a component's logic into two distinct, logical parts.

### 1\. `setup(fn)`: The One-Time Initialization

The `setup` function runs **only once** when the component is first created. This creates a stable, long-lived scope for
your component's logic.

- This is the correct place to initialize state, create functions, and define side effects.
- Because it runs once, any function or object defined here is stable by default.
- **This eliminates the need for `useCallback` and `useMemo` entirely.**

```tsx
import { setup } from '@anchorlib/react';

export const Counter = setup(() => {
  // This code runs ONCE.
  const state = anchor({ count: 0 });

  // This function is defined ONCE and is stable.
  const increment = () => {
    state.count++;
  };

  // ...
});
```

### 2\. `view(fn)`: The Fine-Grained Renderer

The `view` function is the reactive part of your component. It is a fine-grained observer that intelligently subscribes
to _only_ the specific pieces of state it reads.

- It re-runs **only** when the state it depends on changes.
- This is an O(1) update, bypassing React's VDOM diffing for unrivaled performance.
- **This eliminates the need for `React.memo`.**

```tsx
import { setup, view, anchor } from '@anchorlib/react';

export const Counter = setup(() => {
  const state = anchor({ count: 0, other: 'foo' });

  const increment = () => {
    state.count++;
  };

  // This `view` subscribes ONLY to `state.count`.
  // It will NOT re-render if `state.other` changes.
  const Template = view(() => {
    return <button onClick={increment}>Count: {state.count}</button>;
  });

  return <Template />;
}, 'Counter');
```

### The Static View

A crucial concept in the `setup`/`view` model is that the JSX returned by the `setup` function is **static**. It is
created only **once** when the component initializes and is never re-rendered.

- **Maximum Performance**: This static part of your component is completely free from React's rendering lifecycle. It
  acts as a stable container for your dynamic `view` components.
- **Separation of Concerns**: It forces a clean separation between the parts of your component that are static (the
  layout, titles, buttons) and the parts that are dynamic (the data displayed inside them).

This combination of a one-time `setup`, fine-grained reactive `view`s, and a static container view is what gives Anchor
its exceptional performance, eliminating the need for manual optimizations like `useMemo`, `useCallback`, and
`React.memo`.

## Component Lifecycles

Anchor provides a set of clear, explicit lifecycle functions that are designed to be more intuitive and less error-prone
than React's `useEffect` hook. Each function has a single, well-defined purpose and lives inside the one-time `setup`
scope, making side effects easier to manage, reason about, and debug.

### Mount Handling

The `onMount(fn)` function runs its callback **only once**, immediately after the component's DOM elements have been
mounted. It is the perfect tool for one-time setup tasks that need access to the live DOM or need to happen in a browser
environment.

- **Use Cases**: Adding global event listeners, initializing third-party libraries, or performing an initial data fetch.
- **Cleanup Function**: For convenience, `onMount` can return a function. This returned function will be automatically
  invoked when the component unmounts, making it a great way to pair setup and teardown logic together without needing a
  separate `onCleanup` call.
- **Why it's better**: It provides a clear, designated place for mount-only logic. Returning a cleanup function keeps
  related setup and teardown code colocated and self-contained.

```tsx
import { setup, onMount } from '@anchorlib/react';

export const EventListenerComponent = setup(() => {
  const handleResize = () => {
    console.log('Window resized!');
  };

  // The function returned from onMount is our cleanup logic.
  onMount(() => {
    console.log('Component has mounted. Adding listener.');
    window.addEventListener('resize', handleResize);

    // This function will be called automatically on unmount.
    return () => {
      console.log('Unmounting. Removing listener.');
      window.removeEventListener('resize', handleResize);
    };
  });

  // ...
});
```

### Cleanup Handling

The `onCleanup(fn)` function runs its callback **only once**, just before the component is unmounted and destroyed. Its
sole purpose is to clean up any resources, subscriptions, or listeners that were established during the component's
lifecycle to prevent memory leaks.

- **Use Cases**: Removing event listeners added with `onMount`, unsubscribing from a WebSocket or observable, or
  disposing of timers created with `setInterval`.

- **Why it's better**: It creates a clear and predictable location for cleanup logic. In React, this is typically
  handled by the return function from `useEffect`, which can be easy to forget and couples the cleanup logic with the
  effect itself. `onCleanup` makes this relationship explicit and mandatory.

```tsx
import { setup, onMount, onCleanup } from '@anchorlib/react';

export const EventListenerComponent = setup(() => {
  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    console.log('Component is unmounting. Cleaning up listener.');
    window.removeEventListener('resize', handleResize);
  });

  const handleResize = () => {
    /* ... */
  };
  // ...
});
```

### Reactive Side Effects

The `effect(fn)` function is for running side effects that react to state changes. It runs its callback once immediately
and then **automatically tracks its dependencies**. It will intelligently re-run the callback only when a piece of state
it read during the last execution has changed.

- **Use Cases**: Re-fetching data when a query changes, logging analytics, or synchronizing state with a browser API
  like `localStorage`.
- **Cleanup Function**: Just like `onMount`, an `effect` can return a cleanup function. This function is executed right
  before the effect runs again, and also when the component unmounts. This is essential for preventing resource leaks in
  ongoing effects, like cancelling a previous network request before starting a new one.
- **Why it's better**: It eliminates dependency arrays, a notorious source of bugs in React. The automatic dependency
  tracking and integrated cleanup make reactive code safer, cleaner, and far easier to maintain.

```tsx
import { setup, effect, anchor } from '@anchorlib/react';

export const DataFetcher = setup(() => {
  const state = anchor({ userId: 1 });

  // This effect automatically subscribes to `state.userId`.
  effect(() => {
    const controller = new AbortController();

    console.log(`Fetching data for user: ${state.userId}`);
    fetch(`/api/users/${state.userId}`, {
      signal: controller.signal,
    });

    // The cleanup function is called before the next effect runs
    // or when the component unmounts.
    return () => {
      console.log(`Cancelling fetch for user: ${state.userId}`);
      controller.abort();
    };
  });

  // ...
});
```

::: tip Using React's Hooks
You can still use standard React hooks like `useEffect`, `useMemo`, and `useCallback` inside the `setup` function. While
often unnecessary due to Anchor's model, this can be useful for integrating with third-party libraries or for backward
compatibility. Because `setup` only runs once, these hooks will also only run once.
:::

::: warning Important

- Component lifecycle functions (`onMount`, `onCleanup`, and `effect`) are designed to run in a browser environment and
  will not execute during Server-Side Rendering (SSR).
- You should not use React's own state hooks like `useState` or `useReducer` inside `setup`. Doing so will cause the
  entire component to re-render on state changes, breaking the fine-grained reactivity model that Anchor provides.
  :::

### Escaping Reactivity with `untrack`

Sometimes, you need to read a value from a reactive state object _without_ creating a subscription. For example, you
might need to get the current value of a state property inside an event handler or an asynchronous callback without
causing the component or effect to re-run when that value changes.

The `untrack(fn)` utility is the perfect tool for this. It runs the function you provide and returns its result, but it
temporarily disables reactivity tracking while the function is executing.

- **Use Cases**: Reading a state value for a one-time calculation, accessing state inside an asynchronous callback where
  you don't want to create a new subscription, or preventing an `effect` from re-running based on a specific dependency.

```tsx
import { setup, effect, anchor, untrack } from '@anchorlib/react';

export const Initializer = setup(() => {
  const state = anchor({ count: 0, isReady: false });

  effect(() => {
    // Use `untrack` to prevent this effect from re-running when `isReady` changes.
    // The effect will ONLY re-run when `state.count` changes.
    if (!untrack(() => state.isReady)) {
      // Perform some one-time initialization.
      console.log('Component is initializing...');
      state.isReady = true;
    }

    console.log('Current count is: ', state.count);
  });

  // ...
});
```

## Advanced Usage

The combination of `effect` and `microtask` is powerful for handling complex asynchronous UI patterns. A debounced
search input that fetches data from an API is a perfect example, as it requires managing timers, network requests, and
potential race conditions.

```tsx
import { setup, onMount, effect, anchor, microtask } from '@anchorlib/react';

export const BookList = setup(() => {
  const state = anchor({
    query: '',
    books: [],
    isLoading: true,
  });

  const [schedule, cancel] = microtask(300);

  // 1. Create a fetch function that handles its own cleanup.
  const fetchBooks = () => {
    const controller = new AbortController();
    const url = new URL('/api/books', window.location.origin);
    if (state.query) {
      url.searchParams.set('q', state.query);
    }

    state.isLoading = true;
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        state.books = data;
      })
      .finally(() => {
        state.isLoading = false;
      });

    // Return the cleanup function.
    return () => controller.abort();
  };

  // 2. Fetch initial data on mount.
  onMount(fetchBooks);

  // 3. Set up a debounced search effect when the query changes.
  effect(() => {
    // Re-run when query changes, but don't fetch if it's empty.
    if (!state.query) return;

    let abort: (() => void) | void;
    schedule(() => {
      abort = fetchBooks();
    });

    return () => {
      // Cancel the pending scheduled fetch and abort the in-flight request.
      cancel();
      abort?.();
    };
  });

  // ... return a view that uses state.query, state.books, and state.isLoading
});
```

::: tip In this example:

- **Self-Contained Fetch Logic**: The `fetchBooks` function is fully self-contained. It reads `state.query` from its
  closure and returns its own `abort` function, making it reusable and clean.
- **Initial Data Load**: `onMount(fetchBooks)` is declarative. It runs the fetch on mount and automatically uses the
  returned `abort` function for cleanup if the component unmounts.
- **Debounced Search**: The `effect`'s sole responsibility is scheduling the `fetchBooks` call when `state.query`
  changes.
- **Unified Cleanup**: The `effect`'s cleanup function is robust. It calls `cancel()` to stop any pending _scheduled_
  calls and `abort?.()` to abort any _in-flight_ `fetch` requests from the previous run.

:::

::: warning Important

The callback passed to `schedule` is asynchronous, so any reactive state accessed _inside_ it will not be tracked. This
is why `state.query` must be read in the synchronous part of the `effect` to establish the dependency.

:::

## Before and After: The Anchor Advantage

To see the practical benefit of the `setup`/`view` model, let's compare a standard React component with its Anchor equivalent.

### Before: Traditional React with Hooks

Consider a simple component that needs to display a user's full name and provide a button to change it. In standard React, you might memoize the `fullName` and the `changeName` function to prevent unnecessary re-calculations and re-renders.

```tsx
import { useState, useMemo, useCallback } from 'react';

export const UserProfile = () => {
  const [user, setUser] = useState({ firstName: 'John', lastName: 'Doe' });

  // 1. Manually memoize the derived value.
  const fullName = useMemo(() => {
    console.log('Recalculating full name...');
    return `${user.firstName} ${user.lastName}`;
  }, [user.firstName, user.lastName]);

  // 2. Manually memoize the callback function.
  const changeName = useCallback(() => {
    setUser({ firstName: 'Jane', lastName: 'Smith' });
  }, []);

  return (
    <div>
      <h2>{fullName}</h2>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
};
```

This code is verbose and error-prone. Forgetting `useMemo` or `useCallback` can lead to performance issues, while incorrect dependency arrays can lead to stale data.

### After: Anchor's `setup`/`view` Model

With Anchor, the code becomes simpler, more intuitive, and performant by default.

```tsx
import { setup, view, anchor } from '@anchorlib/react';

export const UserProfile = setup(() => {
  // Runs once.
  const state = anchor({
    firstName: 'John',
    lastName: 'Doe',
    // 1. A plain getter is naturally memoized and reactive.
    get fullName() {
      console.log('Recalculating full name...');
      return `${this.firstName} ${this.lastName}`;
    },
  });

  // 2. The function is stable by default. No useCallback needed.
  const changeName = () => {
    Object.assign(state, { firstName: 'John', lastName: 'Doe' });
  };

  // This view only re-renders when `state.fullName` changes.
  const FullName = view(() => <h2>{state.fullName}</h2>);

  return (
    <div>
      <FullName />
      <button onClick={changeName}>Change Name</button>
    </div>
  );
});
```

The Anchor version eliminates all manual optimizations. The `fullName` getter is automatically reactive, and the `changeName` function is stable because it's defined in `setup`. The code is cleaner, less complex, and free from the common bugs associated with React's hook-based optimizations.

## Addressing Concerns

A key design principle of Anchor is providing a superior Developer Experience (DX) by making common bugs less
catastrophic and easier to debug.

### 1. Forgetting a Dependency

A common concern with automatic dependency tracking is: "What if I forget to use a piece of state in my view or effect?"

In this scenario, the UI simply won't update when that specific piece of state changes. While this is a bug, it's a **safe failure**.
The component becomes stale, but it doesn't crash or trigger expensive, unwanted side effects. The
bug is predictable and easy to spot because the UI doesn't match the state.

This contrasts sharply with forgetting a dependency in React's `useEffect` array, which can lead to dangerous bugs.

### 2. Circular Mutation Detection

A more dangerous anti-pattern is creating an infinite loop. This happens when an `effect` or `view` writes to the exact
same state property that it reads from, causing it to trigger itself endlessly. For example,
`effect(() => { state.count = state.count + 1 })`. In React's `useEffect`, this can easily crash the browser or even
DDOS your own backend services.

Anchor actively prevents this. Instead of failing silently or crashing, Anchor detects the circular mutation and throws
a descriptive warning in the console, complete with a stack trace. This gives you immediate, actionable feedback to fix
the root cause of the problem, turning a potentially catastrophic bug into a clear, debuggable issue.

::: details Circular Mutation Detection {open}
<img style="border-radius: 8px" src="/images/circular-mutation.webp" alt="Circular Mutation Detection" />
:::

### 3. Compatibility with Traditional React

The `setup`/`view` model is designed for interoperability. You are not locked into an all-or-nothing architecture.

- **Rendering Third-Party Components**: You can render any standard React component (class or function) inside the
  return statement of your `setup` function or within a `view`. This includes components from libraries like Material
  UI, Ant Design, or your own existing codebase.

- **Rendering Anchor Components Elsewhere**: A component created with `setup` is a standard React component. You can
  render it inside any other React component, whether it's a traditional class component, a functional component with
  hooks, or another Anchor component.

This flexibility allows you to adopt Anchor incrementally, component by component, without needing to refactor your
entire application.

## Best Practices

To make the most of the `setup`/`view` architecture, keep these principles in mind:

1. **Group Logically Related State in `view`s**: Focus on creating `view` components that group logically related data.
   For example, a `UserView` that renders `state.firstName`, `state.lastName`, and a computed `state.fullName` makes
   sense as a single `view`, as these properties often change together. The goal is to create reactive boundaries around
   cohesive pieces of the UI, rather than just making every single element a `view`.
2. **Separate Logic from Rendering**: Keep your business logic, state management, and side effects inside the `setup`
   function. `view` functions should be as simple as possible, primarily concerned with presenting state. Pass stable
   functions from `setup` to handle mutations.
3. **Mix Models Intelligently**: When passing state to a traditional React child component, it's often better to pass
   individual properties (`state.user.name`) as props rather than the entire reactive `state` object. This is because a
   traditional component will re-render whenever its props change. If you pass the whole `state` object, the child may
   re-render unnecessarily when an unrelated property on the `state` object is modified.
4. **Use `untrack` for Intentional Escapes**: When you need to read a state value without creating a subscription (e.g.,
   for a one-time calculation or inside an event handler), use `untrack` to make your intention clear and prevent
   unnecessary re-renders.
5. **Be Cautious with `useContext`**: While you can use React's `useContext` inside `setup`, be aware of its
   implications. If you pass a frequently changing React state through the provider, it will trigger a
   standard React re-render of the _entire_ Anchor component, breaking the fine-grained model from it.

By following these practices, you can build highly performant, easily maintainable, and scalable components with Anchor.
