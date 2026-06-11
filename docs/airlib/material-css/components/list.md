---
title: 'List'
description: 'Material Design lists are continuous, vertical indexes of text or images.'
---

# List
Lists are continuous, vertical indexes of text and images. They are typically used to present interactive collections of data, menus, or options.

## Theme Variables
You can customize the list item dimensions by overriding its CSS variables.

```css [CSS]
:root {
  --list-item-min-height: calc(var(--spacing) * 14); /* 56px */
}
```
This variable defines the baseline minimum height for all list items, ensuring accessible touch targets.

## Composed Utilities
Use the following utilities to quickly build standard interactive list structures.

```html [HTML]
<!-- Standard List Container -->
<ul class="list-view">
  
  <!-- Standard List Item -->
  <li class="list-view-item">
    <span class="material-symbols-outlined">inbox</span>
    <div class="list-view-item-content">
      <span>Inbox</span>
      <span class="list-view-item-supporting-text">You have new messages</span>
    </div>
  </li>

  <!-- Selected List Item -->
  <li class="list-view-item" aria-selected="true">
    <span class="material-symbols-outlined">drafts</span>
    <div class="list-view-item-content">
      <span>Drafts</span>
    </div>
  </li>
  
</ul>
```

- `list-view`: Sets up the main container as a vertical flexbox, removing native list styling (`list-style: none`, `m-0`, `p-0`), establishing a gap between items, and setting a bounding radius (`xl`).
- `list-view-filled`: A variant for the container that applies a `surface-container-low` background.
- `list-view-item`: The core composed utility for interactive list rows. Applies `list-view-item-base`, `cursor-pointer`, default hover/focus states, and automatically handles the `[aria-selected='true']` state with `secondary-container` coloring.
- `list-view-item-filled`: A stylistic variant for list items that applies a `surface-container` background and inner segmentation border radii, including its own distinct hover, focus, and selected states.

## Layout Structure
Use these internal utilities to structure complex text inside a list item.

- `list-view-item-content`: A flexbox container designed to wrap text. It automatically applies `flex-col`, `justify-center`, `items-start`, and takes up the remaining available space (`flex-1`).
- `list-view-item-supporting-text`: Secondary text styling (`body-medium` typography, `on-surface-variant` color) for subtitles or descriptions placed inside `list-view-item-content`.

## Composing Utilities
For customized list rows, you can compose them using the granular layer utilities.

```html [HTML]
<li class="list-view-item-base list-view-item-surface hover:list-view-item-hover">
  Custom Item
</li>
```

- `list-view-item-base`: Establishes the layout (`flex items-center`), height, padding, gap spacing, corner radius inheritance (`first-child` / `last-child`), focus rings, and transitions.

### State Utilities
- `list-view-item-surface`, `list-view-item-hover`, `list-view-item-focus`: Default background and text colors for unselected interactions.
- `list-view-item-selected-surface`, `list-view-item-selected-focus`: Background and text colors for the selected state.
