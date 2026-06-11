---
title: 'Tabs'
description: 'Material Design tabs organize content across different screens, data sets, and other interactions.'
---

# Tabs
Tabs organize and allow navigation between groups of content that are related and at the same level of hierarchy.

## Theme Variables
You can customize the height of the tabs and the thickness of the active indicator line by overriding their CSS variables.

```css [CSS]
:root {
  --air-tabs-height: calc(var(--spacing) * 12); /* 48px default */
  --air-tabs-indicator-height: calc(var(--spacing) * 0.75); /* 3px default */
}
```

## Composed Utilities
The following composed utilities automatically handle horizontal scrolling, typography, interaction states, and the active indicator line based on the `[aria-selected="true"]` attribute.

```html [HTML]
<!-- The scrollable list of tabs -->
<ul class="tab-list" role="tablist">
  <li role="presentation">
    <!-- Selected Tab -->
    <button class="tab-item" role="tab" aria-selected="true" aria-controls="panel-1">
      Flight details
      <!-- Active indicator line -->
      <span class="tab-indicator"></span>
    </button>
  </li>
  
  <li role="presentation">
    <!-- Unselected Tab -->
    <button class="tab-item" role="tab" aria-selected="false" aria-controls="panel-2">
      Seat selection
      <span class="tab-indicator"></span>
    </button>
  </li>
</ul>

<!-- Content panel for the selected tab -->
<div class="tab-content p-4" id="panel-1" role="tabpanel">
  <p class="body-medium">Flight details content goes here.</p>
</div>
```

### Tab List and Panels
- `tab-list`: Applied to the `<ul>` or `<nav>` element. It creates a horizontally scrollable flex container, hides the native scrollbars, and applies a `surface-container-low` background.
- `tab-content`: Applied to the panels that display the content corresponding to the active tab. It applies `overflow: hidden` and a `surface-container-low` background to match the list.

### Tab Item and Indicator
- `tab-item`: Applied to the interactive `<button>` inside the list. It sets `title-small` typography, defines standard padding, and manages hover/focus state layers using `color-mix`.
  - **Unselected:** Uses `on-surface-variant` text.
  - **Selected:** When `[aria-selected="true"]` is applied, the text changes to the `primary` color, and the hover/focus state layers switch to mix with the `primary` color instead.
- `tab-indicator`: Applied to an empty `<span>` placed inside the `tab-item`. It positions a primary-colored line at the absolute bottom of the tab item. By default, it is hidden (`opacity: 0`). When its parent `tab-item` receives `[aria-selected="true"]`, it dynamically becomes visible.

### Segmented Tab Structure
In addition to the standard line-indicator tabs, the library provides a `tab` utility that can be used similarly to a button group for segmented layout, applying dynamic inner and outer border radii to grouped elements.

```html [HTML]
<div class="tab">
  <!-- Content blocks grouped tightly together -->
</div>
```
