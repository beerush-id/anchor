---
name: air-material-css
description: "Use this skill when building UI layouts and components styled with the Air Material CSS design system — a Material Design 3–aligned utility layer built on TailwindCSS v4 @utility/@theme. This skill is heavily modularized. Read ONLY the specific module that matches your current task."
---

# Air Material CSS Decision Router

Air Material CSS is a TailwindCSS v4–based design system implementing Material Design 3 (M3) principles. It exposes CSS `@utility` classes (applied via `class=` attributes) and `@theme` tokens (used as `var(--...)` in custom styles). Everything is composable: atomic surface/hover/focus utilities can be mixed with the pre-composed high-level utilities.

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Setup & Theming
- **When**: You need to install the library, configure the entry CSS import, set the seed color to produce a custom palette, enable dark mode, or understand the `color-scheme` / `data-theme` attribute pattern.
- **Action**: Read `contents/setup.md`

## Design Tokens
- **When**: You need to reference raw CSS custom properties for color roles (`--color-primary`, `--color-surface`, etc.), spacing (`--spacing`), shape/radius scale (`--radius-*`), elevation shadows (`--elevation-*`), z-index layers (`--z-index-*`), opacity constants (`--opacity-hover`, etc.), or motion tokens (`--duration-*`, `--ease-*`).
- **Action**: Read `contents/tokens.md`

## Typography
- **When**: You need to apply M3 type scale utilities (`air-display-lg`, `air-headline-md`, `air-title-sm`, `air-body-md`, `air-label-lg`, etc.) or their `-strong` variants, or reference the raw `--font-*` tokens.
- **Action**: Read `contents/typography.md`

## Components
- **When**: You need to build or style any of the following: Button (filled, elevated, tonal, outlined, text, toggle), Icon Button, Button Group, Split Button, Segmented Button, Card (elevated, filled, outlined), Chip, Badge, Divider, Ripple, Link, or Progress (linear, circular).
- **Action**: Read `contents/components.md`

## Forms & Inputs
- **When**: You need to build form fields: Text Field (outlined, filled), Select, Textarea, Checkbox, Radio, Switch, Slider, or Search Bar.
- **Action**: Read `contents/forms.md`

## Overlays & Floating UI
- **When**: You need to build Dialog, Menu, Snackbar, Tooltip (plain, rich), FAB Menu, or any absolutely positioned / portal-rendered element.
- **Action**: Read `contents/overlays.md`

## Layout & Navigation
- **When**: You need App Bar, Tabs, Accordion, Navigation Bar, Navigation Rail, Navigation Drawer, Bottom Sheet, or Side Sheet.
- **Action**: Read `contents/layout.md`

## Extensions
- **When**: You need Skeleton loaders, Masonry grid, or AI-specific utilities (prompt field, chat thread, typing indicator, sparkle).
- **Action**: Read `contents/extensions.md`

---
**CRITICAL INSTRUCTION**: Do NOT read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
