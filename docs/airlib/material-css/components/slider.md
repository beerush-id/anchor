---
title: 'Slider'
description: 'Material Design slider component for making selections from a range of values.'
---

# Slider
Sliders allow users to make selections from a range of values. They are ideal for adjusting settings such as volume, brightness, or applying image filters. The library provides styling for both custom DOM structures and native HTML range inputs.

## Theme Variables
You can customize the slider dimensions and the visual gap around the handle by overriding its CSS variables.

```css [CSS]
:root {
  --slider-track-height: calc(var(--spacing) * 4); /* 16px */
  --slider-handle-size: calc(var(--spacing) * 11); /* 44px */
  --slider-handle-width: var(--spacing); /* 4px */
  --slider-handle-gap: var(--spacing); /* 4px visual split */
}
```
These variables define the track thickness, the touch target area for the handle, the visual width of the thumb, and the gap that visually splits the track.

## Composed Utilities (Native Input)
The simplest way to use a slider is by applying the composed utility directly to a native HTML `<input type="range">`.

```html [HTML]
<input type="range" class="slider-primary" min="0" max="100" value="50" />
```

- `slider-primary`: The main composed utility for native inputs. It applies `slider` (which resets appearance and wires up webkit/moz pseudo-elements) and `slider-native-primary-surface` (which applies `primary` and `secondary-container` colors, handles hover/focus state shadows, and renders the visual gap using `box-shadow`).

## Custom DOM Structure
If you require complex custom behavior that a native input cannot provide, use the modular layout and color utilities to build a custom slider.

```html [HTML]
<!-- Custom Slider Structure (requires JavaScript for drag logic) -->
<div class="slider-base" tabindex="0">
  <div class="slider-track-base slider-track-secondary">
    <!-- Active portion of the track -->
    <div class="slider-track-active-base slider-track-active-primary" style="width: 50%;"></div>
  </div>
  <!-- Draggable handle -->
  <div class="slider-handle-base slider-handle-primary hover:slider-handle-hover" style="left: 50%;"></div>
</div>
```

### Custom Layout Utilities
- `slider-base`: Applied to the outer wrapper. Establishes relative positioning and binds the height to `slider-handle-size` to ensure a large, accessible touch target.
- `slider-track-base`: Applied to the background track. Absolute positions it vertically centered with `slider-track-height`.
- `slider-track-active-base`: Applied to the active (filled) portion of the track.
- `slider-handle-base`: Applied to the drag handle. Centers it on its coordinates and manages the inner `::after` element that forms the visual thumb, including an active scale animation.

### Custom State Utilities
- `slider-track-secondary`: Applies the unselected `secondary-container` background to the track.
- `slider-track-active-primary`: Applies the `primary` background to the active portion of the track.
- `slider-handle-primary`: Colors the inner `::after` thumb `primary`.
- `slider-handle-hover`: Applies a `primary` color mix background to the handle wrapper on hover to indicate interactivity.
