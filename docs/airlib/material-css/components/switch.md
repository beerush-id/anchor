---
title: 'Switch'
description: 'Material Design switch component used to toggle the state of a single setting on or off.'
---

# Switch
Switches toggle the state of a single setting on or off. They are the preferred way to adjust settings on mobile and web interfaces when the change takes immediate effect.

## Theme Variables
You can customize the switch dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --air-switch-track-width: calc(var(--spacing) * 13); /* 52px */
  --air-switch-track-height: calc(var(--spacing) * 8); /* 32px */
  --air-switch-handle-size: calc(var(--spacing) * 6); /* 24px */
  --air-switch-handle-active-size: calc(var(--spacing) * 8); /* 32px (for pressed states) */
}
```

## Composed Utilities
The following utilities establish the switch track and the sliding thumb.

```html [HTML]
<!-- JavaScript is needed to toggle the aria-checked state -->
<button class="switch" aria-checked="false" role="switch">
  <span class="switch-thumb">
    <!-- Optional: Inner icon -->
    <svg class="switch-icon" viewBox="0 0 24 24">
      <path d="..."></path>
    </svg>
  </span>
</button>

<!-- Checked State -->
<button class="switch" aria-checked="true" role="switch">
  <span class="switch-thumb">
    <svg class="switch-icon switch-icon-checked" viewBox="0 0 24 24">
      <path d="..."></path>
    </svg>
  </span>
</button>
```

- `switch`: Applied to the outer track (usually a `<button>`). It establishes the 52x32 track layout, applies a `surface-variant` background, and automatically shifts its background to `primary` when the `[aria-checked='true']` attribute is set.
- `switch-thumb`: Applied to the inner sliding handle. It manages its absolute position (`inset-inline-start`), size, and shadow colors. By default, it uses the `outline` color. When the parent `.switch` is checked, this utility automatically slides to the right and changes color to `on-primary`.
- `switch-icon`: Applied to an optional inner SVG. It sets the size and hides the icon by default (`opacity: 0`).
- `switch-icon-checked`: Applied to the SVG to reveal it (`opacity: 1`) and change its color to `primary` when the switch is checked.

## Composing Utilities
If you need custom state handling, build the switch using the modular layer utilities.

### Track Utilities
- `switch-base`: Establishes the layout (`inline-flex items-center relative`), size variables, and transition logic.
- `switch-track`: Sets the base unselected visual colors (`surface-variant` background, `outline` border).
- `switch-track-checked`: Applies the selected visuals (`primary` background and border).
- `switch-track-disabled`: Lowers opacity and prevents pointer events.

### Handle Utilities
- `switch-handle`: Establishes the absolute positioning logic and all transform/inset transitions for sliding left and right.
- `switch-handle-surface`: Sets the default unselected handle color (`outline`).
- `switch-handle-checked`: Repositions the handle to the right edge and applies the `on-primary` color.
- State layers like `switch-handle-hover`, `switch-handle-focus`, and their checked counterparts (`switch-handle-checked-hover`, etc.) manage the specific `box-shadow` coloring that creates the Material hover halo effect around the thumb.
