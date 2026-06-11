---
title: 'Feedback'
description: 'Components that inform users about the status of operations or display alerts.'
---

# Feedback

Feedback components keep users informed about what is happening in the application. They can interrupt the user to demand an action, or passively display status updates.

## Dialogs

Dialogs are modal windows that appear in front of app content to provide critical information or ask for a decision.

```html [HTML]
<dialog id="my-dialog" class="dialog">
  <h2 class="dialog-title">Delete this item?</h2>
  <div class="dialog-content">
    This action cannot be undone. All data will be permanently removed.
  </div>
  <div class="dialog-actions">
    <button class="button-text">Cancel</button>
    <button class="button">Delete</button>
  </div>
</dialog>
```

AIR Material CSS hooks directly into the native HTML `<dialog>` element. When the dialog receives the `open` attribute natively (usually via `dialogElement.showModal()`), the CSS automatically manages the scale-in animation and backdrop blur transitions without needing extra JavaScript classes.

## Snackbars

Snackbars provide brief messages about app processes at the bottom of the screen.

```html [HTML]
<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
  <div class="snackbar" data-state="visible">
    <span>Message sent successfully</span>
    <button class="snackbar-action">Undo</button>
  </div>
</div>
```

Snackbars use the inverse surface colors to ensure they stand out against the background. Toggling the `data-state="visible"` attribute triggers the slide-up and fade-in animation. The `snackbar-action` button natively uses `inverse-primary` colors for optimal contrast.

## Tooltips

Tooltips display informative text when users hover over, focus on, or tap an element.

```html [HTML]
<div class="relative inline-flex">
  <button class="icon-button" aria-describedby="tooltip-id">
    <span class="icon">print</span>
  </button>
  
  <div id="tooltip-id" class="tooltip-plain" data-state="visible">
    Print document
  </div>
</div>
```

The `tooltip-plain` variant uses inverse surface styling for high contrast, while `tooltip-rich` provides larger padding and surface-variant styling for tooltips that might contain buttons or links. The `data-state="visible"` attribute natively handles the fade-in animation, which can be easily toggled by a minimal JavaScript controller or using CSS `:hover` states on a wrapper element.

## Progress Indicators

Progress indicators express an unspecified wait time or display the length of a process.

```html [HTML]
<!-- Linear Progress -->
<div class="progress-linear">
  <div class="progress-linear-bar progress-linear-primary progress-linear-indeterminate"></div>
</div>

<!-- Circular Progress -->
<svg class="progress-circular progress-circular-indeterminate" viewBox="0 0 48 48">
  <circle class="progress-circular-circle progress-circular-primary progress-circular-circle-indeterminate" cx="24" cy="24" r="18"></circle>
</svg>
```

Both linear and circular progress indicators support `indeterminate` modes powered natively by CSS `@keyframes`. The linear variant scales and translates a bar across the track, while the circular variant utilizes a complex stroke-dasharray animation combined with a continuous rotation to create the signature Material spinning effect.

## Ripple Effects

Ripples provide a visual confirmation at the point of contact when users tap an interactive element.

```html [HTML]
<button class="button relative overflow-hidden">
  <div class="ripple-container">
    <span class="ripple" style="left: 50%; top: 50%;"></span>
  </div>
  Click Me
</button>
```

The `ripple` class relies on a `currentColor` background to naturally adapt to the text color of its parent element. The animation is a simple hardware-accelerated scale transform (`scale(0)` to `scale(1)`) triggered when the element is rendered in the DOM, making it easy to wire up with simple Javascript event listeners.
