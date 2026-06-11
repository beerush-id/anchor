---
title: 'Color Picker'
description: 'Material Design styled color input component for selecting colors natively.'
---

# Color Picker
The color picker component provides a simple, styled wrapper for the native HTML `<input type="color">`. It overrides default browser styles to provide a clean, rounded Material Design appearance.

## Theme Variables
You can customize the color picker dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --air-color-picker-width: calc(var(--spacing) * 10);
  --air-color-picker-height: calc(var(--spacing) * 10);
}
```
These variables define the explicit width and height of the color picker button.

## Composed Utilities
Apply the `color-picker` utility directly to a native color input element.

```html [HTML]
<input type="color" class="color-picker" value="#3b82f6" />
```

- `color-picker`: Sets the input appearance to `none`, sets a fixed width and height (`40x40` pixels by default), and applies a medium border radius (`var(--radius-md)`). It also normalizes the internal structure across browsers by resetting borders and padding on `::-webkit-color-swatch-wrapper`, `::-webkit-color-swatch`, and `::-moz-color-swatch`. Finally, it applies the standard `focus-ring` utility with smooth transitions.
