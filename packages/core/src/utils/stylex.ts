import { valueGetter, type ValueGetterType } from '../shared/env.js';

export type UnitMeta = {
  unit: string;
  value: string | number | boolean | null | undefined;
};

/**
 * Represents standard CSS properties, allowing either string or number values.
 */
export type CSSProperties = {
  [K in keyof CSSStyleDeclaration]?: UnitMeta['value'] | UnitMeta;
};

/**
 * Represents an input for styles, combining standard CSS properties and custom CSS variables (e.g., `--my-var`).
 */
export type StyleInput = CSSProperties & Record<`--${string}`, UnitMeta['value'] | undefined | UnitMeta>;
export type StyleOutput = {
  [K in keyof StyleInput]: string | number;
};

/**
 * A function that provides style input dynamically.
 */
export type StyleProvider = () => StyleInput;

export type UnitProvider = ((value: UnitMeta['value'], unit: string) => UnitMeta) & {
  px: (value: UnitMeta['value']) => UnitMeta;
  em: (value: UnitMeta['value']) => UnitMeta;
  vw: (value: UnitMeta['value']) => UnitMeta;
  vh: (value: UnitMeta['value']) => UnitMeta;
  rem: (value: UnitMeta['value']) => UnitMeta;
  deg: (value: UnitMeta['value']) => UnitMeta;
  vmin: (value: UnitMeta['value']) => UnitMeta;
  vmax: (value: UnitMeta['value']) => UnitMeta;
  percent: (value: UnitMeta['value']) => UnitMeta;
};

/**
 * Processes a style input object, automatically appending `px` units to numeric values
 * for properties that require units (ignoring unitless properties like `opacity` or `zIndex`).
 * Evaluates the input if a `StyleProvider` function is passed.
 *
 * @param input - The style object or a function returning a style object.
 * @returns A new style object with properly formatted numeric values.
 */
export type StyleX = ((input: StyleInput | StyleProvider) => StyleOutput) & {
  get: (input: StyleProvider) => ValueGetterType<StyleOutput>;
  unit: (value: UnitMeta['value'], unit: string) => UnitMeta;
};

function stylexFn(input: StyleInput | StyleProvider) {
  const value = typeof input === 'function' ? input() : input;
  const result: StyleInput = {};

  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'object' && v !== null && 'unit' in v && 'value' in v) {
      if (v.value === undefined || v.value === null || typeof v.value !== 'number' || Number.isNaN(v.value)) continue;
      (result as Record<string, string | number>)[k] = `${v.value}${v.unit ?? ''}`;
      continue;
    }

    if (v !== undefined && v !== null) {
      (result as Record<string, string | number>)[k] = convert(k, v as string | number);
    }
  }

  return result as StyleOutput;
}

/**
 * Creates a unit provider function that automatically appends a unit to a value.
 * @param value - The value to be converted.
 * @param unit - The unit to append to the value.
 * @returns An object containing the unit and value.
 */
export const $unit = ((value, unit) => {
  return { unit, value };
}) as UnitProvider;

const map = { percent: '%' };
for (const un of ['px', 'em', 'vw', 'vh', 'rem', 'deg', 'vmin', 'vmax', 'percent']) {
  $unit[un as keyof UnitProvider] = ((value) => $unit(value, map[un as never] ?? un)) as (
    value: UnitMeta['value']
  ) => UnitMeta;
}

/**
 * Retrieves the value of a style provider.
 * @param input - The style provider function.
 * @returns The value returned by the provider function.
 */
stylexFn.get = (input: StyleProvider) => {
  return valueGetter(() => stylexFn(input));
};
stylexFn.unit = $unit;

export const stylex = stylexFn as StyleX;

// CSS properties that accept unitless numbers
const UNITLESS = new Set([
  'animationIterationCount',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'fillOpacity',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'fontWeight',
  'gridColumn',
  'gridRow',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'stopOpacity',
  'strokeDashoffset',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
]);

function convert(key: string, value: string | number): string | number {
  if (typeof value === 'number' && value !== 0 && !UNITLESS.has(key)) {
    return `${value}px`;
  }
  return value;
}
