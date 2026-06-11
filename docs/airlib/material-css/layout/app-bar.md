---
title: 'App Bar'
description: 'Material Design top app bar layout for displaying information and actions at the top of a screen.'
---

# App Bar
Top app bars display information and actions relating to the current screen. They provide branding, navigation, and core actions.

## Theme Variables
You can customize the standard height of the app bar by overriding its CSS variable.

```css [CSS]
:root {
  --air-app-bar-height: calc(var(--spacing) * 16); /* 64px standard */
}
```

## Composed Utilities
The `app-bar` utility establishes the main layout and automatically handles background color transitions for scroll state elevation.

```html [HTML]
<!-- Toggle data-scrolled="true" on scroll to elevate visually -->
<header class="app-bar" data-scrolled="false">
  <!-- Navigation Icon -->
  <button class="icon-button">
    <span class="material-symbols-outlined">menu</span>
  </button>
  
  <!-- Title -->
  <h1 class="app-bar-title">Page Title</h1>
  
  <!-- Trailing Actions -->
  <button class="icon-button">
    <span class="material-symbols-outlined">search</span>
  </button>
  <button class="icon-button">
    <span class="material-symbols-outlined">account_circle</span>
  </button>
</header>
```

- `app-bar`: Applied to the container (e.g., `<header>`). It establishes a flex layout centered vertically with a predefined height (`--air-app-bar-height`). It defaults to the standard `surface` background color.
- `app-bar-title`: Applied to the inner text element. It applies `title-large` typography, adds specific inline padding, and uses `flex: 1` to push trailing actions to the far right.

## Scroll States
In Material Design 3, app bars don't use drop shadows to indicate elevation. Instead, they elevate visually by changing their background color when content scrolls beneath them.

- When `data-scrolled="true"` is dynamically applied to the `app-bar` via your scroll event listener, it smoothly transitions to a `surface-container-high` background color, distinguishing it from the `surface` below.
