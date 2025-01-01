import { expect, test } from 'vitest';
import {
  isArray,
  isBoolean,
  isBooleanString,
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
} from '../../lib/esm/utils/index.js';

test('Validate typeOf function', () => {
  expect(typeOf('')).toBe('string');
  expect(typeOf(0)).toBe('number');
  expect(typeOf(true)).toBe('boolean');
  expect(typeOf(null)).toBe('null');
  expect(typeOf(undefined)).toBe('undefined');
  expect(typeOf([])).toBe('array');
  expect(typeOf({})).toBe('object');
  expect(typeOf(() => {})).toBe('function');
  expect(typeOf(new Date())).toBe('date');
  expect(typeOf(/.*/)).toBe('regexp');
  expect(typeOf(new Error())).toBe('error');
  expect(typeOf(new Map())).toBe('map');
  expect(typeOf(new Set())).toBe('set');
});

test('Validate Equality', () => {
  expect(typeOf('')).toBe(typeOf(''));
  expect(typeOf(0)).toBe(typeOf(0));
  expect(typeOf(true)).toBe(typeOf(true));
  expect(typeOf(null)).toBe(typeOf(null));
  expect(typeOf(undefined)).toBe(typeOf(undefined));
  expect(typeOf([])).toBe(typeOf([]));
  expect(typeOf({})).toBe(typeOf({}));
  expect(typeOf(() => {})).toBe(typeOf(() => {}));
  expect(typeOf(new Date())).toBe(typeOf(new Date()));
  expect(typeOf(/.*/)).toBe(typeOf(/.*/));
  expect(typeOf(new Error())).toBe(typeOf(new Error()));
  expect(typeOf(new Map())).toBe(typeOf(new Map()));
  expect(typeOf(new Set())).toBe(typeOf(new Set()));
});

test('Validate isString function', () => {
  expect(isString('')).toBe(true);
  expect(isString([])).toBe(false);
  expect(isString({})).toBe(false);
  expect(isString(null)).toBe(false);
  expect(isString(undefined)).toBe(false);
  expect(isString(0)).toBe(false);
  expect(isString(true)).toBe(false);
  expect(isString(() => {})).toBe(false);
  expect(isString(new Date())).toBe(false);
  expect(isString(/.*/)).toBe(false);
  expect(isString(new Error())).toBe(false);
  expect(isString(new Map())).toBe(false);
  expect(isString(new Set())).toBe(false);
});

test('Validate isNumber function', () => {
  expect(isNumber(0)).toBe(true);
  expect(isNumber('')).toBe(false);
  expect(isNumber([])).toBe(false);
  expect(isNumber({})).toBe(false);
  expect(isNumber(null)).toBe(false);
  expect(isNumber(undefined)).toBe(false);
  expect(isNumber(true)).toBe(false);
  expect(isNumber(() => {})).toBe(false);
  expect(isNumber(new Date())).toBe(false);
  expect(isNumber(/.*/)).toBe(false);
  expect(isNumber(new Error())).toBe(false);
  expect(isNumber(new Map())).toBe(false);
  expect(isNumber(new Set())).toBe(false);
});

test('Validate isEven function', () => {
  expect(isEven(0)).toBe(true);
  expect(isEven(1)).toBe(false);
  expect(isEven(2)).toBe(true);
  expect(isEven(3)).toBe(false);
  expect(isEven(4)).toBe(true);
  expect(isEven(5)).toBe(false);
  expect(isEven(6)).toBe(true);
  expect(isEven(7)).toBe(false);
  expect(isEven(8)).toBe(true);
  expect(isEven(9)).toBe(false);
  expect(isEven(10)).toBe(true);
  expect(isEven(111111)).toBe(false);
  expect(isEven(121212)).toBe(true);
});

test('Validate isOdd function', () => {
  expect(isOdd(0)).toBe(false);
  expect(isOdd(1)).toBe(true);
  expect(isOdd(2)).toBe(false);
  expect(isOdd(3)).toBe(true);
  expect(isOdd(4)).toBe(false);
  expect(isOdd(5)).toBe(true);
  expect(isOdd(6)).toBe(false);
  expect(isOdd(7)).toBe(true);
  expect(isOdd(8)).toBe(false);
  expect(isOdd(9)).toBe(true);
  expect(isOdd(10)).toBe(false);
  expect(isOdd(111111)).toBe(true);
  expect(isOdd(121212)).toBe(false);
});

test('Validate isInt function', () => {
  expect(isInt(0)).toBe(true);
  expect(isInt(1)).toBe(true);
  expect(isInt(2)).toBe(true);
  expect(isInt(-2)).toBe(true);
  expect(isInt(2.5)).toBe(false);
  expect(isInt(-2.5)).toBe(false);
});

test('Validate isFloat function', () => {
  expect(isFloat(0)).toBe(false);
  expect(isFloat(1)).toBe(false);
  expect(isFloat(2)).toBe(false);
  expect(isFloat(-2)).toBe(false);
  expect(isFloat(2.5)).toBe(true);
  expect(isFloat(-2.5)).toBe(true);
});

test('Validate isNumberString function', () => {
  expect(isNumberString('0')).toBe(true);
  expect(isNumberString('1')).toBe(true);
  expect(isNumberString('2')).toBe(true);
  expect(isNumberString('-2')).toBe(true);
  expect(isNumberString('2.5')).toBe(true);
  expect(isNumberString('-2.5')).toBe(true);
  expect(isNumberString('2.5.5')).toBe(false);
  expect(isNumberString(null)).toBe(false);
  expect(isNumberString(undefined)).toBe(false);
  expect(isNumberString('')).toBe(false);
});

test('Validate isUnitString function', () => {
  expect(isUnitString('0px')).toBe(true);
  expect(isUnitString('1px')).toBe(true);
  expect(isUnitString('2px')).toBe(true);
  expect(isUnitString('-2px')).toBe(true);
  expect(isUnitString('2.5px')).toBe(true);
  expect(isUnitString('-2.5px')).toBe(true);
  expect(isUnitString('2.5.5px')).toBe(false);
  expect(isUnitString(null)).toBe(false);
  expect(isUnitString(undefined)).toBe(false);
  expect(isUnitString('')).toBe(false);
});

test('Validate isObject function', () => {
  class Test {}

  expect(isObject({})).toBe(true);
  expect(isObject(new Test())).toBe(false);
  expect(isObject([])).toBe(false);
  expect(isObject(null)).toBe(false);
  expect(isObject(undefined)).toBe(false);
  expect(isObject('')).toBe(false);
  expect(isObject(0)).toBe(false);
  expect(isObject(true)).toBe(false);
  expect(isObject(() => {})).toBe(false);
  expect(isObject(new Date())).toBe(false);
  expect(isObject(/.*/)).toBe(false);
  expect(isObject(new Error())).toBe(false);
  expect(isObject(new Map())).toBe(false);
  expect(isObject(new Set())).toBe(false);
});

test('Validate isObjectLike function', () => {
  class Test {}

  expect(isObjectLike({})).toBe(true);
  expect(isObjectLike(new Test())).toBe(true);
  expect(isObjectLike([])).toBe(false);
  expect(isObjectLike(null)).toBe(false);
  expect(isObjectLike(undefined)).toBe(false);
  expect(isObjectLike('')).toBe(false);
  expect(isObjectLike(0)).toBe(false);
  expect(isObjectLike(true)).toBe(false);
  expect(isObjectLike(() => {})).toBe(false);
  expect(isObjectLike(new Date())).toBe(false);
  expect(isObjectLike(/.*/)).toBe(false);
  expect(isObjectLike(new Error())).toBe(false);
  expect(isObjectLike(new Map())).toBe(false);
  expect(isObjectLike(new Set())).toBe(false);
});

test('Validate isArray function', () => {
  expect(isArray([])).toBe(true);
  expect(isArray({})).toBe(false);
  expect(isArray(null)).toBe(false);
  expect(isArray(undefined)).toBe(false);
  expect(isArray('')).toBe(false);
  expect(isArray(0)).toBe(false);
  expect(isArray(true)).toBe(false);
  expect(isArray(() => {})).toBe(false);
  expect(isArray(new Date())).toBe(false);
  expect(isArray(/.*/)).toBe(false);
  expect(isArray(new Error())).toBe(false);
  expect(isArray(new Map())).toBe(false);
  expect(isArray(new Set())).toBe(false);
});

test('Validate isDate function', () => {
  expect(isDate(new Date())).toBe(true);
  expect(isDate({})).toBe(false);
  expect(isDate([])).toBe(false);
  expect(isDate(null)).toBe(false);
  expect(isDate(undefined)).toBe(false);
  expect(isDate('')).toBe(false);
  expect(isDate(0)).toBe(false);
  expect(isDate(true)).toBe(false);
  expect(isDate(() => {})).toBe(false);
  expect(isDate(/.*/)).toBe(false);
  expect(isDate(new Error())).toBe(false);
  expect(isDate(new Map())).toBe(false);
  expect(isDate(new Set())).toBe(false);
});

test('Validate isDateString function', () => {
  expect(isDateString('2021-01-01')).toBe(true);
  expect(isDateString('2021-01-01T00:00:00')).toBe(true);
  expect(isDateString('2021-01-01T00:00:00Z')).toBe(true);
  expect(isDateString('2021-01-01T00:00:00+00:00')).toBe(true);
  expect(isDateString('')).toBe(false);
  expect(isDateString(0)).toBe(false);
  expect(isDateString(true)).toBe(false);
  expect(isDateString([])).toBe(false);
  expect(isDateString({})).toBe(false);
  expect(isDateString(null)).toBe(false);
  expect(isDateString(undefined)).toBe(false);
  expect(isDateString(() => {})).toBe(false);
  expect(isDateString(/.*/)).toBe(false);
  expect(isDateString(new Error())).toBe(false);
  expect(isDateString(new Map())).toBe(false);
  expect(isDateString(new Set())).toBe(false);
});

test('Validate isFunction function', () => {
  expect(isFunction(() => {})).toBe(true);
  expect(isFunction('')).toBe(false);
  expect(isFunction([])).toBe(false);
  expect(isFunction({})).toBe(false);
  expect(isFunction(null)).toBe(false);
  expect(isFunction(undefined)).toBe(false);
  expect(isFunction(0)).toBe(false);
  expect(isFunction(true)).toBe(false);
  expect(isFunction(new Date())).toBe(false);
  expect(isFunction(/.*/)).toBe(false);
  expect(isFunction(new Error())).toBe(false);
  expect(isFunction(new Map())).toBe(false);
  expect(isFunction(new Set())).toBe(false);
});

test('Validate isBoolean function', () => {
  expect(isBoolean(true)).toBe(true);
  expect(isBoolean(false)).toBe(true);
  expect(isBoolean('true')).toBe(false);
  expect(isBoolean('false')).toBe(false);
  expect(isBoolean([])).toBe(false);
  expect(isBoolean({})).toBe(false);
  expect(isBoolean(null)).toBe(false);
  expect(isBoolean(undefined)).toBe(false);
  expect(isBoolean(0)).toBe(false);
  expect(isBoolean(() => {})).toBe(false);
  expect(isBoolean(new Date())).toBe(false);
  expect(isBoolean(/.*/)).toBe(false);
  expect(isBoolean(new Error())).toBe(false);
  expect(isBoolean(new Map())).toBe(false);
  expect(isBoolean(new Set())).toBe(false);
});

test('Validate isBooleanString function', () => {
  expect(isBooleanString('true')).toBe(true);
  expect(isBooleanString('false')).toBe(true);
  expect(isBooleanString('')).toBe(false);
  expect(isBooleanString('0')).toBe(false);
  expect(isBooleanString('1')).toBe(false);
  expect(isBooleanString('yes')).toBe(false);
  expect(isBooleanString('no')).toBe(false);
  expect(isBooleanString('on')).toBe(false);
  expect(isBooleanString('off')).toBe(false);
  expect(isBooleanString('')).toBe(false);
  expect(isBooleanString([])).toBe(false);
  expect(isBooleanString({})).toBe(false);
  expect(isBooleanString(null)).toBe(false);
  expect(isBooleanString(undefined)).toBe(false);
  expect(isBooleanString(0)).toBe(false);
  expect(isBooleanString(() => {})).toBe(false);
  expect(isBooleanString(new Date())).toBe(false);
  expect(isBooleanString(/.*/)).toBe(false);
  expect(isBooleanString(new Error())).toBe(false);
  expect(isBooleanString(new Map())).toBe(false);
  expect(isBooleanString(new Set())).toBe(false);
});

test('Validate isMap function', () => {
  expect(isMap(new Map())).toBe(true);
  expect(isMap(new Set())).toBe(false);
  expect(isMap({})).toBe(false);
  expect(isMap([])).toBe(false);
  expect(isMap(null)).toBe(false);
  expect(isMap(undefined)).toBe(false);
  expect(isMap('')).toBe(false);
  expect(isMap(0)).toBe(false);
  expect(isMap(true)).toBe(false);
  expect(isMap(() => {})).toBe(false);
  expect(isMap(new Date())).toBe(false);
  expect(isMap(/.*/)).toBe(false);
  expect(isMap(new Error())).toBe(false);
});

test('Validate isSet function', () => {
  expect(isSet(new Set())).toBe(true);
  expect(isSet(new Map())).toBe(false);
  expect(isSet({})).toBe(false);
  expect(isSet([])).toBe(false);
  expect(isSet(null)).toBe(false);
  expect(isSet(undefined)).toBe(false);
  expect(isSet('')).toBe(false);
  expect(isSet(0)).toBe(false);
  expect(isSet(true)).toBe(false);
  expect(isSet(() => {})).toBe(false);
  expect(isSet(new Date())).toBe(false);
  expect(isSet(/.*/)).toBe(false);
  expect(isSet(new Error())).toBe(false);
});

test('Validate isRegex function', () => {
  expect(isRegExp(/.*/)).toBe(true);
  expect(isRegExp(new Set())).toBe(false);
  expect(isRegExp(new Map())).toBe(false);
  expect(isRegExp({})).toBe(false);
  expect(isRegExp([])).toBe(false);
  expect(isRegExp(null)).toBe(false);
  expect(isRegExp(undefined)).toBe(false);
  expect(isRegExp('')).toBe(false);
  expect(isRegExp(0)).toBe(false);
  expect(isRegExp(true)).toBe(false);
  expect(isRegExp(() => {})).toBe(false);
  expect(isRegExp(new Date())).toBe(false);
  expect(isRegExp(new Error())).toBe(false);
});

test('Validate isError function', () => {
  expect(isError(new Error())).toBe(true);
  expect(isError(/.*/)).toBe(false);
  expect(isError(new Set())).toBe(false);
  expect(isError(new Map())).toBe(false);
  expect(isError({})).toBe(false);
  expect(isError([])).toBe(false);
  expect(isError(null)).toBe(false);
  expect(isError(undefined)).toBe(false);
  expect(isError('')).toBe(false);
  expect(isError(0)).toBe(false);
  expect(isError(true)).toBe(false);
  expect(isError(() => {})).toBe(false);
  expect(isError(new Date())).toBe(false);
});

test('Validate isDefined function', () => {
  expect(isDefined(null)).toBe(false);
  expect(isDefined(undefined)).toBe(false);
  expect(isDefined(NaN)).toBe(false);
  expect(isDefined(0)).toBe(true);
  expect(isDefined(-1)).toBe(true);
  expect(isDefined('')).toBe(true);
  expect(isDefined([])).toBe(true);
  expect(isDefined({})).toBe(true);
  expect(isDefined(true)).toBe(true);
  expect(isDefined(() => {})).toBe(true);
  expect(isDefined(new Date())).toBe(true);
  expect(isDefined(/.*/)).toBe(true);
  expect(isDefined(new Error())).toBe(true);
  expect(isDefined(new Map())).toBe(true);
  expect(isDefined(new Set())).toBe(true);
});

test('Validate isNullish function', () => {
  expect(isNullish(null)).toBe(true);
  expect(isNullish(undefined)).toBe(true);
  expect(isNullish(NaN)).toBe(true);
  expect(isNullish(0)).toBe(false);
  expect(isNullish(-1)).toBe(false);
  expect(isNullish('')).toBe(false);
  expect(isNullish([])).toBe(false);
  expect(isNullish({})).toBe(false);
  expect(isNullish(true)).toBe(false);
  expect(isNullish(() => {})).toBe(false);
  expect(isNullish(new Date())).toBe(false);
  expect(isNullish(/.*/)).toBe(false);
  expect(isNullish(new Error())).toBe(false);
  expect(isNullish(new Map())).toBe(false);
  expect(isNullish(new Set())).toBe(false);
});

test('Validate isFalsy function', () => {
  expect(isFalsy(null)).toBe(true);
  expect(isFalsy(undefined)).toBe(true);
  expect(isFalsy(NaN)).toBe(true);
  expect(isFalsy(false)).toBe(true);
  expect(isFalsy('')).toBe(false);
  expect(isFalsy(0)).toBe(false);
  expect(isFalsy([])).toBe(false);
  expect(isFalsy({})).toBe(false);
  expect(isFalsy(true)).toBe(false);
  expect(isFalsy(() => {})).toBe(false);
  expect(isFalsy(new Date())).toBe(false);
  expect(isFalsy(/.*/)).toBe(false);
  expect(isFalsy(new Error())).toBe(false);
  expect(isFalsy(new Map())).toBe(false);
  expect(isFalsy(new Set())).toBe(false);
});

test('Validate isTruthy function', () => {
  expect(isTruthy(null)).toBe(false);
  expect(isTruthy(undefined)).toBe(false);
  expect(isTruthy(NaN)).toBe(false);
  expect(isTruthy(false)).toBe(false);
  expect(isTruthy('')).toBe(true);
  expect(isTruthy(0)).toBe(true);
  expect(isTruthy([])).toBe(true);
  expect(isTruthy({})).toBe(true);
  expect(isTruthy(true)).toBe(true);
  expect(isTruthy(() => {})).toBe(true);
  expect(isTruthy(new Date())).toBe(true);
  expect(isTruthy(/.*/)).toBe(true);
  expect(isTruthy(new Error())).toBe(true);
  expect(isTruthy(new Map())).toBe(true);
  expect(isTruthy(new Set())).toBe(true);
});

test('Validate isPositive function', () => {
  expect(isPositive(null)).toBe(false);
  expect(isPositive(undefined)).toBe(false);
  expect(isPositive(NaN)).toBe(false);
  expect(isPositive(false)).toBe(false);
  expect(isPositive('')).toBe(false);
  expect(isPositive(0)).toBe(true);
  expect(isPositive(-1)).toBe(false);
  expect(isPositive(1)).toBe(true);
  expect(isPositive([])).toBe(false);
  expect(isPositive({})).toBe(false);
  expect(isPositive(true)).toBe(false);
  expect(isPositive(() => {})).toBe(false);
  expect(isPositive(new Date())).toBe(false);
  expect(isPositive(/.*/)).toBe(false);
  expect(isPositive(new Error())).toBe(false);
  expect(isPositive(new Map())).toBe(false);
  expect(isPositive(new Set())).toBe(false);
});

test('Validate isEmpty function', () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty(undefined)).toBe(true);
  expect(isEmpty(NaN)).toBe(true);
  expect(isEmpty('')).toBe(true);
  expect(isEmpty(0)).toBe(true);
  expect(isEmpty([])).toBe(true);
  expect(isEmpty({})).toBe(true);
  expect(isEmpty(true)).toBe(false);
  expect(isEmpty(false)).toBe(false);
  expect(isEmpty(() => {})).toBe(false);
  expect(isEmpty(new Date())).toBe(false);
  expect(isEmpty(/.*/)).toBe(false);
  expect(isEmpty(new Error())).toBe(false);
  expect(isEmpty(new Map())).toBe(true);
  expect(isEmpty(new Set())).toBe(true);
});
