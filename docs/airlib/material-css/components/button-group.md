---
title: 'Button Group'
description: 'Container for grouping standard buttons horizontally.'
---

# Button Group
The button group component is a container utility used to group standard buttons horizontally. It automatically adjusts the border radii of the child buttons to create a cohesive group.

## Theme Variables
You can customize the button group layout and corner radii by overriding its CSS variables.

```css [CSS]
:root {
  --group-radius-outer: calc(var(--air-button-height, 40px) / 2);
  --group-radius-inner: var(--radius-sm, 8px);
  --group-gap: calc(var(--spacing) * 0.5);
}
```
These variables define the outer curvature for the first/last items, the inner curvature for adjacent buttons, and the spacing gap between them.

## Composed Utilities
Apply the utility class to a wrapper element containing standard buttons.

```html [HTML]
<div class="button-group">
  <button class="button">Option 1</button>
  <button class="button">Option 2</button>
  <button class="button">Option 3</button>
</div>
```
- `button-group`: Sets the container to `inline-flex` with a defined gap. It overrides the border radius of all child elements matching `[class*='button']` to an inner radius (`var(--group-radius-inner)`), while applying a rounded outer radius (`var(--group-radius-outer)`) to the first and last child elements. It also manages `z-index` on `:focus-visible` to ensure focus rings are properly visible.
