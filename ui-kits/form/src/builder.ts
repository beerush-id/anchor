import { anchor } from '@airlib/core';
import { createBaseline } from './context.js';
import type { AnyType, SchemaMap } from './types.js';
import { readPath, writePath } from './utils.js';

export type ShellResult = {
  snapshot: AnyType;
  baseline: Map<string, AnyType>;
  errors: Map<string, string[]>;
  changes: Map<string, AnyType>;
};

/**
 * Fills missing values in the input object using schema defaults,
 * validates all fields, and creates the baseline for tracking.
 *
 * Mutates `input` in-place — never creates a new object.
 * Snapshots internally before mutation for change detection.
 */
export function buildShell(schemas: Map<string, SchemaMap>, input: AnyType): ShellResult {
  if (!anchor.has(input)) throw new Error('buildShell requires a mutable object.');
  const preFill = structuredClone(anchor.get(input));
  const templates = new Map<string, string[]>();
  const errors = new Map<string, string[]>();
  const changes = new Map<string, AnyType>();

  for (const [path, schema] of schemas) {
    if (schema.type === 'object') continue;

    if (path.includes('.$')) {
      const arrayPath = path.substring(0, path.indexOf('.$'));
      if (!templates.has(arrayPath)) templates.set(arrayPath, []);
      templates.get(arrayPath)!.push(path);
      continue;
    }

    const current = readPath(input, path);
    if (current !== undefined) continue;

    const result = schema.builder.safeParse(undefined);
    if (result.success && result.data !== undefined) {
      writePath(input, path, result.data);
    }
  }

  for (const [arrayPath, templatePaths] of templates) {
    const arr = readPath(input, arrayPath);
    if (!Array.isArray(arr)) continue;

    for (let i = 0; i < arr.length; i++) {
      for (const templatePath of templatePaths) {
        const schema = schemas.get(templatePath)!;
        if (schema.type === 'object' || schema.type === 'array') continue;

        const realPath = templatePath.replace('.$', `.${i}`);
        const current = readPath(input, realPath);
        if (current !== undefined) continue;

        const result = schema.builder.safeParse(undefined);
        if (result.success && result.data !== undefined) {
          writePath(input, realPath, result.data);
        }
      }
    }
  }

  const snapshot = structuredClone(anchor.get(input));
  const baseline = createBaseline(structuredClone(anchor.get(input)));

  for (const [path, value] of baseline) {
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) continue;

    const given = readPath(preFill, path);
    if (given === undefined && value !== undefined) {
      changes.set(path, value);
    } else if (given !== value) {
      changes.set(path, value);
    }
  }

  for (const [path, schema] of schemas) {
    if (schema.type === 'object' || schema.type === 'array') continue;
    if (path.includes('.$')) continue;

    const value = readPath(input, path);
    const result = schema.builder.safeParse(value);

    if (!result.success) {
      errors.set(
        path,
        result.error.issues.map((i: AnyType) => i.message)
      );
    }
  }

  for (const [arrayPath, templatePaths] of templates) {
    const arr = readPath(input, arrayPath);
    if (!Array.isArray(arr)) continue;

    for (let i = 0; i < arr.length; i++) {
      for (const templatePath of templatePaths) {
        const schema = schemas.get(templatePath)!;
        if (schema.type === 'object' || schema.type === 'array') continue;

        const realPath = templatePath.replace('.$', `.${i}`);
        const value = readPath(input, realPath);
        const result = schema.builder.safeParse(value);

        if (!result.success) {
          errors.set(
            realPath,
            result.error.issues.map((i: AnyType) => i.message)
          );
        }
      }
    }
  }

  return { snapshot, baseline, errors, changes };
}
