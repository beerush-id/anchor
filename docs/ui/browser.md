---
title: 'Browser Utilities'
description: 'Discover reactive browser utilities in the AIR Stack for tracking cursor, viewport, scroll, keyboard, drag-and-drop, media queries, network, and clipboard state.'
---

# Browser Utilities

Web applications frequently interact with browser APIs and DOM events to respond to user interactions and environment changes. Manually attaching and detaching event listeners across components leads to duplicate state, memory leaks, and SSR hydration mismatches.

The **AIR Stack** provides reactive browser primitives that wrap DOM events into fine-grained reactive state. These primitives defer event listeners until hydration completes via `onInteractive()` and automatically clean up subscriptions when components unmount.

## Hydration & Lifecycle

SSR and static site generation run code in environments where DOM APIs like `window` or `document` are unavailable. Accessing browser APIs during initial render causes hydration mismatches or server-side exceptions.

To prevent dangling listeners and guarantee safe hydration, browser utilities register internal listeners using `onInteractive()`. You must invoke `acceptInteractions()` after mount or hydration to enable browser event tracking.

::: code-group

```tsx [React]
import { hydrateRoot } from 'react-dom/client';
import { acceptInteractions } from '@anchorlib/react/browser';
import App from './App.js';

hydrateRoot(document.getElementById('root')!, <App />);

// Activate browser reactive listeners after hydration completes
acceptInteractions();
```

```tsx [SolidJS]
import { hydrate } from 'solid-js/web';
import { acceptInteractions } from '@anchorlib/solid/browser';
import App from './App.js';

hydrate(() => <App />, document.getElementById('root')!);

// Activate browser reactive listeners after hydration completes
acceptInteractions();
```

:::

By deferring browser event registration until `acceptInteractions()` is called, components remain SSR-safe without requiring runtime environment guards on every render. Learn more about hydration in [Universal SSR](/ssr).

## Cursor

Tracking pointer coordinates, active mouse buttons, and pressed modifier keys allows UI components to react to user pointer interactions across the entire document or within specific elements.

### Live Cursor

The `LIVE_CURSOR` singleton exposes document-wide pointer coordinates, active mouse buttons, and modifier keys directly into your template.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_CURSOR } from '@anchorlib/react/browser';

// <Show> tracks LIVE_CURSOR inline and unwraps properties into the render callback
<Show when={() => LIVE_CURSOR.x && LIVE_CURSOR}>
  {({ x, y, button, modifiers }) => (
    <div>
      <p>Pointer Position: {x}, {y}</p>
      <p>Active Button: {button ?? 'none'}</p>
      <p>Shift Key Active: {modifiers.has('shift') ? 'Yes' : 'No'}</p>
    </div>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_CURSOR } from '@anchorlib/solid/browser';

// <Show> tracks LIVE_CURSOR inline and unwraps properties into the render callback
<Show when={() => LIVE_CURSOR.x && LIVE_CURSOR}>
  {({ x, y, button, modifiers }) => (
    <div>
      <p>Pointer Position: {x}, {y}</p>
      <p>Active Button: {button ?? 'none'}</p>
      <p>Shift Key Active: {modifiers.has('shift') ? 'Yes' : 'No'}</p>
    </div>
  )}
</Show>
```

:::

Reading `LIVE_CURSOR` properties directly in `<Show>` automatically tracks global pointer position (`x`, `y`, `pageX`, `pageY`), active mouse button (`left`, `right`, `middle`), and modifier keys (`shift`, `alt`, `ctrl`, `meta`).

### Scoped Cursor

When building interactive canvas elements, custom dropdowns, or drag handles, you often need to limit pointer tracking to a specific DOM element instead of the entire document.

The `cursorRef(element)` factory returns a Ref-like reactive object bound to a target DOM node.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { cursorRef } from '@anchorlib/react/browser';

export const InteractiveBox = setup(() => {
  const boxCursor = cursorRef();

  return render(() => (
    <div ref={boxCursor} className="p-6 border rounded">
      <p>Element Pointer Offset: {boxCursor.x}, {boxCursor.y}</p>
      <p>Active Target: {boxCursor.target ? 'Inside' : 'Outside'}</p>
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { cursorRef } from '@anchorlib/solid/browser';

export const InteractiveBox = setup(() => {
  const boxCursor = cursorRef();

  return (
    <div ref={boxCursor} class="p-6 border rounded">
      <p>Element Pointer Offset: {boxCursor.x}, {boxCursor.y}</p>
      <p>Active Target: {boxCursor.target ? 'Inside' : 'Outside'}</p>
    </div>
  );
});
```

:::

Passing `ref={boxCursor}` directly assigns the target DOM element, tracking coordinates and pointer interactions relative to the container.

## Scroll

Scroll-driven visual effects like hiding navigation headers on scroll down or triggering parallax animations require monitoring scroll coordinates and scroll direction without layout thrashing.

### Live Scroll

The `LIVE_SCROLL` singleton tracks window-level scrolling status and direction reactively.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_SCROLL } from '@anchorlib/react/browser';

<Show when={() => LIVE_SCROLL.y && LIVE_SCROLL}>
  {({ y, direction, isScrolling }) => (
    <header className={direction === 'down' ? 'nav-hidden' : 'nav-visible'}>
      <p>Scroll Position Y: {y}px</p>
      <p>Status: {isScrolling ? 'Scrolling' : 'Idle'}</p>
    </header>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_SCROLL } from '@anchorlib/solid/browser';

<Show when={() => LIVE_SCROLL.y && LIVE_SCROLL}>
  {({ y, direction, isScrolling }) => (
    <header class={direction === 'down' ? 'nav-hidden' : 'nav-visible'}>
      <p>Scroll Position Y: {y}px</p>
      <p>Status: {isScrolling ? 'Scrolling' : 'Idle'}</p>
    </header>
  )}
</Show>
```

:::

Reading `LIVE_SCROLL` properties tracks window scroll pixel positions (`x`, `y`), current scroll direction (`up`, `down`, `left`, `right`), and a transient `isScrolling` boolean that resets automatically when scrolling pauses.

### Scoped Scroll

Applications with custom scrollable containers, virtualized lists, or modal sidebars need to monitor scroll offsets for specific elements rather than the main window.

The `scrollRef(element)` factory returns a Ref-like reactive object bound to a scrollable DOM container.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { scrollRef } from '@anchorlib/react/browser';

export const ScrollableList = setup(() => {
  const listScroll = scrollRef();

  return render(() => (
    <div ref={listScroll} style={{ height: '300px', overflowY: 'auto' }}>
      <p className="sticky top-0 bg-white">Container Y: {listScroll.y}px</p>
      <div style={{ height: '1000px' }}>Scrollable Content</div>
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { scrollRef } from '@anchorlib/solid/browser';

export const ScrollableList = setup(() => {
  const listScroll = scrollRef();

  return (
    <div ref={listScroll} style={{ height: '300px', overflowY: 'auto' }}>
      <p class="sticky top-0 bg-white">Container Y: {listScroll.y}px</p>
      <div style={{ height: '1000px' }}>Scrollable Content</div>
    </div>
  );
});
```

:::

Passing `ref={listScroll}` directly listens to scroll events on that specific container, providing fine-grained scroll offsets without affecting global window scroll logic.

## Selection

Highlighting selected text or rendering floating toolbars relative to text selections requires calculating DOM bounding rectangles and SVG selection paths.

The `LIVE_SELECTION` primitive captures active document selections, offering helper methods to extract bounding rectangles, selected text, and SVG paths for multi-line text selection rendering.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_SELECTION } from '@anchorlib/react/browser';

<Show when={() => LIVE_SELECTION.rect && LIVE_SELECTION}>
  {({ rect, paths }) => (
    <svg
      className="fixed pointer-events-none"
      width={rect.width + 16}
      height={rect.height + 16}
      style={{ top: `${rect.y - 8}px`, left: `${rect.x - 8}px`, zIndex: 999 }}
    >
      <path d={paths(6, 8)} fill="rgba(0, 0, 0, 0.15)" />
    </svg>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_SELECTION } from '@anchorlib/solid/browser';

<Show when={() => LIVE_SELECTION.rect && LIVE_SELECTION}>
  {({ rect, paths }) => (
    <svg
      class="fixed pointer-events-none"
      width={rect.width + 16}
      height={rect.height + 16}
      style={{ top: `${rect.y - 8}px`, left: `${rect.x - 8}px`, zIndex: 999 }}
    >
      <path d={paths(6, 8)} fill="rgba(0, 0, 0, 0.15)" />
    </svg>
  )}
</Show>
```

:::

`LIVE_SELECTION` captures active text selection ranges (`rect`, `rects`), selected text and HTML strings, and computes custom SVG path strings via `LIVE_SELECTION.paths(padding, radius)` to render pixel-perfect multi-line selection overlays.

## Drag & Drop

Native HTML Drag and Drop APIs involve complex event handler sequences across `dragstart`, `dragover`, `dragleave`, and `drop` events.

The `LIVE_DND` primitive provides reactive drag state alongside declarative `draggable` and `droppable` registration utilities.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_DND } from '@anchorlib/react/browser';

<div className="dnd-container">
  {/* Draggable Element */}
  <div
    ref={(el) => LIVE_DND.draggable(el, { data: { id: 'card-101', type: 'task' } })}
    className="draggable-card"
  >
    Drag Me
  </div>

  {/* Floating Drag Preview - Show unwraps LIVE_DND and destructures x, y, payload */}
  <Show when={() => LIVE_DND.isDragging && LIVE_DND}>
    {({ x, y, payload }) => (
      <div
        className="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${y}px`, left: `${x}px` }}
      >
        <span className="bg-black text-white px-3 py-1 rounded shadow">
          {payload.data?.type ?? 'item'}
        </span>
      </div>
    )}
  </Show>

  {/* Drop Zone */}
  <div
    ref={(el) => LIVE_DND.droppable(el)}
    className={LIVE_DND.isDragging ? 'drop-zone active' : 'drop-zone'}
  >
    {LIVE_DND.isDragging ? 'Release to Drop' : 'Drop Target'}
  </div>
</div>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_DND } from '@anchorlib/solid/browser';

<div class="dnd-container">
  {/* Draggable Element */}
  <div
    ref={(el) => LIVE_DND.draggable(el, { data: { id: 'card-101', type: 'task' } })}
    class="draggable-card"
  >
    Drag Me
  </div>

  {/* Floating Drag Preview - Show unwraps LIVE_DND and destructures x, y, payload */}
  <Show when={() => LIVE_DND.isDragging && LIVE_DND}>
    {({ x, y, payload }) => (
      <div
        class="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${y}px`, left: `${x}px` }}
      >
        <span class="bg-black text-white px-3 py-1 rounded shadow">
          {payload.data?.type ?? 'item'}
        </span>
      </div>
    )}
  </Show>

  {/* Drop Zone */}
  <div
    ref={(el) => LIVE_DND.droppable(el)}
    class={LIVE_DND.isDragging ? 'drop-zone active' : 'drop-zone'}
  >
    {LIVE_DND.isDragging ? 'Release to Drop' : 'Drop Target'}
  </div>
</div>
```

:::

`LIVE_DND` manages active drag coordinates (`x`, `y`, `deltaX`, `deltaY`), drag payload content (`data`, `files`, `text`), target drop zones (`zone`, `target`), and boolean status flags (`isDragging`, `isInternal`).

## Media

Adapting UI components based on viewport dimensions, orientation, system color schemes, or input device capabilities often requires setting up window `matchMedia` listeners.

The `LIVE_MEDIA` primitive provides reactive boolean flags for standard CSS media features, while `mediaQuery(query)` creates a reactive getter for custom CSS media queries.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_MEDIA, mediaQuery } from '@anchorlib/react/browser';

const isWide = mediaQuery('(min-width: 1400px)');

<Show when={() => LIVE_MEDIA}>
  {({ isDark, isMobile, isTouch }) => (
    <div className={isDark ? 'theme-dark' : 'theme-light'}>
      <p>Device Type: {isMobile ? 'Mobile' : 'Desktop'}</p>
      <p>Touch Screen: {isTouch ? 'Supported' : 'Not Supported'}</p>
      <p>Wide Display: {isWide() ? 'Yes' : 'No'}</p>
    </div>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_MEDIA, mediaQuery } from '@anchorlib/solid/browser';

const isWide = mediaQuery('(min-width: 1400px)');

<Show when={() => LIVE_MEDIA}>
  {({ isDark, isMobile, isTouch }) => (
    <div class={isDark ? 'theme-dark' : 'theme-light'}>
      <p>Device Type: {isMobile ? 'Mobile' : 'Desktop'}</p>
      <p>Touch Screen: {isTouch ? 'Supported' : 'Not Supported'}</p>
      <p>Wide Display: {isWide() ? 'Yes' : 'No'}</p>
    </div>
  )}
</Show>
```

:::

`LIVE_MEDIA` includes built-in queries for `isDark`, `isLight`, `isMobile`, `isTablet`, `isDesktop`, `isLandscape`, `isPortrait`, `isTouch`, `isHover`, `isReducedMotion`, `isHighContrast`, and `isRetina`.

## Window

Applications often need to react to viewport resize events, document visibility changes, or user inactivity timeouts (such as automatic session logout or pausing video playback).

The `LIVE_WINDOW` primitive continuously monitors viewport dimensions, tab focus, document visibility, and user idle timeouts.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_WINDOW } from '@anchorlib/react/browser';

LIVE_WINDOW.setIdleTimeout(3);

<Show when={() => LIVE_WINDOW.isIdle && LIVE_WINDOW}>
  {({ lastActive }) => (
    <div className="idle-modal">
      User is currently idle (last active: {new Date(lastActive).toLocaleTimeString()})
    </div>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_WINDOW } from '@anchorlib/solid/browser';

LIVE_WINDOW.setIdleTimeout(3);

<Show when={() => LIVE_WINDOW.isIdle && LIVE_WINDOW}>
  {({ lastActive }) => (
    <div class="idle-modal">
      User is currently idle (last active: {new Date(lastActive).toLocaleTimeString()})
    </div>
  )}
</Show>
```

:::

`LIVE_WINDOW` exposes reactive properties for `width`, `height`, `isVisible`, `isFocused`, and `isIdle`, updated automatically via window lifecycle and activity event handlers.

## Network

Detecting online status, connection types, and estimated network speeds helps applications toggle offline modes, pause background syncing, or load lower-resolution assets.

The `LIVE_NETWORK` primitive tracks online connectivity and Network Information API metrics seamlessly.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_NETWORK } from '@anchorlib/react/browser';

<Show when={() => !LIVE_NETWORK.isOnline && LIVE_NETWORK}>
  {({ effectiveType, downlink }) => (
    <div className="offline-banner">
      You are offline ({effectiveType}, {downlink} Mbps). Changes will sync on reconnect.
    </div>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_NETWORK } from '@anchorlib/solid/browser';

<Show when={() => !LIVE_NETWORK.isOnline && LIVE_NETWORK}>
  {({ effectiveType, downlink }) => (
    <div class="offline-banner">
      You are offline ({effectiveType}, {downlink} Mbps). Changes will sync on reconnect.
    </div>
  )}
</Show>
```

:::

`LIVE_NETWORK` updates reactively when the browser toggles between `online` and `offline` states or when network interface characteristics change.

## Geolocation

Accessing real-time physical location data via the browser's Geolocation API usually requires managing `watchPosition` handles and error callbacks manually.

The `LIVE_GEO` primitive streams device coordinates and tracking metadata into a reactive state.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_GEO } from '@anchorlib/react/browser';

<Show when={() => LIVE_GEO.isTracking && LIVE_GEO}>
  {({ lat, lng, accuracy, speed }) => (
    <div>
      <p>Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
      <p>Accuracy: {accuracy} meters</p>
      <p>Speed: {speed} m/s</p>
    </div>
  )}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_GEO } from '@anchorlib/solid/browser';

<Show when={() => LIVE_GEO.isTracking && LIVE_GEO}>
  {({ lat, lng, accuracy, speed }) => (
    <div>
      <p>Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
      <p>Accuracy: {accuracy} meters</p>
      <p>Speed: {speed} m/s</p>
    </div>
  )}
</Show>
```

:::

Reading `LIVE_GEO` properties automatically initializes `navigator.geolocation.watchPosition` tracking, updating latitude (`lat`), longitude (`lng`), speed (`speed`), accuracy (`accuracy`), and error status (`error`).

## Keyboard

Managing keyboard event listeners, shortcut key combinations, and modifier keys across the document or within specific form input fields.

### Live Keyboard

The `LIVE_KEYBOARD` primitive monitors document key presses, allowing fluent combination checks.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_KEYBOARD } from '@anchorlib/react/browser';

<Show when={() => (LIVE_KEYBOARD.is('ctrl', 's') || LIVE_KEYBOARD.is('meta', 's')) && LIVE_KEYBOARD}>
  {({ key }) => <p className="save-toast">Saved via shortcut ({key})!</p>}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_KEYBOARD } from '@anchorlib/solid/browser';

<Show when={() => (LIVE_KEYBOARD.is('ctrl', 's') || LIVE_KEYBOARD.is('meta', 's')) && LIVE_KEYBOARD}>
  {({ key }) => <p class="save-toast">Saved via shortcut ({key})!</p>}
</Show>
```

:::

`LIVE_KEYBOARD.is(...keys)` evaluates whether the specified modifier keys and target key are active simultaneously (e.g. `is('ctrl', 'shift', 'p')`).

### Scoped Keyboard

When building custom input components, rich text editors, or form dialogs, you often need to inspect keyboard events strictly for a specific DOM input element.

The `keyboardRef(element)` factory returns a Ref-like reactive object bound to a target input node.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { keyboardRef } from '@anchorlib/react/browser';

export const ScopedInput = setup(() => {
  const inputKeyboard = keyboardRef();

  return render(() => (
    <div>
      <input ref={inputKeyboard} placeholder="Type here..." />
      <p>Input Key: {inputKeyboard.key}</p>
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { keyboardRef } from '@anchorlib/solid/browser';

export const ScopedInput = setup(() => {
  const inputKeyboard = keyboardRef();

  return (
    <div>
      <input ref={inputKeyboard} placeholder="Type here..." />
      <p>Input Key: {inputKeyboard.key}</p>
    </div>
  );
});
```

:::

Passing `ref={inputKeyboard}` directly tracks key presses and modifiers specifically for that input container.

## Clipboard

Reading pasted content, parsing JSON payloads, or copying text and complex objects to the system clipboard requires handling Clipboard API promises and event listeners.

The `LIVE_CLIPBOARD` state manages clipboard data slots (`text`, `data`, `files`) and provides asynchronous `copy`, `paste`, `take`, and `clear` operations.

::: code-group

```tsx [React]
import { Show } from '@anchorlib/react';
import { LIVE_CLIPBOARD } from '@anchorlib/react/browser';

<Show when={() => LIVE_CLIPBOARD.text && LIVE_CLIPBOARD}>
  {({ text }) => <p>Pasted Text: {text}</p>}
</Show>
```

```tsx [SolidJS]
import { Show } from '@anchorlib/solid';
import { LIVE_CLIPBOARD } from '@anchorlib/solid/browser';

<Show when={() => LIVE_CLIPBOARD.text && LIVE_CLIPBOARD}>
  {({ text }) => <p>Pasted Text: {text}</p>}
</Show>
```

:::

`LIVE_CLIPBOARD.copy(payload)` serializes objects automatically into JSON strings, while `LIVE_CLIPBOARD.paste()` parses clipboard payloads and routes them to registered taker callbacks or reactive slots.

## Animation Frame

Triggering high-frequency visual updates directly within event listeners can cause dropped frames if multiple `requestAnimationFrame` callbacks are scheduled simultaneously.

The `reframe()` primitive creates a scheduler and canceler pair for `requestAnimationFrame`, ensuring that only one frame is scheduled at any time.

::: code-group

```tsx [React]
import { setup, render } from '@anchorlib/react';
import { reframe } from '@anchorlib/react/browser';

export const SmoothCanvasRenderer = setup(() => {
  const [scheduleFrame, cancelFrame] = reframe();

  const handlePointerMove = (e: React.PointerEvent) => {
    scheduleFrame(() => {
      console.log('Rendering frame at position:', e.clientX, e.clientY);
    });
  };

  return render(() => (
    <div onPointerMove={handlePointerMove} className="canvas-container">
      Move pointer here for smooth frame scheduling
    </div>
  ));
});
```

```tsx [SolidJS]
import { setup } from '@anchorlib/solid';
import { reframe } from '@anchorlib/solid/browser';

export const SmoothCanvasRenderer = setup(() => {
  const [scheduleFrame, cancelFrame] = reframe();

  const handlePointerMove = (e: PointerEvent) => {
    scheduleFrame(() => {
      console.log('Rendering frame at position:', e.clientX, e.clientY);
    });
  };

  return (
    <div onPointerMove={handlePointerMove} class="canvas-container">
      Move pointer here for smooth frame scheduling
    </div>
  );
});
```

:::

Calling `scheduleFrame(callback)` automatically cancels any pending animation frame request before scheduling the next one, preventing frame backlog and maintaining a consistent 60fps/120fps render loop.
