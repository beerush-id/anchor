import { describe, expectTypeOf, it } from 'vitest';
import type { None, RouteSegment } from '../../src/index.js';
import { route } from '../../src/index.js';

describe('route() function', () => {
  it('creates a route with correct path type', () => {
    const users = route('/users');
    console.log(users.options);

    expectTypeOf(users.path).toEqualTypeOf<'/users'>();
  });

  it('strips trailing slashes by default', () => {
    const withSlash = route('/users/');
    const withoutSlash = route('/users');

    expectTypeOf(withSlash.path).toEqualTypeOf<'/users'>();
    expectTypeOf(withoutSlash.path).toEqualTypeOf<'/users'>();
  });

  it('respects trailingSlash: "strip" option', () => {
    const users = route('/users/', { trailingSlash: 'strip' });

    expectTypeOf(users.path).toEqualTypeOf<'/users'>();
  });

  it('respects trailingSlash: "require" option', () => {
    const withSlash = route('/users/', { trailingSlash: 'require' });
    const withoutSlash = route('/users', { trailingSlash: 'require' });

    expectTypeOf(withSlash.path).toEqualTypeOf<'/users/'>();
    expectTypeOf(withoutSlash.path).toEqualTypeOf<'/users/'>();
  });

  it('respects trailingSlash: "ignore" option', () => {
    const withSlash = route('/users/', { trailingSlash: 'ignore' });
    const withoutSlash = route('/users', { trailingSlash: 'ignore' });

    expectTypeOf(withSlash.path).toEqualTypeOf<'/users/'>();
    expectTypeOf(withoutSlash.path).toEqualTypeOf<'/users'>();
  });

  it('preserves root path correctly', () => {
    const root = route('/');
    const rootWithStrip = route('/', { trailingSlash: 'strip' });
    const rootWithRequire = route('/', { trailingSlash: 'require' });

    expectTypeOf(root.path).toEqualTypeOf<'/'>();
    expectTypeOf(rootWithStrip.path).toEqualTypeOf<'/'>();
    expectTypeOf(rootWithRequire.path).toEqualTypeOf<'/'>();
  });

  it('infers empty params for static route', () => {
    const users = route('/users');

    // Should be callable without params
    expectTypeOf(users).toBeCallableWith();
  });

  it('infers params from path pattern', () => {
    const userProfile = route('/:id');

    // Should require params with id
    expectTypeOf(userProfile).toBeCallableWith({ id: '123' });
    expectTypeOf(userProfile).toBeCallableWith({ id: '123' });
  });

  it('infers query params from path pattern', () => {
    const userProfile = route('/:id?filter&limit');

    expectTypeOf(userProfile).toBeCallableWith({ id: '123' }, { filter: 'active' });
  });

  it('returns URL object when called', () => {
    const users = route('/users');
    const result = users();
    expectTypeOf(result).toEqualTypeOf<URL>();
  });
});