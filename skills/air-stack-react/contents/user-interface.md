## 6. User Interface (`@airlib/react`)
Anchor UI components are autonomous. They own their own behaviors and mutations rather than relying on their parents to micromanage them via massive callback props.

### Styling Patterns

#### Inline Classes (Default)
When a visual combination is used exactly once and requires no dynamic conditions, keep the classes inline as a raw string. This is the baseline pattern; it preserves locality and makes the markup immediately readable with zero runtime overhead.

```tsx
export const BillingHeader = () => (
  <header className="border-b border-gray-200 pb-4 mb-8">
    <h1 className="text-2xl font-semibold tracking-tight">Billing Settings</h1>
    <p className="text-gray-500 mt-2">Manage your subscription.</p>
  </header>
);
```

#### Core Styling Utilities (`classx` & `stylex`)
Use the `@airlib/react` utilities as the primary convention for **dynamic styles and classes**.

> **⚠️ CRITICAL: `.use()` Required for Anchor Components**
>
> - **Native HTML elements** (`<div>`, `<span>`, `<button>`): Pass `classx()` / `stylex()` directly — reactive updates work automatically
> - **Anchor components** (built with `setup()` like `<InvoiceBadge>`, `<ScrollView>`): Must use `classx.use(() => ...)` / `stylex.use(() => ...)` with a **getter** — the `.use()` variant creates a reactive binding that updates when dependencies change
>
> Forgetting `.use()` on anchor components = styles/classes never update when the reactive state changes. The UI will show stale values silently — no error, no warning.

**ClassX (`classx`)**: Joins class names based on strings, arrays, or object maps.
```tsx
import { classx } from '@airlib/react';
import { InvoiceBadge } from './InvoiceBadge.js'; // Example Anchor Component

export const Badge = ({ status, isActive, isOld }) => (
  // Mix string arguments and conditional objects directly
  <div className={classx('p-4 border rounded-lg', {
    'bg-gray-50': status === 'pending',
    'bg-green-50': status === 'paid',
    'opacity-50': isOld
  })}>
    {/* NATIVE HTML ELEMENTS: Pass classx() directly */}
    <span className={classx('text-sm font-medium', { 'text-green-900': isActive })}>
      {status}
    </span>
    
    {/* ANCHOR COMPONENTS: Must use classx.use() with a getter to pass a reactive binding */}
    <InvoiceBadge className={classx.use(() => ['badge', { active: isActive }])} />
  </div>
);
```

**StyleX (`stylex`)**: Automatically handles CSS units and unitless properties. Use the inline `style` property strictly as an escape hatch for continuous, JS-calculated values that cannot be mapped to discrete utility classes. Never map dynamic variables directly to Tailwind arbitrary brackets (e.g., `bg-[${color}]`).

> **⚠️ Same rule applies: `.use()` for anchor components.**
> `stylex()` → native elements. `stylex.use(() => ...)` → anchor components.

```tsx
import { stylex, $unit } from '@airlib/react';
import { ScrollView } from './ScrollView.js'; // Example Anchor Component

export const VirtualList = ({ height, scrollY, tenantColor, progress }) => (
  // NATIVE HTML ELEMENTS: Pass stylex() directly
  <div 
    className="relative w-full rounded-md border"
    style={stylex({
      height: height, // automatically appends px
      transform: `translate3d(0, ${scrollY}px, 0)`,
      width: $unit.percent(progress), // Explicit units
      opacity: 0.5, // Ignores units for unitless properties
      '--brand-color': tenantColor
    })}
  >
    {/* ANCHOR COMPONENTS: Must use stylex.use() with a getter to pass a reactive binding */}
    <ScrollView style={stylex.use(() => ({ height: height - 10 }))} />
  </div>
);
```

#### Local Variables & Class Factories
When a class combination is repeated in the *same file*, extract it to a local variable. When `classx` conditional logic becomes large and repeated, extract it to a local factory function to keep the JSX clean. 
*Note: Define styling helpers below your components so the primary UI logic isn't buried.*

```tsx
import { For, classx } from '@airlib/react';

export const InvoiceList = ({ invoices }) => (
  <div className="flex flex-col gap-4">
    <For each={() => invoices}>
      {(invoice) => (
        <div className={getInvoiceStyle(invoice.status)}>
          <span className={badgeClass}>{invoice.status}</span>
        </div>
      )}
    </For>
  </div>
);

// Local Variable: For repeating static class combinations
const badgeClass = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";

// Class Factory: Compose complex conditional styling logic cleanly
const getInvoiceStyle = (status: 'paid' | 'overdue' | 'pending') => classx('p-4 border rounded-lg', {
  'bg-green-50 border-green-200 text-green-900': status === 'paid',
  'bg-red-50 border-red-200 text-red-900': status === 'overdue',
  'bg-gray-50 border-gray-200 text-gray-900': status === 'pending'
});
```

#### Global Utilities & Native CSS
When a combination of classes is repeated across multiple pages, graduate it to global CSS. Use native CSS selectors (`:has()`, attribute targeting) for structural state tracking, and reserve Javascript class-toggling for logic that is too complex for native CSS to handle cleanly.

**CSS Guidelines**:
- **Readability**: Break long `@apply` lists into multiple lines, grouped by relevant properties (layout, typography, visuals).
- **Theming**: Prefer `@theme` variables over hardcoded static values.

```css
/* Tailwind @utility (Modern custom utility) */
@theme {
  --spacing-input-x: calc(var(--spacing) * 3);
  --spacing-input-y: calc(var(--spacing) * 2);
  --color-error-input: var(--color-red-500);
}

@utility form-input {
  /* Group by Layout & Typography */
  @apply w-full;
  @apply text-sm;

  /* Group by Visuals (Prefer theme variables over static values) */
  @apply rounded-md border border-gray-300 bg-white;

  padding-block: var(--spacing-input-y);
  padding-inline: var(--spacing-input-x);

  /* Semantic Attribute Selectors (No JS needed to manually toggle classes) */
  &[aria-invalid="true"] {
    border: 1px solid var(--color-error-input);
  }
}

/* Advanced Selectors (No JS needed to track nested child states) */
.pricing-card:has(input[type="checkbox"]:not(:checked)) {
  @apply opacity-75 grayscale;
}
```

### Reactive Boundaries & Prop Passing
When passing reactive state into the UI, you must protect the parent layout from unnecessary re-renders. The strategy depends entirely on *where* the state is being consumed.

#### Passing to a Component/View (Prop Binding)
When passing state down to a custom Component or View, you **must use a binding** (`$use` or `$bind`). The parent defers the read, passing a reactive reference so the child can track the freshest state internally.
- **One-Way (`$use`)**: Always takes a **Getter** (e.g., `() => state.data.currentUser`). Passes a deferred reference so the child tracks the state internally, protecting the parent from re-renders.
- **Two-Way (`$bind`)**: Always takes a **Getter + Key** (e.g., `$bind(() => state.profile, 'name')`). The child must know exactly which object and property to mutate to safely propagate the change back up. The getter ensures the binding survives even if the parent object is reassigned.

#### Passing to a Static Element (Reactive Boundary)
When passing state directly into native HTML elements (e.g., `<div>{state.value}</div>`), the surrounding block **must be wrapped in a reactive boundary** (like `render(() => ...)` or `<Show>`). In this scenario, the wrapper itself *is* the binding that tracks the read.

```tsx
import { setup, render, template, $use, $bind } from '@airlib/react';
import { metricsContext, appStateContext } from './contexts.js';

export const SettingsPanel = setup(() => {
  const metrics = metricsContext.get();
  const state = appStateContext.get();

  const handleSave = () => console.log('Saved!');

  // Reactive Boundary: `render(() => ...)` wraps the static HTML reads
  return render(() => (
    <div className="panel">
      {/* State read directly into Static HTML -> The `render` wrapper tracks this */}
      <h1>{state.settings.title}</h1>

      {/* Prop Binding: Pass reference to Components -> Child handles tracking */}
      <ProgressBar progress={$use(() => metrics.cpu)} />
      <Toggle value={$bind(() => state.settings, 'notifications')} />
      <Button onClick={handleSave}>Save</Button>
    </div>
  ));
});

// The View safely tracks the one-way bound prop internally
const ProgressBar = template<{ progress: number }>(({ progress }) => (
  <div className="progress-bar" style={{ width: `${progress}%` }} />
));
```

### Static UI
A Static UI provides structural markup without owning any data. To avoid the architectural trap of premature abstraction, scale your markup based strictly on its scope of reuse:

#### Single-Use (Inline)
If a structure is used exactly once, keep it inline. This preserves top-down readability.

```tsx
export const ProfilePage = page(profileRoute).render(({ state }) => (
  <main>
    {/* Inline markup for single-use structures */}
    <div className="profile-card">
      <span className="profile-label">Profile</span>
      <Avatar url={$use(() => state.data.user.avatarUrl)} />
    </div>
  </main>
));
```

#### Local Reuse (Same File)
If a structure is repeated multiple times on the *same page*, extract it to a local static structure in the *same file*.

```tsx
import { For, $use } from '@airlib/react';

export const ProfilePage = page(profileRoute).render(({ state }) => (
  <div className="grid">
    <For each={() => state.data.users}>
      {(user) => <ProfileCard profile={user} />}
    </For>
  </div>
));

// Extracted locally to prevent repetition on this specific page
const ProfileCard = ({ profile }) => (
  <div className="profile-card">
    <span className="profile-label">Profile</span>
    <Avatar url={$use(() => profile.avatarUrl)} />
  </div>
);
```

#### Global Reuse (Shared Folder)
Only graduate a static structure to a shared global directory (e.g., `lib/ui`) when it is actively imported and used across *multiple different pages*.

```tsx
// @/lib/components/ProfileCard.tsx

export const ProfileCard = ({ profile }) => (
  <div className="profile-card">
    <span className="profile-label">Profile</span>
    <Avatar url={$use(() => profile.avatarUrl)} />
  </div>
);

// AnyOtherPage.tsx
import { page } from '@airlib/react';
import { otherRoute } from './route.js';
import { ProfileCard } from '@/lib/components/ProfileCard';

export const AnyOtherPage = page(otherRoute).render(({ state }) => render(() => (
  <main>
    <ProfileCard profile={state.data.currentUser} />
  </main>
)));
```

### Reactive UI: Views & Isolation
A **View** is a one-way reactive boundary that presents state as-is but never owns state or behavior. It isolates fast updates to prevent expensive parent re-renders.

#### Snippet
Choose the right reactive boundary based on **how much of the UI is reactive** × **how large/frequently it updates**. A small reactive toggle needs less isolation than a large form with frequent updates.

#### `render()` — Small, Mostly Reactive

When a component's body is predominantly reactive AND the output is small (e.g., a toggle, a badge, a counter), wrap the return in `render()`. The whole output is one reactive boundary, which is appropriate because the output is small.

```tsx
export const Toggle = setup<{ value?: Bindable<boolean> }>((props) => {
  const toggle = () => { props.value = !props.value; };

  return render(() => (
    <button onClick={toggle}>
      {props.value ? 'ON' : 'OFF'}
    </button>
  ));
});
```

**When `render()` is the wrong choice:**
- **Output is large and mostly static** → return JSX directly from `setup()`, no wrapper needed
- **Output is large and heavily reactive** → break into smaller named snippets (`snippet()`) or extract into components (`setup()`)

Example — a form with many fields should NOT use `render()` around the whole body. Each field lives in its own component (`<InputField>`) or `<Snippet>` boundary, while the form body remains static:

```tsx
import { setup, mutable, $bind } from '@airlib/react';

export const ProfileForm = setup(() => {
  const state = mutable({ name: '', email: '' });

  // Body is static layout — return JSX directly, no render()
  return (
    <div className="form">
      <InputField label="Name" value={$bind(() => state, 'name')} />
      <InputField label="Email" value={$bind(() => state, 'email')} />
    </div>
  );
});
```

#### `snippet()` — Named Semantic Boundary

Use `snippet()` to create a named, reusable reactive boundary inside a component. Snippets inherit the parent closure naturally — they read the same variables the parent has access to.

```tsx
import { setup, snippet } from '@airlib/react';
import { metricsContext } from './contexts.js';

export const Dashboard = setup(() => {
  const metrics = metricsContext.get();

  // Named snippet: represents a distinct concept
  const CpuMeter = snippet(() => (
    <div className="cpu-fast-update">CPU: {metrics.cpu}%</div>
  ));

  return render(() => (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <CpuMeter />
    </div>
  ));
});
```

#### `<Show>` — Conditional Gate + Safe Destructuring

`<Show>` is both a conditional gate and a rendering boundary. The `when` prop guarantees safety: when falsy, children never render. When truthy, destructuring inside the children function is safe — the data is guaranteed non-null.

```tsx
import { Show } from '@airlib/react';

// Safe: Show gates on condition before destructuring
<Show when={() => user.data}>
  {({ name, email }) => <div>{name} — {email}</div>}
</Show>
```

Use `<Show>` when you need **flow control** (show/hide) AND rendering isolation together.

#### `<Snippet>` — Pure Rendering Boundary (No Gate)

`<Snippet>` creates an inline rendering boundary WITHOUT a conditional gate. The user is responsible for handling nullish values — the data is passed through as-is.

```tsx
import { Snippet } from '@airlib/react';

// No gate: user handles nullish themselves
<Snippet data={metrics}>
  {({ cpu }) => <div className="cpu-fast-update">CPU: {cpu.toFixed(1)}%</div>}
</Snippet>
```

Use `<Snippet>` when you need **rendering isolation only** and the element is always present in the DOM (no conditional show/hide).

**Key difference:**

| | `<Show>` | `<Snippet>` |
|---|---|---|
| Conditional gate? | Yes (`when` prop) | No |
| Destructuring safe? | Yes — gate guarantees data | No — user handles nullish |
| Purpose | Flow control + rendering | Rendering isolation only |

#### Template
Use `template()` to create a standalone, reusable reactive View. Unlike a snippet, a template requires explicit props and can be extracted to a different file.

```tsx
import { template } from '@airlib/react';

// A highly optimized, standalone reactive boundary
export const FeatureCard = template<{ title: string, description: string, theme: Theme }>(
  ({ title, description, theme }) => (
    <div className={`feature-card ${theme.current}`}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
);
```

### Components

#### Component Graduation
A piece of UI graduates into a **Component** (`setup()`) only when it needs to own any of its own:
- **State**: Data that belongs strictly to itself (e.g., loading, selected, count, etc.).
- **Behavior**: Logic that mutates state or processes data (e.g., format, validate, toggle, etc.).
- **Side-Effect**: Interactions with the outside world (e.g., fetch, sync, observers, etc.).

If it only presents data, it is a **Static UI** (standard function) or a **View** (`snippet`/`template`).
#### Component Initialization (`setup`)
Use `setup` to create a Component. To track reactive state reads in JSX, use `render(() => ...)`.

```tsx
import { setup, render, mutable, onMount, onCleanup, $use, createContext } from '@airlib/react';
import type { ReactNode } from 'react';

// A component with reactive JSX
export const Counter = setup<{ initial?: number }>((props) => {
  const state = mutable({ 
    count: props.initial ?? 0,
    increment: () => { state.count++; }
  });

  return render(() => (
    <button onClick={state.increment}>Count: {state.count}</button>
  ));
});

export const tabContext = createContext<{ active: number }>();

// A component with static JSX
export const Tabs = setup<{ default?: number, children?: ReactNode }>((props) => {
  const state = mutable({ active: props.default ?? 0 });
  tabContext.set(state); // Children use tabContext.get() to read/write state

  return (
    <div className="tabs-container">
      {props.children}
    </div>
  );
});
```

#### Component Props
In AirLib, `props` is reactive state and the **source of truth** of your component. Read from it and write directly back to it. 

Create a separate internal `mutable()` state only for data that belongs strictly to the component itself (e.g., local loading status, intermediate buffering, or internal toggles).

```tsx
import { setup, render } from '@airlib/react';

export const Counter = setup<{ count?: number }>((props) => {
  // Initialize missing props
  props.count ??= 0;

  const increment = () => props.count!++;

  return render(() => (
    <button onClick={increment}>
      Count: {props.count}
    </button>
  ));
});
```

#### Two-Way Binding (`Bindable`)
When a component needs to sync internal mutations back to its parent, it should type the prop as `Bindable<T>`. The component directly mutates this prop (`props.value = ...`), and the binding automatically propagates the state change. The component must also dispatch the associated native events back to the parent to maintain full composability.

```tsx
import { setup, render, type Bindable } from '@airlib/react';

// User Interaction (Reactive JSX)
export const Toggle = setup<{ 
  value?: Bindable<boolean>,
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}>((props) => {
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => { 
    props.value = !props.value; 
    props.onClick?.(e);
  };

  return render(() => (
    <button onClick={toggle}>
      {props.value ? 'ON' : 'OFF'}
    </button>
  ));
});
```

```tsx
import { mutable, setup, render, type Bindable } from '@airlib/react';

// System Event (Imperative API)
export const VideoPlayer = setup<{ 
  playing?: Bindable<boolean>, 
  src: string,
  onPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void,
  onPause?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
}>((props) => {
  const ref = mutable<{ current: HTMLVideoElement | null }>({ current: null });
  
  effect(() => {
    // Effect re-run when either props.playing or ref.current changes
    props.playing ? ref.current?.play() : ref.current?.pause();
  });

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    props.playing = true;
    props.onPlay?.(e);
  };

  const handlePause = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    props.playing = false;
    props.onPause?.(e);
  };

  return render(() => (
    <video
      ref={ref}
      src={props.src}
      onPlay={handlePlay}
      onPause={handlePause}
    />
  ));
});
```

```tsx
import { setup, render, type Bindable } from '@airlib/react';
import type { ReactNode } from 'react';

// System Event (Declarative DOM)
export const Accordion = setup<{ 
  expanded?: Bindable<boolean>, 
  title: string, 
  children?: ReactNode,
  onToggle?: (e: React.SyntheticEvent<HTMLDetailsElement>) => void
}>((props) => {
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    props.expanded = e.currentTarget.open;
    props.onToggle?.(e);
  };

  return render(() => (
    <details 
      open={props.expanded} 
      onToggle={handleToggle}
    >
      <summary>{props.title}</summary>
      {props.children}
    </details>
  ));
});
```

```tsx
import { mutable, setup, render, effect, type Bindable } from '@airlib/react';
import type { ReactNode } from 'react';

// System Event (Reactive JSX)
export const Reveal = setup<{ visible?: Bindable<boolean>, threshold?: number, children?: ReactNode }>((props) => {
  const ref = mutable<{ current: HTMLElement | null}>({ current: null });

  effect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      // Bottom-Up: Sync visibility to parent
      props.visible = entry.isIntersecting;
    });
    observer.observe(ref);

    return () => observer.disconnect();
  });

  return render(() => (
    <div ref={ref} style={{ minHeight: props.threshold ?? '1px' }}>
      {/* Top-Down: Conditionally render children based on the bound prop */}
      {props.visible ? props.children : null}
    </div>
  ));
});
```

```tsx
import { setup, mutable, $bind } from '@airlib/react';

// The Parent Consumer
export const Settings = setup(() => {
  const state = mutable({ notifications: true, advanced: false, autoPlay: false });

  // Static JSX: We pass the proxy references down, but we do not read them here!
  return (
    <div>
      <Toggle value={$bind(() => state, 'notifications')} />
      <Accordion title="Advanced" expanded={$bind(() => state, 'advanced')}>
        <VideoPlayer src="/intro.mp4" playing={$bind(() => state, 'autoPlay')} />
      </Accordion>
    </div>
  );
});
```

#### Props Forwarding
Forward reactive component `props` to child elements safely by extracting them explicitly. This establishes a clean reactive boundary and isolates subscriptions to the exact properties needed.

Use `props.$omit()` to forward all native props except those managed internally:

```tsx
import { setup, render, type Bindable } from '@airlib/react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  value?: Bindable<string>;
}

export const InputField = setup<InputProps>((props) => {
  const restProps = props.$omit(['value']);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.value = e.currentTarget.value;
    props.onInput?.(e);
  };

  return render(() => (
    <input 
      {...restProps}
      value={props.value ?? ''} 
      onInput={handleInput}
    />
  ));
});
```

Use `props.$pick()` to explicitly select and forward only specific props:

```tsx
import { setup, render } from '@airlib/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button = setup<ButtonProps>((props) => {
  const nativeProps = props.$pick(['onClick', 'disabled', 'type', 'className']);

  return render(() => (
    <button {...nativeProps} data-variant={props.variant ?? 'primary'}>
      {props.children}
    </button>
  ));
});
```

##### Direct DOM Manipulation (`nodeRef`)
When you need to frequently update an element's attributes, classes, or styles based on state changes (e.g., animations, drag-and-drop, or toggling visibility of a heavy container), use `nodeRef()`.

```tsx
import { setup, render, mutable, nodeRef } from '@airlib/react';

export const AnimatedBox = setup(() => {
  const state = mutable({ x: 0, y: 0, active: false });

  // High-performance direct DOM manipulation
  const boxRef = nodeRef(() => ({
    className: state.active ? 'box active' : 'box',
    style: { transform: `translate(${state.x}px, ${state.y}px)` }
  }));

  const toggleActive = () => { state.active = !state.active; };

  return render(() => (
    <div 
      ref={boxRef} 
      {...boxRef.attributes} 
      onClick={toggleActive}
    >
      <HeavyContent /> {/* Changing box location/class won't re-render this */}
    </div>
  ));
});
```

#### Component Lifecycle
A component's lifecycle is bound to its initialization scope (`setup()`), which runs exactly once to initialize state, build closures, and attach scoped side-effects.

##### DOM Element Access
For one-time initialization of static elements, use a standard local variable and a `ref` callback.

```tsx
import { setup, render, onMount } from '@airlib/react';

export const CanvasElement = setup(() => {
  // One-time use variable.
  let ref: HTMLCanvasElement | null = null;

  // onMount runs after the element is attached to the DOM
  // Use for one-time use.
  onMount(() => {
    if (!ref) return;
    const ctx = ref.getContext('2d');
    ctx?.fillRect(0, 0, 100, 100);
  });

  // One-time ref assignment.
  return <canvas ref={(el) => { ref = el; }} />;
});
```

##### Scope-Bound Cleanup (`onCleanup`)
You can conditionally execute side-effects (e.g., attaching listeners, starting timers, etc.) directly inside the component body. 

Use `onCleanup` to register a teardown function to the current scope, guaranteeing it is destroyed when the component is removed.

```tsx
import { setup, render, onCleanup } from '@airlib/react';

export const GlobalShortcut = setup(() => {
  // We can attach listeners directly in the component body based on conditions.
  if (typeof window !== 'undefined') {
    const handleKeyup = (e: KeyboardEvent) => {
      if (e.key === 'Escape') console.log('Esc pressed!');
    };
    
    document.addEventListener('keyup', handleKeyup);
    
    // Registers the teardown to the component's lifecycle
    onCleanup(() => document.removeEventListener('keyup', handleKeyup));
  }

  return render(() => <div />);
});
```

##### Self-Governing Components
A self-governing component discovers its own environment — parent elements, scroll containers, form contexts, intersection boundaries — and attaches its own behavior without the parent orchestrating it. The parent doesn't need to know what the component does internally; the component handles its own concerns.

```tsx
import { setup, render, mutable, effect } from '@airlib/react';
import { popover } from './popover'; // Headless utility

export const Tooltip = setup<{ text: string, x?: PopX, y?: PopY }>((props) => {
  const ref = mutable({ current: null as HTMLElement | null });

  effect(() => {
    const { current } = ref;
    const parent = current?.parentElement;
    if (!current || !parent) return;

    parent.addEventListener('mouseenter', () => popover(current, props.x, props.y));
  });

  return render(() => <span ref={ref} className="tooltip">{props.text}</span>);
});
```

Usage — the tooltip is a child, not a wrapper:
```tsx
<button>
  Hover me
  <Tooltip text="Self-governing tooltip" />
</button>
```

### Optimistic UI
A user interface pattern for immediate feedback. AI can implement this using different combinations, including:

#### The `undoable` Primitive
It applies mutations instantly using `undoable()` and provides an `undo` function to rollback if the network request fails.

```tsx
import { setup, render, undoable } from '@airlib/react';

export const LikeButton = setup<{ post: any }>((props) => {
  const toggleLike = async () => {
    const [undo, settled] = undoable(() => {
      props.post.liked = !props.post.liked;
    });

    await likePost(props.post.id).then(settled, undo);
  };

  return render(() => (
    <button onClick={toggleLike}>
      {props.post.liked ? 'Unlike' : 'Like'}
    </button>
  ));
});
```

#### Custom State Tracking
Manually saving the previous state before applying mutations, and manually restoring it if the operation fails. Use this when you need to perform sequential state mutations separated by asynchronous boundaries (`await`), where the rollback itself requires manual, asynchronous orchestration.

```tsx
import { setup, render } from '@airlib/react';

export const Checkout = setup<{ cart: any }>((props) => {
  const processCheckout = async () => {
    // 1. Manually track the state
    let prevStatus = props.cart.status;

    try {
      // 2. First mutation
      props.cart.status = 'locking';
      await api.lockInventory(props.cart.id);
      
      // Update tracking variable before next step
      prevStatus = props.cart.status;
      
      // 3. Second mutation
      props.cart.status = 'paying';
      await api.processPayment(props.cart.id);

      props.cart.status = 'complete';
    } catch (e) {
      // 4. Automatically restores the immediately previous state, regardless of where it failed
      props.cart.status = prevStatus;
    }
  };

  return render(() => (
    <button onClick={processCheckout}>Checkout</button>
  ));
});
```

#### Workflows
Using the workflow engine where each step handles its own isolated optimistic updates and rollback logic. This is ideal for complex, multi-stage pipelines because it prevents massive centralized error handlers.

```tsx
import { setup, render, plan, undoable, mutable } from '@airlib/react';

export const Checkout = setup(() => {
  const cart = mutable({ id: 'cart_123', status: 'idle' });

  // Define the workflow natively bound to the component's state
  const checkoutFlow = plan()
    .then(async () => {
      const [undo, settled] = undoable(() => cart.status = 'locking');
      await api.lockInventory(cart.id).then(settled).catch((e) => { undo(); throw e; });
    })
    .then(async () => {
      const [undo, settled] = undoable(() => cart.status = 'paying');
      await api.processPayment(cart.id).then(settled).catch((e) => { undo(); throw e; });
      cart.status = 'complete';
    });

  return render(() => (
    <button onClick={checkoutFlow}>
      {cart.status === 'idle' ? 'Checkout' : cart.status}
    </button>
  ));
});

```
