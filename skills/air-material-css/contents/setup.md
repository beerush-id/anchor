# Setup & Theming

## Installation

```css
@import 'tailwindcss';
@import '@airlib/material';
```

Optionally (but highly recommended) import `default.css` for base body styles and ghost-surface helpers:

```css
@import '@airlib/material/default.css';
```


## Custom Color Palette

All M3 colors derive from a single seed. Set it to theme the entire UI:

```css
@theme {
  --seed-color: oklch(60% 0.18 140);
}
```

## Dark Mode

Place `data-theme` on any element to force a color scheme. Removing it reverts to OS preference.

```html
<button data-theme="dark">🌙</button>
<button data-theme="light">☀️</button>
```

```js
el.setAttribute('data-theme', 'dark');
el.removeAttribute('data-theme'); // back to OS
```

## Ghost Surface

Text Field's floating label needs to know its container's background. Add the matching class to any surface-colored container:

| Class | Background |
|---|---|
| `bg-surface` | surface |
| `bg-surface-dim` | surface-dim |
| `bg-surface-bright` | surface-bright |
| `bg-surface-container-lowest` | surface-container-lowest |
| `bg-surface-container-low` | surface-container-low |
| `bg-surface-container` | surface-container |
| `bg-surface-container-high` | surface-container-high |
| `bg-surface-container-highest` | surface-container-highest |
| `bg-surface-variant` | surface-variant |
