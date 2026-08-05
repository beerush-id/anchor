declare module '*?airimg' {
  export interface ImageMeta {
    src: string;
    width: number;
    height: number;
    alt: string;
  }

  export interface ImageTransform extends ImageMeta {
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
