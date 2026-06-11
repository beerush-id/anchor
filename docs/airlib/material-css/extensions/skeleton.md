---
title: 'Skeleton'
description: 'Material Design skeleton loaders for indicating data loading states.'
---

# Skeleton
Skeleton loaders provide a visual placeholder while content is loading. They improve perceived performance by showing the structure of the upcoming data before it renders.

## Composed Utilities
The skeleton utilities replace text, borders, and images with an animated, shimmering gradient based on your current theme's surface colors.

### Single Element Skeleton
You can apply the skeleton effect directly to any individual element.

```html [HTML]
<!-- Will render as a shimmering block matching the text's natural dimensions -->
<h2 class="title-large skeleton">Loading Title...</h2>

<!-- Works on layout elements too -->
<div class="card skeleton w-64 h-32"></div>
```

- `skeleton`: Applied to any element to convert it into a placeholder. It makes the text transparent, removes borders and shadows, sets `pointer-events: none`, and applies an infinitely repeating `shimmer-loading` gradient animation using `surface-container` and `surface-container-highest` colors. It automatically sets the opacity of child images and Material icons to `0`.

### Skeleton Group (Universal Loader)
Instead of applying the `skeleton` class to every individual element manually, you can apply `skeleton-group` to a parent container to instantly skeletonize its common structural children.

```html [HTML]
<!-- Real markup that turns into a skeleton block while loading is true -->
<div class="card p-4 skeleton-group">
  <div class="flex items-center gap-4">
    <img src="/avatar.jpg" class="w-12 h-12 rounded-full" />
    <div>
      <h3 class="title-medium">John Doe</h3>
      <p class="body-medium">Software Engineer</p>
    </div>
  </div>
  <button class="button-filled mt-4">Connect</button>
</div>
```

- `skeleton-group`: Applied to a parent wrapper. It disables pointer events and text selection for the entire group, and automatically applies the core `skeleton` utility to standard child elements like `p`, `h1` through `h6`, `li`, `a`, `button`, `img`, `.chip`, `.badge`, `.icon-button`, and `.fab`. It is smart enough to avoid applying the skeleton redundantly to `span` elements nested inside text blocks.
