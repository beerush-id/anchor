---
title: 'Date Picker'
description: 'Material Design date picker component for selecting dates from a calendar.'
---

# Date Picker
The date picker provides the visual foundation for building calendar interfaces. It includes styles for the main container, the calendar grid, headers, and individual date cells with their respective interaction states.

## Theme Variables
You can customize the date picker dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --date-picker-radius: var(--radius-xl);
  --date-picker-cell-size: calc(var(--spacing) * 12); /* 48px */
}
```
These variables define the outer border radius of the calendar container and the fixed dimensions of individual date cells.

## Composed Utilities
The composed utilities provide out-of-the-box styling for the calendar and its cells, automatically managing hover, selection, and today states via ARIA attributes.

```html [HTML]
<div class="date-picker">
  <div class="date-picker-header">
    <button class="button-icon">chevron_left</button>
    <span>October 2026</span>
    <button class="button-icon">chevron_right</button>
  </div>
  
  <div class="date-picker-grid">
    <!-- Date Cells -->
    <button class="date-picker-cell">1</button>
    <button class="date-picker-cell" aria-current="date">2</button> <!-- Today -->
    <button class="date-picker-cell" aria-selected="true">3</button> <!-- Selected -->
    <button class="date-picker-cell" disabled>4</button> <!-- Disabled -->
  </div>
</div>
```

- `date-picker`: Applies `date-picker-surface`, setting up the background, padding, and corner radius for the main container.
- `date-picker-cell`: The primary utility for interactive date buttons. It builds upon `date-picker-cell-base` and automatically handles interactions based on attributes:
  - Default hover states.
  - Active/selected state when `[aria-selected='true']`.
  - Today's date indicator (primary colored border/text) when `[aria-current='date']`.
  - Disabled state when `disabled` or `[aria-disabled='true']`.

## Layout & Structure
Use these utilities to structure the calendar's internal layout.

- `date-picker-surface`: The base container styling (`surface-container-high` background, `inline-block`, rounded corners, and padding).
- `date-picker-grid`: A 7-column CSS grid with standardized gap spacing for calendar days.
- `date-picker-header`: A flex container with `space-between` alignment and appropriate margins for the calendar header (month/year and navigation controls).

## Composing Utilities
For custom date cells, you can compose them using the base and state layers.

```html [HTML]
<button class="date-picker-cell-base date-picker-cell-surface hover:date-picker-cell-hover">
  15
</button>
```

- `date-picker-cell-base`: Sets up the fixed 48x48 pixel size, full border radius, flex centering, transparent base borders (to reserve space), and transitions.

### State Utilities
- `date-picker-cell-surface`, `date-picker-cell-hover`: Default unselected state colors.
- `date-picker-cell-selected-surface`, `date-picker-cell-selected-hover`: Primary colors for a selected date.
- `date-picker-cell-today-surface`: Applies a primary-colored border and text to indicate the current date.
- `date-picker-cell-disabled`: Alters color to a lower opacity mix, applies `not-allowed` cursor, and disables pointer events.
