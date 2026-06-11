---
title: 'Segmented Button'
description: 'Material Design segmented buttons allow users to select options, switch views, or sort elements.'
---

# Segmented Button
Segmented buttons are typically used to select between mutually exclusive or multiple options, functioning similarly to tabs or a button group.

## Theme Variables
You can customize the layout and corner radii of segmented buttons by overriding their CSS variables.

```css [CSS]
:root {
  --segmented-height: calc(var(--spacing) * 10); /* 40px default */
  --segmented-radius-outer: calc(var(--segmented-height) / 2); /* Fully rounded outer corners */
  --segmented-radius-inner: var(--radius-sm); /* Slightly rounded inner corners */
  --segmented-gap: calc(var(--spacing) * 0.5); /* 2px default gap */
}
```
These variables define the height, the distinct inner and outer curvature that binds the buttons together, and the spacing gap between them.

## Composed Utilities
The following utilities establish the container group and style the individual toggle buttons.

```html [HTML]
<!-- JavaScript is needed to manage aria-pressed or aria-selected states -->
<div class="segmented-group">
  <button class="segmented-button" aria-pressed="true">Day</button>
  <button class="segmented-button">Week</button>
  <button class="segmented-button">Month</button>
</div>
```

- `segmented-group`: Applied to the outer container. It establishes an `inline-flex` layout and applies the `segmented-gap` variable between items.
- `segmented-button`: Applied to the individual buttons. It manages the dynamic border radii based on DOM position (`:first-child` / `:last-child`). By default, it applies a `surface-container` background. When toggled (`[aria-pressed='true']` or `[aria-selected='true']`), it automatically switches to a `secondary-container` background with corresponding hover and focus states.

## Composing Utilities
If you need custom state handling, you can use the granular layer utilities.

```html [HTML]
<button class="segmented-button-base segmented-button-surface hover:segmented-button-hover">
  Custom
</button>
```

- `segmented-button-base`: Establishes the layout (`inline-flex items-center`), binds height and padding, applies `label-large` typography, and orchestrates the distinct inner/outer border radii logic.
- `segmented-button-surface`, `segmented-button-hover`, `segmented-button-focus`: Standard background color mixes for the unselected state.
- `segmented-button-selected-surface`, `segmented-button-selected-hover`, `segmented-button-selected-focus`: Highlight background color mixes for the selected state.
