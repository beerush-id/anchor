# Overlays & Floating UI

All overlay components are hidden by default and shown via a `data-state` attribute or `[open]` on `<dialog>`. They rely on CSS transitions for enter/exit animation.

---

## Dialog

Uses the native `<dialog>` element for proper accessibility (focus trap, `::backdrop`, `Escape` key).

### Component Variables
```
--air-dialog-padding    default: 24px
--air-dialog-radius     default: --radius-xl (28px)
--air-dialog-max-width  default: 560px
```

```html
<dialog class="dialog" id="my-dialog">
  <h2 class="dialog-title">Confirm Action</h2>
  <p class="dialog-content">
    Are you sure you want to delete this item? This cannot be undone.
  </p>
  <div class="dialog-actions">
    <button class="button-text" onclick="document.getElementById('my-dialog').close()">
      Cancel
    </button>
    <button class="button">Delete</button>
  </div>
</dialog>
```

Open / close:
```js
document.getElementById('my-dialog').showModal(); // opens with backdrop
document.getElementById('my-dialog').close();
```

The dialog animates from `opacity:0; scale(0.95)` → `opacity:1; scale(1)` on `[open]`.
The `::backdrop` fades from transparent to `color-mix(in srgb, var(--color-scrim) 32%, transparent)`.

### Fullscreen Variant
```html
<dialog class="dialog dialog-fullscreen">...</dialog>
```

---

## Menu

A floating surface for dropdown menus. Shown via `data-state="open"`.

### Component Variables
```
--air-menu-min-width      default: 112px (28 × --spacing)
--air-menu-radius         default: --radius-lg (16px)
--air-menu-item-height    default: 48px
--air-menu-item-padding-x default: 16px
```

```html
<div style="position: relative; display: inline-block;">
  <button class="button" onclick="toggleMenu()">Options</button>

  <ul class="menu" id="options-menu" data-state="closed">
    <li><button class="menu-item">Edit</button></li>
    <li><button class="menu-item">Duplicate</button></li>
    <li><hr class="divider" /></li>
    <li><button class="menu-item" disabled>Archive</button></li>
    <li><button class="menu-item">Delete</button></li>
  </ul>
</div>
```

Toggle via JS:
```js
function toggleMenu() {
  const m = document.getElementById('options-menu');
  m.dataset.state = m.dataset.state === 'open' ? 'closed' : 'open';
}
```

The menu animates from `opacity:0; scale(0.95)` → `opacity:1; scale(1)` on `data-state="open"`.
The `transform-origin` is `top left` — reposition with inline styles for other anchors.

---

## Snackbar

Notification bar that slides up from the bottom. Toggle via `data-state="visible"`.

### Component Variables
```
--snackbar-min-height  default: 48px
--snackbar-padding-x   default: 16px
--snackbar-radius      default: --radius-xs (4px)
--snackbar-gap         default: 8px
```

```html
<div class="snackbar" id="snack" data-state="hidden">
  File saved successfully.
  <button class="snackbar-action" onclick="hideSnack()">Undo</button>
</div>
```

```js
function showSnack() {
  document.getElementById('snack').dataset.state = 'visible';
  setTimeout(() => { document.getElementById('snack').dataset.state = 'hidden'; }, 4000);
}
```

Surface: `--color-inverse-surface` (dark in light mode). Action color: `--color-inverse-primary`.

Typical placement (fixed bottom center):
```html
<div style="position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);">
  <div class="snackbar" id="snack" data-state="hidden">...</div>
</div>
```

---

## Tooltip

Show/hide via `data-state="visible"`. Both variants use `position: absolute` — place inside a `position: relative` container.

### Plain Tooltip (brief label)
```html
<div style="position: relative; display: inline-block;">
  <button class="icon-button" aria-describedby="tip-1">
    <span class="material-symbols-outlined">info</span>
  </button>
  <div class="tooltip-plain" id="tip-1" role="tooltip"
       data-state="hidden"
       style="bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); white-space: nowrap;">
    More information
  </div>
</div>
```

### Rich Tooltip (interactive, more content)
```html
<div style="position: relative; display: inline-block;">
  <button class="icon-button">
    <span class="material-symbols-outlined">help</span>
  </button>
  <div class="tooltip-rich" role="tooltip" data-state="hidden"
       style="bottom: calc(100% + 8px); left: 0; width: 240px;">
    <p>This feature allows you to customize your dashboard layout.</p>
    <a class="link" href="#">Learn more</a>
  </div>
</div>
```

Toggle `data-state="visible"` via JS (e.g. on hover/focus).

---

## FAB (Floating Action Button)

### Component Variables
```
--air-fab-size      default: 56px (14 × --spacing)
--air-fab-radius    default: --radius-lg (16px)
```

### Composed Utilities
| Class | Background | Text/Icon color |
|---|---|---|
| `fab` | `--color-primary-container` | `--color-on-primary-container` |
| `fab-surface` | `--color-surface-container-high` | `--color-primary` |
| `fab-secondary` | `--color-secondary-container` | `--color-on-secondary-container` |
| `fab-tertiary` | `--color-tertiary-container` | `--color-on-tertiary-container` |

### Size Modifiers
```
fab-sm   40px, --radius-md
default  56px, --radius-lg
fab-lg   96px, --radius-xl
```

### Extended FAB (label + icon)
Add `fab-extended` to get auto min-width, padding, gap, and label-large typography:

```html
<!-- Standard FAB -->
<button class="fab" style="position: fixed; bottom: 24px; right: 24px;">
  <span class="material-symbols-outlined">add</span>
</button>

<!-- Extended FAB -->
<button class="fab fab-extended" style="position: fixed; bottom: 24px; right: 24px;">
  <span class="material-symbols-outlined">edit</span>
  Compose
</button>

<!-- Large FAB -->
<button class="fab fab-lg">
  <span class="material-symbols-outlined">add</span>
</button>
```

---

## FAB Menu

A speed-dial pattern: one trigger FAB that expands a list of mini FABs.

```html
<div class="fab-menu" data-state="closed" style="position: fixed; bottom: 24px; right: 24px;">

  <!-- Mini FAB items (listed in reverse visual order due to flex-col-reverse) -->
  <div class="fab-menu-list">
    <button class="fab fab-sm fab-secondary fab-menu-item">
      <span class="material-symbols-outlined">image</span>
    </button>
    <button class="fab fab-sm fab-tertiary fab-menu-item">
      <span class="material-symbols-outlined">mic</span>
    </button>
    <button class="fab fab-sm fab-menu-item">
      <span class="material-symbols-outlined">description</span>
    </button>
  </div>

  <!-- Trigger FAB -->
  <button class="fab fab-menu-trigger" onclick="toggleFabMenu()">
    <span class="material-symbols-outlined">add</span>
  </button>
</div>
```

```js
function toggleFabMenu() {
  const menu = document.querySelector('.fab-menu');
  menu.dataset.state = menu.dataset.state === 'open' ? 'closed' : 'open';
}
```

When `data-state="open"`:
- The trigger icon rotates 45° (`+` → `×`)
- Mini FABs animate in with staggered delays (50ms increments, up to 5 items)
