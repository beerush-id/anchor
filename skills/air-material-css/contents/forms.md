# Forms & Inputs

---

## Text Field

The Text Field is a wrapper (`text-field`) containing a label and an input. The floating label behavior is pure CSS — no JS needed.

### Component Variables
```
--air-text-field-height        default: 56px (14 × --spacing)
--air-text-field-radius        default: --radius-md (12px)
--air-text-field-padding-x     default: 16px
--air-text-field-font-size     default: --font-body-large-size
```

### Outlined Variant (default)

```html
<div class="text-field bg-surface">
  <label class="text-field-label" for="name">Full Name</label>
  <input id="name" class="text-field-input" type="text" placeholder=" " />
</div>
```

> `placeholder=" "` (a single space) is required for the floating label to detect when the input is empty vs filled. The placeholder text is intentionally invisible at rest; it appears on focus via CSS.

### Filled Variant

```html
<div class="text-field bg-surface-container-highest">
  <label class="text-field-label" for="email">Email</label>
  <input id="email" class="text-field-input-filled" type="email" placeholder=" " />
</div>
```

### With Leading / Trailing Icons

Place an icon element **before** the input (leading) or **after** (trailing). The wrapper detects it via `:has()` and auto-adjusts padding:

```html
<div class="text-field">
  <span class="material-symbols-outlined">search</span>
  <label class="text-field-label" for="q">Search</label>
  <input id="q" class="text-field-input" type="text" placeholder=" " />
</div>

<div class="text-field">
  <label class="text-field-label" for="pwd">Password</label>
  <input id="pwd" class="text-field-input" type="password" placeholder=" " />
  <button class="icon-button">
    <span class="material-symbols-outlined">visibility</span>
  </button>
</div>
```

### Supporting Text & Error

```html
<div class="text-field">
  <label class="text-field-label" for="user">Username</label>
  <input id="user" class="text-field-input" type="text" placeholder=" " />
  <span class="text-field-supporting-text">Max 32 characters</span>
</div>

<!-- Error state: swap input border + supporting text color -->
<div class="text-field">
  <label class="text-field-label text-field-label-error" for="user-err">Username</label>
  <input id="user-err" class="text-field-input text-field-input-error" type="text" placeholder=" " />
  <span class="text-field-error">Username already taken</span>
</div>
```

### Size Modifiers
```
text-field-sm   h-10 (40px)
text-field-md   h-14 (56px) — default
text-field-lg   h-16 (64px)
```

Apply to the **wrapper**, not the input:
```html
<div class="text-field text-field-sm">...</div>
```

---

## Select

Extends `text-field-input` / `text-field-input-filled`. The wrapper adds a CSS mask-image chevron arrow automatically via `:has(.select-input)`.

```html
<div class="text-field">
  <label class="text-field-label" for="country">Country</label>
  <select id="country" class="select-input">
    <option>United States</option>
    <option>Germany</option>
  </select>
</div>

<!-- Filled variant -->
<div class="text-field">
  <label class="text-field-label" for="size">Size</label>
  <select id="size" class="select-input-filled">
    <option>Small</option>
    <option>Large</option>
  </select>
</div>
```

---

## Textarea

```html
<div class="text-field">
  <label class="text-field-label" for="bio">Bio</label>
  <textarea id="bio" class="textarea-input" placeholder=" "></textarea>
</div>

<!-- Filled -->
<div class="text-field">
  <label class="text-field-label" for="notes">Notes</label>
  <textarea id="notes" class="textarea-input-filled" placeholder=" "></textarea>
</div>
```

Minimum height is `2 × --air-text-field-height`. Supports `resize: vertical`.

---

## Checkbox

The checkbox has two patterns: **headless** (apply classes manually for full control) or **native input** (using `checkbox-input` which handles all states via CSS `:checked` / `:indeterminate`).

### Native Input (recommended)

```html
<label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
  <input type="checkbox" class="checkbox-input" />
  Accept terms
</label>

<!-- Pre-checked -->
<input type="checkbox" class="checkbox-input" checked />

<!-- Indeterminate (set via JS: el.indeterminate = true) -->
<input type="checkbox" class="checkbox-input" />

<!-- Disabled -->
<input type="checkbox" class="checkbox-input" disabled />
```

The `checkbox-input` class:
- Applies a 48×48px touch-target state layer via `::before`
- Renders the checkmark/indeterminate dash via `::after` + mask-image SVG
- Handles all states (checked, indeterminate, disabled) natively via CSS

### Headless (manual control via ARIA)

```html
<div class="checkbox-container" role="checkbox" aria-checked="false" tabindex="0">
  <div class="checkbox">
    <!-- SVG checkmark if aria-checked="true" -->
    <svg class="checkbox-icon checkbox-checked-icon">...</svg>
  </div>
</div>
```

Apply `checkbox-checked` to `.checkbox` when `aria-checked="true"`.
Apply `checkbox-disabled` when `aria-disabled="true"`.

---

## Radio

```html
<fieldset>
  <legend>Shipping speed</legend>

  <button class="radio" role="radio" aria-checked="true" type="button">
    <div class="radio-visual">
      <div class="radio-visual-dot radio-checked-dot"></div>
    </div>
    Standard
  </button>

  <button class="radio" role="radio" aria-checked="false" type="button">
    <div class="radio-visual">
      <div class="radio-visual-dot"></div>
    </div>
    Express
  </button>
</fieldset>
```

The `.radio` utility provides the 48×48px touch target and hover/focus ring. 
Apply `radio-checked` to `.radio-visual` and `radio-checked-dot` to the dot when selected.
Apply `radio-disabled` to `.radio-visual` and `radio-disabled-dot` to the dot when disabled.

---

## Switch

The Switch uses an ARIA button pattern. The `switch-thumb` utility is context-driven: it reads from the `.switch` ancestor state.

```html
<!-- Off -->
<button class="switch" role="switch" aria-checked="false">
  <div class="switch-thumb"></div>
</button>

<!-- On -->
<button class="switch" role="switch" aria-checked="true">
  <div class="switch-thumb"></div>
</button>

<!-- Disabled -->
<button class="switch" role="switch" aria-checked="false" aria-disabled="true" disabled>
  <div class="switch-thumb"></div>
</button>
```

State-driven classes applied by `switch-thumb` automatically:
- `aria-checked="false"` → small handle left (16px)
- `aria-checked="true"` → large handle right (24px, `--color-on-primary`)
- Hover + focus ripple via `box-shadow`

Optional icon inside the thumb (shows on checked):
```html
<div class="switch-thumb">
  <svg class="switch-icon switch-icon-checked">...</svg>
</div>
```

---

## Slider

Two approaches: **native `<input type="range">`** (simplest) or **custom div-based** (for range sliders, custom tooltips).

### Native (recommended)

```html
<input type="range" class="slider-primary" min="0" max="100" value="40" />
```

`slider-primary` = `slider` + `slider-native-primary-surface`. Styling covers WebKit and Firefox.

### Custom Div-Based

```html
<div class="slider-base" role="slider" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" tabindex="0">
  <div class="slider-track-base slider-track-secondary">
    <div class="slider-track-active-base slider-track-active-primary" style="width: 40%;"></div>
  </div>
  <div class="slider-handle-base slider-handle-primary" style="left: 40%;">
    <!-- optional hover state managed via JS: add slider-handle-hover class -->
  </div>
</div>
```

---

## Search Bar

A search field styled as a full-width rounded container:

```html
<div class="search-bar">
  <span class="material-symbols-outlined">search</span>
  <input class="search-bar-input" type="search" placeholder="Search..." />
  <button class="icon-button">
    <span class="material-symbols-outlined">mic</span>
  </button>
</div>
```

The container gains a stronger background on `:focus-within` via `:has(.search-bar-input:focus)`.
