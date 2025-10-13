import type { StyleDeclaration, StyleRef } from './types.js';
import { isRef } from './ref.js';

export function stylex(style?: StyleRef): Partial<CSSStyleDeclaration> {
  if (!style) return {};
  if (isRef<StyleRef>(style)) return parseStyle({ ...style.value }) as Partial<CSSStyleDeclaration>;

  return parseStyle({ ...style }) as Partial<CSSStyleDeclaration>;
}

function parseStyle(style: Partial<StyleDeclaration>): Partial<CSSStyleDeclaration> {
  const parsedStyle: Partial<CSSStyleDeclaration> = {};

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
