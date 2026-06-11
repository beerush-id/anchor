---
title: 'Icon Button'
description: 'Material Design icon button component for compact actions and toggles.'
---

# Icon Button
Icon buttons help people take supplementary actions and can act as toggles. They come in standard, filled, tonal, and outlined variants.

## Theme Variables
You can customize the icon button layout by overriding its CSS variables.

```css [CSS]
:root {
  --air-icon-button-size: calc(var(--spacing) * 10); /* 40px default */
  --air-icon-button-icon-size: calc(var(--spacing) * 6); /* 24px default */
  --air-icon-button-radius: var(--radius-full);
}
```
These variables dictate the outer touch target size, the inner icon size, and the border radius for all default medium-sized icon buttons.

## Composed Utilities
The following composed utilities provide ready-to-use icon buttons with all base layout and interaction states (including hover, focus, active, disabled, and toggle states via `aria-pressed` or `aria-selected`).

```html [HTML]
<!-- Standard Icon Button -->
<button class="icon-button">
  <span class="material-symbols-outlined">more_vert</span>
</button>

<!-- Filled Icon Button -->
<button class="icon-button-filled">
  <span class="material-symbols-outlined">settings</span>
</button>

<!-- Tonal Icon Button -->
<button class="icon-button-tonal">
  <span class="material-symbols-outlined">palette</span>
</button>

<!-- Outlined Icon Button -->
<button class="icon-button-outlined">
  <span class="material-symbols-outlined">search</span>
</button>

<!-- Toggle Icon Button (Standard) -->
<button class="icon-button" aria-pressed="true">
  <span class="material-symbols-outlined">favorite</span>
</button>
```

- `icon-button`: The standard (low emphasis) variant. Applies `icon-button-base` and responds to `:hover`, `:focus-visible`, `:active`, and `[aria-pressed='true']`.
- `icon-button-filled`: The high emphasis filled variant. Automatically manages a distinct unselected state when `[aria-pressed='false']`.
- `icon-button-tonal`: The medium emphasis filled tonal variant. Also supports distinct toggled and unselected styles.
- `icon-button-outlined`: The medium emphasis outlined variant. Switches to an inverse color scheme when toggled (`[aria-pressed='true']`).

## Composing Utilities
If you need custom control over state interactions, use the granular base and state layers.

```html [HTML]
<button class="icon-button-base icon-button-filled-surface hover:icon-button-filled-hover">
  <svg>...</svg>
</button>
```

- `icon-button-base`: Sets up `inline-flex` centering, binds width and height to the CSS variables, guarantees a minimum 48x48 accessible hit area via an absolute `::after` pseudo-element, and enforces correct scaling on child elements (`svg`, `span`, `i`).
- `icon-button-disabled`: Applies `cursor: not-allowed` and adjusts colors for the disabled state.

### Sizing Utilities
- `icon-button-xs`: Extra small (`24x24` container, `16x16` icon).
- `icon-button-sm`: Small (`32x32` container, `20x20` icon).
- `icon-button-md`: Medium (default, `40x40` container, `24x24` icon).
- `icon-button-lg`: Large (`48x48` container, `28x28` icon).
- `icon-button-xl`: Extra large (`56x56` container, `32x32` icon).

### State Utilities
- `icon-button-standard-*`: Granular states (`surface`, `hover`, `focus`, `pressed`, `selected-surface`, etc.) for the standard variant.
- `icon-button-filled-*`: Granular states for the filled variant.
- `icon-button-tonal-*`: Granular states for the tonal variant.
- `icon-button-outlined-*`: Granular states and border configurations for the outlined variant.
