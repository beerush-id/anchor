---
title: 'Split Button'
description: 'Material Design split buttons provide a primary action along with a dropdown for secondary actions.'
---

# Split Button
Split buttons combine a primary button with a trailing dropdown button. They allow users to execute a default action quickly, or open a menu to select alternative actions.

## Theme Variables
You can customize the layout and corner radii of split buttons by overriding their CSS variables.

```css [CSS]
:root {
  --split-button-height: var(--air-button-height, 40px);
  --split-button-radius-outer: calc(var(--split-button-height) / 2); /* Prevent CSS proportional radius scaling bug */
  --split-button-radius-inner: var(--radius-sm); /* 8px default */
  --split-button-gap: calc(var(--spacing) * 0.5); /* 2px gap between halves */
}
```
These variables define the height, the distinct inner and outer curvature that binds the halves together, and the gap spacing between them.

## Composed Utilities
The following utilities establish the container group and style the individual button halves. The primary and trailing button styles are controlled by wrapper color classes applied to the group container.

```html [HTML]
<div class="split-button-group split-button-filled">
  <!-- Primary Action Area -->
  <button class="split-button-primary">
    <span class="material-symbols-outlined">add</span>
    New Document
  </button>
  
  <!-- Trailing Action Area (Dropdown Arrow) -->
  <button class="split-button-trailing" aria-label="More options">
    <span class="material-symbols-outlined">arrow_drop_down</span>
  </button>
</div>
```

- `split-button-group`: Applied to the outer container. Establishes the `inline-flex` layout and sets the `split-button-height` and `split-button-gap`.
- `split-button-primary`: Applied to the main button half. It takes up remaining space (`flex-1`), manages the outer-left/inner-right border radii, and automatically applies smart icon padding using the `:has()` selector if a leading icon is present.
- `split-button-trailing`: Applied to the secondary button half. It manages the inner-left/outer-right border radii and uses a reduced horizontal padding suitable for a single icon.

## Color Variants
To apply colors and interactive states, apply one of the following variant classes to the `split-button-group` wrapper element. The wrapper class automatically targets and styles both the primary and trailing button children.

- `split-button-filled`: Uses high-emphasis `primary` background and `on-primary` text colors.
- `split-button-tonal`: Uses medium-emphasis `secondary-container` background and `on-secondary-container` text colors.
- `split-button-elevated`: Uses `surface-container-low` background, `primary` text color, and applies an elevation shadow.
- `split-button-outlined`: Uses a transparent background, `primary` text color, and an `outline` border color.
