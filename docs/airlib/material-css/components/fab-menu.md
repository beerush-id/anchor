---
title: 'FAB Menu'
description: 'Material Design floating action button menu for expanding multiple related actions.'
---

# FAB Menu
A FAB Menu (also known as a Speed Dial) expands a primary Floating Action Button to reveal a list of related, smaller secondary actions.

## Composed Utilities
The following utilities structure the menu, animate the trigger, and handle the staggered entrance of the secondary items based on a `data-state` attribute.

```html [HTML]
<!-- JavaScript is required to toggle data-state between 'open' and 'closed' -->
<div class="fab-menu" data-state="closed">
  <!-- The main trigger FAB -->
  <button class="fab fab-menu-trigger">
    <span class="material-symbols-outlined">add</span>
  </button>
  
  <!-- The expanding list of secondary FABs -->
  <div class="fab-menu-list">
    <button class="fab-sm fab-secondary fab-menu-item">
      <span class="material-symbols-outlined">edit</span>
    </button>
    <button class="fab-sm fab-secondary fab-menu-item">
      <span class="material-symbols-outlined">photo_camera</span>
    </button>
  </div>
</div>
```

- `fab-menu`: The main relative wrapper. Uses `inline-flex flex-col-reverse items-center` to stack the menu above the trigger button.
- `fab-menu-trigger`: Applied to the main FAB. It elevates the `z-index` and binds a `45deg` rotation animation to its icon child (`span`, `svg`, `i`) when it has `data-state="open"`. It returns to `0deg` when `closed`.
- `fab-menu-list`: An absolute container placed directly above the trigger (`bottom-full`). It automatically centers the items horizontally and applies spacing gaps.
- `fab-menu-item`: Applied to the secondary mini FABs inside the list. It starts with `opacity: 0` and a scaled-down transform (`scale(0.6) translateY(20px)`). When the parent `.fab-menu` is set to `data-state="open"`, it transitions to full scale and opacity. The CSS automatically staggers the entrance animation of up to 5 child items by incrementing the `transition-delay` by 50ms each.
