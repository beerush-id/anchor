---
title: 'Inputs'
description: 'Data entry components like text fields, checkboxes, and switches.'
---

# Inputs

Inputs allow users to enter text, select options, and toggle settings. AIR Material CSS provides a comprehensive set of input controls that support Material Design 3's advanced floating label animations natively in CSS.

## Text Fields

Text fields let users enter and edit text. They come in two primary variants: outlined and filled.

```html [HTML]
<div class="flex flex-col gap-4">
  <div class="text-field">
    <input type="text" id="username" class="text-field-input" placeholder=" " />
    <label for="username" class="text-field-label">Username</label>
  </div>

  <div class="text-field">
    <input type="text" id="email" class="text-field-input-filled" placeholder=" " />
    <label for="email" class="text-field-label">Email Address</label>
  </div>
</div>
```

The floating label animation is powered purely by CSS `has()` selectors. By placing a blank space in the `placeholder=" "` attribute, the CSS can detect when the user has typed something using `:not(:placeholder-shown)` and automatically keep the label elevated.

## Select Menus

Select menus allow users to choose one option from a list. They share the same base structure as text fields.

```html [HTML]
<div class="text-field">
  <select id="country" class="select-input">
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </select>
  <label for="country" class="text-field-label">Country</label>
</div>
```

The `select-input` automatically injects a custom dropdown arrow icon using a CSS mask, hiding the browser's default ugly select arrow while maintaining native select functionality.

## Textareas

Textareas are used for multi-line text input.

```html [HTML]
<div class="text-field">
  <textarea id="bio" class="textarea-input" placeholder=" "></textarea>
  <label for="bio" class="text-field-label">Biography</label>
</div>
```

The `textarea-input` automatically adjusts its minimum height and padding to ensure the floating label doesn't overlap the typed text.

## Checkboxes

Checkboxes allow users to select one or more items from a set, or turn an option on or off.

```html [HTML]
<div class="flex items-center gap-4">
  <input type="checkbox" class="checkbox-input" id="check1" />
  <label for="check1">Unchecked</label>
</div>

<div class="flex items-center gap-4">
  <input type="checkbox" class="checkbox-input" id="check2" checked />
  <label for="check2">Checked</label>
</div>

<div class="flex items-center gap-4">
  <input type="checkbox" class="checkbox-input" id="check3" disabled />
  <label for="check3">Disabled</label>
</div>
```

The checkbox relies on native HTML `input type="checkbox"`. The custom styling perfectly maps the checkmark SVG directly using `mask-image` on an `::after` pseudo-element, changing colors through `currentColor`. An invisible `::before` pseudo-element ensures the click target remains at least 48x48px for accessibility.

## Radio Buttons

Radio buttons allow users to select one option from a set.

```html [HTML]
<div class="flex flex-col gap-2">
  <button class="radio" aria-checked="true" role="radio">
    <div class="radio-visual radio-checked">
      <div class="radio-visual-dot radio-checked-dot"></div>
    </div>
  </button>
  
  <button class="radio" aria-checked="false" role="radio">
    <div class="radio-visual">
      <div class="radio-visual-dot"></div>
    </div>
  </button>
</div>
```

The radio button uses nested elements to handle the complex state animations. Toggling `aria-checked="true"` scales the inner `radio-visual-dot` from `0` to `1` and transitions the outer border color. The outer `radio` container manages hover and focus states, guaranteeing a 48px touch target.

## Switches

Switches toggle the state of a single setting on or off.

```html [HTML]
<div class="flex items-center gap-4">
  <button class="switch" role="switch" aria-checked="true">
    <div class="switch-thumb"></div>
  </button>
  <span>Wi-Fi</span>
</div>

<div class="flex items-center gap-4">
  <button class="switch" role="switch" aria-checked="false">
    <div class="switch-thumb"></div>
  </button>
  <span>Bluetooth</span>
</div>
```

When `aria-checked="true"` is applied to the main `switch` element, the CSS perfectly handles the width expansion, translation, and color shift of the inner `switch-thumb` without any custom JavaScript offset calculations.

## Sliders

Sliders allow users to make selections from a range of values.

```html [HTML]
<div class="flex flex-col gap-4">
  <input type="range" class="slider-primary" min="0" max="100" value="50" />
</div>
```

By applying the `slider-primary` class to a native HTML `<input type="range">`, AIR Material CSS automatically targets the complex vendor-specific pseudo-elements (`::-webkit-slider-thumb`, `::-moz-range-thumb`, etc.) to generate the pill-shaped handle, background tracks, and interactive focus halos natively.

## Search Bars

Search bars allow users to enter a keyword or phrase to get relevant information.

```html [HTML]
<div class="search-bar">
  <button class="icon-button">
    <span class="icon">menu</span>
  </button>
  <input type="text" class="search-bar-input" placeholder="Search your files" />
  <button class="icon-button">
    <span class="icon">mic</span>
  </button>
</div>
```

The `search-bar` container automatically tracks the focus state of the inner `search-bar-input` using CSS `:has(.search-bar-input:focus)` to apply an elevated background color when the user is typing.
