---
title: 'Time Picker'
description: 'Material Design time picker utilities for selecting hours and minutes.'
---

# Time Picker
Time pickers help users select and set a specific time. The library provides styling for the digital time input display.

## Theme Variables
You can customize the size of the time input units (hours/minutes blocks) by overriding its CSS variable.

```css [CSS]
:root {
  --time-picker-unit-size: calc(var(--spacing) * 24); /* 96px default */
}
```

## Composed Utilities
The following composed utilities automatically handle layout, typography, and interactive states for the time picker input display.

```html [HTML]
<div class="time-picker shadow-3">
  <div class="time-picker-display">
    <!-- Selected Hour -->
    <button class="time-picker-unit" aria-selected="true">
      08
    </button>
    
    <span class="time-picker-separator">:</span>
    
    <!-- Unselected Minute -->
    <button class="time-picker-unit" aria-selected="false">
      30
    </button>
  </div>
</div>
```

- `time-picker`: Applied to the outer container. It establishes a flex column layout, sets a large outer border radius (`radius-xl`), and applies a `surface-container-high` background color.
- `time-picker-unit`: Applied to the individual hour and minute blocks. It enforces the `time-picker-unit-size`, centers the text, and applies `display-large` typography. By default, it applies a `surface-variant` background. When the `[aria-selected='true']` attribute is set, it automatically shifts to a `primary-container` background with `on-primary-container` text. It handles its own hover state color mixes for both unselected and selected states.

## Additional Utilities
- `time-picker-display`: Applied to the wrapper around the units and separator. It creates a flex row and applies the necessary gap between the elements.
- `time-picker-separator`: Applied to the colon (`:`) between hours and minutes. It matches the `display-large` typography of the units and uses the `on-surface` text color.
