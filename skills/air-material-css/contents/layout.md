# Layout & Navigation

---

## App Bar

A horizontal top bar, typically `position: sticky` or `position: fixed`.

### Component Variable
```
--air-app-bar-height   default: 64px (16 × --spacing)
```

```html
<header class="air-app-bar">
  <button class="air-icon-button">
    <span class="air-icon">menu</span>
  </button>
  <h1 class="air-app-bar-title">App Name</h1>
  <button class="air-icon-button">
    <span class="air-icon">account_circle</span>
  </button>
</header>
```

On scroll, add `data-scrolled="true"` to shift from `--color-surface` to `--color-surface-container-high`:
```js
window.addEventListener('scroll', () => {
  document.querySelector('.air-app-bar').dataset.scrolled = window.scrollY > 0 ? 'true' : 'false';
});
```

---

## Tabs

A scrollable horizontal tab strip with an animated indicator line.

### Component Variables
```
--air-tabs-height            default: 48px
--air-tabs-indicator-height  default: 3px
```

```html
<div class="air-tab-list">
  <button class="air-tab-item" aria-selected="true">
    Overview
    <span class="air-tab-indicator"></span>
  </button>
  <button class="air-tab-item" aria-selected="false">
    Details
    <span class="air-tab-indicator"></span>
  </button>
  <button class="air-tab-item" aria-selected="false" disabled>
    Reviews
    <span class="air-tab-indicator"></span>
  </button>
</div>

<!-- Tab panel -->
<div class="air-tab-content">
  <!-- panel content -->
</div>
```

`air-tab-indicator` is absolutely positioned inside `.air-tab-item` and becomes visible (`opacity:1`) when `aria-selected="true"`.

The `.air-tab-list` hides its scrollbar but remains scrollable for overflow scenarios.

### Segmented Tab Container (`air-tab` utility)
A card-group–style wrapper with pill outer corners and square inner corners:
```html
<div class="air-tab">
  <div class="air-tab-list">...</div>
  <div class="air-tab-content">...</div>
</div>
```

---

## Accordion

A vertically stacked disclosure pattern. Animation uses CSS `grid-template-rows: 0fr → 1fr`.

```html
<div class="air-accordion-group">

  <div class="air-accordion-item">
    <button class="air-accordion-header" aria-expanded="false"
            onclick="toggleAccordion(this)">
      What is Air Material CSS?
      <span class="air-icon">expand_more</span>
    </button>
    <div class="air-accordion-content" data-state="closed">
      <div class="air-accordion-inner">
        A TailwindCSS v4–based M3 design system...
      </div>
    </div>
  </div>

  <div class="air-accordion-item">
    <button class="air-accordion-header" aria-expanded="true"
            onclick="toggleAccordion(this)">
      Is it accessible?
      <span class="air-icon">expand_more</span>
    </button>
    <div class="air-accordion-content" data-state="open">
      <div class="air-accordion-inner">
        Yes. It uses ARIA attributes and focus-ring utilities.
      </div>
    </div>
  </div>

</div>
```

```js
function toggleAccordion(btn) {
  const content = btn.nextElementSibling;
  const isOpen = content.dataset.state === 'open';
  content.dataset.state = isOpen ? 'closed' : 'open';
  btn.setAttribute('aria-expanded', !isOpen);
}
```

Anatomy:
- `air-accordion-group` — flex-col container, outer xl radius, inner sm radius
- `air-accordion-item` — each disclosure unit (`--color-surface-container-low` bg)
- `air-accordion-header` — trigger button, flex row, space-between, air-title-md type
- `air-accordion-content` — CSS grid row animator (closed: 0fr, open: 1fr)
- `air-accordion-inner` — the inner content wrapper with padding animation

---

## Navigation Bar

Fixed bottom bar for mobile (≤5 destinations). Height: 80px.

### Component Variable
```
--air-nav-bar-height   default: 80px (20 × --spacing)
```

```html
<nav class="air-navigation-bar">

  <button class="air-navigation-bar-item" aria-selected="true">
    <div class="air-nav-icon-container">
      <span class="air-icon">home</span>
    </div>
    Home
  </button>

  <button class="air-navigation-bar-item" aria-selected="false">
    <div class="air-nav-icon-container">
      <span class="air-icon">explore</span>
    </div>
    Explore
  </button>

  <button class="air-navigation-bar-item" aria-selected="false">
    <div class="air-badge-container">
      <div class="air-nav-icon-container">
        <span class="air-icon">notifications</span>
      </div>
      <span class="air-badge">5</span>
    </div>
    Alerts
  </button>

</nav>
```

- `air-navigation-bar` — `position: fixed; bottom: 0; left: 0; width: 100%`, `--color-surface-container`
- `air-navigation-bar-item` — flex-col, air-label-md, manages color via `aria-selected`
- `air-nav-icon-container` — 64×32px pill; selected → `--color-secondary-container`; hover/focus handled by parent context

---

## Navigation Rail

Fixed left sidebar for tablet (≥4 destinations). Width: 80px.

### Component Variable
```
--air-nav-rail-width   default: 80px (20 × --spacing)
```

```html
<nav class="air-navigation-rail">

  <!-- Optional FAB at top -->
  <button class="air-fab air-fab-sm" style="margin-bottom: 12px;">
    <span class="air-icon">add</span>
  </button>

  <button class="air-navigation-rail-item" aria-selected="true">
    <div class="air-nav-rail-icon-container">
      <span class="air-icon">dashboard</span>
    </div>
    Dashboard
  </button>

  <button class="air-navigation-rail-item" aria-selected="false">
    <div class="air-nav-rail-icon-container">
      <span class="air-icon">analytics</span>
    </div>
    Analytics
  </button>

</nav>
```

- `air-navigation-rail` — `position: fixed; top: 0; left: 0; height: 100%`, `--color-surface` with `outline-variant` border
- `air-nav-rail-icon-container` — 56×32px pill; selected → secondary-container

---

## Navigation Drawer

A slide-in panel from the left (modal) or always-visible (persistent).

### Component Variables
```
--air-drawer-width   default: 22.5rem (360px)
--air-drawer-radius  default: --radius-lg (16px)
```

```html
<!-- Scrim (click to close) -->
<div class="air-drawer-scrim" id="drawer-scrim" data-state="closed"
     onclick="closeDrawer()"></div>

<!-- Drawer panel -->
<aside class="air-drawer" id="main-drawer" data-state="closed">
  <nav style="padding: 16px;">
    <a class="air-link-nav" href="#" aria-current="page">Home</a>
    <a class="air-link-nav" href="#">Settings</a>
  </nav>
</aside>
```

```js
function openDrawer() {
  document.getElementById('main-drawer').dataset.state = 'open';
  document.getElementById('drawer-scrim').dataset.state = 'open';
}
function closeDrawer() {
  document.getElementById('main-drawer').dataset.state = 'closed';
  document.getElementById('drawer-scrim').dataset.state = 'closed';
}
```

**Persistent (always visible, not overlaid):** Add `.air-drawer-persistent` to `.air-drawer`:
```html
<aside class="air-drawer air-drawer-persistent">...</aside>
```
This removes the transform and uses `position: relative`, integrating it inline in the layout.

---

## Bottom Sheet

Slides up from the bottom of the screen. Width capped at `--air-bottom-sheet-max-width` (640px).

```html
<!-- Scrim -->
<div class="air-bottom-sheet-scrim" id="sheet-scrim" data-state="closed"
     onclick="closeSheet()"></div>

<!-- Sheet -->
<div class="air-bottom-sheet" id="my-sheet" data-state="closed">
  <div class="air-bottom-sheet-handle"></div>
  <div style="padding: 16px 24px 32px;">
    <h3 class="air-title-md">Share</h3>
    <p class="air-body-md">Choose how you want to share this item.</p>
  </div>
</div>
```

```js
function openSheet() {
  document.getElementById('my-sheet').dataset.state = 'open';
  document.getElementById('sheet-scrim').dataset.state = 'open';
}
function closeSheet() {
  document.getElementById('my-sheet').dataset.state = 'closed';
  document.getElementById('sheet-scrim').dataset.state = 'closed';
}
```

`air-bottom-sheet-handle` — 32×4px drag indicator, centered, with `--color-outline` surface.

---

## Side Sheet

Slides in from the right (default) or left.

### Component Variables
```
--air-side-sheet-radius     default: --radius-xl (28px)
--air-side-sheet-max-width  default: 25rem (400px)
```

```html
<!-- Scrim -->
<div class="air-side-sheet-scrim" id="side-scrim" data-state="closed"
     onclick="closeSideSheet()"></div>

<!-- Right-anchored (default) -->
<aside class="air-side-sheet" id="side-sheet" data-state="closed">
  <div style="padding: 24px;">
    <h2 class="air-headline-sm">Filters</h2>
    <!-- filter controls -->
  </div>
</aside>

<!-- Left-anchored override -->
<aside class="air-side-sheet-base air-side-sheet-left air-side-sheet-surface" data-state="closed">
  ...
</aside>
```

`air-side-sheet` defaults to right-anchored. For left, compose the atomic utilities manually as shown above.
