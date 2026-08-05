import { describe, expectTypeOf, it } from 'vitest';
import { createRouteManifest, type RouteManifestEntry } from '../../src/manifest.js';
import { createRouter } from '../../src/router.js';
import type { None } from '../../src/types.js';

declare module '../../src/types.js' {
  interface RouteMeta {
    title?: string;
    section?: 'docs' | 'blog';
  }
}

const router = createRouter();
const rootRoute = router.route();
const indexRoute = rootRoute.route('/');
const blogsRoute = rootRoute.route('/blogs');
const blogsIndexRoute = blogsRoute.route('/');
const blogsDynamicRoute = blogsRoute.route('/:slug');

const routes = createRouteManifest([
  ['/', indexRoute],
  ['/blogs', blogsIndexRoute],
  ['/blogs/:slug', blogsDynamicRoute],
] as const);

describe('route manifest types', () => {
  it('returns non-undefined entries for valid keys', () => {
    const entry = routes.get('/blogs/:slug');

    expectTypeOf(entry).not.toBeUndefined();
    expectTypeOf(entry.path).toEqualTypeOf<'/blogs/:slug'>();
    expectTypeOf(entry.route).not.toBeUndefined();
  });

  it('types get() for index entries', () => {
    expectTypeOf(routes.get('/').path).toEqualTypeOf<'/'>();
    expectTypeOf(routes.get('/blogs').path).toEqualTypeOf<'/blogs'>();
  });

  it('rejects unknown path literals at compile time', () => {
    // @ts-expect-error - '/blog' is not a manifest key.
    routes.get('/blog');

    // @ts-expect-error - Unknown paths cannot be looked up.
    routes.get('/users/:id');
  });

  it('types params of looked-up dynamic routes', () => {
    const entry = routes.get('/blogs/:slug');

    expectTypeOf(entry.route.url).parameter(0).toEqualTypeOf<{ slug: string } | undefined>();
  });

  it('types params of looked-up static routes', () => {
    const entry = routes.get('/blogs');

    expectTypeOf(entry.route.url).parameter(0).toEqualTypeOf<None | undefined>();
  });

  it('types filtered entries loosely', () => {
    expectTypeOf(routes.except('/blogs/:slug')).toEqualTypeOf<RouteManifestEntry[]>();
    expectTypeOf(routes.except(/:slug/)).toEqualTypeOf<RouteManifestEntry[]>();
    expectTypeOf(routes.under('/blogs')).toEqualTypeOf<RouteManifestEntry[]>();
  });

  it('iterates loosely typed entries', () => {
    for (const entry of routes) {
      expectTypeOf(entry.path).toEqualTypeOf<string>();
    }
  });
});

describe('route meta types', () => {
  it('accepts augmented RouteMeta keys', () => {
    blogsDynamicRoute.meta({ title: 'Blog', section: 'blog' });

    expectTypeOf(blogsDynamicRoute.meta()).toHaveProperty('title');
    expectTypeOf(blogsDynamicRoute.meta().title).toEqualTypeOf<string | undefined>();
  });

  it('rejects unknown meta keys', () => {
    // @ts-expect-error - 'unknown' is not an augmented RouteMeta key.
    blogsDynamicRoute.meta({ unknown: true });
  });

  it('returns the route for chaining when merging', () => {
    const result = blogsDynamicRoute.meta({ title: 'x' });

    expectTypeOf(result.meta).toBeFunction();
  });
});
