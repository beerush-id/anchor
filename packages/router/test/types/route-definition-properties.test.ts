import { describe, expectTypeOf, it } from 'vitest';
import { createRouter } from '../../src/index.js';

const router = createRouter();

describe('route definition properties', () => {
  it('exposes route definition properties directly', () => {
    const users = router.route('/users');
    expectTypeOf<typeof users.path extends '/users' ? true : false>().toEqualTypeOf<true>();
  });
});
