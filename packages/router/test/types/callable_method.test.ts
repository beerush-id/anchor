import { describe, expectTypeOf, it } from 'vitest';
import { route } from '../../src/index.js';

describe('callable method', () => {
  it('callable accepts params and optional query', () => {
    const userProfile = route('/:id');

    expectTypeOf(userProfile).toBeCallableWith({ id: '123' });
    expectTypeOf(userProfile).toBeCallableWith({ id: '123' });
  });
});