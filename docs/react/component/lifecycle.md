---
title: "Lifecycle Handlers"
description: "Managing component lifecycle with onMount() and onCleanup()."
keywords:
  - onMount
  - onCleanup
  - lifecycle
  - setup
---

# Component Lifecycle

You can execute logic at specific points in a component's life, such as when it enters or leaves the DOM.

## Mounting

You can schedule code to run **once** when the component is successfully mounted to the DOM. This is monitored by `onMount`.

### Usage
Since `setup` also runs once during initialization, you might wonder when to use `onMount`.

-   **`setup` body**: Runs *during* component creation (before DOM attachment). Use this for state initialization, defining effects, and event handlers.
-   **Mounting**: Runs *after* the component is in the DOM. Use this for:
    -   Direct DOM manipulation (focusing inputs, measuring elements).
    -   Integrating with 3rd-party libraries that need DOM nodes.
    -   Starting animations.

```tsx
import { setup, onMount, nodeRef } from '@anchorlib/react';

export const AutoFocusInput = setup(() => {
  const inputRef = nodeRef<HTMLInputElement>();

  onMount(() => {
    // Safe to access DOM here
    inputRef.current?.focus();
    console.log('Input focused!');
  });

  return render(() => <input ref={inputRef} />);
});
```

### Returning Cleanup
For convenience, the mounting handler can return a cleanup function. This is often cleaner than defining a separate cleanup handler.

```tsx
onMount(() => {
  const id = setInterval(() => console.log('Tick'), 1000);

  // Cleanup on unmount
  return () => clearInterval(id);
});
```

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, mutable, onMount, snippet } from '@anchorlib/react';

export const TimerDemo = setup(() => {
  const state = mutable({ 
    count: 0,
    isRunning: false,
    logs: [] as string[]
  });

  let intervalId: number | null = null;

  const addLog = (message: string) => {
    state.logs = [...state.logs, `[${new Date().toLocaleTimeString()}] ${message}`].slice(-5);
  };

  onMount(() => {
    addLog('Component mounted');
    
    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      addLog('Component unmounted (cleanup)');
    };
  });

  const startTimer = () => {
    if (!state.isRunning) {
      state.isRunning = true;
      addLog('Timer started');
      intervalId = setInterval(() => {
        state.count++;
      }, 1000) as unknown as number;
    }
  };

  const stopTimer = () => {
    if (state.isRunning && intervalId) {
      state.isRunning = false;
      clearInterval(intervalId);
      intervalId = null;
      addLog('Timer stopped');
    }
  };

  const reset = () => {
    stopTimer();
    state.count = 0;
    addLog('Timer reset');
  };

  // Snippet for timer display (updates when count or isRunning changes)
  const TimerDisplay = snippet(() => (
    <div style={{ 
      fontSize: '48px', 
      fontWeight: 'bold', 
      textAlign: 'center',
      margin: '20px 0',
      color: state.isRunning ? '#4CAF50' : '#666'
    }}>
      {state.count}s
    </div>
  ), 'TimerDisplay');

  // Snippet for controls (updates when isRunning changes)
  const TimerControls = snippet(() => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button 
        onClick={startTimer}
        disabled={state.isRunning}
        style={{ 
          flex: 1,
          padding: '12px', 
          cursor: state.isRunning ? 'not-allowed' : 'pointer',
          opacity: state.isRunning ? 0.5 : 1
        }}
      >
        Start
      </button>
      <button 
        onClick={stopTimer}
        disabled={!state.isRunning}
        style={{ 
          flex: 1,
          padding: '12px', 
          cursor: !state.isRunning ? 'not-allowed' : 'pointer',
          opacity: !state.isRunning ? 0.5 : 1
        }}
      >
        Stop
      </button>
      <button 
        onClick={reset}
        style={{ flex: 1, padding: '12px', cursor: 'pointer' }}
      >
        Reset
      </button>
    </div>
  ), 'TimerControls');

  // Snippet for event log (updates when logs change)
  const EventLog = snippet(() => (
    <div style={{ 
      padding: '12px', 
      background: '#f5f5f5', 
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <strong>Event Log:</strong>
      {state.logs.length === 0 ? (
        <div style={{ color: '#999', marginTop: '8px' }}>No events yet</div>
      ) : (
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          {state.logs.map((log, i) => <li key={i}>{log}</li>)}
        </ul>
      )}
    </div>
  ), 'EventLog');

  // Static layout
  return (
    <div style={{ padding: '20px', maxWidth: '400px' }}>
      <h3>Timer with Cleanup</h3>
      <TimerDisplay />
      <TimerControls />
      <EventLog />
    </div>
  );
}, 'TimerDemo');

export default TimerDemo;
```

:::

## Unmounting

You can schedule code to run when the component is **removed** from the DOM. This is monitored by `onCleanup`.

### Usage
Use the unmount handler to clean up any side effects created in `setup` that aren't automatically handled by the reactivity system.

-   Removing global event listeners (e.g., `window.addEventListener`).
-   Clearing timers (if not using `effect`).
-   Destroying 3rd-party instances (e.g., Chart.js, Maps).

```tsx
import { setup, onMount, onCleanup } from '@anchorlib/react';

export const WindowTracker = setup(() => {
  const handleResize = () => console.log('Resized');

  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    console.log('Cleaned up listener');
  });

  return render(() => <div>Resize the window</div>);
});
```

## Lifecycle Flow

1.  **Setup Phase**: The `setup` function executes. State is created.
2.  **Render**: The component renders its initial HTML.
3.  **Mount**: The HTML is inserted into the DOM.
4.  **`onMount`**: Handlers fire.
5.  **Updates**: `effect`s and templates re-run as state changes.
6.  **Unmount**: Component is removed from DOM.
7.  **`onCleanup`**: Handlers fire.

## Best Practices

### 1. Prefer `effect` for Data Fetching
If your data fetching depends on state (e.g., fetching user details when `userId` changes), use `effect` instead of `onMount`. `onMount` only runs once, so it won't react to prop changes.

```tsx
// ✅ Good: Re-fetches when props.id changes
effect(() => {
  fetchUser(props.id);
});
```

### 2. Use `onMount` for DOM Access
Only use `onMount` when you specifically need to interact with the DOM element (e.g., focusing, scrolling, measuring). For logic that doesn't need the DOM, put it directly in the `setup` body.

### 3. Always Clean Up
If you add an event listener or start a timer, **always** return a cleanup function or use `onCleanup`. Failing to do so causes memory leaks and unexpected behavior when components unmount and remount.
