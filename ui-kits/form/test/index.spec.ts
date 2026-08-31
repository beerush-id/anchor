import { anchor, clearContextStore, createLifecycle } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formFactory } from '../src/index.js';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

let scope: ReturnType<typeof createLifecycle>;

beforeEach(() => {
  clearContextStore();
  anchor.configure({ globalScopeWarning: false });
  scope = createLifecycle();
});

afterEach(() => {
  scope.destroy();
});

describe('formFactory', () => {
  it('creates a form state from factory call', () => {
    scope.run(() => {
      const factory = formFactory(schema);
      const form = factory({ value: { name: 'Alice', age: 25 } });

      expect(form.fields['name']).toBe('Alice');
      expect(form.fields['age']).toBe(25);
    });
  });

  it('factory.get() returns the current form', () => {
    scope.run(() => {
      const factory = formFactory(schema);
      factory({ value: { name: 'Alice', age: 25 } });

      const form = factory.get();
      expect(form).toBeDefined();
      expect(form!.fields['name']).toBe('Alice');
    });
  });

  it('factory.field() returns a FormField', () => {
    scope.run(() => {
      const factory = formFactory(schema);
      factory({ value: { name: 'Alice', age: 25 } });

      const field = factory.field('name');
      expect(field).toBeDefined();
      expect(field.name).toBe('name');
    });
  });
});
