---
title: 'Progress Indicators'
description: 'Material Design progress indicators express an unspecified wait time or display the length of a process.'
---

# Progress Indicators
Progress indicators inform users about the status of ongoing processes. They come in two primary forms: linear and circular, and can be determinate (showing exact progress) or indeterminate (showing continuous activity).

## Theme Variables
You can customize the linear progress height by overriding its CSS variables.

```css [CSS]
:root {
  --progress-linear-height: var(--spacing); /* 4px default */
}
```
This variable dictates the thickness of the linear progress track.

## Composed Utilities
The library provides composed base utilities for the track or container. The internal bars or circles must be constructed manually using the granular utilities to ensure proper animation and logic control.

```html [HTML]
<!-- Determinate Linear Progress (e.g., 50%) -->
<div class="progress-linear">
  <div class="progress-linear-bar progress-linear-primary" style="width: 50%;"></div>
</div>

<!-- Indeterminate Linear Progress -->
<div class="progress-linear">
  <div class="progress-linear-bar progress-linear-primary progress-linear-indeterminate"></div>
</div>

<!-- Indeterminate Circular Progress -->
<svg class="progress-circular progress-circular-indeterminate" viewBox="0 0 48 48">
  <circle class="progress-circular-circle progress-circular-primary progress-circular-circle-indeterminate" cx="24" cy="24" r="18" />
</svg>
```

- `progress-linear`: The main track container for a linear indicator. Applies `progress-linear-base` (width, height, border radius, overflow hidden) and `progress-linear-surface` (`surface-container-highest` background).
- `progress-circular`: The main container/SVG size utility for a circular indicator. Applies `progress-circular-base`, which sets the explicit width and height to `48px`.

## Composing Utilities
Because progress indicators rely heavily on DOM structure (e.g., separating the track from the animated bar or SVG circle), use these granular utilities to build the moving parts.

### Linear Utilities
- `progress-linear-bar`: Establishes the absolute positioning (`inset-y-0 left-0`) for the inner moving bar. Includes a smooth width transition for determinate state updates.
- `progress-linear-primary`: Applies the `primary` background color to the bar.
- `progress-linear-indeterminate`: Sets up the CSS animation (`indeterminate-linear` keyframes) to infinitely stretch and translate the bar across the track.

### Circular Utilities
- `progress-circular-indeterminate`: Applied to the outer `<svg>` wrapper. Spins the entire SVG infinitely using the `indeterminate-circular-spin` animation.
- `progress-circular-circle`: Applied to the inner `<circle>`. Sets up the `stroke-width` (`4px`), `stroke-linecap` (`round`), and base transitions.
- `progress-circular-primary`: Applies the `primary` color to the SVG `stroke`.
- `progress-circular-circle-indeterminate`: Applied to the inner `<circle>` alongside the base utility. It animates the SVG `stroke-dasharray` and `stroke-dashoffset` (`indeterminate-circular-dash` keyframes) to create the stretching and shrinking circular snake effect.
