---
title: 'Link'
description: 'Material Design link utilities for inline text, navigation, and standalone calls to action.'
---

# Link
Links allow users to navigate to different pages, scroll to sections within a page, or access external resources. The library provides three distinct semantic variants.

## Composed Utilities
The following utilities apply complete styling and interaction states for different link contexts.

```html [HTML]
<!-- Inline text link -->
<p>Read our <a href="#" class="link">Privacy Policy</a>.</p>

<!-- Navigation link -->
<nav class="flex gap-4">
  <a href="#" class="link-nav" aria-current="page">Home</a>
  <a href="#" class="link-nav">About</a>
</nav>

<!-- Standalone call-to-action link -->
<a href="#" class="link-standalone">Read more</a>
```

- `link`: Designed for inline text within paragraphs. It uses the `primary` color and `500` font weight. On hover, it displays a colored underline. Visited links automatically switch to the `tertiary` color to indicate history.
- `link-nav`: A subtle, no-underline link designed for sidebars and navbars. It uses `on-surface-variant` by default, brightens to `on-surface` on hover, and automatically highlights with the `primary` color when the `aria-current="page"` attribute is present.
- `link-standalone`: A heavier weight (`600`) inline-flex link meant to act as a secondary call-to-action. It includes a built-in arrow affordance (`→`) generated via a CSS `::after` pseudo-element. On hover, the gap expands and the arrow smoothly translates to the right.
