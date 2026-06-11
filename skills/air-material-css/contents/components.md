# Components

All component utilities follow a consistent layering pattern:
- **`*-base`** — layout (flexbox, size, padding, transitions)
- **`*-surface`** — default colors
- **`*-hover` / `*-focus`** — interactive state colors
- **Composed** — the all-in-one class you reach for first

Use the composed utility unless you need to override a specific layer.

---

## Button

### Component Variables (override via inline CSS or a parent class)
```
--air-button-height        default: 40px (10 × --spacing)
--air-button-padding-x     default: 24px
--air-button-icon-padding-x  default: 16px
--air-button-gap           default: 8px
--air-button-radius        default: --radius-full (pill)
--air-button-font-size     default: --font-label-large-size
```

### Composed Utilities
| Class | M3 Variant | Emphasis |
|---|---|---|
| `button` | Filled | High |
| `button-elevated` | Elevated (shadow) | High |
| `button-tonal` | Filled Tonal | Medium |
| `button-outlined` | Outlined | Medium |
| `button-text` | Text | Low |
| `toggle-button` | Toggle (selected via `aria-pressed/selected`) | — |

All handle `:hover`, `:focus-visible`, and `:disabled` automatically.

Smart icon padding: if the first or last child is a `.material-symbols-outlined`, `<svg>`, or `<img>`, side padding automatically adjusts to `--air-button-icon-padding-x`.

### Size Modifiers (combine with any variant)
```
button-xs   h-6   (24px)
button-sm   h-8   (32px)
button-md   h-10  (40px) — default
button-lg   h-12  (48px)
button-xl   h-14  (56px)
```

```html
<button class="button">Save</button>
<button class="button-tonal button-lg">
  <span class="material-symbols-outlined">upload</span>
  Upload
</button>
<button class="button-outlined" disabled>Cancel</button>
<button class="toggle-button" aria-pressed="true">Bold</button>
```

---

## Button Group

Wraps multiple buttons, giving outer buttons a pill radius and inner buttons a square radius with a small gap:

```html
<div class="button-group">
  <button class="button">Left</button>
  <button class="button">Center</button>
  <button class="button">Right</button>
</div>
```

Variables: `--group-gap` (2px default).

---

## Split Button

A two-part button: primary action + trailing dropdown trigger.

```html
<div class="split-button-group split-button-filled">
  <button class="split-button-primary">Save</button>
  <button class="split-button-trailing">
    <span class="material-symbols-outlined">arrow_drop_down</span>
  </button>
</div>
```

Variants: `split-button-filled`, `split-button-tonal`, `split-button-elevated`, `split-button-outlined`.

---

## Segmented Button

A group of toggle-style buttons with connected pill shape:

```html
<div class="segmented-group">
  <button class="segmented-button" aria-selected="true">Day</button>
  <button class="segmented-button">Week</button>
  <button class="segmented-button">Month</button>
</div>
```

Selected state driven by `aria-selected="true"` or `aria-pressed="true"`.

---

## Icon Button

Square buttons sized for a single icon. 48×48px minimum touch target enforced via `::after`.

### Component Variables
```
--air-icon-button-size       default: 40px
--air-icon-button-icon-size  default: 24px
--air-icon-button-radius     default: --radius-full
```

### Composed Utilities
| Class | M3 Variant |
|---|---|
| `icon-button` | Standard (transparent bg) |
| `icon-button-filled` | Filled |
| `icon-button-tonal` | Filled Tonal |
| `icon-button-outlined` | Outlined |

Toggle support: `icon-button-filled` and `icon-button-tonal` use `aria-pressed="false"` for unselected state; `icon-button` and `icon-button-outlined` use `aria-pressed="true"` for selected state.

### Size Modifiers
```
icon-button-xs   24px / icon 16px
icon-button-sm   32px / icon 20px
icon-button-md   40px / icon 24px (default)
icon-button-lg   48px / icon 28px
icon-button-xl   56px / icon 32px
```

```html
<button class="icon-button">
  <span class="material-symbols-outlined">search</span>
</button>
<button class="icon-button-filled icon-button-lg">
  <span class="material-symbols-outlined">add</span>
</button>
<!-- Toggle: aria-pressed="false" = unselected surface -->
<button class="icon-button-filled" aria-pressed="false">
  <span class="material-symbols-outlined">favorite</span>
</button>
```

---

## Card

### Component Variables
```
--air-card-radius    default: --radius-xl (28px)
--air-card-padding   default: 24px
```

### Composed Utilities
| Class | M3 Variant | Background |
|---|---|---|
| `card` | Elevated | `--color-surface-container-low` |
| `card-filled` | Filled | `--color-surface-container-highest` |
| `card-outlined` | Outlined | `--color-surface` + 1px border |

Add `card-interactive` for hover/focus states and pointer cursor:
```html
<div class="card card-interactive" tabindex="0">...</div>
```

### Content Structure Utilities
```
card-header   → flex-col, full padding top, half padding bottom
card-title    → text-title-medium, on-surface
card-subtitle → text-body-medium, on-surface-variant
card-body     → flex-grow 1, full padding (0 top if follows card-header)
card-actions  → flex row, justify-end, half padding top
```

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <p class="card-subtitle">Subtitle</p>
  </div>
  <div class="card-body">Content here.</div>
  <div class="card-actions">
    <button class="button-text">Cancel</button>
    <button class="button">Confirm</button>
  </div>
</div>
```

### Card Group (segmented stacking)
Stacks cards with `2px` gap; outer corners use `--air-card-radius`, inner use `--radius-sm`:

```html
<div class="card-group">
  <div class="card-filled">First</div>
  <div class="card-filled">Middle</div>
  <div class="card-filled">Last</div>
</div>
```

---

## Chip

### Component Variables
```
--air-chip-height      default: 32px
--air-chip-radius      default: --radius-sm (8px)
--air-chip-padding-x   default: 16px
```

### Composed Utilities
| Class | Background |
|---|---|
| `chip` | Outlined (transparent + outline-variant border) |
| `chip-elevated` | `--color-surface-container-low` |

Selected state: `aria-selected="true"` → secondary-container.
Disabled: `:disabled` or `aria-disabled="true"` → opacity 0.38.

### Size Modifiers
```
chip-sm   h-6  (24px)
chip-md   h-8  (32px) — default
chip-lg   h-10 (40px)
```

```html
<button class="chip" aria-selected="false">Filter</button>
<button class="chip" aria-selected="true">Active</button>
```

---

## Badge

Absolutely positioned count/dot indicator. Wrap the target with `badge-container`:

```html
<div class="badge-container">
  <button class="icon-button">
    <span class="material-symbols-outlined">notifications</span>
  </button>
  <span class="badge">3</span>
</div>

<!-- Small dot (no text) -->
<div class="badge-container">
  <button class="icon-button">...</button>
  <span class="badge-dot"></span>
</div>
```

`badge` = large with count. `badge-dot` = 6px dot.
Color variants: `badge-error-surface` (default), `badge-primary-surface`, `badge-secondary-surface`.

---

## Divider

```html
<hr class="divider" />          <!-- horizontal full-width -->
<hr class="divider-vertical" /> <!-- vertical (needs fixed height container) -->
<hr class="divider-inset" />    <!-- horizontal with 16px left margin -->
```

---

## Ripple

Programmatic ripple effect. Add `ripple-container` inside any positioned element, then inject `ripple` spans via JS on click:

```html
<button class="button" style="position:relative; overflow:hidden;">
  Save
  <span class="ripple-container">
    <!-- JS inserts: <span class="ripple" style="width:Xpx;height:Xpx;left:Xpx;top:Xpx;"></span> -->
  </span>
</button>
```

The ripple color inherits `currentColor` at `--opacity-pressed` opacity.

---

## Link

```html
<a class="link" href="#">Inline link</a>
<a class="link-nav" href="#" aria-current="page">Nav link</a>
<a class="link-standalone" href="#">Call to action →</a>
```

- `link` — colored primary, underline on hover, visited uses tertiary
- `link-nav` — on-surface-variant, turns primary on `aria-current="page"`
- `link-standalone` — bold, animated `→` arrow on hover

---

## Progress

### Linear
```html
<div class="progress-linear">
  <!-- Determinate -->
  <div class="progress-linear-bar progress-linear-primary" style="width: 60%;"></div>

  <!-- Indeterminate -->
  <div class="progress-linear-bar progress-linear-primary progress-linear-indeterminate"></div>
</div>
```

### Circular (SVG-based)
```html
<svg class="progress-circular" viewBox="0 0 48 48">
  <circle
    class="progress-circular-circle progress-circular-primary"
    cx="24" cy="24" r="20"
    stroke-dasharray="90, 150"
    stroke-dashoffset="-35"
  />
</svg>

<!-- Indeterminate -->
<svg class="progress-circular progress-circular-indeterminate" viewBox="0 0 48 48">
  <circle class="progress-circular-circle progress-circular-primary progress-circular-circle-indeterminate"
    cx="24" cy="24" r="20" />
</svg>
```

---

## Table

```html
<table class="table-view">
  <thead>
    <tr>
      <th class="table-header-cell">Name</th>
      <th class="table-header-cell">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr class="table-row-filled">
      <td class="table-cell">Item A</td>
      <td class="table-cell">Active</td>
    </tr>
    <!-- Selected row -->
    <tr class="table-row-filled" aria-selected="true">
      <td class="table-cell">Item B</td>
      <td class="table-cell">Pending</td>
    </tr>
  </tbody>
</table>
```

`table-row` — base with focus-ring, no background.
`table-row-filled` — segmented rows with hover/select states.
Outer corners auto-apply `--radius-xl` via CSS `:first-child/:last-child` selectors.
