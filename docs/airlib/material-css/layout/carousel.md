---
title: 'Carousel'
description: 'Material Design carousel layout for horizontally scrolling through a collection of items.'
---

# Carousel
Carousels display a collection of items that can be scrolled horizontally. They are ideal for image galleries, product cards, or horizontally segmented content.

## Theme Variables
You can customize the border radius of the carousel items by overriding its CSS variable.

```css [CSS]
:root {
  --air-carousel-radius: var(--radius-xl); /* 28px default for M3 */
}
```

## Composed Utilities
The carousel utilities rely on CSS Scroll Snap to create a smooth, native swiping experience without the need for complex JavaScript event listeners.

```html [HTML]
<!-- The Carousel Container -->
<div class="carousel">
  <!-- Carousel Items -->
  <div class="carousel-item">
    <img src="/image-1.jpg" alt="Item 1" class="w-64 h-64 object-cover" />
  </div>
  
  <div class="carousel-item">
    <img src="/image-2.jpg" alt="Item 2" class="w-64 h-64 object-cover" />
  </div>
  
  <div class="carousel-item">
    <img src="/image-3.jpg" alt="Item 3" class="w-64 h-64 object-cover" />
  </div>
</div>
```

- `carousel`: Applied to the outer wrapper. It establishes a horizontal flex layout with a standard 8px gap. It sets `overflow-x: auto`, hides the native browser scrollbars, and enforces `scroll-snap-type: x mandatory` to ensure scrolling always rests perfectly on an item.
- `carousel-item`: Applied to the direct children of the carousel. It prevents the items from shrinking (`flex-shrink: 0`), applies the standard `--air-carousel-radius`, clips overflowing content (`overflow: hidden`), and sets `scroll-snap-align: center` so that the items snap to the center of the viewport when scrolling stops.
