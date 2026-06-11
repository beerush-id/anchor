---
title: 'Card'
description: 'Material Design cards contain content and actions about a single subject.'
---

# Card
Material Design cards contain content and actions about a single subject. They come in three variants: elevated (default), filled, and outlined.

## Theme Variables
You can customize the card's dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --air-card-radius: var(--radius-xl); /* 28px standard container radius */
  --air-card-padding: calc(var(--spacing) * 6); /* 24px standard padding */
}
```
These variables define the border radius and standard padding for the card container and its content areas.

## Composed Utilities
The following composed utilities provide ready-to-use card styles. If you want a card to be interactive (hover and focus states), append the `card-interactive` utility.

```html [HTML]
<!-- Elevated Card (Default) -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Elevated Card</h3>
    <p class="card-subtitle">Default variant</p>
  </div>
  <div class="card-body">
    Card content goes here.
  </div>
  <div class="card-actions">
    <button class="button-text">Action</button>
  </div>
</div>

<!-- Filled Interactive Card -->
<div class="card-filled card-interactive" tabindex="0">
  <div class="card-body">Filled interactive card</div>
</div>

<!-- Outlined Interactive Card -->
<div class="card-outlined card-interactive" tabindex="0">
  <div class="card-body">Outlined interactive card</div>
</div>
```

- `card`: Default elevated card. Applies `card-base` and `card-elevated-surface`.
- `card-filled`: Filled card. Applies `card-base` and `card-filled-surface`.
- `card-outlined`: Outlined card. Applies `card-base` and `card-outlined-surface`.
- `card-interactive`: Optional modifier. Adds `cursor-pointer`, `focus-ring`, and enables the `hover` and `focus-visible` background color transitions on the composed card utilities.

## Content Structure
Use these utilities to lay out the content inside a card.

- `card-header`: Flex column container with padding. Sets up spacing for titles.
- `card-title`: Applies `text-title-medium` typography and standard text color.
- `card-subtitle`: Applies `text-body-medium` typography and variant text color.
- `card-body`: Flex-grow container with standard padding. Automatically removes top padding if it directly follows a `.card-header`.
- `card-actions`: Flex container aligned to the right, used for action buttons.

## Segmented Card Group
Use the `card-group` utility to stack multiple cards or elements together seamlessly.

```html [HTML]
<div class="card-group">
  <div class="card-filled">Top Segment</div>
  <div class="card-filled">Middle Segment</div>
  <div class="card-filled">Bottom Segment</div>
</div>
```

- `card-group`: Flex column container that applies an outer radius to the first and last children, and an inner radius (small) to siblings, separated by a 2px gap.

## Composing Utilities
If you need custom state management, you can use the granular state utilities.

```html [HTML]
<div class="card-base card-elevated-surface hover:card-elevated-hover">
  Custom State Card
</div>
```

- `card-base`: Sets up flex column layout, hidden overflow, rounded corners, and default body typography with transitions.

### State Utilities
- `card-elevated-surface`, `card-elevated-hover`, `card-elevated-focus`: Colors for the elevated variant.
- `card-filled-surface`, `card-filled-hover`, `card-filled-focus`: Colors for the filled variant.
- `card-outlined-surface`, `card-outlined-hover`, `card-outlined-focus`: Colors and 1px border for the outlined variant.
