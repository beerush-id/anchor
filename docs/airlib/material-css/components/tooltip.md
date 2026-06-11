---
title: 'Tooltip'
description: 'Material Design tooltips display informative text when users hover over, focus on, or tap an element.'
---

# Tooltip
Tooltips display informative text when users hover over, focus on, or tap an element. The library provides styling for both simple "plain" tooltips and complex "rich" tooltips.

## Theme Variables
You can customize the inner padding of the tooltips by overriding their CSS variables.

```css [CSS]
:root {
  --air-tooltip-plain-padding-x: calc(var(--spacing) * 2); /* 8px */
  --air-tooltip-plain-padding-y: var(--spacing); /* 4px */

  --air-tooltip-rich-padding-x: calc(var(--spacing) * 4); /* 16px */
  --air-tooltip-rich-padding-y: calc(var(--spacing) * 3); /* 12px */
}
```

## Composed Utilities
The library offers two main composed utilities depending on the complexity of the content you need to display.

> [!NOTE]
> Positioning tooltips (e.g., above, below, or beside an element) requires JavaScript. These CSS utilities only handle the visual styling and fade-in animations based on the `data-state="visible"` attribute.

### Plain Tooltip
Plain tooltips briefly describe an element or action. They are non-interactive and use high-contrast inverse colors to ensure readability against most backgrounds.

```html [HTML]
<!-- Toggle data-state="visible" to trigger fade-in animation -->
<div class="tooltip-plain" data-state="visible" role="tooltip">
  Save document
</div>
```

- `tooltip-plain`: Combines `tooltip-base` (fade transitions), `tooltip-plain-layout` (small typography and padding), and `tooltip-plain-surface` (uses `inverse-surface` and `inverse-on-surface` colors). It explicitly applies `pointer-events: none` so it doesn't block interactions with elements underneath.

### Rich Tooltip
Rich tooltips provide more detailed context or contain interactive elements like links and buttons. They use standard surface colors to accommodate longer reading times.

```html [HTML]
<div class="tooltip-rich shadow-2" data-state="visible" role="tooltip">
  <h3 class="title-small">Rich Tooltip Title</h3>
  <p class="body-medium">Provides more detailed information and can include interactive elements.</p>
  <button class="button-text-primary mt-2">Learn more</button>
</div>
```

- `tooltip-rich`: Combines `tooltip-base`, `tooltip-rich-layout` (medium typography, larger padding, and `pointer-events-auto`), and `tooltip-rich-surface` (uses `surface-variant` background and `on-surface-variant` text). Because rich tooltips can contain interactive elements, they do not block pointer events.

## Animation & State
Both tooltip variants utilize the `tooltip-base` utility, which defaults to `opacity: 0` and `visibility: hidden`.
When your JavaScript logic applies the `data-state="visible"` attribute, the tooltip fades in smoothly using the standard Material `duration-short` timing.
