## 6. User Interface (`@anchorlib/solid`)
Anchor UI components are autonomous. They own their own behaviors and mutations rather than relying on their parents to micromanage them via massive callback props.

### Styling Patterns

#### Inline Classes (Default)
When a visual combination is used exactly once, keep the classes inline. This preserves locality and makes the markup immediately readable.

```tsx
export const BillingHeader = () => (
  <header class="border-b border-gray-200 pb-4 mb-8">
    <h1 class="text-2xl font-semibold tracking-tight">Billing Settings</h1>
    <p class="text-gray-500 mt-2">Manage your subscription.</p>
  </header>
);
```

#### Local Variables & Class Factories
When a class combination is repeated in the *same file*, extract it to a local variable. For complex conditional logic, extract it to a local factory function to prevent bloated inline ternaries. 
*Note: Define styling helpers below your components so the primary UI logic isn't buried.*

```tsx
import { For } from '@anchorlib/solid';

export const InvoiceList = ({ invoices }) => (
  <div class="flex flex-col gap-4">
    <For each={invoices}>
      {(invoice) => (
        <div class={`p-4 border rounded-lg ${getInvoiceStyle(invoice.status)}`}>
          <span class={badgeClass}>{invoice.status}</span>
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
    class="relative w-full rounded-md border"
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
When passing state down to a custom Component or View, you **must use a binding** (`$bind`). The parent defers the read, passing a reactive reference so the child can track the freshest state internally.
- **One-Way (Fine-Grained Read)**: Just pass the state directly (e.g. `<ProgressBar progress={metrics.cpu} />`). The read is natively reactive and fine-grained in Solid.
- **Two-Way (`$bind`)**: Always takes a **Getter + Key** (e.g., `$bind(() => state.profile, 'name')`). The child must know exactly which object and property to mutate to safely propagate the change back up. The getter ensures the binding survives even if the parent object is reassigned.

#### Passing to a Static Element (Reactive Boundary)
When passing state directly into native HTML elements (e.g., `<div>{state.value}</div>`), the surrounding block **must be wrapped in a reactive boundary** (like `render(() => ...)` or `<Show>`). In this scenario, the wrapper itself *is* the binding that tracks the read.

```tsx
import { setup, template, $bind } from '@anchorlib/solid';
import { metricsContext, appStateContext } from './contexts.js';

export const SettingsPanel = setup(() => {
  const metrics = metricsContext.get();
  const state = appStateContext.get();

  return (
    <div class="panel">
      {/* State read directly into Static HTML -> The Show wrapper tracks this */}
      <h1>{state.settings.title}</h1>

      {/* Prop Binding: Pass reference to Components -> Child handles tracking */}
      <ProgressBar progress={metrics.cpu} />
      <Toggle value={$bind(() => state.settings, 'notifications')} />
      <Button onClick={() => console.log('Saved!')}>Save</Button>
    </div>
  );
});

// The View safely tracks the one-way bound prop internally
const ProgressBar = template<{ progress: number }>(({ progress }) => (
  <div class="progress-bar" style={{ width: `${progress}%` }} />
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
    <div class="profile-card">
      <span class="profile-label">Profile</span>
      <Avatar url={state.data.user.avatarUrl} />
    </div>
  </main>
));
```

#### Local Reuse (Same File)
If a structure is repeated multiple times on the *same page*, extract it to a local static structure in the *same file*.

```tsx
import { For } from '@anchorlib/solid';

export const ProfilePage = page(profileRoute).render(({ state }) => (
  <div class="grid">
    <For each={state.data.users}>
      {(user) => <ProfileCard profile={user} />}
    </For>
  </div>
));

// Extracted locally to prevent repetition on this specific page
const ProfileCard = ({ profile }) => (
  <div class="profile-card">
    <span class="profile-label">Profile</span>
    <Avatar url={profile.avatarUrl} />
  </div>
);
```

#### Global Reuse (Shared Folder)
Only graduate a static structure to a shared global directory (e.g., `lib/ui`) when it is actively imported and used across *multiple different pages*.

```tsx
// @/lib/components/ProfileCard.tsx

export const ProfileCard = ({ profile }) => (
  <div class="profile-card">
    <span class="profile-label">Profile</span>
    <Avatar url={profile.avatarUrl} />
  </div>
);

// AnyOtherPage.tsx
import { page } from '@anchorlib/solid';
import { otherRoute } from './route.js';
import { ProfileCard } from '@/lib/components/ProfileCard';

export const AnyOtherPage = page(otherRoute).render(({ state }) => (
  <main>
    <ProfileCard profile={state.data.currentUser} />
  </main>
));
```

### Reactive UI: Views & Isolation
A **View** is a one-way reactive boundary that presents state as-is but never owns state or behavior. It isolates fast updates to prevent expensive parent re-renders.

#### Snippet
Use `snippet()` to create an inline reactive boundary. Snippets naturally inherit the parent closure, meaning you don't need to pass props to them. They isolate fast updates, preventing the parent component from re-rendering.

```tsx
import { setup, snippet } from '@anchorlib/solid';
import { metricsContext, authContext } from './contexts.js';

export const Dashboard = setup(() => {
  const metrics = metricsContext.get();
  const user = authContext.get();

  // The fast-updating CPU meter is isolated into a snippet.
  // When metrics.cpu changes 60 times a second, ONLY this snippet re-renders.
  const CpuMeter = snippet(() => (
    <div class="cpu-fast-update">CPU: {metrics.cpu}%</div>
  ));

  return (
    <div class="dashboard">
      <div class="profile">
        {/* Infrequently changing data */}
        <h2>{user.firstName}</h2> 
      </div>
      <div class="metrics-panel">
        <CpuMeter />
      </div>
    </div>
  );
});
```

#### Template
Use `template()` to create a standalone, reusable reactive View. Unlike a snippet, a template requires explicit props and can be extracted to a different file.

```tsx
import { template } from '@anchorlib/solid';

// A highly optimized, standalone reactive boundary
export const FeatureCard = template<{ title: string, description: string, theme: Theme }>(
  ({ title, description, theme }) => (
    <div class={`feature-card ${theme.current}`}>
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
Use `setup` to create a Component. 

```tsx
import { setup, mutable, onMount, onCleanup, createContext } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

// A component with reactive JSX
export const Counter = setup<{ initial?: number }>((props) => {
  const state = mutable({ 
    count: props.initial ?? 0,
    increment: () => { state.count++; }
  });

  return (
    <button onClick={state.increment}>Count: {state.count}</button>
  );
});

export const tabContext = createContext<{ active: number }>();

// A component with static JSX
export const Tabs = setup<{ default?: number, children?: JSX.Element }>((props) => {
  const state = mutable({ active: props.default ?? 0 });
  tabContext.set(state); // Children use tabContext.get() to read/write state

  return (
    <div class="tabs-container">
      {props.children}
    </div>
  );
});
```

#### Component Props
In the AIR Stack, `props` is reactive state and the **source of truth** of your component. Read from it and write directly back to it. 

Create a separate internal `mutable()` state only for data that belongs strictly to the component itself (e.g., local loading status, intermediate buffering, or internal toggles).

```tsx
import { setup } from '@anchorlib/solid';

export const Counter = setup<{ count?: number }>((props) => {
  // Initialize missing props
  props.count ??= 0;

  const increment = () => props.count!++;

  return (
    <button onClick={increment}>
      Count: {props.count}
    </button>
  );
});
```

#### Two-Way Binding (`Bindable`)
When a component needs to sync internal mutations back to its parent, it should type the prop as `Bindable<T>`. The component directly mutates this prop (`props.value = ...`), and the binding automatically propagates the state change. The component must also dispatch the associated native events back to the parent to maintain full composability.

```tsx
import { setup, type Bindable } from '@anchorlib/solid';

// User Interaction (Reactive JSX)
export const Toggle = setup<{ 
  value?: Bindable<boolean>,
  onClick?: (e: MouseEvent) => void
}>((props) => {
  const toggle = (e: MouseEvent) => { 
    props.value = !props.value; 
    props.onClick?.(e);
  };

  return (
    <button onClick={toggle}>
      {props.value ? 'ON' : 'OFF'}
    </button>
  );
});
```

```tsx
import { mutable, setup, type Bindable } from '@anchorlib/solid';

// System Event (Imperative API)
export const VideoPlayer = setup<{ 
  playing?: Bindable<boolean>, 
  src: string,
  onPlay?: (e: Event) => void,
  onPause?: (e: Event) => void
}>((props) => {
  const ref = mutable<{ current: HTMLVideoElement | null }>({ current: null });
  
  effect(() => {
    // Effect re-run when either props.playing or ref.current changes
    props.playing ? ref.current?.play() : ref.current?.pause();
  });

  // Video re-render only when props.src changes, which also re-run the effect.
  return (
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
  );
});
```

```tsx
import { setup, type Bindable } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

// System Event (Declarative DOM)
export const Accordion = setup<{ 
  expanded?: Bindable<boolean>, 
  title: string, 
  children?: JSX.Element,
  onToggle?: (e: Event) => void
}>((props) => {
  return (
    <details 
      open={props.expanded} 
      onToggle={(e: Event & { currentTarget: HTMLDetailsElement }) => {
        props.expanded = e.currentTarget.open;
        props.onToggle?.(e);
      }}
    >
      <summary>{props.title}</summary>
      {props.children}
    </details>
  );
});
```

```tsx
import { mutable, setup, effect, type Bindable } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

// System Event (Reactive JSX)
export const Reveal = setup<{ visible?: Bindable<boolean>, threshold?: number, children?: JSX.Element }>((props) => {
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

  return (
    <div ref={ref} style={{ minHeight: props.threshold ?? '1px' }}>
      {/* Top-Down: Conditionally render children based on the bound prop */}
      {props.visible ? props.children : null}
    </div>
  );
});
```

```tsx
import { setup, mutable, $bind } from '@anchorlib/solid';

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
import { setup, type Bindable } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  value?: Bindable<string>;
}

export const InputField = setup<InputProps>((props) => {
  const restProps = props.$omit(['value']);

  const handleInput = (e: Event & { currentTarget: HTMLInputElement }) => {
    props.value = e.currentTarget.value;
    props.onInput?.(e);
  };

  return (
    <input 
      {...restProps}
      value={props.value ?? ''} 
      onInput={handleInput}
    />
  );
});
```

Use `props.$pick()` to explicitly select and forward only specific props:

```tsx
import { setup } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: JSX.Element;
  variant?: 'primary' | 'secondary';
}

export const Button = setup<ButtonProps>((props) => {
  const nativeProps = props.$pick(['onClick', 'disabled', 'type', 'className']);

  return (
    <button {...nativeProps} data-variant={props.variant ?? 'primary'}>
      {props.children}
    </button>
  );
});
```

##### Direct DOM Manipulation (`nodeRef`)
When you need to frequently update an element's attributes, classes, or styles based on state changes (e.g., animations, drag-and-drop, or toggling visibility of a heavy container), use `nodeRef()`.

```tsx
import { setup, mutable, nodeRef } from '@anchorlib/solid';

export const AnimatedBox = setup(() => {
  const state = mutable({ x: 0, y: 0, active: false });

  // High-performance direct DOM manipulation
  const boxRef = nodeRef(() => ({
    class: state.active ? 'box active' : 'box',
    style: { transform: `translate(${state.x}px, ${state.y}px)` }
  }));

  return (
    <div 
      ref={boxRef} 
      {...boxRef.attributes} 
      onClick={() => state.active = !state.active}
    >
      <HeavyContent /> {/* Changing box location/class won't re-render this */}
    </div>
  );
});
```

#### Component Lifecycle
A component's lifecycle is bound to its initialization scope (`setup()`), which runs exactly once to initialize state, build closures, and attach scoped side-effects.

##### DOM Element Access
For one-time initialization of static elements, use a standard local variable and a `ref` callback.

```tsx
import { setup, onMount } from '@anchorlib/solid';

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
import { setup, onCleanup } from '@anchorlib/solid';

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

  return <div />;
});
```

##### Self-Governing Components
A self-governing component discovers its own environment — parent elements, scroll containers, form contexts, intersection boundaries — and attaches its own behavior without the parent orchestrating it. The parent doesn't need to know what the component does internally; the component handles its own concerns.

```tsx
import { setup, mutable, effect } from '@anchorlib/solid';
import { popover } from './popover'; // Headless utility

export const Tooltip = setup<{ text: string, x?: PopX, y?: PopY }>((props) => {
  const ref = mutable({ current: null as HTMLElement | null });

  effect(() => {
    const { current } = ref;
    const parent = current?.parentElement;
    if (!current || !parent) return;

    parent.addEventListener('mouseenter', () => popover(current, props.x, props.y));
  });

  return <span ref={ref} class="tooltip">{props.text}</span>;
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
import { setup, undoable } from '@anchorlib/solid';

export const LikeButton = setup<{ post: any }>((props) => {
  const toggleLike = async () => {
    const [undo, settled] = undoable(() => {
      props.post.liked = !props.post.liked;
    });

    await likePost(props.post.id).then(settled, undo);
  };

  return (
    <button onClick={toggleLike}>
      {props.post.liked ? 'Unlike' : 'Like'}
    </button>
  );
});
```

#### Custom State Tracking
Manually saving the previous state before applying mutations, and manually restoring it if the operation fails. Use this when you need to perform sequential state mutations separated by asynchronous boundaries (`await`), where the rollback itself requires manual, asynchronous orchestration.

```tsx
import { setup } from '@anchorlib/solid';

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

  return (
    <button onClick={processCheckout}>Checkout</button>
  );
});
```

#### Workflows
Using the workflow engine where each step handles its own isolated optimistic updates and rollback logic. This is ideal for complex, multi-stage pipelines because it prevents massive centralized error handlers.

```tsx
import { setup, plan, undoable, mutable } from '@anchorlib/solid';

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

  return (
    <button onClick={checkoutFlow}>
      {cart.status === 'idle' ? 'Checkout' : cart.status}
    </button>
  );
});
```
