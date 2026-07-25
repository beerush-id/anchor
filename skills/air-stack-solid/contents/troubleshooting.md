## Troubleshooting — Common Solid AIR Stack Mistakes

### 1. Forgot `.use()` on Dynamic Styles for Anchor Components

**Symptom:** A component's `class` or `style` prop doesn't update when the reactive state changes.

**Cause:** Native HTML elements accept `classx()`/`stylex()` directly, but anchor components (built with `setup()`) need `.use()` to create a reactive binding.

```tsx
// ❌ Wrong: Static value — never updates
<InvoiceBadge class={classx('badge', { active: isActive })} />

// ✅ Correct: Reactive binding — updates when isActive changes
<InvoiceBadge class={classx.use(() => ['badge', { active: isActive }])} />
```

**Rule:** Native elements `<div>`, `<span>`, `<button>` → pass `classx()` directly. Anchor components (`<InvoiceBadge>`, `<ProgressBar>`) → use `classx.use()` / `stylex.use()` with a getter.

---

### 2. Inline Event Handlers Inside Component Body

**Symptom:** The component works, but a new function is recreated on every reactive update — defeating fine-grained updates for child components that receive the handler as a prop.

**Cause:** The event handler is defined as an arrow function inline in the JSX inside `setup()`.

```tsx
// ❌ Wrong: Handler recreated on every setup callback
export const Counter = setup((props) => {
  return <button onClick={() => props.count!++}>Count: {props.count}</button>;
});

// ✅ Correct: Stable closure defined once in setup()
export const Counter = setup((props) => {
  const increment = () => props.count!++;
  return <button onClick={increment}>Count: {props.count}</button>;
});
```

**Rule:** Define all event handlers as stable closures in `setup()`. Reference them by name in JSX.

---

### 3. Module-Level `effect()` in SSR

**Symptom:** `window is not defined` errors or hydration mismatch failures during SSR.

**Cause:** In Solid, `effect()` runs only in the browser — but if the code references `window`, `document`, or DOM APIs at the **module level** (not inside `effect()`), it will crash during SSR.

```tsx
// ❌ Wrong: Module-level code runs on the server
window.addEventListener('resize', handler); // Crashes during SSR

// ✅ Correct: Scoped inside effect (runs only in browser)
export const WindowTracker = setup(() => {
  effect(() => {
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });
  return <div>Window tracker</div>;
});
```

**Rule:** All browser API access must be inside `effect()` within `setup()`. Never reference `window` or `document` at the module level.

---

### 4. Putting a Large Reactive Form in a Single Reactive Block

**Symptom:** The entire form re-evaluates on every keystroke. Typing feels laggy, especially with many fields.

**Cause:** Solid's native JSX reactivity means any signal read in the template re-runs that entire JSX branch. If all form fields are in a single branch, every keystroke re-evaluates the whole block.

```tsx
// ❌ Wrong: Entire form re-evaluates on every keystroke
export const ProfileForm = setup(() => {
  return (
    <div class="form">
      <input value={state.name} onInput={...} />
      <input value={state.email} onInput={...} />
      <input value={state.phone} onInput={...} />
    </div>
  );
});

// ✅ Correct: Each InputField handles its own reactivity
export const ProfileForm = setup(() => {
  return (
    <div class="form">
      <InputField label="Name" value={$bind(() => state, 'name')} />
      <InputField label="Email" value={$bind(() => state, 'email')} />
      <InputField label="Phone" value={$bind(() => state, 'phone')} />
    </div>
  );
});
```

**Rule:** For large forms or dashboards, keep the body static and isolate reactive parts into components or `<Snippet>` boundaries per domain.

---

### 5. `acceptInteractions()` Not Called After Hydration

**Symptom:** Browser utilities (`LIVE_KEYBOARD`, `LIVE_CLIPBOARD`, `LIVE_CURSOR`, etc.) don't respond to any events — they stay in their initial state forever.

**Cause:** `acceptInteractions()` was not called after hydration. All browser utility listeners are deferred until this call.

```tsx
// ❌ Wrong: Browser utilities never activate
hydrate(document.getElementById('root'), () => <App />);

// ✅ Correct: Activate browser utilities after hydration
hydrate(document.getElementById('root'), () => <App />);
acceptInteractions();
```

**Check:** Is `acceptInteractions()` called after `hydrate()` in your entry-client.tsx?

---

### 6. Using `<Show>` Without a Getter (Solid-Specific)

**Symptom:** The `<Show>` condition never re-evaluates — it shows the initial state indefinitely.

**Cause:** Solid's `<Show>` takes a **function** (getter) for the `when` prop, not a direct value. Without the getter, it only evaluates once.

```tsx
// ❌ Wrong: Direct value — never re-evaluates
<Show when={user.data}>
  <div>{user.data.name}</div>
</Show>

// ✅ Correct: Getter function — re-evaluates on signal change
<Show when={() => user.data}>
  {u => <div>{u.name}</div>}
</Show>
```

**Rule:** Always pass a **getter function** (`() => value`) to `<Show when>`. The children receive the unwrapped value as a parameter.

---

### 7. Using `<Snippet>` When `<Show>` Is Needed (Missing Conditional Gate)

**Symptom:** Destructuring inside the children function throws `TypeError: Cannot destructure property 'x' of null`.

**Cause:** `<Snippet>` passes data through without a conditional gate. If the data is `null` or `undefined`, destructuring crashes. `<Show>` gates on the `when` prop first.

```tsx
// ❌ Wrong: Crashes if user.data is null
<Snippet data={user.data}>
  {({ name }) => <div>{name}</div>}
</Snippet>

// ✅ Correct: Show gates on condition, destructuring is safe
<Show when={() => user.data}>
  {data => <div>{data.name}</div>}
</Show>

// ✅ Also correct: Snippet with manual nullish handling
<Snippet data={user.data}>
  {(data) => <div>{data?.name ?? 'Loading...'}</div>}
</Snippet>
```

**Rule:** Use `<Show>` when the data may not exist yet (gate + safe destructuring). Use `<Snippet>` only when you know the data is non-null and just need rendering isolation.

---

### 8. Reading Reactive State Outside a Reactive Boundary

**Symptom:** The UI doesn't update when state changes — the component shows stale data.

**Cause:** In Solid, reactive state reads in JSX are automatically tracked. But if a signal is read **outside** the JSX (e.g., in a computed variable before the return), it's evaluated once during `setup()` and never re-evaluated.

```tsx
// ❌ Wrong: state.count read during setup() — never updates
export const Counter = setup((props) => {
  const count = state.count; // Read once, not reactive
  return <div>{count}</div>;
});

// ✅ Correct: Read inside JSX — tracked reactively
export const Counter = setup((props) => {
  return <div>{state.count}</div>;
});

// ✅ Also correct: Use derived() for computed values
const double = derived(() => state.count * 2);
```

**Rule:** Read reactive state directly in JSX (not in variables before return) unless you use `derived()` or a signal.
