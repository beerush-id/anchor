import { anchor, clearContextStore, createLifecycle } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { formField } from '../src/field.js';
import { formState } from '../src/form.js';

const schema = z.object({
  name: z.string().min(3),
  age: z.number(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
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

describe('FormField', () => {
  it('reads and writes through the parent form', () => {
    scope.run(() => {
      const form = formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name');

      expect(field.name).toBe('name');
      expect(field.value).toBe('Alice');

      field.value = 'Bob';
      expect(field.value).toBe('Bob');
      expect(form.fields['name']).toBe('Bob');
    });
  });

  it('reflects form errors', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField(() => 'name');

      expect(field.valid).toBe(true);
      expect(field.error).toBeUndefined();

      field.value = 'Al';
      expect(field.valid).toBe(false);
      expect(field.error).toBeDefined();
    });
  });

  it('reflects changed and touched state', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name');

      expect(field.changed).toBe(false);
      expect(field.touched).toBe(false);

      field.value = 'Bob';
      expect(field.changed).toBe(true);
      expect(field.touched).toBe(true);
    });
  });

  it('reflects disabled from form pending state', async () => {
    await scope.run(async () => {
      const form = formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name');
      expect(field.disabled).toBe(false);

      form.fields['name'] = 'Bob';

      let resolve: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });

      const submitPromise = form.submit(() => promise);

      expect(field.disabled).toBe(true);

      resolve!();
      await submitPromise;

      expect(field.disabled).toBe(false);
    });
  });

  it('derives required from schema by default', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name');
      expect(field.required).toBe(true);
    });
  });

  it('overrides required with boolean', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name', undefined, false);
      expect(field.required).toBe(false);
    });
  });

  it('overrides required with function', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      let toggle = true;
      const field = formField('name', undefined, () => toggle);

      expect(field.required).toBe(true);
      toggle = false;
      expect(field.required).toBe(false);
    });
  });

  describe('Match', () => {
    it('matches by field path (string)', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'x', age: 25, password: 'secret', confirmPassword: 'secret' },
        });

        const field = formField('confirmPassword', 'password');

        expect(field.matched).toBe(true);

        form.fields['confirmPassword'] = 'differ';
        expect(field.matched).toBe(false);
      });
    });

    it('matches by custom function', () => {
      scope.run(() => {
        const rangeSchema = z.object({ min: z.number(), max: z.number() });
        const form = formState(rangeSchema, { value: { min: 0, max: 10 } });

        const field = formField('max', (f: any) => f.fields['max'] > f.fields['min']);

        expect(field.matched).toBe(true);

        form.fields['min'] = 20;
        expect(field.matched).toBe(false);

        form.fields['max'] = 30;
        expect(field.matched).toBe(true);
      });
    });

    it('defaults to matched=true when no match is specified', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'x', age: 25, password: 'secret', confirmPassword: 'different' },
        });

        const field = formField('confirmPassword');
        expect(field.matched).toBe(true);
      });
    });
  });

  it('creates FormInput via input() method', () => {
    scope.run(() => {
      formState(schema, {
        value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
      });

      const field = formField('name');
      const input = field.input({ type: 'text' });

      expect(input).toBeDefined();
      expect(input.name).toBe('name');
    });
  });

  it('handles writes to unknown fields gracefully', () => {
    scope.run(() => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      formState(schema, {});

      const field = formField('unknown_field');
      field.value = 'test';

      expect(field.value).toBeUndefined();
      errSpy.mockRestore();
    });
  });

  describe('standalone (no form)', () => {
    it('value setter is a no-op without form', () => {
      scope.run(() => {
        const field = formField('name');
        field.value = 'test';
        expect(field.value).toBeUndefined();
      });
    });

    it('disabled returns false without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(field.disabled).toBe(false);
      });
    });

    it('required falls back to false without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(field.required).toBe(false);
      });
    });

    it('changed returns false without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(field.changed).toBe(false);
      });
    });

    it('touched returns false without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(field.touched).toBe(false);
      });
    });

    it('clear is a no-op without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(() => field.clear()).not.toThrow();
      });
    });

    it('reset is a no-op without form', () => {
      scope.run(() => {
        const field = formField('name');
        expect(() => field.reset()).not.toThrow();
      });
    });
  });

  describe('clear & reset', () => {
    it('clear resets field to schema default', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
        });

        const field = formField('name');
        field.value = 'Bob';
        expect(field.changed).toBe(true);

        field.clear();
        expect(field.value).toBeUndefined();
        expect(field.changed).toBe(true);
      });
    });

    it('reset restores field to baseline', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
        });

        const field = formField('name');
        field.value = 'Bob';

        field.reset();
        expect(field.value).toBe('Alice');
        expect(field.changed).toBe(false);
      });
    });
  });

  describe('Array element operations', () => {
    const listSchema = z.object({
      items: z.array(z.string()),
    });

    it('remove splices element from parent array', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C'] },
        });

        const field = formField('items.1');
        field.remove();
        expect(form.fields['items']).toEqual(['A', 'C']);
      });
    });

    it('moveUp swaps element with previous', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C'] },
        });

        const field = formField('items.2');
        field.moveUp();
        expect(form.fields['items']).toEqual(['A', 'C', 'B']);
      });
    });

    it('moveDown swaps element with next', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C'] },
        });

        const field = formField('items.0');
        field.moveDown();
        expect(form.fields['items']).toEqual(['B', 'A', 'C']);
      });
    });

    it('moveUp with count moves multiple positions', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C', 'D'] },
        });

        const field = formField('items.3');
        field.moveUp(2);
        expect(form.fields['items']).toEqual(['A', 'D', 'B', 'C']);
      });
    });

    it('moveDown with count moves multiple positions', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C', 'D'] },
        });

        const field = formField('items.0');
        field.moveDown(2);
        expect(form.fields['items']).toEqual(['B', 'C', 'A', 'D']);
      });
    });

    it('moveUp is no-op at first position', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C'] },
        });

        const field = formField('items.0');
        field.moveUp();
        expect(form.fields['items']).toEqual(['A', 'B', 'C']);
      });
    });

    it('moveDown is no-op at last position', () => {
      scope.run(() => {
        const form = formState(listSchema, {
          value: { items: ['A', 'B', 'C'] },
        });

        const field = formField('items.2');
        field.moveDown();
        expect(form.fields['items']).toEqual(['A', 'B', 'C']);
      });
    });

    it('remove/move is no-op on non-array field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, password: 'secret', confirmPassword: 'secret' },
        });

        const field = formField('name');
        expect(() => field.remove()).not.toThrow();
        expect(() => field.moveUp()).not.toThrow();
        expect(() => field.moveDown()).not.toThrow();
      });
    });

    it('remove/move is no-op without form', () => {
      scope.run(() => {
        const field = formField('items.0');
        expect(() => field.remove()).not.toThrow();
        expect(() => field.moveUp()).not.toThrow();
        expect(() => field.moveDown()).not.toThrow();
      });
    });

    it('remove/move is no-op when parent is not an array', () => {
      scope.run(() => {
        const objSchema = z.object({
          data: z.object({ 0: z.string() }),
        });
        formState(objSchema as any, { value: { data: { 0: 'val' } } });

        const field = formField('data.0');
        expect(() => field.remove()).not.toThrow();
      });
    });
  });
});
