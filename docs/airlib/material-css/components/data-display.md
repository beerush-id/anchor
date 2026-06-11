---
title: 'Data Display'
description: 'Components for organizing and presenting data.'
---

# Data Display

Organize your information cleanly with lists, tables, cards, and metadata indicators. AIR Material CSS provides pure CSS implementations of these complex structures.

## Lists

Lists are continuous, vertical indexes of text or images.

```html [HTML]
<ul class="list-view list-view-filled">
  <li class="list-view-item list-view-item-filled">
    <div class="list-view-item-content">
      <span>Brunch this weekend?</span>
      <span class="list-view-item-supporting-text">Ali Connors — I'll be in your neighborhood doing errands this...</span>
    </div>
  </li>
  
  <li class="list-view-item list-view-item-filled" aria-selected="true">
    <div class="list-view-item-content">
      <span>Summer BBQ</span>
      <span class="list-view-item-supporting-text">to Alex, Scott, Jennifer — Wish I could come, but I'm out of town this...</span>
    </div>
  </li>
</ul>
```

The `list-view-filled` container automatically manages the segmented spacing between items using CSS gaps. The items themselves respect the outer container's border radius, applying proper curved corners to the first and last elements natively. Setting `aria-selected="true"` instantly applies the active state styling and hover logic.

## Tables

Tables allow users to view and compare structured data across rows and columns.

```html [HTML]
<table class="table-view">
  <thead>
    <tr>
      <th class="table-header-cell">Name</th>
      <th class="table-header-cell">Status</th>
      <th class="table-header-cell">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr class="table-row-filled">
      <td class="table-cell">Jane Doe</td>
      <td class="table-cell">Active</td>
      <td class="table-cell">Admin</td>
    </tr>
    <tr class="table-row-filled" aria-selected="true">
      <td class="table-cell">John Smith</td>
      <td class="table-cell">Inactive</td>
      <td class="table-cell">User</td>
    </tr>
  </tbody>
</table>
```

The table utilities leverage native HTML `table` elements. Instead of using border-collapse, the table uses `border-spacing` to create a visually segmented design where each row acts as a distinct interactive block. The CSS automatically targets the first and last cells in each row to calculate the correct inner and outer border radiuses.

## Cards

Cards are surfaces that display content and actions on a single topic.

```html [HTML]
<div class="card-group">
  <div class="card-filled card-interactive">
    <div class="card-header">
      <h3 class="card-title">Glass Souls' World Tour</h3>
      <p class="card-subtitle">From your recent favorites</p>
    </div>
    <div class="card-body">
      <p>The band is hitting the road again, bringing their signature sound to cities across the globe.</p>
    </div>
    <div class="card-actions">
      <button class="button-text">Dismiss</button>
      <button class="button">Buy Tickets</button>
    </div>
  </div>
</div>
```

The `card-header`, `card-body`, and `card-actions` classes automatically manage padding and margin adjustments. For instance, `card-body` removes its top padding if it immediately follows a `card-header`. The `card-group` wrapper ensures multiple stacked cards share connected inner border radiuses.

## Badges

Badges are used to indicate notifications or status events.

```html [HTML]
<div class="badge-container">
  <button class="icon-button">
    <span class="icon">notifications</span>
  </button>
  <span class="badge">3</span>
</div>

<div class="badge-container">
  <button class="icon-button">
    <span class="icon">mail</span>
  </button>
  <span class="badge-dot"></span>
</div>
```

Applying the `badge-container` utility sets up the correct relative positioning context. The `badge` and `badge-dot` classes then apply absolute positioning, transforming `(30%, -30%)` upwards and outwards to overlap perfectly on the top-right corner of their sibling element.

## Chips

Chips help people enter information, make selections, filter content, or trigger actions.

```html [HTML]
<div class="flex flex-wrap gap-2">
  <button class="chip">
    <span class="icon">check</span>
    Assist Chip
  </button>
  
  <button class="chip" aria-selected="true">
    Filter Chip
  </button>
  
  <button class="chip-elevated">
    Input Chip
    <span class="icon">close</span>
  </button>
</div>
```

The chip uses CSS `:has()` pseudo-class selectors to smartly detect if an icon (`svg`, `span.icon`, `img`) is placed before or after the text. It automatically calculates and applies the correct internal spacing offset based on the Material Design 3 spec, without requiring separate layout classes.

## Menus

Menus display a list of choices on a temporary surface.

```html [HTML]
<div class="relative">
  <button class="button">Open Menu</button>
  
  <ul class="menu" data-state="open">
    <li class="menu-item">Copy</li>
    <li class="menu-item">Paste</li>
    <hr class="divider" />
    <li class="menu-item menu-item-disabled">Delete</li>
  </ul>
</div>
```

The `menu` class acts as the floating popover surface (`z-popover`). Applying `data-state="open"` scales and fades the menu in from its top-left origin seamlessly. The inner `menu-item` classes provide the necessary padding, hover states, and typography.

## Dividers

Dividers are thin lines that group content in lists and layouts.

```html [HTML]
<!-- Full width horizontal divider -->
<hr class="divider" />

<!-- Inset divider (leaves 16px padding on left) -->
<hr class="divider-inset" />

<div class="flex h-10">
  <span>Option A</span>
  <!-- Vertical divider -->
  <div class="divider-vertical mx-4"></div>
  <span>Option B</span>
</div>
```

By default, the `divider` uses the `outline-variant` color token. The `divider-inset` class is especially useful within lists where you want the line to align with text that has an icon beside it, skipping the leading padding.
