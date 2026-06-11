# Layout & Navigation

---

## App Bar

A horizontal top bar, typically `position: sticky` or `position: fixed`.

### Component Variable
```
--air-app-bar-height   default: 64px (16 × --spacing)
```

```html
<header class="app-bar">
  <button class="icon-button">
    <span class="material-symbols-outlined">menu</span>
  </button>
  <h1 class="app-bar-title">App Name</h1>
  <button class="icon-button">
    <span class="material-symbols-outlined">account_circle</span>
  </button>
</header>
```

On scroll, add `data-scrolled="true"` to shift from `--color-surface` to `--color-surface-container-high`:
```js
window.addEventListener('scroll', () => {
  document.querySelector('.app-bar').dataset.scrolled = window.scrollY > 0 ? 'true' : 'false';
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
<div class="tab-list">
  <button class="tab-item" aria-selected="true">
    Overview
    <span class="tab-indicator"></span>
  </button>
  <button class="tab-item" aria-selected="false">
    Details
    <span class="tab-indicator"></span>
  </button>
  <button class="tab-item" aria-selected="false" disabled>
    Reviews
    <span class="tab-indicator"></span>
  </button>
</div>

<!-- Tab panel -->
<div class="tab-content">
  <!-- panel content -->
</div>
```

`tab-indicator` is absolutely positioned inside `.tab-item` and becomes visible (`opacity:1`) when `aria-selected="true"`.

The `.tab-list` hides its scrollbar but remains scrollable for overflow scenarios.

### Segmented Tab Container (`tab` utility)
A card-group–style wrapper with pill outer corners and square inner corners:
```html
<div class="tab">
  <div class="tab-list">...</div>
  <div class="tab-content">...</div>
</div>
```

---

## Accordion

A vertically stacked disclosure pattern. Animation uses CSS `grid-template-rows: 0fr → 1fr`.

```html
<div class="accordion-group">

  <div class="accordion-item">
    <button class="accordion-header" aria-expanded="false"
            onclick="toggleAccordion(this)">
      What is Air Material CSS?
      <span class="material-symbols-outlined">expand_more</span>
    </button>
    <div class="accordion-content" data-state="closed">
      <div class="accordion-inner">
        A TailwindCSS v4–based M3 design system...
      </div>
    </div>
  </div>

  <div class="accordion-item">
    <button class="accordion-header" aria-expanded="true"
            onclick="toggleAccordion(this)">
      Is it accessible?
      <span class="material-symbols-outlined">expand_more</span>
    </button>
    <div class="accordion-content" data-state="open">
      <div class="accordion-inner">
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
- `accordion-group` — flex-col container, outer xl radius, inner sm radius
- `accordion-item` — each disclosure unit (`--color-surface-container-low` bg)
- `accordion-header` — trigger button, flex row, space-between, title-medium type
- `accordion-content` — CSS grid row animator (closed: 0fr, open: 1fr)
- `accordion-inner` — the inner content wrapper with padding animation

---

## Navigation Bar

Fixed bottom bar for mobile (≤5 destinations). Height: 80px.

### Component Variable
```
--air-nav-bar-height   default: 80px (20 × --spacing)
```

```html
<nav class="navigation-bar">

  <button class="navigation-bar-item" aria-selected="true">
    <div class="nav-icon-container">
      <span class="material-symbols-outlined">home</span>
    </div>
    Home
  </button>

  <button class="navigation-bar-item" aria-selected="false">
    <div class="nav-icon-container">
      <span class="material-symbols-outlined">explore</span>
    </div>
    Explore
  </button>

  <button class="navigation-bar-item" aria-selected="false">
    <div class="badge-container">
      <div class="nav-icon-container">
        <span class="material-symbols-outlined">notifications</span>
      </div>
      <span class="badge">5</span>
    </div>
    Alerts
  </button>

</nav>
```

- `navigation-bar` — `position: fixed; bottom: 0; left: 0; width: 100%`, `--color-surface-container`
- `navigation-bar-item` — flex-col, label-medium, manages color via `aria-selected`
- `nav-icon-container` — 64×32px pill; selected → `--color-secondary-container`; hover/focus handled by parent context

---

## Navigation Rail

Fixed left sidebar for tablet (≥4 destinations). Width: 80px.

### Component Variable
```
--air-nav-rail-width   default: 80px (20 × --spacing)
```

```html
<nav class="navigation-rail">

  <!-- Optional FAB at top -->
  <button class="fab fab-sm" style="margin-bottom: 12px;">
    <span class="material-symbols-outlined">add</span>
  </button>

  <button class="navigation-rail-item" aria-selected="true">
    <div class="nav-rail-icon-container">
      <span class="material-symbols-outlined">dashboard</span>
    </div>
    Dashboard
  </button>

  <button class="navigation-rail-item" aria-selected="false">
    <div class="nav-rail-icon-container">
      <span class="material-symbols-outlined">analytics</span>
    </div>
    Analytics
  </button>

</nav>
```

- `navigation-rail` — `position: fixed; top: 0; left: 0; height: 100%`, `--color-surface` with `outline-variant` border
- `nav-rail-icon-container` — 56×32px pill; selected → secondary-container

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
<div class="drawer-scrim" id="drawer-scrim" data-state="closed"
     onclick="closeDrawer()"></div>

<!-- Drawer panel -->
<aside class="drawer" id="main-drawer" data-state="closed">
  <nav style="padding: 16px;">
    <a class="link-nav" href="#" aria-current="page">Home</a>
    <a class="link-nav" href="#">Settings</a>
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

**Persistent (always visible, not overlaid):** Add `.drawer-persistent` to `.drawer`:
```html
<aside class="drawer drawer-persistent">...</aside>
```
This removes the transform and uses `position: relative`, integrating it inline in the layout.

---

## Bottom Sheet

Slides up from the bottom of the screen. Width capped at `--air-bottom-sheet-max-width` (640px).

```html
<!-- Scrim -->
<div class="bottom-sheet-scrim" id="sheet-scrim" data-state="closed"
     onclick="closeSheet()"></div>

<!-- Sheet -->
<div class="bottom-sheet" id="my-sheet" data-state="closed">
  <div class="bottom-sheet-handle"></div>
  <div style="padding: 16px 24px 32px;">
    <h3 class="text-title-medium">Share</h3>
    <p class="text-body-medium">Choose how you want to share this item.</p>
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

`bottom-sheet-handle` — 32×4px drag indicator, centered, with `--color-outline` surface.

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
<div class="side-sheet-scrim" id="side-scrim" data-state="closed"
     onclick="closeSideSheet()"></div>

<!-- Right-anchored (default) -->
<aside class="side-sheet" id="side-sheet" data-state="closed">
  <div style="padding: 24px;">
    <h2 class="text-headline-small">Filters</h2>
    <!-- filter controls -->
  </div>
</aside>

<!-- Left-anchored override -->
<aside class="side-sheet-base side-sheet-left side-sheet-surface" data-state="closed">
  ...
</aside>
```

`side-sheet` defaults to right-anchored. For left, compose the atomic utilities manually as shown above.
