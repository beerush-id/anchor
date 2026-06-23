# Forms & Inputs

---

## Text Field

The Text Field is a wrapper (`air-text-field`) containing a label and an input. The floating label behavior is pure CSS — no JS needed.

### Component Variables
```
--air-text-field-height        default: calc(14 * var(--spacing))
--air-text-field-radius        default: --radius-md (12px)
--air-text-field-padding-x     default: 16px
--air-text-field-font-size     default: --font-body-large-size
```

### Outlined Variant (default)

```html
<div class="air-text-field bg-surface">
  <label class="air-text-field-label" for="name">Full Name</label>
  <input id="name" class="air-text-field-input" type="text" placeholder=" " />
</div>
```

> `placeholder=" "` (a single space) is required for the floating label to detect when the input is empty vs filled. The placeholder text is intentionally invisible at rest; it appears on focus via CSS.

### Filled Variant

```html
<div class="air-text-field bg-surface-container-highest">
  <label class="air-text-field-label" for="email">Email</label>
  <input id="email" class="air-text-field-input-filled" type="email" placeholder=" " />
</div>
```

### With Leading / Trailing Icons

Place an icon element **before** the input (leading) or **after** (trailing). The wrapper detects it via `:has()` and auto-adjusts padding:

```html
<div class="air-text-field">
  <span class="air-icon">search</span>
  <label class="air-text-field-label" for="q">Search</label>
  <input id="q" class="air-text-field-input" type="text" placeholder=" " />
</div>

<div class="air-text-field">
  <label class="air-text-field-label" for="pwd">Password</label>
  <input id="pwd" class="air-text-field-input" type="password" placeholder=" " />
  <button class="air-icon-button">
    <span class="air-icon">visibility</span>
  </button>
</div>
```

### Supporting Text & Error

```html
<div class="air-text-field">
  <label class="air-text-field-label" for="user">Username</label>
  <input id="user" class="air-text-field-input" type="text" placeholder=" " />
  <span class="air-text-field-supporting-text">Max 32 characters</span>
</div>

<!-- Error state: swap input border + supporting text color -->
<div class="air-text-field">
  <label class="air-text-field-label air-text-field-label-error" for="user-err">Username</label>
  <input id="user-err" class="air-text-field-input air-text-field-input-error" type="text" placeholder=" " />
  <span class="air-text-field-error">Username already taken</span>
</div>
```

### Size Modifiers
```
air-text-field-sm   calc(10 * var(--spacing))
air-text-field-md   calc(14 * var(--spacing)) — default
air-text-field-lg   calc(16 * var(--spacing))
```

Apply to the **wrapper**, not the input:
```html
<div class="air-text-field air-text-field-sm">...</div>
```

---

## Select

Extends `air-text-field-input` / `air-text-field-input-filled`. The wrapper adds a CSS mask-image chevron arrow automatically via `:has(.air-select-input)`.

```html
<div class="air-text-field">
  <label class="air-text-field-label" for="country">Country</label>
  <select id="country" class="air-select-input">
    <option>United States</option>
    <option>Germany</option>
  </select>
</div>

<!-- Filled variant -->
<div class="air-text-field">
  <label class="air-text-field-label" for="size">Size</label>
  <select id="size" class="air-select-input-filled">
    <option>Small</option>
    <option>Large</option>
  </select>
</div>
```

---

## Textarea

```html
<div class="air-text-field">
  <label class="air-text-field-label" for="bio">Bio</label>
  <textarea id="bio" class="air-textarea-input" placeholder=" "></textarea>
</div>

<!-- Filled -->
<div class="air-text-field">
  <label class="air-text-field-label" for="notes">Notes</label>
  <textarea id="notes" class="air-textarea-input-filled" placeholder=" "></textarea>
</div>
```

Minimum height is `2 * var(--air-text-field-height)`. Supports `resize: vertical`.

---

## Checkbox

The checkbox has two patterns: **headless** (apply classes manually for full control) or **native input** (using `air-checkbox-input` which handles all states via CSS `:checked` / `:indeterminate`).

### Native Input (recommended)

```html
<label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
  <input type="checkbox" class="air-checkbox-input" />
  Accept terms
</label>

<!-- Pre-checked -->
<input type="checkbox" class="air-checkbox-input" checked />

<!-- Indeterminate (set via JS: el.indeterminate = true) -->
<input type="checkbox" class="air-checkbox-input" />

<!-- Disabled -->
<input type="checkbox" class="air-checkbox-input" disabled />
```

The `air-checkbox-input` class:
- Applies a 48×48px touch-target state layer via `::before`
- Renders the checkmark/indeterminate dash via `::after` + mask-image SVG
- Handles all states (checked, indeterminate, disabled) natively via CSS

### Headless (manual control via ARIA)

```html
<div class="air-checkbox-container" role="checkbox" aria-checked="false" tabindex="0">
  <div class="air-checkbox">
    <!-- SVG checkmark if aria-checked="true" -->
    <svg class="air-checkbox-icon air-checkbox-checked-icon">...</svg>
  </div>
</div>
```

Apply `air-checkbox-checked` to `.air-checkbox` when `aria-checked="true"`.
Apply `air-checkbox-disabled` when `aria-disabled="true"`.

---

## Radio

```html
<fieldset>
  <legend>Shipping speed</legend>

  <button class="air-radio" role="radio" aria-checked="true" type="button">
    <div class="air-radio-visual">
      <div class="air-radio-visual-dot air-radio-checked-dot"></div>
    </div>
    Standard
  </button>

  <button class="air-radio" role="radio" aria-checked="false" type="button">
    <div class="air-radio-visual">
      <div class="air-radio-visual-dot"></div>
    </div>
    Express
  </button>
</fieldset>
```

The `.air-radio` utility provides the 48×48px touch target and hover/focus ring. 
Apply `air-radio-checked` to `.air-radio-visual` and `air-radio-checked-dot` to the dot when selected.
Apply `air-radio-disabled` to `.air-radio-visual` and `air-radio-disabled-dot` to the dot when disabled.

---

## Switch

The Switch uses an ARIA button pattern. The `air-switch-thumb` utility is context-driven: it reads from the `.air-switch` ancestor state.

```html
<!-- Off -->
<button class="air-switch" role="switch" aria-checked="false">
  <div class="air-switch-thumb"></div>
</button>

<!-- On -->
<button class="air-switch" role="switch" aria-checked="true">
  <div class="air-switch-thumb"></div>
</button>

<!-- Disabled -->
<button class="air-switch" role="switch" aria-checked="false" aria-disabled="true" disabled>
  <div class="air-switch-thumb"></div>
</button>
```

State-driven classes applied by `air-switch-thumb` automatically:
- `aria-checked="false"` → small handle left (16px)
- `aria-checked="true"` → large handle right (24px, `--color-on-primary`)
- Hover + focus ripple via `box-shadow`

Optional icon inside the thumb (shows on checked):
```html
<div class="air-switch-thumb">
  <svg class="air-switch-icon air-switch-icon-checked">...</svg>
</div>
```

---

## Slider

Two approaches: **native `<input type="range">`** (simplest) or **custom div-based** (for range sliders, custom tooltips).

### Native (recommended)

```html
<input type="range" class="air-slider-primary" min="0" max="100" value="40" />
```

`air-slider-primary` = `air-slider` + `air-slider-native-primary-surface`. Styling covers WebKit and Firefox.

### Custom Div-Based

```html
<div class="air-slider-base" role="slider" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" tabindex="0">
  <div class="air-slider-track-base air-slider-track-secondary">
    <div class="air-slider-track-active-base air-slider-track-active-primary" style="width: 40%;"></div>
  </div>
  <div class="air-slider-handle-base air-slider-handle-primary" style="left: 40%;">
    <!-- optional hover state managed via JS: add air-slider-handle-hover class -->
  </div>
</div>
```

---

## Search Bar

A search field styled as a full-width rounded container:

```html
<div class="air-search-bar">
  <span class="air-icon">search</span>
  <input class="air-search-bar-input" type="search" placeholder="Search..." />
  <button class="air-icon-button">
    <span class="air-icon">mic</span>
  </button>
</div>
```

The container gains a stronger background on `:focus-within` via `:has(.air-search-bar-input:focus)`.
