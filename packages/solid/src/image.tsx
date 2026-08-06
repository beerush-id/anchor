import { type JSX, splitProps } from 'solid-js';

export interface AirImageMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface AirImage extends AirImageMeta {
  srcset: string;
  sizes: Record<number, AirImageMeta>;
  default: AirImageMeta;
  [size: number]: AirImageMeta;
}

export interface ImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  from?: AirImage;
  size?: number;
}

export function Image(props: ImageProps): JSX.Element {
  const [local, imgProps] = splitProps(props, ['from', 'size', 'src', 'width', 'height', 'alt', 'srcset']);

  const target = () => {
    const from = local.from;
    if (!from) return null;
    return local.size !== undefined && from[local.size] ? from[local.size] : from;
  };

  return (
    <img
      src={local.src ?? target()?.src}
      width={local.width ?? target()?.width}
      height={local.height ?? target()?.height}
      alt={local.alt ?? target()?.alt}
      srcset={local.srcset ?? (target() && 'srcset' in target()! ? (target() as AirImage).srcset : undefined)}
      {...imgProps}
    />
  );
}
