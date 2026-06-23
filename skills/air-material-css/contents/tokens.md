# Design Tokens

All tokens live inside `@theme {}` blocks and are available as CSS custom properties via `var(--token-name)`. Use them in any custom CSS rule or inline style.

---

## Color Roles

All colors are `light-dark()` values keyed to `--seed-color`. They adapt automatically to the active `color-scheme`.

### Primary
| Token | Purpose |
|---|---|
| `--color-primary` | Primary action color |
| `--color-on-primary` | Text/icon on primary |
| `--color-primary-container` | Tonal container for primary |
| `--color-on-primary-container` | Text/icon on primary-container |

### Secondary
| Token | Purpose |
|---|---|
| `--color-secondary` | Secondary action color |
| `--color-on-secondary` | Text/icon on secondary |
| `--color-secondary-container` | Tonal container for secondary (selected states) |
| `--color-on-secondary-container` | Text/icon on secondary-container |

### Tertiary (hue shifted +60°)
| Token | Purpose |
|---|---|
| `--color-tertiary` | Tertiary accent |
| `--color-on-tertiary` | Text/icon on tertiary |
| `--color-tertiary-container` | Tonal container for tertiary |
| `--color-on-tertiary-container` | Text/icon on tertiary-container |

### Inverse
| Token | Purpose |
|---|---|
| `--color-inverse-surface` | Inverted surface (e.g. Snackbar) |
| `--color-inverse-on-surface` | Text on inverted surface |
| `--color-inverse-primary` | Action color on inverted surface |

### Surface
| Token | Lightness (light / dark) |
|---|---|
| `--color-surface` | ~98% / ~16% |
| `--color-surface-dim` | ~87% / ~12% |
| `--color-surface-bright` | ~98% / ~34% |
| `--color-surface-container-lowest` | 100% / ~12% |
| `--color-surface-container-low` | ~96% / ~20% |
| `--color-surface-container` | ~94% / ~24% |
| `--color-surface-container-high` | ~92% / ~28% |
| `--color-surface-container-highest` | ~90% / ~32% |
| `--color-on-surface` | Text/icon on any surface |
| `--color-surface-variant` | Muted surface alternative |
| `--color-on-surface-variant` | Text/icon on surface-variant |

### Outline
| Token | Purpose |
|---|---|
| `--color-outline` | Borders, input strokes |
| `--color-outline-variant` | Subtle separators |

### Error
| Token | Purpose |
|---|---|
| `--color-error` | Error state |
| `--color-on-error` | Text on error |
| `--color-error-container` | Error container |
| `--color-on-error-container` | Text on error-container |

### Overlay
| Token | Purpose |
|---|---|
| `--color-scrim` | Backdrop overlay tint |
| `--color-shadow` | Box shadow base |

---

## Spacing

The base unit is `--spacing: 0.25rem` (4px). All component sizes are expressed as multiples:

```css
/* Examples */
padding: calc(var(--spacing) * 4);   /* 16px */
gap: calc(var(--spacing) * 2);        /* 8px */
height: calc(var(--spacing) * 14);    /* 56px */
```

---

## Shape / Radius Scale

| Token | Value |
|---|---|
| `--radius-none` | `0` |
| `--radius-xs` | `0.25rem` (4px) |
| `--radius-sm` | `0.5rem` (8px) |
| `--radius-md` | `0.75rem` (12px) |
| `--radius-lg` | `1rem` (16px) |
| `--radius-lg-increased` | `1.25rem` (20px) |
| `--radius-xl` | `1.75rem` (28px) — standard card/dialog |
| `--radius-xl-increased` | `2rem` (32px) |
| `--radius-xxl` | `3rem` (48px) |
| `--radius-full` | `9999px` — pill, fully round |

---

## State Layer Opacities

Used internally by `air-state-layer` and component hover/focus states. Reference when building custom interactive elements:

| Token | Value |
|---|---|
| `--opacity-hover` | `0.08` |
| `--opacity-focus` | `0.12` |
| `--opacity-pressed` | `0.12` |
| `--opacity-dragged` | `0.16` |

---

## Focus Ring

| Token | Value |
|---|---|
| `--focus-ring-width` | `3px` |
| `--focus-ring-offset` | `2px` |

---

## Z-Index Layers

| Token | Value | Use |
|---|---|---|
| `--z-index-elevated` | `1` | Slightly raised elements |
| `--z-index-dropdown` | `10` | Dropdowns |
| `--z-index-sticky` | `20` | Sticky headers |
| `--z-index-fixed` | `40` | Fixed nav |
| `--z-index-modal` | `50` | Dialogs / sheets |
| `--z-index-popover` | `100` | Tooltips, popovers |
| `--z-index-toast` | `200` | Snackbars / toasts |

TailwindCSS v4 also exposes these as utility classes: `z-elevated`, `z-dropdown`, `z-sticky`, `z-fixed`, `z-modal`, `z-popover`, `z-toast`.

---

## Elevation Shadows

| Token | Level |
|---|---|
| `--elevation-0` | `none` |
| `--elevation-1` | Subtle (cards at rest) |
| `--elevation-2` | Menus, dropdowns |
| `--elevation-3` | Dialogs |
| `--elevation-4` | Navigation drawers |
| `--elevation-5` | Maximum |

Usage:
```css
box-shadow: var(--elevation-2);
```

---

## Motion Tokens

### Durations
| Token | Value |
|---|---|
| `--duration-short` | `200ms` |
| `--duration-medium` | `300ms` |
| `--duration-long` | `500ms` |

### Easing Curves
| Token | Curve |
|---|---|
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` — expand/enter |
| `--ease-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` — collapse/exit |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` — common transitions |
| `--ease-standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `--ease-standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
