# Typography

The type scale follows M3 exactly. All tokens live in `--font-*` custom properties; all utilities are `@utility` classes.

---

## Type Scale Utilities

Apply any of these classes to set `font-size`, `font-weight`, `letter-spacing`, and `line-height` simultaneously.

### Display (large heroes, marketing)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `air-display-lg` | 57px | 400 | 64px |
| `air-display-md` | 45px | 400 | 52px |
| `air-display-sm` | 36px | 400 | 44px |

### Headline (section titles)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `air-headline-lg` | 32px | 400 | 40px |
| `air-headline-md` | 28px | 400 | 36px |
| `air-headline-sm` | 24px | 400 | 32px |

### Title (card titles, dialogs, app bar)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `air-title-lg` | 22px | 400 | 28px |
| `air-title-md` | 16px | 500 | 24px |
| `air-title-sm` | 14px | 500 | 20px |

### Body (paragraph text)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `air-body-lg` | 16px | 400 | 24px |
| `air-body-md` | 14px | 400 | 20px — **body default** |
| `air-body-sm` | 12px | 400 | 16px |

### Label (buttons, chips, tabs, captions)
| Class | Size | Weight | Line Height |
|---|---|---|---|
| `air-label-lg` | 14px | 500 | 20px |
| `air-label-md` | 12px | 500 | 16px |
| `air-label-sm` | 11px | 500 | 16px |

---

## Strong Variants

Each scale step has a `-strong` variant with a bumped weight. Append `-strong` to any utility above:

```
air-display-lg-strong   → weight 500
air-headline-md-strong → weight 500
air-title-md-strong    → weight 600
air-title-sm-strong     → weight 600
air-body-lg-strong      → weight 500
air-label-lg-strong     → weight 600
air-label-md-strong    → weight 600
air-label-sm-strong     → weight 600
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
<h1 class="air-headline-lg">Page Title</h1>
<p class="air-body-md">Body copy text.</p>
<span class="air-label-lg">Button Label</span>
<h2 class="air-title-md-strong">Card Title</h2>
```

---

## State-Layer & Focus-Ring Utilities

These two utilities are also defined in the utilities layer and are used internally by all interactive components.

### `air-state-layer`
Adds a `::before` pseudo-element that transitions opacity on hover / focus / active:

```html
<button class="air-state-layer">...</button>
```

Override the color via `--state-layer-color` (defaults to `--color-on-surface`).

### `air-focus-ring`
Adds a consistent focus outline using `--color-secondary` that only appears on `:focus-visible`:

```html
<button class="air-focus-ring">...</button>
```
