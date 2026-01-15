import { describe, expectTypeOf, it } from 'vitest';
import type { RouteSegment } from '../../src/index.js';
import { route } from '../../src/index.js';

describe('route definition properties', () => {
  it('exposes route definition properties directly', () => {
    const users = route('/users');

    expectTypeOf(users.path).toEqualTypeOf<'/users'>();
    expectTypeOf(users.segments).toEqualTypeOf<RouteSegment[]>();
    expectTypeOf(users).toHaveProperty('children');
  });
});