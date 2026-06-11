---
title: 'Snackbar'
description: 'Material Design snackbars provide brief messages about app processes at the bottom of the screen.'
---

# Snackbar
Snackbars inform users of a process that an app has performed or will perform. They appear temporarily towards the bottom of the screen.

## Theme Variables
You can customize the layout of the snackbar by overriding its CSS variables.

```css [CSS]
:root {
  --snackbar-min-height: calc(var(--spacing) * 12); /* 48px default */
  --snackbar-padding-x: calc(var(--spacing) * 4); /* 16px default */
  --snackbar-radius: var(--radius-xs);
  --snackbar-gap: calc(var(--spacing) * 2); /* 8px default gap between text and action */
}
```

## Composed Utilities
The core composed utility automatically handles the layout, typography, inversion colors, and entrance/exit animations.

```html [HTML]
<!-- JavaScript is needed to toggle data-state="visible" to trigger animations -->
<div class="snackbar shadow-3" data-state="visible">
  <span>Message archived.</span>
  <button class="snackbar-action">Undo</button>
</div>
```

- `snackbar`: The main container utility. It applies `snackbar-base` for layout (a flexbox with vertical translation animations) and `snackbar-surface` for colors. Snackbars uniquely use the "inverse" color scheme (`inverse-surface` background, `inverse-on-surface` text) to ensure they stand out against standard surfaces.

## Actions
Snackbars can optionally include a single action button.

- `snackbar-action`: A specialized button utility designed to sit inside a snackbar. It applies layout, typography (`label-large`), and uses the `inverse-primary` color to ensure high contrast against the dark `inverse-surface` background. It handles its own hover and focus background color mixes.

## Animation & State
By default, the `snackbar-base` utility hides the element (`opacity: 0`, `visibility: hidden`) and translates it down (`transform: translateY(100%)`). 
When the `data-state="visible"` attribute is applied, the snackbar transitions into view smoothly using standard easing curves.
