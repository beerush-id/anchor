# Typography

The type scale follows M3 exactly. All tokens live in `--font-*` custom properties; all utilities are `@utility` classes.

---

## Type Scale Utilities

Apply any of these classes to set `font-size`, `font-weight`, `letter-spacing`, and `line-height` simultaneously.

### Display (large heroes, marketing)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `text-display-large` | 57px | 400 | 64px |
| `text-display-medium` | 45px | 400 | 52px |
| `text-display-small` | 36px | 400 | 44px |

### Headline (section titles)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `text-headline-large` | 32px | 400 | 40px |
| `text-headline-medium` | 28px | 400 | 36px |
| `text-headline-small` | 24px | 400 | 32px |

### Title (card titles, dialogs, app bar)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `text-title-large` | 22px | 400 | 28px |
| `text-title-medium` | 16px | 500 | 24px |
| `text-title-small` | 14px | 500 | 20px |

### Body (paragraph text)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `text-body-large` | 16px | 400 | 24px |
| `text-body-medium` | 14px | 400 | 20px — **body default** |
| `text-body-small` | 12px | 400 | 16px |

### Label (buttons, chips, tabs, captions)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `text-label-large` | 14px | 500 | 20px |
| `text-label-medium` | 12px | 500 | 16px |
| `text-label-small` | 11px | 500 | 16px |

---

## Emphasized Variants

Each scale step has an `-emphasized` variant with a bumped weight. Append `-emphasized` to any utility above:

```
text-display-large-emphasized   → weight 500
text-headline-medium-emphasized → weight 500
text-title-medium-emphasized    → weight 600
text-title-small-emphasized     → weight 600
text-body-large-emphasized      → weight 500
text-label-large-emphasized     → weight 600
text-label-medium-emphasized    → weight 600
text-label-small-emphasized     → weight 600
```

---

## Raw Tokens

If you need to reference individual font properties in custom CSS:

```
--font-base: 1rem

--font-display-large-size / -weight / -tracking / -line-height
--font-display-medium-size / -weight / -tracking / -line-height
--font-display-small-size  / ...

--font-headline-large-size / ...
--font-headline-medium-size / ...
--font-headline-small-size / ...

--font-title-large-size / ...
--font-title-medium-size / ...
--font-title-small-size / ...

--font-body-large-size / ...
--font-body-medium-size / ...
--font-body-small-size / ...

--font-label-large-size / ...
--font-label-medium-size / ...
--font-label-small-size / ...
```

---

## Usage Examples

```html
<h1 class="text-headline-large">Page Title</h1>
<p class="text-body-medium">Body copy text.</p>
<span class="text-label-large">Button Label</span>
<h2 class="text-title-medium-emphasized">Card Title</h2>
```

---

## State-Layer & Focus-Ring Utilities

These two utilities are also defined in the utilities layer and are used internally by all interactive components.

### `state-layer`
Adds a `::before` pseudo-element that transitions opacity on hover / focus / active:

```html
<button class="state-layer">...</button>
```

Override the color via `--state-layer-color` (defaults to `--color-on-surface`).

### `focus-ring`
Adds a consistent focus outline using `--color-secondary` that only appears on `:focus-visible`:

```html
<button class="focus-ring">...</button>
```
