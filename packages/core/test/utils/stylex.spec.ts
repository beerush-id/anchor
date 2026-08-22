import { describe, expect, it } from 'vitest';
import { $unit, stylex } from '../../src/index.js';

import { IS_VALUE_GETTER } from '../../src/shared/env.js';

describe('stylex', () => {
  it('should return simple string properties as is', () => {
    expect(stylex({ color: 'red', display: 'block' })).toEqual({
      color: 'red',
      display: 'block',
    });
    const getter = stylex.use(() => ({ color: 'blue' }));
    expect(getter[IS_VALUE_GETTER]).toBe(true);
    expect(getter()).toEqual({ color: 'blue' });
  });

  it('should append px to numeric values for properties that require units', () => {
    expect(stylex({ width: 100, marginTop: 20, fontSize: 16 })).toEqual({
      width: '100px',
      marginTop: '20px',
      fontSize: '16px',
    });
  });

  it('should not append px to 0', () => {
    expect(stylex({ margin: 0, padding: 0 })).toEqual({
      margin: 0,
      padding: 0,
    });
  });

  it('should not append px to unitless CSS properties', () => {
    expect(
      stylex({
        opacity: 0.5,
        zIndex: 10,
        flexGrow: 1,
        fontWeight: 600,
        lineHeight: 1.5,
      })
    ).toEqual({
      opacity: 0.5,
      zIndex: 10,
      flexGrow: 1,
      fontWeight: 600,
      lineHeight: 1.5,
    });
  });

  it('should handle custom CSS variables', () => {
    expect(stylex({ '--my-var': '10px', '--my-num': 10 })).toEqual({
      '--my-var': '10px',
      '--my-num': '10px',
    });
  });

  it('should ignore undefined and null values', () => {
    expect(stylex({ color: 'red', margin: undefined, padding: null })).toEqual({
      color: 'red',
    });
  });

  it('should handle a function provider', () => {
    expect(stylex(() => ({ width: 100, opacity: 0.5 }))).toEqual({
      width: '100px',
      opacity: 0.5,
    });
  });

  it('should handle unit value', () => {
    expect(
      stylex({
        width: $unit.percent(100),
        height: stylex.unit(undefined, '%'),
        fontSize: $unit.px(NaN),
        lineHeight: stylex.unit(null, 'em'),
        fontWeight: $unit(500, null as never),
        opacity: 0.5,
      })
    ).toEqual({
      width: '100%',
      fontWeight: '500',
      opacity: 0.5,
    });
  });
});
