import { describe, expect, it } from 'vitest';
import {
  isArray,
  isBoolean,
  isBooleanString,
  isBrowser,
  isDate,
  isDateString,
  isDefined,
  isEmpty,
  isError,
  isEven,
  isFalsy,
  isFloat,
  isFunction,
  isInt,
  isMap,
  isNullish,
  isNumber,
  isNumberString,
  isObject,
  isObjectLike,
  isOdd,
  isPositive,
  isRegExp,
  isSet,
  isString,
  isTruthy,
  isUnitString,
  typeOf,
} from '../../src/index.js';

describe('Inspector Utilities', () => {
  describe('Type Checking', () => {
    it('should identify types correctly', () => {
      expect(typeOf('')).toBe('string');
      expect(typeOf(123)).toBe('number');
      expect(typeOf({})).toBe('object');
      expect(typeOf([])).toBe('array');
      expect(typeOf(new Date())).toBe('date');
      expect(typeOf(() => null)).toBe('function');
      expect(typeOf(true)).toBe('boolean');
      expect(typeOf(null)).toBe('null');
      expect(typeOf(/test/)).toBe('regexp');
      expect(typeOf(new Error())).toBe('error');
      expect(typeOf(new Map())).toBe('map');
      expect(typeOf(new Set())).toBe('set');
      expect(typeOf(undefined)).toBe('undefined');
    });

    it('should identify edge cases for typeOf', () => {
      // Test with various objects that might have different prototypes
      expect(typeOf(Object.create(null))).toBe('object');
      expect(typeOf(new Promise(() => {}))).toBe('promise');
      expect(typeOf(new WeakMap())).toBe('weakmap');
      expect(typeOf(new WeakSet())).toBe('weakset');
      expect(typeOf(Symbol('test'))).toBe('symbol');
      expect(typeOf(BigInt(123))).toBe('bigint');
    });
  });

  describe('String Checks', () => {
    it('should validate strings', () => {
      expect(isString('test')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });

    it('should validate number strings', () => {
      expect(isNumberString('123')).toBe(true);
      expect(isNumberString('-123.45')).toBe(true);
      expect(isNumberString('abc')).toBe(false);
      // Edge cases
      expect(isNumberString('')).toBe(false);
      expect(isNumberString('-0')).toBe(true);
      expect(isNumberString('.5')).toBe(true);
      expect(isNumberString('-.5')).toBe(true);
      expect(isNumberString('123.')).toBe(true);
      expect(isNumberString('12.3.4')).toBe(false);
      expect(isNumberString(null as never)).toBe(false);
      expect(isNumberString(undefined as never)).toBe(false);
      expect(isNumberString(123 as never)).toBe(false);
    });

    it('should validate unit strings', () => {
      expect(isUnitString('10px')).toBe(true);
      expect(isUnitString('-20.5em')).toBe(true);
      expect(isUnitString('100%')).toBe(true);
      expect(isUnitString('12.3vh')).toBe(true);
      expect(isUnitString('abc')).toBe(false);
      // Edge cases
      expect(isUnitString('')).toBe(false);
      expect(isUnitString('123')).toBe(false);
      expect(isUnitString('px')).toBe(false);
      expect(isUnitString('.5rem')).toBe(true);
      expect(isUnitString('-.5rem')).toBe(true);
      expect(isUnitString('1.2.3px')).toBe(false);
      expect(isUnitString(null as never)).toBe(false);
      expect(isUnitString(undefined as never)).toBe(false);
      expect(isUnitString(123 as never)).toBe(false);
    });

    it('should validate boolean strings', () => {
      expect(isBooleanString('true')).toBe(true);
      expect(isBooleanString('false')).toBe(true);
      expect(isBooleanString('yes')).toBe(false);
      // Edge cases
      expect(isBooleanString('True')).toBe(false);
      expect(isBooleanString('False')).toBe(false);
      expect(isBooleanString('')).toBe(false);
      expect(isBooleanString(null as never)).toBe(false);
      expect(isBooleanString(undefined as never)).toBe(false);
      expect(isBooleanString(true as never)).toBe(false);
    });

    it('should validate date strings', () => {
      expect(isDateString('2023-01-01')).toBe(true);
      expect(isDateString('invalid')).toBe(false);
      // Edge cases
      expect(isDateString('')).toBe(false);
      expect(isDateString('2023-13-01')).toBe(false); // Invalid month
      expect(isDateString('2023-01-32')).toBe(false); // Invalid day
      expect(isDateString('0000-01-01')).toBe(false); // Year 0
      expect(isDateString('2023-01-01T12:00:00Z')).toBe(true); // ISO format
      expect(isDateString(null as never)).toBe(false);
      expect(isDateString(undefined as never)).toBe(false);
      expect(isDateString(123 as never)).toBe(false);
      expect(isDateString((() => {}) as never)).toBe(false);
    });
  });

  describe('Number Checks', () => {
    it('should validate numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber('123')).toBe(false);
      // Edge cases
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
      expect(isNumber(null as never)).toBe(false);
      expect(isNumber(undefined as never)).toBe(false);
    });

    it('should validate even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(3)).toBe(false);
      // Edge cases
      expect(isEven(0)).toBe(true);
      expect(isEven(-2)).toBe(true);
      expect(isEven(-1)).toBe(false);
      expect(isEven(2.5)).toBe(false); // 2.5 % 2 = 0.5, which is truthy, so 2.5 is not even
      expect(isEven(-2.5)).toBe(false);
    });

    it('should validate odd numbers', () => {
      expect(isOdd(3)).toBe(true);
      expect(isOdd(2)).toBe(false);
      // Edge cases
      expect(isOdd(1)).toBe(true);
      expect(isOdd(0)).toBe(false);
      expect(isOdd(-1)).toBe(true);
      expect(isOdd(-2)).toBe(false);
      expect(isOdd(2.5)).toBe(true); // 2.5 % 2 = 0.5, which is truthy, so 2.5 is not even, but also not odd in
      // mathematical sense
      expect(isOdd(-2.5)).toBe(true);
    });

    it('should validate integers', () => {
      expect(isInt(123)).toBe(true);
      expect(isInt(123.45)).toBe(false);
      // Edge cases
      expect(isInt(0)).toBe(true);
      expect(isInt(-1)).toBe(true);
      expect(isInt(Infinity)).toBe(false);
      expect(isInt(-Infinity)).toBe(false);
      expect(isInt(NaN)).toBe(false);
      expect(isInt(null as never)).toBe(false);
      expect(isInt(undefined as never)).toBe(false);
      expect(isInt('123' as never)).toBe(false);
    });

    it('should validate floats', () => {
      expect(isFloat(123.45)).toBe(true);
      expect(isFloat(123)).toBe(false);
      // Edge cases
      expect(isFloat(0.1)).toBe(true);
      expect(isFloat(-0.1)).toBe(true);
      expect(isFloat(0)).toBe(false);
      expect(isFloat(Infinity)).toBe(false);
      expect(isFloat(-Infinity)).toBe(false);
      expect(isFloat(NaN)).toBe(false);
      expect(isFloat(null as never)).toBe(false);
    });

    it('should validate positive numbers', () => {
      expect(isPositive(123)).toBe(true);
      expect(isPositive(-123)).toBe(false);
      // Edge cases
      expect(isPositive(0)).toBe(true);
      expect(isPositive(0.1)).toBe(true);
      expect(isPositive(-0.1)).toBe(false);
      expect(isPositive(Infinity)).toBe(true);
      expect(isPositive(-Infinity)).toBe(false);
      expect(isPositive(NaN)).toBe(false);
      expect(isPositive(null as never)).toBe(false);
      expect(isPositive(undefined as never)).toBe(false);
      expect(isPositive('123' as never)).toBe(false);
    });
  });

  describe('Object Checks', () => {
    it('should validate objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject(Object.create(null))).toBe(true);
      expect(isObject(new Proxy({}, {}))).toBe(true);

      // Edge cases
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(new Date())).toBe(false);
      expect(isObject(/test/)).toBe(false);
      expect(isObject(new Map())).toBe(false);
      expect(isObject(new Set())).toBe(false);
      expect(isObject(new (class {})())).toBe(false);
    });

    it('should validate object-like values', () => {
      expect(isObjectLike({})).toBe(true);
      expect(isObjectLike(Object.create(null))).toBe(true);
      expect(isObjectLike(new (class {})())).toBe(true);
      expect(isObjectLike(new Proxy({}, {}))).toBe(true);

      // Edge cases - only plain objects should return true
      expect(isObjectLike(null)).toBe(false);
      expect(isObjectLike([])).toBe(false);
      expect(isObjectLike(new Date())).toBe(false);
      expect(isObjectLike(/test/)).toBe(false);
      expect(isObjectLike(new Map())).toBe(false);
      expect(isObjectLike(new Set())).toBe(false);
      expect(isObjectLike(undefined)).toBe(false);
      expect(isObjectLike('string')).toBe(false);
      expect(isObjectLike(123)).toBe(false);
      expect(isObjectLike(true)).toBe(false);
      expect(isObjectLike(function () {})).toBe(false);
    });

    it('should validate arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray({})).toBe(false);
      // Edge cases
      expect(isArray(new Array(1))).toBe(true);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray('[]')).toBe(false);
    });
  });

  describe('Special Types', () => {
    it('should validate dates', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate('2023-01-01')).toBe(false);
      // Edge cases
      expect(isDate(null)).toBe(false);
      expect(isDate(undefined)).toBe(false);
      expect(isDate({})).toBe(false);
    });

    it('should validate functions', () => {
      expect(isFunction(() => null)).toBe(true);
      expect(isFunction({})).toBe(false);
      // Edge cases
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction(function* () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
    });

    it('should validate booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean('true')).toBe(false);
      // Edge cases
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
    });

    it('should validate maps', () => {
      expect(isMap(new Map())).toBe(true);
      expect(isMap({})).toBe(false);
      // Edge cases
      expect(isMap(null)).toBe(false);
      expect(isMap(undefined)).toBe(false);
      expect(isMap(new Set())).toBe(false);
    });

    it('should validate sets', () => {
      expect(isSet(new Set())).toBe(true);
      expect(isSet([])).toBe(false);
      // Edge cases
      expect(isSet(null)).toBe(false);
      expect(isSet(undefined)).toBe(false);
      expect(isSet(new Map())).toBe(false);
    });

    it('should validate regular expressions', () => {
      expect(isRegExp(/test/)).toBe(true);
      expect(isRegExp({})).toBe(false);
      // Edge cases
      expect(isRegExp(null)).toBe(false);
      expect(isRegExp(undefined)).toBe(false);
      expect(isRegExp(new RegExp('test'))).toBe(true);
    });

    it('should validate errors', () => {
      expect(isError(new Error())).toBe(true);
      expect(isError({})).toBe(false);
      // Edge cases
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError(new TypeError())).toBe(true);
      expect(isError(new SyntaxError())).toBe(true);
    });
  });

  describe('Value State Checks', () => {
    it('should validate defined values', () => {
      expect(isDefined(123)).toBe(true);
      expect(isDefined(undefined)).toBe(false);
      expect(isDefined(null)).toBe(false);
      // Edge cases
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(NaN)).toBe(false);
    });

    it('should validate nullish values', () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
      expect(isNullish(NaN)).toBe(true);
      expect(isNullish(123)).toBe(false);
      // Edge cases
      expect(isNullish(0)).toBe(false);
      expect(isNullish('')).toBe(false);
      expect(isNullish(false)).toBe(false);
      expect(isNullish([])).toBe(false);
      expect(isNullish({})).toBe(false);
    });

    it('should validate falsy values', () => {
      expect(isFalsy(false)).toBe(true);
      expect(isFalsy(null)).toBe(true);
      expect(isFalsy(undefined)).toBe(true);
      expect(isFalsy(0)).toBe(false); // Special case
      expect(isFalsy('')).toBe(false); // Special case
      // Additional edge cases
      expect(isFalsy(NaN)).toBe(true);
      expect(isFalsy(true)).toBe(false);
      expect(isFalsy(1)).toBe(false);
      expect(isFalsy('test')).toBe(false);
      expect(isFalsy([])).toBe(false);
      expect(isFalsy({})).toBe(false);
    });

    it('should validate truthy values', () => {
      expect(isTruthy(true)).toBe(true);
      expect(isTruthy(123)).toBe(true);
      expect(isTruthy(false)).toBe(false);
      expect(isTruthy(null)).toBe(false);
      // Additional edge cases
      expect(isTruthy(0)).toBe(true); // Opposite of isFalsy special case
      expect(isTruthy('')).toBe(true); // Opposite of isFalsy special case
      expect(isTruthy(-1)).toBe(true);
      expect(isTruthy([])).toBe(true);
      expect(isTruthy({})).toBe(true);
      expect(isTruthy(NaN)).toBe(false);
    });

    it('should validate empty values', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
      expect(isEmpty(new Set())).toBe(true);
      expect(isEmpty(new Map())).toBe(true);
      expect(isEmpty(['test'])).toBe(false);
      expect(isEmpty({ test: true })).toBe(false);
      // Additional edge cases
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty(NaN)).toBe(true);
      expect(isEmpty(0)).toBe(true);
      expect(isEmpty(-1)).toBe(true);
      expect(isEmpty(1)).toBe(false);
      expect(isEmpty('test')).toBe(false);
      expect(isEmpty(() => {})).toBe(false);
      expect(isEmpty(new Set([1]))).toBe(false);
      expect(isEmpty(new Map([['key', 'value']]))).toBe(false);
    });
  });

  describe('Environment Checks', () => {
    it('should check browser environment', () => {
      // Since we're running in Node.js for tests
      expect(isBrowser()).toBe(false);
    });
  });
});
