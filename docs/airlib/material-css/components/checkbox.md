---
title: 'Checkbox'
description: 'Material Design checkbox component for selecting one or more options from a list.'
---

# Checkbox
Material Design checkboxes allow users to select one or more items from a set. They can appear as unchecked, checked, or indeterminate.

## Theme Variables
You can customize the checkbox sizes by overriding its CSS variables.

```css [CSS]
:root {
  --checkbox-target: calc(var(--spacing) * 12); /* 48px touch target */
  --checkbox-size: calc(var(--spacing) * 4.5); /* 18px visual size */
}
```
These variables define the overall clickable touch target area and the inner visual size of the checkbox square.

## Composed Utilities
The primary out-of-the-box utility is `checkbox-input`, designed to be applied directly to a native `<input type="checkbox">` element.

```html [HTML]
<!-- Native Checkbox Input -->
<input type="checkbox" class="checkbox-input" />

<!-- Checked State -->
<input type="checkbox" class="checkbox-input" checked />

<!-- Disabled State -->
<input type="checkbox" class="checkbox-input" disabled />
```

- `checkbox-input`: A highly composed utility. It builds upon `checkbox-base` and applies the `state-layer` utility to expand the clickable touch target to 48x48 pixels via the `::before` pseudo-element. It automatically injects the checkmark or indeterminate SVG icons using CSS `mask-image` on the `::after` pseudo-element (reusing `currentColor`). It natively responds to `:checked`, `:indeterminate`, `[aria-checked='true']`, `[aria-checked='mixed']`, and `:disabled`.

## Composing Utilities
For custom wrapper-based implementations where the native input might be visually hidden, you can use the modular utilities.

```html [HTML]
<label class="checkbox-container">
  <input type="checkbox" class="sr-only peer" />
  <div class="checkbox peer-checked:checkbox-checked">
    <svg class="checkbox-icon peer-checked:checkbox-checked-icon">...</svg>
  </div>
</label>
```

- `checkbox-container`: A 48x48 `inline-flex` wrapper that centers its content and applies hover background transitions. It also handles focus rings for the internal checkbox elements.
- `checkbox`: Applies `checkbox-base` along with built-in `box-shadow` focus rings when `:focus-visible`.
- `checkbox-base`: Renders the 18x18 checkbox square with a 2px border and handles transition properties for background, border, and color.
- `checkbox-icon`: A sizing and transition utility for an SVG icon placed inside the checkbox. Initializes with `opacity: 0`.

### State Utilities
- `checkbox-checked`: Applies the primary background and border color for the checked state.
- `checkbox-indeterminate`: Applies the primary background and border color for the mixed state.
- `checkbox-checked-icon`, `checkbox-indeterminate-icon`: Sets `opacity: 1` on the icon to reveal it.
- `checkbox-disabled`: Lowers opacity (`0.38`), sets the disabled border color, and removes pointer events.
- `checkbox-disabled-checked`: Specific background and color resets for a checkbox that is both disabled and checked.
- `checkbox-hover`: Applies an 8% color-mix background on hover.
