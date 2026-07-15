import { describe, expect, it } from 'vitest';
import { stylex } from '../../src/index.js';
import { IS_VALUE_GETTER } from '../../src/module.js';

describe('stylex', () => {
  it('should return simple string properties as is', () => {
    expect(stylex({ color: 'red', display: 'block' }).value).toEqual({
      color: 'red',
      display: 'block',
    });
    expect(stylex({})[IS_VALUE_GETTER]).toBe(true);
  });

  it('should append px to numeric values for properties that require units', () => {
    expect(stylex({ width: 100, marginTop: 20, fontSize: 16 }).value).toEqual({
      width: '100px',
      marginTop: '20px',
      fontSize: '16px',
    });
  });

  it('should not append px to 0', () => {
    expect(stylex({ margin: 0, padding: 0 }).value).toEqual({
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
      }).value
    ).toEqual({
      opacity: 0.5,
      zIndex: 10,
      flexGrow: 1,
      fontWeight: 600,
      lineHeight: 1.5,
    });
  });

  it('should handle custom CSS variables', () => {
    expect(stylex({ '--my-var': '10px', '--my-num': 10 }).value).toEqual({
      '--my-var': '10px',
      '--my-num': '10px',
    });
  });

  it('should ignore undefined and null values', () => {
    expect(stylex({ color: 'red', margin: undefined, padding: null as any }).value).toEqual({
      color: 'red',
    });
  });

  it('should handle a function provider', () => {
    expect(stylex(() => ({ width: 100, opacity: 0.5 })).value).toEqual({
      width: '100px',
      opacity: 0.5,
    });
  });
});
