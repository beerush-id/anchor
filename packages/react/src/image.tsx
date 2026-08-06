import type { ComponentProps, ReactNode } from 'react';
import { snippet } from './hoc.js';

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

export interface ImageProps extends ComponentProps<'img'> {
  from?: AirImage;
  size?: number;
}

export type ImageNode = (props: ImageProps) => ReactNode;

export const Image = snippet<ImageProps>(
  ({ from = {} as AirImage, size, src, width, height, alt, srcSet, ...props }) => {
    const target = size !== undefined && from[size] ? from[size] : from;

    return (
      <img
        src={src ?? target.src}
        width={width ?? target.width}
        height={height ?? target.height}
        alt={alt ?? target.alt}
        srcSet={srcSet ?? ('srcset' in target ? (target as AirImage).srcset : undefined)}
        {...props}
      />
    );
  },
  'Image',
  'Slot',
  false
) as ImageNode;
