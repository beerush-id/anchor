---
title: 'Pickers'
description: 'Components for selecting dates, times, and colors.'
---

# Pickers

Pickers provide a simple way to select a single value from a pre-determined set.

## Date Pickers

Date pickers let users navigate calendars and select dates.

```html [HTML]
<div class="date-picker">
  <div class="date-picker-header">
    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
  </div>
  <div class="date-picker-grid">
    <button class="date-picker-cell" disabled>30</button>
    <button class="date-picker-cell">1</button>
    <button class="date-picker-cell" aria-current="date">2</button>
    <button class="date-picker-cell" aria-selected="true">3</button>
    <button class="date-picker-cell">4</button>
  </div>
</div>
```

The `date-picker-grid` utilizes CSS Grid to perfectly align the 7 columns of the calendar. Individual `date-picker-cell` elements represent the selectable days. Applying `aria-current="date"` styles the cell as the current 'today' date with a primary-colored border, while `aria-selected="true"` fully fills the cell to indicate the active selection.

## Time Pickers

Time pickers allow users to input a specific time value.

```html [HTML]
<div class="time-picker">
  <div class="time-picker-display">
    <button class="time-picker-unit" aria-selected="true">10</button>
    <span class="time-picker-separator">:</span>
    <button class="time-picker-unit">30</button>
  </div>
</div>
```

The time picker layout isolates the hour and minute blocks into large, touch-friendly `time-picker-unit` buttons using the `Display Large` typography style. Like the date picker, `aria-selected="true"` shifts the unit into the active primary-container color scheme.

## Color Pickers

Color pickers allow users to select a custom color, usually launching a native system picker.

```html [HTML]
<input type="color" class="color-picker" value="#006c4b" />
```

Applying the `color-picker` class to a native HTML `<input type="color">` overrides the default, often-ugly browser implementations across WebKit and Mozilla browsers (`::-webkit-color-swatch-wrapper`, `::-moz-color-swatch`). It removes borders and applies a standard Material border radius and focus ring natively.
