import type { ClassList, ClassName, StyleDeclaration, StyleRef } from '@base/index.js';
import { isRef } from '@anchorlib/react-classic';
import type { CSSProperties } from 'react';

export let BRAND_PREFIX = 'ark';

export interface ClassxFn {
  (...classes: ClassList): string;

  brand(className: string): string;

  getBrand(): string;
  setBrand(name: string): void;

  props<T>(props: T): T;
}

function classFn(...classes: ClassList): string {
  const classNames = classes.filter(Boolean).map((item) => {
    if (Array.isArray(item)) {
      return classFn(...item);
    }

    if (isRef(item)) {
      return classFn(item.value);
    }

    if (typeof item === 'object') {
      return Object.keys(item)
        .filter((key) => item[key])
        .join(' ');
    }

    return item;
  });

  return classNames.join(' ');
}

classFn.brand = (className: string) => {
  if (className.startsWith('--')) {
    return `--${BRAND_PREFIX}-${className.replace(/^--/, '')}`;
  }

  return `${BRAND_PREFIX}-${className}`;
};

classFn.setBrand = (name: string) => {
  BRAND_PREFIX = name;
};

classFn.getBrand = () => BRAND_PREFIX;

classFn.props = <P>(props: { className?: ClassName | ClassList }) => {
  return (props.className ? { ...props, className: classFn(props.className) } : { ...props }) as P;
};

export const classx = classFn as ClassxFn;

export function stylex(style?: StyleRef): Partial<CSSProperties> {
  if (!style) return {};
  if (isRef(style)) return parseStyle({ ...style.value }) as Partial<CSSProperties>;

  return parseStyle({ ...style }) as Partial<CSSProperties>;
}

function parseStyle(style: Partial<StyleDeclaration>): Partial<CSSProperties> {
  const parsedStyle: Partial<CSSProperties> = {};

  for (const [key, value] of Object.entries(style)) {
    parsedStyle[key as never] = styleUnit(key, value) as never;
  }

  return parsedStyle;
}

const UNITLESS_PROPERTIES = new Set([
  'animationIterationCount',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridRow',
  'gridColumn',
  'fontWeight',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'scale',
  'rotate',
]);

export function styleUnit(prop: string, value: string | number | undefined, unit = 'px'): string {
  if (typeof value === 'number' && !UNITLESS_PROPERTIES.has(prop)) {
    return `${value}${unit}`;
  }
  return typeof value === 'string' ? value : String(value ?? '');
}
