## Troubleshooting — Common React AIR Stack Mistakes

### 1. Forgot `.use()` on Dynamic Styles for Anchor Components

**Symptom:** A component's `className` or `style` prop doesn't update when the reactive state changes.

**Cause:** Native HTML elements accept `classx()`/`stylex()` directly, but anchor components (built with `setup()`) need `.use()` to create a reactive binding.

```tsx
// ❌ Wrong: Static value — never updates
<InvoiceBadge className={classx('badge', { active: isActive })} />

// ✅ Correct: Reactive binding — updates when isActive changes
<InvoiceBadge className={classx.use(() => ['badge', { active: isActive }])} />
```

**Rule:** Native elements `<div>`, `<span>`, `<button>` → pass `classx()` directly. Anchor components (`<InvoiceBadge>`, `<ProgressBar>`) → use `classx.use()` / `stylex.use()` with a getter.

---

### 2. Inline Event Handlers Inside `render()`

**Symptom:** The component works, but a new function is created every time the reactive callback executes — defeating fine-grained updates for child components that receive the handler as a prop.

**Cause:** The event handler is defined as an arrow function inside the `render()` callback, which runs on every reactive update.

```tsx
// ❌ Wrong: Handler recreated on every render callback
export const Counter = setup((props) => {
  return render(() => (
    <button onClick={() => props.count!++}>Count: {props.count}</button>
  ));
});

// ✅ Correct: Stable closure defined in setup(), referenced in render()
export const Counter = setup((props) => {
  const increment = () => props.count!++;
  return render(() => (
    <button onClick={increment}>Count: {props.count}</button>
  ));
});
```

**Rule:** Define all event handlers as stable closures in `setup()`. Reference them by name in `render()`.

---

### 3. Module-Level `effect()` in SSR

**Symptom:** `window` is not defined, `document` is not defined, or hydration mismatch errors during server rendering.

**Cause:** `effect()` at module level runs during SSR where browser APIs don't exist. Effects that read `window`, `document`, or DOM APIs must be scoped to a component lifecycle.

```tsx
// ❌ Wrong: Module-level effect runs on the server
effect(() => {
  window.addEventListener('resize', handler); // Crashes during SSR
});

// ✅ Correct: Scoped to component lifecycle
export const WindowTracker = setup(() => {
  effect(() => {
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });
  return null;
});

// ✅ Also correct: effect.client() — only runs in browser
effect.client(() => {
  window.addEventListener('resize', handler);
});
```

**Rule:** Browser-only side effects go inside `setup()` or use `effect.client()`. Never use `effect()` at module level.

---

### 4. Putting a Large Reactive Form in a Single `render()` Block

**Symptom:** The entire form re-renders on every keystroke. Typing feels laggy, especially with many fields.

**Cause:** The form's entire JSX tree is wrapped in a single `render()`, so any state change causes the whole tree to re-evaluate.

```tsx
// ❌ Wrong: Entire form re-renders on every keystroke
export const ProfileForm = setup(() => {
  return render(() => (
    <div className="form">
      <input value={state.name} onInput={...} />
      <input value={state.email} onInput={...} />
      <input value={state.phone} onInput={...} />
    </div>
  ));
});

// ✅ Correct: Static body — each InputField handles its own reactivity
export const ProfileForm = setup(() => {
  return (
    <div className="form">
      <InputField label="Name" value={$bind(() => state, 'name')} />
      <InputField label="Email" value={$bind(() => state, 'email')} />
      <InputField label="Phone" value={$bind(() => state, 'phone')} />
    </div>
  );
});
```

**Rule:** Use `render()` for small reactive outputs (toggles, badges, counters). For large forms or dashboards, keep the body static and isolate reactive parts into components or `<Snippet>` boundaries.

---

### 5. `acceptInteractions()` Not Called After Hydration

**Symptom:** Browser utilities (`LIVE_KEYBOARD`, `LIVE_CLIPBOARD`, `LIVE_CURSOR`, etc.) don't respond to any events — they stay in their initial state forever.

**Cause:** `acceptInteractions()` was not called after hydration. All browser utility listeners are deferred until this call.

```tsx
// ❌ Wrong: Browser utilities never activate
hydrateRoot(document.getElementById('root')!, <App />);

// ✅ Correct: Activate browser utilities after hydration
hydrateRoot(document.getElementById('root')!, <App />);
acceptInteractions();
```

**Check:** Is `acceptInteractions()` called after `hydrateRoot()` in your entry-client.tsx?

---

### 6. Using `effect()` Instead of `effect.client()` for Browser Utilities

**Symptom:** The side effect works in the browser but causes SSR errors or hydration mismatches.

**Cause:** `effect()` runs during SSR. `effect.client()` skips SSR execution entirely — it's the correct choice for browser-only side effects like keyboard shortcuts, clipboard reads, and geolocation.

```tsx
// ❌ Wrong: Runs during SSR (may crash or mismatch)
effect(() => {
  if (LIVE_KEYBOARD.is('ctrl', 's')) saveDocument();
});

// ✅ Correct: Only runs after hydration in the browser
effect.client(() => {
  if (LIVE_KEYBOARD.is('ctrl', 's')) saveDocument();
});
```

**Rule:** Use `effect.client()` for any side effect that reads from browser utilities, `window`, `document`, or DOM APIs. Use `effect()` for side effects that are safe to run on both server and client.

---

### 7. Reading Reactive State Outside a Reactive Boundary

**Symptom:** The UI doesn't update when state changes — the component shows stale data.

**Cause:** Reactive state (`mutable`, `derived`, `query`) was read directly in the component body (outside `render()`, `<Show>`, or `snippet()`). The read happens once during `setup()`, not tracked for updates.

```tsx
// ❌ Wrong: state.count read during setup() — never updates
export const Counter = setup((props) => {
  return <div>{state.count}</div>; // Show once, never re-renders
});

// ✅ Correct: Read inside render() boundary — tracked reactively
export const Counter = setup((props) => {
  return render(() => <div>{state.count}</div>);
});
```

**Rule:** Reactive reads in JSX must be inside `render()`, `<Show>`, `snippet()`, or a child component's `setup()`.

---

### 8. Using `<Snippet>` When `<Show>` Is Needed (Missing Conditional Gate)

**Symptom:** Destructuring inside the children function throws `TypeError: Cannot destructure property 'x' of null`.

**Cause:** `<Snippet>` passes data through without a conditional gate. If the data is `null` or `undefined`, destructuring crashes. `<Show>` gates on the `when` prop first.

```tsx
// ❌ Wrong: Crashes if user.data is null
<Snippet data={user.data}>
  {({ name }) => <div>{name}</div>}
</Snippet>

// ✅ Correct: Show gates on condition, destructuring is safe
<Show when={() => user.data}>
  {({ name }) => <div>{name}</div>}
</Show>

// ✅ Also correct: Snippet with manual nullish handling
<Snippet data={user.data}>
  {(data) => <div>{data?.name ?? 'Loading...'}</div>}
</Snippet>
```

**Rule:** Use `<Show>` when the data may not exist yet (gate + safe destructuring). Use `<Snippet>` only when you know the data is non-null and just need rendering isolation.
