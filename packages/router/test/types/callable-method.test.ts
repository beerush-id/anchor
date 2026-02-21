import { describe, expectTypeOf, it } from 'vitest';
import { createRouter } from '../../src/index.js';

describe('callable method', () => {
  const router = createRouter();

  it('callable accepts params and optional query', () => {
    const userProfile = router.route('/:id');

    expectTypeOf(userProfile.url).toBeCallableWith({ id: '123' });
    expectTypeOf(userProfile.url).toBeCallableWith({ id: '123' });
  });
});
