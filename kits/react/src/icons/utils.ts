import type { SVGAttributes } from 'react';
import { ARK_CONFIG } from '../lib/index.js';

export type IconProps = SVGAttributes<SVGSVGElement> & {
  size?: number;
};

export const ICON_SIZE = {
  xs: 0.75,
  sm: 1,
  md: 1.25,
  lg: 1.5,
  xl: 1.75,
} as const;

export type IconSize = (typeof ICON_SIZE)[keyof typeof ICON_SIZE];

export function iconSize(size: IconSize | number = ICON_SIZE.sm) {
  return size <= ICON_SIZE.xl ? size * ARK_CONFIG.iconSize : size;
}
