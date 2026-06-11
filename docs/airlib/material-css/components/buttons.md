---
title: 'Buttons'
description: 'Interactive button elements for triggering actions and forms.'
---

# Buttons

Buttons allow users to take actions, and make choices, with a single tap. AIR Material provides several button variants, each representing a different level of emphasis.

## Standard Buttons

Use standard buttons for primary and secondary actions across your application.

```html [HTML]
<div class="flex gap-4">
  <button class="button">Filled</button>
  <button class="button-elevated">Elevated</button>
  <button class="button-tonal">Tonal</button>
  <button class="button-outlined">Outlined</button>
  <button class="button-text">Text</button>
</div>
```

The classes map directly to Material Design 3 emphasis levels:
- `button`: High emphasis, primary actions.
- `button-elevated`: High emphasis, used when separating the button from a busy background.
- `button-tonal`: Medium emphasis, secondary actions.
- `button-outlined`: Medium-to-low emphasis, alternative secondary actions.
- `button-text`: Low emphasis, used for less important actions.

## Buttons with Icons

You can embed icons within buttons to provide better visual context for the action.

```html [HTML]
<button class="button">
  <span class="icon">add</span>
  Create
</button>

<button class="button-outlined">
  Settings
  <span class="icon">settings</span>
</button>
```

The CSS automatically adjusts the internal padding based on whether the icon is placed before or after the text, ensuring visual balance.

## Toggle Buttons

Toggle buttons allow users to switch between two states, such as turning a setting on or off.

```html [HTML]
<button class="toggle-button" aria-pressed="true">
  <span class="icon">check</span>
  Enabled
</button>

<button class="toggle-button" aria-pressed="false">
  <span class="icon">close</span>
  Disabled
</button>
```

When `aria-pressed="true"` or `aria-selected="true"` is applied, the toggle button automatically shifts to the active visual state.

## Button Sizes

Buttons can be scaled to fit different layout needs.

```html [HTML]
<div class="flex items-center gap-4">
  <button class="button button-xs">Extra Small</button>
  <button class="button button-sm">Small</button>
  <button class="button">Medium (Default)</button>
  <button class="button button-lg">Large</button>
  <button class="button button-xl">Extra Large</button>
</div>
```

Applying size modifiers automatically adjusts the button's height, internal padding, gap between text and icons, and typography size to maintain perfect proportions.

## Floating Action Buttons

Floating Action Buttons (FABs) represent the primary action of a screen, usually floating above the content.

```html [HTML]
<button class="fab">
  <span class="icon">edit</span>
</button>

<button class="fab fab-surface">
  <span class="icon">add</span>
</button>

<button class="fab fab-secondary">
  <span class="icon">navigation</span>
</button>

<button class="fab fab-tertiary">
  <span class="icon">mic</span>
</button>
```

Different color mapping variants (`fab-surface`, `fab-secondary`, `fab-tertiary`) allow the FAB to blend or contrast with the surrounding theme colors as needed.

### Extended FABs

The Extended FAB provides both an icon and a label to clarify its action.

```html [HTML]
<button class="fab fab-extended">
  <span class="icon">add</span>
  New Task
</button>
```

Adding the `fab-extended` class automatically resets the strict width constraint, calculates the correct inner padding using smart icon detection, and applies the larger `Label Large` typography standard.

### FAB Menus

FAB Menus allow a single Floating Action Button to expand into a vertical list of secondary actions.

```html [HTML]
<div class="fab-menu" data-state="closed">
  <button class="fab fab-menu-trigger">
    <span class="icon">add</span>
  </button>
  
  <div class="fab-menu-list">
    <button class="fab fab-sm fab-surface fab-menu-item">
      <span class="icon">photo</span>
    </button>
    <button class="fab fab-sm fab-surface fab-menu-item">
      <span class="icon">edit</span>
    </button>
  </div>
</div>
```

Toggling the `data-state="open"` attribute on the parent `fab-menu` triggers a sequence of animations natively in CSS. The trigger icon smoothly rotates by 45 degrees, and the smaller `fab-menu-item` children sequentially scale and slide upwards with staggered delays, creating a fluid cascade effect.

## Icon Buttons

Icon Buttons are compact buttons typically used for secondary actions, such as toggling settings or quick actions inside toolbars.

```html [HTML]
<div class="flex gap-4">
  <button class="icon-button">
    <span class="icon">settings</span>
  </button>
  <button class="icon-button-filled">
    <span class="icon">add</span>
  </button>
  <button class="icon-button-tonal">
    <span class="icon">edit</span>
  </button>
  <button class="icon-button-outlined">
    <span class="icon">search</span>
  </button>
</div>
```

The CSS handles perfectly centering the inner `svg` or `span` icon, enforcing a 1:1 aspect ratio, and providing a minimum 48x48px accessible touch target using a pseudo-element (`::after`), ensuring it's always easy to tap on mobile.

## Segmented Buttons

Segmented buttons allow users to select from a short list of related options. They are often used as toggles or single-choice filters.

```html [HTML]
<div class="segmented-group">
  <button class="segmented-button" aria-pressed="true">Daily</button>
  <button class="segmented-button">Weekly</button>
  <button class="segmented-button">Monthly</button>
</div>
```

The `segmented-group` wrapper automatically applies the correct outer border radius (`--radius-full`) to the first and last elements, while keeping a tighter inner radius for the middle elements. When an individual `segmented-button` is toggled using `aria-pressed="true"`, it shifts to its active color state.

## Button Groups

Button groups visually and functionally group multiple standard buttons together into a single unified strip.

```html [HTML]
<div class="button-group">
  <button class="button-outlined">Bold</button>
  <button class="button-outlined">Italic</button>
  <button class="button-outlined">Underline</button>
</div>
```

Applying the `button-group` utility wrapper natively overrides the individual border-radius of the inner buttons, connecting them seamlessly while correctly maintaining the fully rounded exterior corners.

## Split Buttons

Split Buttons provide a primary action and a secondary dropdown action attached together.

```html [HTML]
<div class="split-button-group split-button-filled">
  <button class="split-button-primary">
    <span class="icon">add</span>
    Create
  </button>
  <button class="split-button-trailing">
    <span class="icon">arrow_drop_down</span>
  </button>
</div>
```

Unlike normal button groups, split buttons designate a primary action space and a trailing action space. Applying the color variant (`split-button-filled`, `split-button-outlined`) to the outer `split-button-group` ensures that both connected halves share the exact same background and hover states while remaining independently clickable.

## Links

Links are used as navigation elements. They can be inline within a paragraph or standalone.

```html [HTML]
<p>
  Please review our <a href="#" class="link">Privacy Policy</a> before continuing.
</p>

<nav class="flex gap-4">
  <a href="#" class="link-nav" aria-current="page">Home</a>
  <a href="#" class="link-nav">About</a>
</nav>

<a href="#" class="link-standalone">Read More</a>
```

The `link-standalone` provides an animated arrow (`→`) using an `::after` pseudo element that shifts right when hovered. The `link-nav` variant provides a subtle styling perfect for sidebars or app bars, using `aria-current="page"` to indicate the active state.
