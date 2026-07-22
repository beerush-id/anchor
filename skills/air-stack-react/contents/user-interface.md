## 6. User Interface (`@anchorlib/react`)
Anchor UI components are autonomous. They own their own behaviors and mutations rather than relying on their parents to micromanage them via massive callback props.

### Styling Patterns

#### Inline Classes (Default)
When a visual combination is used exactly once, keep the classes inline. This preserves locality and makes the markup immediately readable.

```tsx
export const BillingHeader = () => (
  <header className="border-b border-gray-200 pb-4 mb-8">
    <h1 className="text-2xl font-semibold tracking-tight">Billing Settings</h1>
    <p className="text-gray-500 mt-2">Manage your subscription.</p>
  </header>
);
```

#### Local Variables & Class Factories
When a class combination is repeated in the *same file*, extract it to a local variable. For complex conditional logic, extract it to a local factory function to prevent bloated inline ternaries. 
*Note: Define styling helpers below your components so the primary UI logic isn't buried.*

```tsx
import { For } from '@anchorlib/react';

export const InvoiceList = ({ invoices }) => (
  <div className="flex flex-col gap-4">
    <For each={() => invoices}>
      {(invoice) => (
        <div className={`p-4 border rounded-lg ${getInvoiceStyle(invoice.status)}`}>
          <span className={badgeClass}>{invoice.status}</span>
          <span>{invoice.amount}</span>
        </div>
      )}
    </For>
  </div>
);

// Local Variable: For repeating static class combinations in the same file
const badgeClass = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";

// Class Factory: For complex conditional styling logic
const getInvoiceStyle = (status: 'paid' | 'overdue') => {
  switch (status) {
    case 'paid': return 'bg-green-50 border-green-200 text-green-900';
    case 'overdue': return 'bg-red-50 border-red-200 text-red-900';
    default: return 'bg-gray-50 border-gray-200 text-gray-900';
  }
};
```

#### Global Utilities & Native CSS
When a combination of classes is repeated across multiple pages, graduate it to global CSS. Use native CSS selectors (`:has()`, attribute targeting) for structural state tracking, and reserve Javascript class-toggling for logic that is too complex for native CSS to handle cleanly.

```css
/* Tailwind @utility (Modern custom utility) */
@utility form-input {
  @apply w-full rounded-md border border-gray-300 px-3 py-2 text-sm;
}

/* Semantic Attribute Selectors (No JS needed to manually toggle classes) */
.form-input[aria-invalid="true"] {
  @apply border-red-500 focus:border-red-500;
}

/* Advanced Selectors (No JS needed to track nested child states) */
.pricing-card:has(input[type="checkbox"]:not(:checked)) {
  @apply opacity-75 grayscale;
}
```

#### Dynamic Inline Styles
Use the inline `style` property strictly as an escape hatch for continuous, JS-calculated values that cannot be mapped to discrete utility classes. Never map dynamic variables directly to Tailwind arbitrary brackets (e.g., `bg-[${color}]`).

```tsx
export const VirtualList = ({ height, scrollY, tenantColor }) => (
  <div 
    className="relative w-full rounded-md border"
    style={{
      // Mathematical runtime calculations
      height: `${height}px`,
      transform: `translate3d(0, ${scrollY}px, 0)`,
      
      // Dynamic database values mapped to native CSS variables
      '--brand-color': tenantColor
    }}
  />
);
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
import { setup, render, template, $use, $bind } from '@anchorlib/react';
import { metricsContext, appStateContext } from './contexts.js';

export const SettingsPanel = setup(() => {
  const metrics = metricsContext.get();
  const state = appStateContext.get();

  // Reactive Boundary: `render(() => ...)` wraps the static HTML reads
  return render(() => (
    <div className="panel">
      {/* State read directly into Static HTML -> The `render` wrapper tracks this */}
      <h1>{state.settings.title}</h1>

      {/* Prop Binding: Pass reference to Components -> Child handles tracking */}
      <ProgressBar progress={$use(() => metrics.cpu)} />
      <Toggle value={$bind(() => state.settings, 'notifications')} />
      <Button onClick={() => console.log('Saved!')}>Save</Button>
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
import { For, $use } from '@anchorlib/react';

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
import { page } from '@anchorlib/react';
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
Use Snippets to create scoped reactive boundaries.

> [!WARNING] AI INSTRUCTION: WHEN TO USE SNIPPETS
> **DO NOT** default to wrapping everything in `<Snippet>` or `snippet()`, but also **DO NOT** default to wrapping massive God components in a single `render()` block!
> 
> Follow the **Critical Rendering Rule** from `SKILL.md`:
> - **Is the majority of the UI static?** Return static JSX from the component, and use Snippets/Templates ONLY to isolate the fast-updating reactive parts.
> - **Is the entire tree heavily reactive AND large?** Do NOT wrap it all in one `render()`. Use Snippets/Templates to break it down by domain so they update independently.
> - **Is the entire tree very small (e.g., a simple toggle button)?** ONLY then should you skip Snippets and let a single `render()` block handle the entire output natively.

When isolation is necessary, choose based on your structural concern:

- **Semantic Boundaries (`snippet()`):** Use the factory to create a named boundary when the UI represents a distinct concept or is complex enough to be extracted (e.g. `CpuMeter`). Snippets naturally inherit the parent closure.
- **Inline Boundaries (`<Snippet>`):** Use the component to create a boundary exactly where the UI sits. You **MUST** pass the state object via the `data` prop and destructure/read it inside the children function to properly defer the read.

```tsx [Semantic Example]
import { setup, snippet } from '@anchorlib/react';
import { metricsContext, authContext } from './contexts.js';

export const Dashboard = setup(() => {
  const metrics = metricsContext.get();
  const user = authContext.get();

  // Semantic Snippet: extracts a distinct concept
  const CpuMeter = snippet(() => (
    <div className="cpu-fast-update">CPU: {metrics.cpu}%</div>
  ));

  return render(() => (
    <div className="dashboard">
      <div className="profile"><h2>{user.firstName}</h2></div>
      <CpuMeter />
    </div>
  ));
});
```

```tsx [Inline Example]
import { setup, Snippet } from '@anchorlib/react';
import { metricsContext, authContext } from './contexts.js';

export const Dashboard = setup(() => {
  const metrics = metricsContext.get();
  const user = authContext.get();

  return render(() => (
    <div className="dashboard">
      <div className="profile"><h2>{user.firstName}</h2></div>
      
      {/* Inline Snippet: pass object to defer the read */}
      <Snippet data={metrics}>
        {({ cpu }) => <div className="cpu-fast-update">CPU: {cpu}%</div>}
      </Snippet>
    </div>
  ));
});
```

#### Template
Use `template()` to create a standalone, reusable reactive View. Unlike a snippet, a template requires explicit props and can be extracted to a different file.

```tsx
import { template } from '@anchorlib/react';

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
import { setup, render, mutable, onMount, onCleanup, $use, createContext } from '@anchorlib/react';
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
In the AIR Stack, `props` is reactive state and the **source of truth** of your component. Read from it and write directly back to it. 

Create a separate internal `mutable()` state only for data that belongs strictly to the component itself (e.g., local loading status, intermediate buffering, or internal toggles).

```tsx
import { setup, render } from '@anchorlib/react';

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
import { setup, render, type Bindable } from '@anchorlib/react';

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
import { mutable, setup, render, type Bindable } from '@anchorlib/react';

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

  // Video re-render only when props.src changes, which also re-run the effect.
  return render(() => (
    <video
      ref={ref}
      src={props.src}
      onPlay={(e) => {
        props.playing = true;
        props.onPlay?.(e);
      }}
      onPause={(e) => {
        props.playing = false;
        props.onPause?.(e);
      }}
    />
  ));
});
```

```tsx
import { setup, render, type Bindable } from '@anchorlib/react';
import type { ReactNode } from 'react';

// System Event (Declarative DOM)
export const Accordion = setup<{ 
  expanded?: Bindable<boolean>, 
  title: string, 
  children?: ReactNode,
  onToggle?: (e: React.SyntheticEvent<HTMLDetailsElement>) => void
}>((props) => {
  return render(() => (
    <details 
      open={props.expanded} 
      onToggle={(e) => {
        props.expanded = e.currentTarget.open;
        props.onToggle?.(e);
      }}
    >
      <summary>{props.title}</summary>
      {props.children}
    </details>
  ));
});
```

```tsx
import { mutable, setup, render, effect, type Bindable } from '@anchorlib/react';
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
import { setup, mutable, $bind } from '@anchorlib/react';

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
import { setup, render, type Bindable } from '@anchorlib/react';
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
import { setup, render } from '@anchorlib/react';
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
import { setup, render, mutable, nodeRef } from '@anchorlib/react';

export const AnimatedBox = setup(() => {
  const state = mutable({ x: 0, y: 0, active: false });

  // High-performance direct DOM manipulation
  const boxRef = nodeRef(() => ({
    className: state.active ? 'box active' : 'box',
    style: { transform: `translate(${state.x}px, ${state.y}px)` }
  }));

  return render(() => (
    <div 
      ref={boxRef} 
      {...boxRef.attributes} 
      onClick={() => state.active = !state.active}
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
import { setup, render, onMount } from '@anchorlib/react';

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
import { setup, render, onCleanup } from '@anchorlib/react';

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
import { setup, render, mutable, effect } from '@anchorlib/react';
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
import { setup, render, undoable } from '@anchorlib/react';

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
import { setup, render } from '@anchorlib/react';

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
import { setup, render, plan, undoable, mutable } from '@anchorlib/react';

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

### Browser Utilities (`@anchorlib/react/browser`)

Reactive browser primitives convert low-level DOM events into fine-grained reactive state. All browser primitives defer internal listener registration until hydration completes via `onInteractive()`.

#### Hydration & Lifecycle

Invoke `acceptInteractions()` after client mount or hydration to activate deferred DOM event listeners cleanly without SSR hydration mismatches.

```tsx
import { hydrateRoot } from 'react-dom/client';
import { acceptInteractions } from '@anchorlib/react/browser';
import App from './App.js';

hydrateRoot(document.getElementById('root')!, <App />);
acceptInteractions();
```

#### Global Singletons Pattern

> [!IMPORTANT] AI RULE: IMPORT ONLY NEEDED UTILITIES
> **DO NOT** import multiple browser utilities together in a single mega-import block unless your active component specifically requires them all. Only import the exact singletons needed for your immediate task.

Read global state singletons (`LIVE_CURSOR`, `LIVE_SCROLL`, `LIVE_SELECTION`, `LIVE_DND`, `LIVE_MEDIA`, `LIVE_WINDOW`, `LIVE_NETWORK`, `LIVE_GEO`, `LIVE_KEYBOARD`, `LIVE_CLIPBOARD`) directly inside `<Show>` templates using inline callback parameter destructuring. Do not create custom component wrappers (`setup`/`view`/`template`/`page`) just to read a global singleton.

- **`x`, `y`**: Pointer coordinates relative to the viewport.
- **`pageX`, `pageY`**: Pointer coordinates relative to the document.
- **`screenX`, `screenY`**: Pointer coordinates relative to the screen.
- **`type`**: The input device type (`'mouse'`, `'touch'`, `'pen'`, or `''`).
- **`button`**: The active mouse button (`'left'`, `'right'`, `'middle'`, or `undefined`).
- **`target`**: The DOM element currently under the pointer.
- **`modifiers`**: A `Set` of active modifier keys (`'alt'`, `'ctrl'`, `'meta'`, `'shift'`).
- **`current`**: The root element being tracked (`Document` or specific `Element`).

```tsx [Global Cursor]
import { Show } from '@anchorlib/react';
import { LIVE_CURSOR } from '@anchorlib/react/browser';

<Show when={() => LIVE_CURSOR.x && LIVE_CURSOR}>
  {({ x, y, type, button, modifiers }) => (
    <div>
      <p>Pointer: {x}, {y} ({type || 'none'})</p>
      <p>Active Button: {button ?? 'none'}</p>
      <p>Modifiers: {Array.from(modifiers).join(', ') || 'none'}</p>
    </div>
  )}
</Show>
```

- **`rect`**: The `DOMRect` of the entire selection, or `null` if nothing is selected.
- **`rects`**: An array of `DOMRect` objects for each line/segment of the selection.
- **`size`**: The number of selected characters.
- **`text`**: The raw string text of the selection.
- **`target`**: The container element holding the selection.
- **`paths(padding, radius)`**: A function returning an SVG `d` path string representing the selection boundaries.

```tsx [Selection Path Overlay]
import { Show } from '@anchorlib/react';
import { LIVE_SELECTION } from '@anchorlib/react/browser';

<Show when={() => LIVE_SELECTION.rect && LIVE_SELECTION}>
  {({ rect, paths, size }) => (
    <>
      <svg width={rect.width + 16} height={rect.height + 16}>
        <path d={paths(6, 8)} fill="rgba(0, 0, 0, 0.15)" />
      </svg>
      <div>Selected {size} chars</div>
    </>
  )}
</Show>
```

- **`isDragging`**: Boolean indicating if a drag operation is currently active.
- **`isInternal`**: Boolean indicating if the drag originated from within the application.
- **`x`, `y`**: Current pointer coordinates during the drag.
- **`startX`, `startY`**: Pointer coordinates where the drag started.
- **`deltaX`, `deltaY`**: Distance moved since the drag started.
- **`payload`**: The active `DragContent` being dragged (`{ type, text, data, files, count }`).
- **`target`**: The DOM element that initiated the drag.
- **`zone`**: The active drop zone element currently being hovered.
- **`draggable(el, state?)`**: Registers an element as draggable.
- **`droppable(...els)`**: Registers elements as drop zones.

```tsx [Drag & Drop Preview]
import { Show } from '@anchorlib/react';
import { LIVE_DND } from '@anchorlib/react/browser';

<Show when={() => LIVE_DND.isDragging && LIVE_DND}>
  {({ x, y, payload }) => (
    <div style={{ top: `${y}px`, left: `${x}px` }}>{payload.data?.type}</div>
  )}
</Show>
```

- **`x`, `y`**: The horizontal and vertical scroll offsets in pixels.
- **`direction`**: The current scrolling direction (`'up'`, `'down'`, `'left'`, `'right'`, or `'none'`).
- **`isScrolling`**: A transient boolean that is `true` while the scroll event is firing and returns to `false` when scrolling pauses.
- **`current`**: The root element being tracked.

```tsx [Scroll Position]
import { Show } from '@anchorlib/react';
import { LIVE_SCROLL } from '@anchorlib/react/browser';

<Show when={() => LIVE_SCROLL.y && LIVE_SCROLL}>
  {({ y, direction }) => (
    <div className={y > 100 ? 'sticky shadow' : 'relative'}>
      Scrolling {direction} at {y}px
    </div>
  )}
</Show>
```

- **`isMobile`**: Matches `(max-width: 639px)`.
- **`isTablet`**: Matches `(min-width: 640px) and (max-width: 1023px)`.
- **`isDesktop`**: Matches `(min-width: 1024px)`.
- **`isDark`, `isLight`**: Matches `(prefers-color-scheme)`.
- **`isLandscape`, `isPortrait`**: Matches `(orientation)`.
- **`isTouch`**: Matches `(pointer: coarse)`.
- **`isHover`**: Matches `(hover: hover)`.
- **`isReducedMotion`, `isHighContrast`**: Matches user accessibility preferences.
- **`isRetina`**: Matches `(resolution >= 2dppx)`.

```tsx [Media Queries]
import { Show } from '@anchorlib/react';
import { LIVE_MEDIA, mediaQuery } from '@anchorlib/react/browser';

const isWide = mediaQuery('(min-width: 1400px)');

<Show when={() => LIVE_MEDIA}>
  {({ isMobile, isDark }) => (
    <div className={isDark ? 'dark' : 'light'}>
      {isMobile ? 'Mobile View' : 'Desktop View'}
      {isWide() && ' (Ultra Wide)'}
    </div>
  )}
</Show>
```

- **`width`, `height`**: The current window dimensions (`window.innerWidth/innerHeight`).
- **`isIdle`**: Boolean indicating if the user has been inactive longer than the idle timeout.
- **`isVisible`**: Boolean indicating if the document is visible (`!document.hidden`).
- **`isFocused`**: Boolean indicating if the document has focus (`document.hasFocus()`).
- **`lastActive`**: The timestamp of the last registered user activity.
- **`setIdleTimeout(minutes)`**: Configures the duration before the window is considered idle.

```tsx [Window & Inactivity]
import { Show } from '@anchorlib/react';
import { LIVE_WINDOW } from '@anchorlib/react/browser';

<Show when={() => LIVE_WINDOW.isIdle && LIVE_WINDOW}>
  {({ lastActive }) => <div>Idle since: {lastActive}</div>}
</Show>
```

- **`lat`**, **`lng`**: Latitude and longitude coordinates.
- **`isTracking`**: Boolean indicating if a valid location is actively being tracked.
- **`speed`**: Device velocity in meters per second (if available).
- **`accuracy`**: The accuracy level of the coordinates in meters.
- **`error`**: String containing any Geolocation API error messages.

```tsx [Geolocation]
import { Show } from '@anchorlib/react';
import { LIVE_GEO } from '@anchorlib/react/browser';

<Show when={() => LIVE_GEO.isTracking && LIVE_GEO}>
  {({ lat, lng }) => <div>Location: {lat}, {lng}</div>}
</Show>
```

- **`isOnline`**: Boolean indicating if the browser is currently connected to the network.
- **`effectiveType`**: The effective connection type (e.g., `'4g'`, `'3g'`, `'2g'`).
- **`downlink`**: Estimated effective bandwidth in Mbps.
- **`rtt`**: Estimated effective round-trip time in ms.
- **`type`**: The underlying connection technology (e.g., `'wifi'`, `'cellular'`).

```tsx [Network Connectivity]
import { Show } from '@anchorlib/react';
import { LIVE_NETWORK } from '@anchorlib/react/browser';

<Show when={() => !LIVE_NETWORK.isOnline && LIVE_NETWORK}>
  {({ effectiveType, downlink }) => <div>Offline ({effectiveType}, {downlink} Mbps)</div>}
</Show>
```

- **`key`**: The primary key currently pressed.
- **`modifiers`**: A `Set` of currently pressed modifier keys (`'alt'`, `'ctrl'`, `'meta'`, `'shift'`).
- **`is(...keys)`**: Helper method that returns `true` if the specified key combination is active (e.g., `is('ctrl', 's')`).
- **`target`**: The DOM element that initiated the keydown event.
- **`current`**: The root element being tracked (`Document` or specific `Element`).

```tsx [Keyboard Shortcut]
import { Show } from '@anchorlib/react';
import { LIVE_KEYBOARD } from '@anchorlib/react/browser';

<Show when={() => LIVE_KEYBOARD.is('ctrl', 's') && LIVE_KEYBOARD}>
  {({ key }) => <p>Saved via {key}!</p>}
</Show>
```

- **`text`**: The most recently copied or pasted string.
- **`data`**: Parsed JSON object from the clipboard.
- **`files`**: An array of `File` objects pasted into the document.
- **`isSupported`**: Boolean indicating if the system clipboard API is available.
- **`copy(payload)`**: Asynchronously writes text or JSON to the clipboard (`Promise<boolean>`).
- **`take(slot, handler)`**: Registers a callback to receive specific pasted data (`'text'`, `'data'`, or `'files'`).
- **`paste(payload)`**: Manually triggers a paste operation programmatically.
- **`clear(slot?)`**: Clears specific clipboard state slots.

```tsx [Clipboard Content]
import { Show } from '@anchorlib/react';
import { LIVE_CLIPBOARD } from '@anchorlib/react/browser';

<Show when={() => LIVE_CLIPBOARD.text && LIVE_CLIPBOARD}>
  {({ text }) => <p>Pasted: {text}</p>}
</Show>
```

#### Ref-like Element Trackers Pattern

Element-scoped factories (`cursorRef()`, `scrollRef()`, `keyboardRef()`) return Ref-like reactive objects containing `.current`. Pass them **directly** as `ref={tracker}` props without writing redundant `ref={(el) => (tracker.current = el)}` callback wrappers.

```tsx
import { setup, render } from '@anchorlib/react';
import { cursorRef, scrollRef, keyboardRef } from '@anchorlib/react/browser';

export const ElementTrackers = setup(() => {
  const boxCursor = cursorRef();
  const listScroll = scrollRef();
  const inputKeyboard = keyboardRef();

  return render(() => (
    <div>
      {/* Pass Ref-like objects directly to ref prop */}
      <div ref={boxCursor}>Cursor inside: {boxCursor.x}, {boxCursor.y}</div>
      <div ref={listScroll} style={{ overflowY: 'auto', height: '200px' }}>
        Scroll Y: {listScroll.y}px
      </div>
      <input ref={inputKeyboard} placeholder="Type here..." />
    </div>
  ));
});
```

#### Animation Frame Scheduling

Use `reframe()` to schedule high-frequency visual updates via `requestAnimationFrame`. Calling `scheduleFrame(callback)` automatically cancels any pending frame request to prevent frame backlog.

```tsx
import { setup, render } from '@anchorlib/react';
import { reframe } from '@anchorlib/react/browser';

export const CanvasRenderer = setup(() => {
  const [scheduleFrame, cancelFrame] = reframe();

  const handlePointerMove = (e: React.PointerEvent) => {
    scheduleFrame(() => {
      console.log('Rendering frame:', e.clientX, e.clientY);
    });
  };

  return render(() => (
    <div onPointerMove={handlePointerMove}>Canvas Surface</div>
  ));
});
```
