import { IS_VALUE_GETTER } from '../module.js';

/**
 * Represents standard CSS properties, allowing either string or number values.
 */
export type CSSProperties = {
  [K in keyof CSSStyleDeclaration]?: string | number;
};

/**
 * Represents an input for styles, combining standard CSS properties and custom CSS variables (e.g., `--my-var`).
 */
export type StyleInput = CSSProperties & Record<`--${string}`, string | number>;

/**
 * A function that provides style input dynamically.
 */
export type StyleProvider = () => StyleInput;

/**
 * Processes a style input object, automatically appending `px` units to numeric values
 * for properties that require units (ignoring unitless properties like `opacity` or `zIndex`).
 * Evaluates the input if a `StyleProvider` function is passed.
 *
 * @param input - The style object or a function returning a style object.
 * @returns A new style object with properly formatted numeric values.
 */
export function stylex(input: StyleInput | StyleProvider) {
  return {
    [IS_VALUE_GETTER]: true,
    get value() {
      const value = typeof input === 'function' ? input() : input;
      const result: StyleInput = {};
      for (const [k, v] of Object.entries(value)) {
        if (v !== undefined && v !== null) {
          (result as Record<string, string | number>)[k] = convert(k, v as string | number);
        }
      }
      return result;
    },
  } as StyleInput & { [IS_VALUE_GETTER]: boolean; value: StyleInput };
}

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
