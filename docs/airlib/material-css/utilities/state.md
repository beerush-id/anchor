---
title: 'State'
description: 'Material Design state layers and focus rings for interactive elements.'
---

# State
State layers provide visual feedback for interactive elements when users hover, focus, or press them. The library provides utility classes to easily apply standard Material Design state layers to custom components.

## Composed Utilities

### State Layer
The `state-layer` utility automatically generates a semi-transparent overlay that reacts to `:hover`, `:focus-visible`, and `:active` pseudo-classes. 

```html [HTML]
<!-- Standard usage on a custom interactive element -->
<div class="state-layer p-4 rounded-md cursor-pointer">
  Hover me to see the state layer
</div>

<!-- Customizing the state layer color -->
<div class="state-layer p-4" style="--state-layer-color: var(--color-primary);">
  Primary colored state layer
</div>
```

- `state-layer`: Applies a `::before` pseudo-element to the container. It inherits the parent's `border-radius` perfectly (`border-radius: inherit`) and sits absolutely positioned over the content (`inset: 0`). 
  - By default, it uses `--color-on-surface` as its base color. You can override this per-element using `--state-layer-color`.
  - It automatically applies standard Material opacities (`--opacity-hover`, `--opacity-focus`, `--opacity-pressed`) based on the user's interaction state.

### Focus Ring
The `focus-ring` utility provides a standardized accessibility outline that only appears when a user navigates via keyboard (`:focus-visible`).

```html [HTML]
<button class="focus-ring p-2 rounded-full">
  Keyboard focus me
</button>
```

- `focus-ring`: Sets up an invisible outline (`outline-style: solid`) using the `secondary` theme color with `0` opacity. When the browser triggers `:focus-visible` (typically via Tab key navigation), the outline color becomes fully opaque. It utilizes `--focus-ring-width` and `--focus-ring-offset` for consistent styling.
