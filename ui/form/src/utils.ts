import { captureStack } from '@airlib/core';
import type { AnyType } from './types.js';

export function writePath(obj: AnyType, path: string, value: AnyType) {
  if (!obj) {
    captureStack.violation.general(
      'Write to Missing Target',
      `Attempted to write "${path}" but the target is ${obj}.`,
      new Error(`Cannot write "${path}" to ${obj}`),
      ['writePath requires a valid object or array as the first argument.', 'Verify the target exists before writing.'],
      writePath
    );
    return;
  }
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = Number.isNaN(Number(parts[i + 1])) ? {} : [];
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

export function readPath(obj: AnyType, path: string) {
  return path.split('.').reduce((acc, key) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as AnyType)[key];
  }, obj);
}

export function unflattenData(flatData: Record<string, AnyType>): AnyType {
  const result: AnyType = {};
  const keys = Object.keys(flatData);

  if (keys.length === 0) {
    return result;
  }

  for (const path of keys) {
    const value = flatData[path];

    if (path === 'root' || !path) {
      return value;
    }

    const segments = path.split('.');
    let current = result;

    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      const nextKey = segments[i + 1];

      if (current[key] === undefined) {
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      current = current[key];
    }

    current[segments[segments.length - 1]] = value;
  }

  return result;
}
