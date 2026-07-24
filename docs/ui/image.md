---
title: "Image"
description: "A universal UI component that handles AirImage metadata objects and automatically resolves responsive sizes."
---

# Image

Images are typically the heaviest assets on a webpage. Serving them efficiently across different screen sizes—which involves generating multiple format variants, calculating dimensions, and writing complex responsive `srcset` tags—is a difficult domain. The `<Image>` component connects the UI directly to your asset optimization pipeline, completely abstracting away the complexity of responsive asset management.

## Usage

When you load an asset via the `@anchorlib/vite-ssr` image plugin (using the `?airimg` query), the plugin resolves the image into a comprehensive metadata object containing the optimal source and all responsive variants.

You pass this metadata object directly into the `<Image>` component via the `from` prop. 

::: code-group

```tsx [React]
import { Image } from '@anchorlib/react';
import heroImage from './assets/hero.jpg?airimg'; 

export function ProfileCard() {
  return (
    <div className="card">
      <Image 
        from={heroImage} 
        alt="User Profile" 
        loading="lazy"
      />
    </div>
  );
}
```

```tsx [SolidJS]
import { Image } from '@anchorlib/solid';
import heroImage from './assets/hero.jpg?airimg';

export function ProfileCard() {
  return (
    <div class="card">
      <Image 
        from={heroImage} 
        alt="User Profile" 
        loading="lazy"
      />
    </div>
  );
}
```

:::

By taking the raw metadata object, the `<Image>` component automatically maps and renders a fully responsive HTML `<img>` tag with the correct `srcset`, `width`, and `height`. 

## Automatic Size Resolution

The `AirImage` object is not just static data; it is an intelligent Proxy. 

When you request a specific `size`, the object automatically resolves to the closest available size variant that is greater than or equal to the requested size. If a larger variant is not available, it safely falls back to the original image.

The `<Image>` component exposes this via the `size` prop:

```tsx
// Automatically finds the best variant >= 300px width
<Image from={heroImage} size={300} />
```

This ensures you always serve the optimal asset size without manually managing URL strings or writing custom selection logic.

## Props

The `<Image>` component accepts all standard HTML `<img>` attributes (`alt`, `loading`, `decoding`, etc.) in addition to the following specialized props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `from` | `AirImage` | **Required** | The metadata object returned by the Vite plugin or IRPC endpoint. |
| `size` | `number` | - | Explicitly selects the closest available size variant (e.g., `size={256}`). If omitted, it renders the full responsive `srcset`. |
| `src` | `string` | - | Overrides the resolved source URL. |
| `width` | `number` | - | Overrides the resolved width. |
| `height` | `number` | - | Overrides the resolved height. |
