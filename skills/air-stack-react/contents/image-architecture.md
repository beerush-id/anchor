## Image Architecture (`@airlib/react` & `@airlib/vite`)

AirLib provides a dedicated image architecture that spans the UI, the build pipeline, and TypeScript.

### 1. AirImage Interface

When an asset is processed (either statically via Vite or dynamically via IRPC), it returns an intelligent `AirImage` Proxy object instead of a standard string URL.

```typescript
export interface AirImageMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
}

// An intelligent Proxy that intercepts size keys (e.g. img[300]) 
// and resolves the closest available size variant.
export interface AirImage extends AirImageMeta {
  srcset: string;
  sizes: Record<number, AirImageMeta>;
  [size: number]: AirImageMeta;
}
```

### 2. Vite Plugin Configuration (`vite.config.ts`)

To process static assets into `AirImage` objects during development or production builds, configure the Vite plugin:

```typescript
import { airImage, airWorker } from '@airlib/vite';

export default defineConfig({
  plugins: [
    airWorker(),
    airImage({ 
      devEnabled: true,             // Process on-the-fly in serve mode
      sizes: [128, 256, 512, 1024], // Configurable breakpoints
      format: 'webp',               // 'webp' | 'avif' | 'png' | 'jpeg'
      quality: 75                   // Compression ratio
    }),
  ],
});
```

### 3. TypeScript Configuration (`tsconfig.json`)

To ensure TypeScript infers the `?airimg` query return type as `AirImage`, you must load the ambient declarations:

```json
{
  "compilerOptions": {
    "types": ["@airlib/vite/ambient"]
  }
}
```

### 4. Component Usage & Props

Use the `<Image>` component to render `AirImage` objects automatically.

- **Always** append the `?airimg` query when importing static assets.
- **Do not** manually construct `src` or `srcset`.
- **Use** the `size` prop to invoke the Proxy's automatic resolution to the closest available width.

```typescript
interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  from: AirImage; // Required metadata object
  size?: number;  // Automatically resolves to closest size >= this value
  src?: string;   // Manual override
  width?: number; // Manual override
  height?: number;// Manual override
}
```

```tsx
import { Image } from '@airlib/react';
import heroImage from './assets/hero.jpg?airimg';

// Automatically uses the closest variant >= 300px
<Image from={heroImage} size={300} alt="Hero" loading="lazy" />

// Automatically renders the full responsive srcset
<Image from={heroImage} alt="Hero" />
```
