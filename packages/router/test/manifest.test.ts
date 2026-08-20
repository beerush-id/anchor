import { type AnyType, setReactive } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteManifest, RouteManifest } from '../src/manifest.js';
import { createRouter } from '../src/router.js';

describe('manifest.ts', () => {
  beforeEach(() => {
    setReactive(true);
  });

  afterEach(() => {
    setReactive(false);
  });

  describe('createRouteManifest', () => {
    it('should create a RouteManifest instance', () => {
      const router = createRouter();
      const indexRoute = router.route('/');
      const manifest = createRouteManifest([['/', indexRoute]] as const);

      expect(manifest).toBeInstanceOf(RouteManifest);
    });

    it('should not expose Map mutation methods', () => {
      const router = createRouter();
      const indexRoute = router.route('/');
      const manifest = createRouteManifest([['/', indexRoute]] as const);

      expect((manifest as AnyType).set).toBeUndefined();
      expect((manifest as AnyType).delete).toBeUndefined();
      expect((manifest as AnyType).clear).toBeUndefined();
    });
  });

  describe('RouteManifest', () => {
    const setup = () => {
      const router = createRouter();
      const rootRoute = router.route();
      const indexRoute = rootRoute.route('/');
      const blogsRoute = rootRoute.route('/blogs');
      const blogsIndexRoute = blogsRoute.route('/');
      const blogsDynamicRoute = blogsRoute.route('/:slug');

      const manifest = createRouteManifest([
        ['/', indexRoute],
        ['/blogs', blogsIndexRoute],
        ['/blogs/:slug', blogsDynamicRoute],
      ] as const);

      return { router, indexRoute, blogsIndexRoute, blogsDynamicRoute, manifest };
    };

    describe('get', () => {
      it('should return the entry for a known path', () => {
        const { manifest, blogsDynamicRoute } = setup();
        const entry = manifest.get('/blogs/:slug');

        expect(entry).toBeDefined();
        expect(entry.path).toBe('/blogs/:slug');
        expect(entry.route).toBe(blogsDynamicRoute);
      });

      it('should return index entries for folder paths', () => {
        const { manifest, blogsIndexRoute, indexRoute } = setup();

        expect(manifest.get('/').route).toBe(indexRoute);
        expect(manifest.get('/blogs').route).toBe(blogsIndexRoute);
      });

      it('should return undefined at runtime for unknown paths', () => {
        const { manifest } = setup();
        const entry = (manifest.get as (path: string) => { route: unknown })('/unknown');

        expect(entry.route).toBeUndefined();
      });
    });

    describe('iteration', () => {
      it('should iterate over all entries in declaration order', () => {
        const { manifest } = setup();
        const entries = [...manifest];

        expect(entries).toHaveLength(3);
        expect(entries.map((entry) => entry.path)).toEqual(['/', '/blogs', '/blogs/:slug']);
      });

      it('should yield { path, route } entry objects', () => {
        const { manifest, indexRoute } = setup();
        const [first] = [...manifest];

        expect(first).toEqual({ path: '/', route: indexRoute });
      });

      it('should be spreadable into an array', () => {
        const { manifest } = setup();

        expect(Array.isArray([...manifest])).toBe(true);
      });
    });

    describe('except', () => {
      it('should exclude an exact path string', () => {
        const { manifest } = setup();
        const entries = manifest.except('/blogs/:slug');

        expect(entries).toHaveLength(2);
        expect(entries.map((entry) => entry.path)).toEqual(['/', '/blogs']);
      });

      it('should exclude paths matching a RegExp', () => {
        const { manifest } = setup();
        const entries = manifest.except(/:\w+/);

        expect(entries).toHaveLength(2);
        expect(entries.map((entry) => entry.path)).toEqual(['/', '/blogs']);
      });

      it('should return all entries when nothing matches', () => {
        const { manifest } = setup();

        expect(manifest.except('/nope')).toHaveLength(3);
        expect(manifest.except(/nope/)).toHaveLength(3);
      });
    });

    describe('under', () => {
      it('should return entries under the given prefix', () => {
        const { manifest } = setup();
        const entries = manifest.under('/blogs');

        expect(entries).toHaveLength(2);
        expect(entries.map((entry) => entry.path)).toEqual(['/blogs', '/blogs/:slug']);
      });

      it('should return an empty array when nothing matches', () => {
        const { manifest } = setup();

        expect(manifest.under('/docs')).toHaveLength(0);
      });
    });

    describe('live meta reads', () => {
      it('should read meta live from route instances', () => {
        const { manifest, blogsDynamicRoute } = setup();

        expect(manifest.get('/blogs/:slug').route.meta()).toEqual({});

        blogsDynamicRoute.meta({ title: 'Blog Detail' });

        expect(manifest.get('/blogs/:slug').route.meta()).toEqual({ title: 'Blog Detail' });

        for (const entry of manifest) {
          if (entry.path === '/blogs/:slug') {
            expect(entry.route.meta()).toEqual({ title: 'Blog Detail' });
          }
        }
      });

      it('should return the underlying entries tuple via entries getter', () => {
        const { manifest } = setup();
        expect(manifest.entries).toBeInstanceOf(Array);
        expect(manifest.entries.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Route.meta', () => {
    it('should return an empty object by default', () => {
      const router = createRouter();
      const route = router.route('/users');

      expect(route.meta()).toEqual({});
    });

    it('should merge partial meta and return the route for chaining', () => {
      const router = createRouter();
      const route = router.route('/users');
      const result = route.meta({ title: 'Users' });

      expect(result).toBe(route);
      expect(route.meta()).toEqual({ title: 'Users' });

      route.meta({ icon: 'users' });

      expect(route.meta()).toEqual({ title: 'Users', icon: 'users' });
    });

    it('should read the same live object across calls', () => {
      const router = createRouter();
      const route = router.route('/users');
      const first = route.meta();

      route.meta({ title: 'Users' });

      expect(route.meta()).toBe(first);
      expect(first).toEqual({ title: 'Users' });
    });

    it('should not warn when merging new keys', () => {
      const router = createRouter();
      const route = router.route('/users');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      route.meta({ title: 'Users' });
      route.meta({ icon: 'users' });

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
