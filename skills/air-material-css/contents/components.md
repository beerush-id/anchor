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
| `air-button` | Filled | High |
| `air-button-elevated` | Elevated (shadow) | High |
| `air-button-tonal` | Filled Tonal | Medium |
| `air-button-outlined` | Outlined | Medium |
| `air-button-text` | Text | Low |
| `air-toggle-button` | Toggle (selected via `aria-pressed/selected`) | — |

All handle `:hover`, `:focus-visible`, and `:disabled` automatically.

Smart icon padding: if the first or last child is a `.air-icon`, side padding automatically adjusts to `--air-button-icon-padding-x`. Implicit `<svg>` or `<img>` targeting has been removed.

### Size Modifiers (combine with any variant)
```
air-button-xs   calc(6 * var(--spacing))
air-button-sm   calc(8 * var(--spacing))
air-button-md   calc(10 * var(--spacing)) — default
air-button-lg   calc(12 * var(--spacing))
air-button-xl   calc(14 * var(--spacing))
```

```html
<button class="air-button">Save</button>
<button class="air-button-tonal air-button-lg">
  <span class="air-icon">upload</span>
  Upload
</button>
<button class="air-button-outlined" disabled>Cancel</button>
<button class="air-toggle-button" aria-pressed="true">Bold</button>
```

---

## Button Group

Wraps multiple buttons, giving outer buttons a pill radius and inner buttons a square radius with a small gap:

```html
<div class="air-button-group">
  <button class="air-button">Left</button>
  <button class="air-button">Center</button>
  <button class="air-button">Right</button>
</div>
```

Variables: `--group-gap` (2px default).

---

## Split Button

A two-part button: primary action + trailing dropdown trigger.

```html
<div class="air-split-button-group air-split-button-filled">
  <button class="air-split-button-primary">Save</button>
  <button class="air-split-button-trailing">
    <span class="air-icon">arrow_drop_down</span>
  </button>
</div>
```

Variants: `air-split-button-filled`, `air-split-button-tonal`, `air-split-button-elevated`, `air-split-button-outlined`.

---

## Segmented Button

A group of toggle-style buttons with connected pill shape:

```html
<div class="air-segmented-group">
  <button class="air-segmented-button" aria-selected="true">Day</button>
  <button class="air-segmented-button">Week</button>
  <button class="air-segmented-button">Month</button>
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
| `air-icon-button` | Standard (transparent bg) |
| `air-icon-button-filled` | Filled |
| `air-icon-button-tonal` | Filled Tonal |
| `air-icon-button-outlined` | Outlined |

Toggle support: `air-icon-button-filled` and `air-icon-button-tonal` use `aria-pressed="false"` for unselected state; `air-icon-button` and `air-icon-button-outlined` use `aria-pressed="true"` for selected state.

### Size Modifiers
```
air-icon-button-xs   calc(6 * var(--spacing))
air-icon-button-sm   calc(8 * var(--spacing))
air-icon-button-md   calc(10 * var(--spacing)) (default)
air-icon-button-lg   calc(12 * var(--spacing))
air-icon-button-xl   calc(14 * var(--spacing))
```

```html
<button class="air-icon-button">
  <span class="air-icon">search</span>
</button>
<button class="air-icon-button-filled air-icon-button-lg">
  <span class="air-icon">add</span>
</button>
<!-- Toggle: aria-pressed="false" = unselected surface -->
<button class="air-icon-button-filled" aria-pressed="false">
  <span class="air-icon">favorite</span>
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
| `air-card` | Elevated | `--color-surface-container-low` |
| `air-card-filled` | Filled | `--color-surface-container-highest` |
| `air-card-outlined` | Outlined | `--color-surface` + 1px border |

Add `air-card-interactive` for hover/focus states and pointer cursor:
```html
<div class="air-card air-card-interactive" tabindex="0">...</div>
```

### Content Structure Utilities
```
air-card-header   → flex-col, full padding top, half padding bottom
air-card-title    → text-title-medium, on-surface
air-card-subtitle → text-body-medium, on-surface-variant
air-card-body     → flex-grow 1, full padding (0 top if follows card-header)
air-card-actions  → flex row, justify-end, half padding top
```

```html
<div class="air-card">
  <div class="air-card-header">
    <h3 class="air-card-title">Title</h3>
    <p class="air-card-subtitle">Subtitle</p>
  </div>
  <div class="air-card-body">Content here.</div>
  <div class="air-card-actions">
    <button class="air-button-text">Cancel</button>
    <button class="air-button">Confirm</button>
  </div>
</div>
```

### Card Group (segmented stacking)
Stacks cards with `2px` gap; outer corners use `--air-card-radius`, inner use `--radius-sm`:

```html
<div class="air-card-group">
  <div class="air-card-filled">First</div>
  <div class="air-card-filled">Middle</div>
  <div class="air-card-filled">Last</div>
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
| `air-chip` | Outlined (transparent + outline-variant border) |
| `air-chip-elevated` | `--color-surface-container-low` |

Selected state: `aria-selected="true"` → secondary-container.
Disabled: `:disabled` or `aria-disabled="true"` → opacity 0.38.

### Size Modifiers
```
air-chip-sm   calc(6 * var(--spacing))
air-chip-md   calc(8 * var(--spacing)) — default
air-chip-lg   calc(10 * var(--spacing))
```

```html
<button class="air-chip" aria-selected="false">Filter</button>
<button class="air-chip" aria-selected="true">Active</button>
```

---

## Badge

Absolutely positioned count/dot indicator. Wrap the target with `air-badge-container`:

```html
<div class="air-badge-container">
  <button class="air-icon-button">
    <span class="air-icon">notifications</span>
  </button>
  <span class="air-badge">3</span>
</div>

<!-- Small dot (no text) -->
<div class="air-badge-container">
  <button class="air-icon-button">...</button>
  <span class="air-badge-dot"></span>
</div>
```

`air-badge` = large with count. `air-badge-dot` = 6px dot.
Color variants: `air-badge-error-surface` (default), `air-badge-primary-surface`, `air-badge-secondary-surface`.

---

## Divider

```html
<hr class="air-divider" />          <!-- horizontal full-width -->
<hr class="air-divider-vertical" /> <!-- vertical (needs fixed height container) -->
<hr class="air-divider-inset" />    <!-- horizontal with 16px left margin -->
```

---

## Ripple

Programmatic ripple effect. Add `air-ripple-container` inside any positioned element, then inject `air-ripple` spans via JS on click:

```html
<button class="air-button" style="position:relative; overflow:hidden;">
  Save
  <span class="air-ripple-container">
    <!-- JS inserts: <span class="air-ripple" style="width:Xpx;height:Xpx;left:Xpx;top:Xpx;"></span> -->
  </span>
</button>
```

The ripple color inherits `currentColor` at `--opacity-pressed` opacity.

---

## Link

```html
<a class="air-link" href="#">Inline link</a>
<a class="air-link-nav" href="#" aria-current="page">Nav link</a>
<a class="air-link-standalone" href="#">Call to action →</a>
```

- `air-link` — colored primary, underline on hover, visited uses tertiary
- `air-link-nav` — on-surface-variant, turns primary on `aria-current="page"`
- `air-link-standalone` — bold, animated `→` arrow on hover

---

## Progress

### Linear
```html
<div class="air-progress-linear">
  <!-- Determinate -->
  <div class="air-progress-linear-bar air-progress-linear-primary" style="width: 60%;"></div>

  <!-- Indeterminate -->
  <div class="air-progress-linear-bar air-progress-linear-primary air-progress-linear-indeterminate"></div>
</div>
```

### Circular (SVG-based)
```html
<svg class="air-progress-circular" viewBox="0 0 48 48">
  <circle
    class="air-progress-circular-circle air-progress-circular-primary"
    cx="24" cy="24" r="20"
    stroke-dasharray="90, 150"
    stroke-dashoffset="-35"
  />
</svg>

<!-- Indeterminate -->
<svg class="air-progress-circular air-progress-circular-indeterminate" viewBox="0 0 48 48">
  <circle class="air-progress-circular-circle air-progress-circular-primary air-progress-circular-circle-indeterminate"
    cx="24" cy="24" r="20" />
</svg>
```

---

## Table

```html
<table class="air-table-view">
  <thead>
    <tr>
      <th class="air-table-header-cell">Name</th>
      <th class="air-table-header-cell">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr class="air-table-row-filled">
      <td class="air-table-cell">Item A</td>
      <td class="air-table-cell">Active</td>
    </tr>
    <!-- Selected row -->
    <tr class="air-table-row-filled" aria-selected="true">
      <td class="air-table-cell">Item B</td>
      <td class="air-table-cell">Pending</td>
    </tr>
  </tbody>
</table>
```

`air-table-row` — base with focus-ring, no background.
`air-table-row-filled` — segmented rows with hover/select states.
Outer corners auto-apply `--radius-xl` via CSS `:first-child/:last-child` selectors.
