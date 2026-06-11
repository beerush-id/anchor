---
title: 'Floating Action Button (FAB)'
description: 'Material Design FAB component for the primary action on a screen.'
---

# Floating Action Button (FAB)
Floating action buttons (FABs) represent the primary action of a screen. They can appear in multiple variants (primary, surface, secondary, tertiary) and sizes (small, standard, large, extended).

## Theme Variables
You can customize the FAB layout and sizing by overriding its CSS variables.

```css [CSS]
:root {
  --air-fab-size: calc(var(--spacing) * 14); /* 56px default */
  --air-fab-radius: var(--radius-lg); /* 16px default */
  --air-fab-padding-x: 0;
  --air-fab-icon-padding-x: 0;
  --air-fab-gap: 0;
  --air-fab-min-width: 0;
}
```
These variables define the base dimensions for a standard FAB. The extended and alternate size variants override these variables internally.

## Composed Utilities
The following composed utilities provide out-of-the-box FABs with complete interaction states built in.

```html [HTML]
<!-- Primary FAB (Default) -->
<button class="fab">
  <span class="material-symbols-outlined">add</span>
</button>

<!-- Surface FAB -->
<button class="fab-surface">
  <span class="material-symbols-outlined">edit</span>
</button>

<!-- Secondary FAB -->
<button class="fab-secondary">
  <span class="material-symbols-outlined">share</span>
</button>

<!-- Tertiary FAB -->
<button class="fab-tertiary">
  <span class="material-symbols-outlined">favorite</span>
</button>
```

- `fab`: The standard primary-colored FAB. Applies `fab-base` and `fab-primary-surface` with hover/focus states.
- `fab-surface`: The surface-colored FAB. Applies `fab-base` and `fab-surface-surface` with hover/focus states.
- `fab-secondary`: The secondary-colored FAB. Applies `fab-base` and `fab-secondary-surface` with hover/focus states.
- `fab-tertiary`: The tertiary-colored FAB. Applies `fab-base` and `fab-tertiary-surface` with hover/focus states.

## Composing Utilities
If you need custom state handling, build your FAB using the modular base and state layers.

```html [HTML]
<button class="fab-base fab-extended fab-primary-surface hover:fab-primary-hover">
  <span class="material-symbols-outlined">add</span>
  Create
</button>
```

- `fab-base`: Establishes the `inline-flex` layout, sizing variables (`width`, `height`, `border-radius`, `padding`), removes borders, and configures smooth transitions.

### Sizing Utilities
By default, `fab-base` is the standard size (56x56). Use these modifiers to change the size or layout:
- `fab-sm`: Small FAB (40x40). Sets a smaller radius (`12px`).
- `fab-lg`: Large FAB (96x96). Sets a larger radius (`28px`).
- `fab-extended`: Extended FAB that accommodates text alongside an icon. Modifies width to `auto`, adds horizontal padding, defines a minimum width, and applies `label-large` typography. It also features smart icon padding, dynamically adjusting space if an icon (`.material-symbols-outlined`, `svg`, `img`) is placed before or after text.

### State Utilities
- `fab-primary-surface`, `fab-primary-hover`, `fab-primary-focus`: Colors for the primary container variant.
- `fab-surface-surface`, `fab-surface-hover`, `fab-surface-focus`: Colors for the surface container variant.
- `fab-secondary-surface`, `fab-secondary-hover`, `fab-secondary-focus`: Colors for the secondary container variant.
- `fab-tertiary-surface`, `fab-tertiary-hover`, `fab-tertiary-focus`: Colors for the tertiary container variant.
