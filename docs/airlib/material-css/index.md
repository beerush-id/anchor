---
title: 'AIR Material 3 CSS'
description: 'Material Design 3 Headless Component Library and Theme for Tailwind CSS v4.'
---

# AIR Material 3 CSS

Building a cohesive design system is complex. Typical UI frameworks rely on JavaScript-heavy runtime calculations, or ship massive monolithic CSS files. Managing light and dark modes, hover states, and dynamic color palettes often requires complex build steps and configuration.

AIR Material 3 CSS takes a different approach: it is a headless component library and theme built specifically for **Tailwind CSS v4**. It leverages Tailwind's new native CSS `@theme` and `@utility` directives alongside modern features like `oklch()` and `light-dark()` to deliver a complete Material Design 3 implementation. By defining just one `--seed-color`, the entire palette, including state layers and contrast ratios, is mathematically calculated by the browser natively in CSS.

<iframe src="/previews/material/index.html" class="rounded-sandbox" style="height: 640px;"></iframe>

## What It Looks Like

Here is how you apply the system and use a component.

```css [CSS]
/* Initialize Tailwind CSS v4 and the Material Theme */
@import 'tailwindcss';
@import '@airlib/material';

/* Override the seed color to dynamically generate the whole palette */
@theme {
  --seed-color: #e6611a;
}
```

```html [HTML]
<!-- Use standard semantic HTML classes -->
<button class="btn btn-primary">Save Changes</button>
```

By relying on standard CSS, it works instantly across any framework (React, Solid, Vue, Svelte) or vanilla HTML, with zero configuration. The `oklch` color space ensures perceptual uniformity, meaning your generated primary, secondary, and tertiary colors will always have the correct contrast and vibrancy.

## Architecture

AIR Material 3 CSS is heavily modularized utilities to prevent bloat. The foundation of the library:

- **Colors**: Generated dynamically from `--seed-color`.
- **Typography**: Base tracking, weights, and scales.
- **Elevation**: Semantic shadow definitions (`--elevation-1` through `5`).
- **Shapes**: Border radius scales (`--radius-sm`, `--radius-md`).
- **Motion**: Standard Material easing curves and durations.

## What's Next

- [Getting Started](./getting-started) — Install the library and set up your base theme.
- [Theme](./theme) — Understand how the OKLCH color engine works.
- [Components](./components) — Browse the available UI components.
- [Layout](./layout) — Build app structures.
- [Extensions](./extensions) — Learn about AI and layout extensions.
- [Utilities](./utilities) — Browse the available CSS utilities.
