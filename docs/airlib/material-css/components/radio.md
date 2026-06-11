---
title: 'Radio'
description: 'Material Design radio button component for selecting a single option from a list.'
---

# Radio
Radio buttons allow the user to select one option from a set. They are typically used when the user needs to see all available options at once.

## Theme Variables
You can customize the radio button dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --radio-target: calc(var(--spacing) * 12); /* 48px touch target */
  --radio-size: calc(var(--spacing) * 5); /* 20px visual circle size */
}
```
These variables define the overall clickable touch target area and the inner visual size of the radio ring.

## Composed Utilities
The primary composed utility is applied to a wrapper element containing the visual HTML structure.

```html [HTML]
<!-- JavaScript is needed to toggle aria-checked and apply state classes to the visual elements -->
<div class="radio" aria-checked="false" tabindex="0">
  <div class="radio-visual">
    <div class="radio-visual-dot"></div>
  </div>
</div>

<!-- Checked State Example -->
<div class="radio" aria-checked="true" tabindex="0">
  <div class="radio-visual radio-checked">
    <div class="radio-visual-dot radio-checked-dot"></div>
  </div>
</div>
```

- `radio`: Applied to the outer wrapper. Sets up the 48x48 touch target layout and manages hover and focus background color mixes. It automatically shifts hover/focus coloring based on whether the `aria-checked` attribute is `true` or `false`.

## Composing Utilities
The visual representation of a radio button consists of a ring and an inner dot, controlled by these granular utilities.

- `radio-base`: The core touch target setup without the automatic hover/focus state interactions.
- `radio-visual`: Applied to the outer ring element. It sets the `radio-size` (`20x20`), full border radius, and default `on-surface-variant` border color.
- `radio-visual-dot`: Applied to the inner dot element. It is absolute-centered, applies the `primary` background color, and scales to `0` by default.

### State Utilities
- `radio-checked`: Applied to the `radio-visual` element when checked. Transitions the border color to `primary`.
- `radio-checked-dot`: Applied to the `radio-visual-dot` element when checked. Animates the scale from `0` to `1`.
- `radio-disabled`: Applied to the `radio-visual` element. Adjusts the border to `on-surface` and lowers opacity.
- `radio-disabled-dot`: Applied to the `radio-visual-dot` element. Changes the dot color to `on-surface` for disabled states.
