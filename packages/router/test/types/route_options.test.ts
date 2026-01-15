import { describe, expectTypeOf, it } from 'vitest';
import type { None } from '../../src/index.js';
import { route } from '../../src/index.js';

describe('RouteOptions', () => {
  it('resolve receives correct params type', () => {
    route('/:id')
      .resolve((ctx) => {
        expectTypeOf(ctx.params).toEqualTypeOf<{ id: string }>();
        expectTypeOf(ctx.query).toEqualTypeOf<None>();
        expectTypeOf(ctx.signal).toEqualTypeOf<AbortSignal>();

        return Promise.resolve({ name: 'test' });
      })
      .meta((data) => ({
        title: data.name,
        description: 'This is a test',
      }));
  });

  it('guard receives correct params type', () => {
    route('/:id').guard((ctx) => {
      expectTypeOf(ctx.params).toEqualTypeOf<{ id: string }>();
      expectTypeOf(ctx.query).toEqualTypeOf<None>();

      return true;
    });
  });

  it('meta function receives data and params', () => {
    type UserData = { name: string; email: string };

    route('/:id')
      .resolve(() => Promise.resolve({ name: 'John', email: 'john@example.com' }))
      .meta((data, params) => {
        expectTypeOf(data).toEqualTypeOf<UserData>();
        expectTypeOf(params).toEqualTypeOf<{ id: string }>();
        return { title: data.name };
      });
  });
});