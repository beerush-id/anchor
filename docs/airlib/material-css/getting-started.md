---
title: 'Getting Started'
description: 'Install and set up AIR Material 3 CSS in your Tailwind v4 project.'
---

# Getting Started

AIR Material 3 CSS is designed to work seamlessly as a theme and headless component library for Tailwind CSS v4.

## Installation

Add both the library and Tailwind CSS to your project using your preferred package manager.

::: code-group

```sh [npm]
npm install @airlib/material tailwindcss
```

```sh [pnpm]
pnpm add @airlib/material tailwindcss
```

```sh [bun]
bun add @airlib/material tailwindcss
```

:::

Once installed, you have two approaches to import the styles depending on your project needs. Both require standard Tailwind CSS initialization.

## Global Bundle (Recommended)

Because Tailwind CSS automatically purges unused styles, importing the global bundle is the recommended approach. You get access to the entire design system during development without worrying about production payload size—Tailwind handles the optimization automatically.

```css [CSS Import]
/* Initialize Tailwind CSS v4 */
@import 'tailwindcss';

/* Import the entire design system */
@import '@airlib/material';

/* Import base defaults (box-sizing, standard text colors) */
@import '@airlib/material/default.css';

/* Override the seed color to match your brand */
@theme {
  --seed-color: #e6611a;
}
```

## Granular Imports

If you only want to use specific parts of the library (for example, just the color engine without the components) to prevent class name collisions or explicitly restrict which components are available to your team, you can bypass the global bundle and import individual modules.

```css [CSS Import]
/* Initialize Tailwind CSS v4 */
@import 'tailwindcss';

/* Import ONLY the core variables (colors, shapes, elevation) */
@import '@airlib/material/theme/index.css';

/* Import typography variables */
@import '@airlib/material/utilities/typography.css';

/* Import specific component styles */
@import '@airlib/material/components/button.css';
@import '@airlib/material/components/card.css';

/* Override the seed color */
@theme {
  --seed-color: oklch(60% 0.15 260);
}
```
