/**
 * Ambient declaration for images imported with `?airimg` suffix.
 * Used by the AIR Stack image plugin to provide image metadata.
 */
declare module '*?airimg' {
  /** Basic image metadata structure. */
  export interface ImageMeta {
    src: string;
    width: number;
    height: number;
    alt: string;
  }

  /** Extended image metadata including srcset and sizes for responsive rendering. */
  export interface ImageTransform extends ImageMeta {
    default: ImageMeta;
    srcset: string;
    sizes: Record<number, ImageMeta>;
    [size: number]: ImageMeta;
  }

  const image: ImageTransform;
  export default image;
}

/**
 * Ambient declaration for static assets imported with `?asset` suffix.
 */
declare module '*?asset' {
  /** Basic image metadata structure. */
  export interface ImageMeta {
    src: string;
    width: number;
    height: number;
    alt: string;
  }

  /** Extended image metadata including srcset and sizes for responsive rendering. */
  export interface ImageTransform extends ImageMeta {
    default: ImageMeta;
    srcset: string;
    sizes: Record<number, ImageMeta>;
    [size: number]: ImageMeta;
  }

  const image: ImageTransform;
  export default image;
}

declare module 'virtual:air/routes' {
  /** Eagerly evaluated map of all page/layout modules (importing it registers every route). */
  const modules: Record<string, unknown>;
  export default modules;
}
