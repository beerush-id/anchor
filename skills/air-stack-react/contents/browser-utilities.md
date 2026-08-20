## Browser Utilities (`@airlib/react/browser`)

Reactive browser primitives that convert low-level DOM events into fine-grained reactive state. All primitives defer internal listener registration until hydration completes via `acceptInteractions()`.

### Hydration & Lifecycle

Invoke `acceptInteractions()` after client mount or hydration to activate all deferred DOM event listeners. This prevents SSR hydration mismatches by ensuring no browser-specific listeners are registered during server rendering.

```tsx
import { hydrateRoot } from 'react-dom/client';
import { acceptInteractions } from '@airlib/react/browser';
import App from './App.js';

hydrateRoot(document.getElementById('root')!, <App />);
acceptInteractions();
```

Use `onInteractive()` to register handlers that execute once interactions are accepted. Handlers registered before `acceptInteractions()` are queued; handlers registered after run immediately.

```tsx
import { onInteractive } from '@airlib/react/browser';

onInteractive(() => {
  const media = window.matchMedia('(max-width: 768px)');
  // This runs after acceptInteractions(), safe from SSR
  return () => media.removeEventListener('change', handler); // Cleanup
});
```

#### Global Singletons Pattern

Read global state singletons directly inside `<Show>` or `effect.client()` boundaries. Do not create custom component wrappers just to read a global singleton — import only the specific singleton you need.

#### Creating Custom Browser Utilities (Lazy Singleton Pattern)

All built-in utilities (`LIVE_KEYBOARD`, `LIVE_DND`, etc.) follow the same internal pattern that you can reuse to create custom reactive wrappers around any browser API:

```tsx
import { onInteractive } from '@airlib/react/browser';

// The singleton uses a lazy getter: listeners are NOT registered at import time.
// They're deferred until acceptInteractions() is called after hydration.
// This prevents SSR crashes and hydration mismatches.

const LIVE_MY_API = new Proxy({} as MyApiState, {
  get(target, key) {
    // Lazily initialize on first read
    if (!target._initialized) {
      target._initialized = true;
      onInteractive(() => {
        // Register real browser listeners here
        window.addEventListener('someevent', handler);
      });
    }
    return target[key as keyof typeof target];
  }
});
```

**Key rules for custom browser utilities:**
1. **Lazy initialization** — use a getter/interceptor to defer listener registration until first read
2. **`onInteractive()`** — wrap listener registration so it only activates after `acceptInteractions()`
3. **Return cleanup** — return a cleanup function from `onInteractive()` to tear down on unmount
4. **No SSR crashes** — never reference `window` or `document` at module level

---

### `LIVE_KEYBOARD` — Keyboard Shortcuts & Input Detection

```tsx
import { setup, render, effect } from '@airlib/react';
import { LIVE_KEYBOARD } from '@airlib/react/browser';

export const UsersList = setup(() => {
  // Declarative shortcut combined with business logic state
  effect.client(() => {
    if (selectedUser.length && LIVE_KEYBOARD.is('ctrl', 'c')) {
      copyToClipboard(selectedUser);
    }
  });

  // Close modal on Escape
  effect.client(() => {
    if (LIVE_KEYBOARD.is('Escape')) closeModal();
  });

  // Complex chord detection
  effect.client(() => {
    if (LIVE_KEYBOARD.is('ctrl', 'shift', 'z')) redoAction();
  });

  return render(() => <ul>...</ul>);
});
```

- **`key`**: The currently pressed key (e.g., `'s'`, `'Escape'`, `'Enter'`, `'ArrowUp'`).
- **`modifiers`**: A reactive `Set<string>` of pressed modifiers — `'alt'`, `'ctrl'`, `'meta'`, `'shift'`.
- **`is(...keys)`**: Returns `true` when the exact key combination is pressed. Last argument is the main key, preceding arguments are modifiers. Example: `is('ctrl', 's')`, `is('ctrl', 'shift', 'z')`.
- **`target`**: The DOM element that received the keydown event.
- **`keyboardRef(element?)`**: Creates a scoped keyboard tracker for a specific element. Pass as `ref` prop directly.

```tsx
import { setup, render } from '@airlib/react';
import { keyboardRef } from '@airlib/react/browser';

export const InputTracker = setup(() => {
  const tracker = keyboardRef();

  return render(() => (
    <input ref={tracker} placeholder="Type here..." />
  ));
});
```

---

### `LIVE_CLIPBOARD` — Clipboard Read & Write

```tsx
import { setup, render, effect } from '@airlib/react';
import { LIVE_CLIPBOARD } from '@airlib/react/browser';

export const SearchBox = setup(() => {
  // Intercept pasted text inside component scope
  effect.client(() => {
    LIVE_CLIPBOARD.take('text', (text) => {
      searchResults.value = text;
    });
  });

  // Programmatic copy on action
  const handleCopy = async () => {
    await LIVE_CLIPBOARD.copy('Copied text');
  };

  return render(() => <input onPaste={/*...*/} />);
});
```

- **`text`**: The most recently pasted string (only when no `take()` handler consumed it).
- **`data`**: Parsed JSON object from paste.
- **`files`**: Array of `File` objects from paste.
- **`isSupported`**: Whether `navigator.clipboard` is available.
- **`copy(payload)`**: Writes text or JSON to clipboard (`Promise<boolean>`).
- **`take(slot, handler)`**: One-shot consumer — only the last registered handler receives the paste data. Slots: `'text'`, `'data'`, `'files'`.
- **`paste(payload)`**: Programmatically triggers paste with the given payload.
- **`clear(slot?)`**: Clears clipboard state.

---

### `LIVE_DND` — Drag & Drop

```tsx
import { setup, render, Show, effect, mutable } from '@airlib/react';
import { LIVE_DND } from '@airlib/react/browser';

export const MultiDomainDnD = setup(() => {
  const box = mutable<{ current: HTMLDivElement | null }>({ current: null });

  // Register draggable element with payload
  effect.client(() => {
    const cleanup = LIVE_DND.draggable(box.current, {
      type: 'user',
      data: { id: '123', name: 'Alice' }
    });
    return cleanup;
  });

  // Reactive drop handling
  effect.client(() => {
    if (LIVE_DND.zone) handleDrop(LIVE_DND.payload);
  });

  return render(() => (
    <>
      {/* Conditionally render drop zone only during drag */}
      <Show when={() => LIVE_DND.isDragging && LIVE_DND}>
        {(droppable) => (
          <div ref={(el) => droppable(el)} className="drop-zone">
            Drop here
          </div>
        )}
      </Show>
      <div ref={box}>Drag me</div>
    </>
  ));
});
```

- **`isDragging`**: Boolean indicating active drag operation.
- **`isInternal`**: Whether drag originated from within the app.
- **`x`, `y`**: Current pointer coordinates during drag.
- **`startX`, `startY`**: Coordinates where drag started.
- **`deltaX`, `deltaY`**: Distance moved since drag start.
- **`payload`**: Active `DragContent` — `{ type, text?, data?, files, count }`.
- **`target`**: Element that initiated the drag.
- **`zone`**: Currently hovered drop zone element.
- **`draggable(el, state?)`**: Registers element as draggable with optional payload. Returns cleanup.
- **`droppable(...els)`**: Registers elements as drop zones. Returns cleanup.
- **`drop(e)`**: Standalone DragEvent parser — handles text, JSON, files, and internal protocol. Useful for handling external drag sources.

```tsx
const handleExternalDrop = (e: DragEvent) => {
  LIVE_DND.drop(e);
  const { files } = LIVE_DND.payload;
};
```

---

### `LIVE_CURSOR` — Pointer Position & Device Type

```tsx
import { setup, render, Show } from '@airlib/react';
import { LIVE_CURSOR, cursorRef } from '@airlib/react/browser';

export const CursorDisplay = setup(() => {
  const boxCursor = cursorRef();

  return render(() => (
    <div ref={boxCursor}>
      <Show when={() => LIVE_CURSOR.x && LIVE_CURSOR}>
        {({ x, y, type, button, modifiers }) => (
          <p>Position: {x}, {y} ({type || 'mouse'}) — {button ?? 'no button'}</p>
        )}
      </Show>
    </div>
  ));
});
```

- **`x`, `y`**: Viewport-relative pointer coordinates.
- **`pageX`, `pageY`**: Document-relative pointer coordinates.
- **`screenX`, `screenY`**: Screen-relative pointer coordinates.
- **`type`**: Input device — `'mouse'`, `'touch'`, `'pen'`, or `''`.
- **`button`**: Active button — `'left'`, `'right'`, `'middle'`, or `undefined`.
- **`target`**: Element currently under the pointer.
- **`modifiers`**: Reactive `Set` of active modifiers — `'alt'`, `'ctrl'`, `'meta'`, `'shift'`.
- **`current`**: Root element being tracked.
- **`cursorRef(element?)`**: Creates a scoped cursor tracker. Pass as `ref` prop directly.

Mouse button constants (for type-safe button comparisons):
- **`MOUSE_BUTTON.left`**: `'left'`
- **`MOUSE_BUTTON.middle`**: `'middle'`
- **`MOUSE_BUTTON.right`**: `'right'`

Modifier key constants (for type-safe modifier checks):
- **`MOUSE_MODIFIERS.alt`**: `'alt'`
- **`MOUSE_MODIFIERS.ctrl`**: `'ctrl'`
- **`MOUSE_MODIFIERS.meta`**: `'meta'`
- **`MOUSE_MODIFIERS.shift`**: `'shift'`

```tsx
import { setup, render, Show, effect } from '@airlib/react';
import { LIVE_CURSOR, MOUSE_BUTTON, MOUSE_MODIFIERS } from '@airlib/react/browser';

export const RightClickHandler = setup(() => {
  effect.client(() => {
    // Type-safe button comparison
    if (LIVE_CURSOR.button === MOUSE_BUTTON.right && LIVE_CURSOR.modifiers.has(MOUSE_MODIFIERS.ctrl)) {
      openContextMenu();
    }
  });

  return null;
});
```

---

### `LIVE_SCROLL` — Scroll Position & Direction

```tsx
import { setup, render } from '@airlib/react';
import { LIVE_SCROLL } from '@airlib/react/browser';

// Sticky header with shadow on scroll — a common real-world pattern
export const AppHeader = setup(() => {
  return render(() => (
    <header className={LIVE_SCROLL.y > 0 ? 'shadow-md' : ''}>Header</header>
  ));
});
```

- **`x`, `y`**: Scroll offset in pixels.
- **`direction`**: Current direction — `'up'`, `'down'`, `'left'`, `'right'`, or `'none'`.
- **`isScrolling`**: Transient boolean — `true` while scrolling, auto-resets to `false` when scrolling pauses (150ms debounce).
- **`current`**: Root element being tracked.
- **`scrollRef(element?)`**: Creates a scoped scroll tracker. Pass as `ref` prop directly.

---

### `LIVE_SELECTION` — Text Selection & Highlight Overlay

```tsx
import { setup, render, Show, effect } from '@airlib/react';
import { LIVE_SELECTION } from '@airlib/react/browser';

export const SelectionOverlay = setup(() => {
  // React to selection changes
  effect.client(() => {
    if (LIVE_SELECTION.text) shareSelection(LIVE_SELECTION.text);
  });

  return render(() => (
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
  ));
});
```

- **`rect`**: `DOMRect` of the entire selection, or `null` if nothing is selected.
- **`rects`**: Array of `DOMRect` per line/segment of the selection.
- **`size`**: Number of selected characters.
- **`text`**: Raw string text of the selection.
- **`target`**: Container element holding the selection.
- **`paths(padding, radius)`**: Multi-line SVG path generator for highlight/annotation overlays. Handles corner rounding, line merging, and column-aware block aggregation. `padding` extends bounds outward; `radius` smooths path corners.

---

### `LIVE_MEDIA` — Media Query State

```tsx
import { setup, render, Show, effect } from '@airlib/react';
import { LIVE_MEDIA, mediaQuery } from '@airlib/react/browser';

export const ResponsiveHeader = setup(() => {
  const isWide = mediaQuery('(min-width: 1400px)');

  // Reactive trigger on media change
  effect.client(() => {
    if (LIVE_MEDIA.isReducedMotion) disableAnimations();
  });

  return render(() => (
    <Show when={() => LIVE_MEDIA}>
      {({ isMobile, isDark, isReducedMotion }) => (
        <div className={isDark ? 'dark' : 'light'}>
          {isMobile ? 'Mobile View' : 'Desktop View'}
          {isWide() && ' (Ultra Wide)'}
        </div>
      )}
    </Show>
  ));
});
```

Predefined queries:
- **`isMobile`**: `(max-width: 639px)`
- **`isTablet`**: `(min-width: 640px) and (max-width: 1023px)`
- **`isDesktop`**: `(min-width: 1024px)`
- **`isDark` / `isLight`**: `(prefers-color-scheme)`
- **`isLandscape` / `isPortrait`**: `(orientation)`
- **`isTouch`**: `(pointer: coarse)`
- **`isHover`**: `(hover: hover)`
- **`isReducedMotion`**: `(prefers-reduced-motion: reduce)`
- **`isHighContrast`**: `(prefers-contrast: more)`
- **`isRetina`**: `(resolution >= 2dppx)`
- **`mediaQuery(query, disposable?)`**: Custom CSS media query. Returns a getter function. `disposable` controls automatic cleanup on unmount.

---

### `LIVE_WINDOW` — Window Dimensions & Activity

```tsx
import { setup, render, Show, effect } from '@airlib/react';
import { LIVE_WINDOW } from '@airlib/react/browser';

export const IdleMonitor = setup(() => {
  // Configure idle timeout on mount
  LIVE_WINDOW.setIdleTimeout(10); // 10 minutes

  // Pause activity on idle
  effect.client(() => {
    if (LIVE_WINDOW.isIdle) pauseSessionAutoSave();
  });

  return render(() => (
    <Show when={() => LIVE_WINDOW.isIdle && LIVE_WINDOW}>
      {({ lastActive }) => <div>Idle since: {lastActive}</div>}
    </Show>
  ));
});
```

- **`width`, `height`**: Window dimensions (`window.innerWidth/innerHeight`).
- **`isIdle`**: Boolean — `true` after user inactivity exceeds the idle timeout.
- **`isVisible`**: `!document.hidden`.
- **`isFocused`**: `document.hasFocus()`.
- **`lastActive`**: Timestamp of last user activity.
- **`setIdleTimeout(minutes)`**: Configures duration before the window is considered idle (default: 5).

---

### `LIVE_NETWORK` — Connection Status & Type

```tsx
import { setup, render, Show, effect, mutable } from '@airlib/react';
import { LIVE_NETWORK } from '@airlib/react/browser';

export const SyncManager = setup(() => {
  const queue = mutable([]);

  // Pause data sync when offline
  effect.client(() => {
    if (!LIVE_NETWORK.isOnline) queue.length = 0; // pause sync
  });

  // Adapt based on connection quality
  effect.client(() => {
    if (LIVE_NETWORK.effectiveType === '2g') loadLowResImages();
  });

  return render(() => (
    <Show when={() => !LIVE_NETWORK.isOnline && LIVE_NETWORK}>
      {({ effectiveType, downlink }) => (
        <div>Offline ({effectiveType}, {downlink} Mbps)</div>
      )}
    </Show>
  ));
});
```

- **`isOnline`**: Whether the browser is connected to the network.
- **`effectiveType`**: Connection type — `'4g'`, `'3g'`, `'2g'`, `'slow-2g'`, or `'unknown'`.
- **`downlink`**: Estimated bandwidth in Mbps.
- **`rtt`**: Estimated round-trip time in ms.
- **`type`**: Underlying connection technology — `'wifi'`, `'cellular'`, etc.

---

### `LIVE_GEO` — Geolocation Tracking

```tsx
import { setup, effect } from '@airlib/react';
import type { ReactNode } from 'react';
import { LIVE_GEO } from '@airlib/react/browser';

// Global effects belong inside a root-level component
export const RootLayout = setup<{ children?: ReactNode }>((props) => {
  effect.client(() => {
    if (LIVE_GEO.isTracking) {
      fetchNearbyPlaces(LIVE_GEO.lat, LIVE_GEO.lng);
    }
  });

  return <>{props.children}</>;
});
```

- **`lat`, `lng`**: Latitude and longitude coordinates.
- **`isTracking`**: Boolean — `true` when a valid location is being tracked.
- **`speed`**: Device velocity in m/s (if available).
- **`accuracy`**: Coordinate accuracy in meters.
- **`error`**: Geolocation API error message, if any.

Geolocation tracking starts automatically on first read via `navigator.geolocation.watchPosition()` with high accuracy enabled. Cleanup is automatic on component unmount.

---

### `LIVE_LOCATION` — Browser URL State

```tsx
import { setup, effect } from '@airlib/react';
import type { ReactNode } from 'react';
import { LIVE_LOCATION } from '@airlib/react/browser';

// Global effects belong inside a root-level component
export const RootLayout = setup<{ children?: ReactNode }>((props) => {
  // React to hash/fragment changes
  effect.client(() => {
    if (LIVE_LOCATION.hash.startsWith('#modal-')) {
      openModal(LIVE_LOCATION.hash.replace('#modal-', ''));
    }
  });

  // Detect host for multi-tenant UI
  effect.client(() => {
    if (LIVE_LOCATION.host === 'admin.example.com') loadAdminMode();
  });

  return <>{props.children}</>;
});
```

- **`path`**: `window.location.pathname`.
- **`hash`**: `window.location.hash`.
- **`host`**: `window.location.host`.
- **`search`**: `window.location.search` (e.g., `?page=2&filter=active`).

Tracks URL changes via `popstate` and `hashchange` events.

```tsx
import { setup, render, effect, mutable } from '@airlib/react';
import { LIVE_LOCATION } from '@airlib/react/browser';

export const SearchParamsReader = setup(() => {
  const params = mutable({ page: '1', filter: '' });

  // Reactively read query parameters from the URL
  effect.client(() => {
    const qs = new URLSearchParams(LIVE_LOCATION.search);
    params.page = qs.get('page') ?? '1';
    params.filter = qs.get('filter') ?? '';
  });

  return render(() => (
    <div>
      <p>Current page: {params.page}</p>
      <p>Active filter: {params.filter || '(none)'}</p>
    </div>
  ));
});
```

---

### `reframe()` — Animation Frame Scheduling

```tsx
import { setup, render } from '@airlib/react';
import { reframe } from '@airlib/react/browser';

export const CanvasRenderer = setup(() => {
  const [scheduleFrame, cancelFrame] = reframe();

  const handlePointerMove = (e) => {
    scheduleFrame(() => {
      renderFrame(e.clientX, e.clientY);
    });
  };

  return render(() => (
    <div onPointerMove={handlePointerMove}>Canvas Surface</div>
  ));
});
```

- **`reframe()`**: Returns `[schedule, cancel]` tuple. `schedule(callback)` queues a `requestAnimationFrame` callback, automatically canceling any pending frame to prevent backlog. `cancel()` aborts the pending frame.
