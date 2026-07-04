import { describe, expect, it } from 'vitest';
import { ROUTE_TYPE } from '../src/enum.js';
import { Router } from '../src/router.js';
import { generateSitemap } from '../src/sitemap.js';
import type { RouteEntry } from '../src/types.js';

describe('sitemap.ts', () => {
  it('should generate sitemap for static routes by default and skip dynamic/wildcard routes without generator', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    root.route('/about');
    const blog = root.route('/blog', { sitemap: false });
    blog.route('/:slug');
    const files = root.route('/files', { sitemap: false });
    files.route('/*');

    const xml = await router.sitemap();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).not.toContain('/blog');
    expect(xml).not.toContain('/files');
  });

  it('should exclude routes marked with sitemap: false', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    root.route('/about');
    root.route('/admin', { sitemap: false });

    const xml = await router.sitemap();

    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).not.toContain('/admin');
  });

  it('should include custom static attributes when sitemap is an object', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    root.route('/about', {
      sitemap: {
        changefreq: 'monthly',
        priority: 0.8,
        lastmod: '2026-07-04',
      },
    });

    const xml = await router.sitemap();

    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<lastmod>2026-07-04</lastmod>');
    expect(xml).toContain('<changefreq>monthly</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('should support Date objects for lastmod attribute', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    const date = new Date('2026-01-01T00:00:00.000Z');
    root.route('/contact', {
      sitemap: {
        lastmod: date,
      },
    });

    const xml = await router.sitemap();
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('should support dynamic route expansion via sitemap function or async function', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();

    const posts = root.route('/posts', { sitemap: false });
    posts.route('/:id', {
      sitemap: async (route) => {
        return [
          { loc: route.url({ id: '1' }), changefreq: 'weekly', priority: 0.9 },
          { loc: route.url({ id: '2' }), changefreq: 'weekly', priority: 0.9 },
        ];
      },
    });

    const tags = root.route('/tags', { sitemap: false });
    tags.route('/:tag', {
      sitemap: (route) => {
        return [route.url({ tag: 'news' }), route.url({ tag: 'tech' })];
      },
    });

    const xml = await router.sitemap();

    expect(xml).toContain('<loc>https://example.com/posts/1</loc>');
    expect(xml).toContain('<loc>https://example.com/posts/2</loc>');
    expect(xml).toContain('<loc>https://example.com/tags/news</loc>');
    expect(xml).toContain('<loc>https://example.com/tags/tech</loc>');
  });

  it('should override baseUrl when passed to sitemap config', async () => {
    const router = new Router({ baseUrl: 'https://internal.local' });
    const root = router.route();
    root.route('/pricing');

    const xml = await router.sitemap({ baseUrl: 'https://public.cdn.io' });

    expect(xml).toContain('<loc>https://public.cdn.io/</loc>');
    expect(xml).toContain('<loc>https://public.cdn.io/pricing</loc>');
    expect(xml).not.toContain('internal.local');
  });

  it('should generate subtree sitemap from Route instance directly', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    const docs = root.route('/docs');
    docs.route('/intro');
    docs.route('/api');

    const xml = await docs.sitemap();

    expect(xml).toContain('<loc>https://example.com/docs</loc>');
    expect(xml).toContain('<loc>https://example.com/docs/intro</loc>');
    expect(xml).toContain('<loc>https://example.com/docs/api</loc>');
    expect(xml).not.toContain('<loc>https://example.com/</loc>');
  });

  it('should use explicit loc when sitemap option is an object with loc property, and handle relative or falsy items in generator', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    root.route('/landing', {
      sitemap: {
        loc: '/special-landing',
        changefreq: 'daily',
        priority: 1.0,
      },
    });
    root.route('/dynamic', {
      sitemap: () => ['relative-path', undefined as never, { loc: 'another-relative', priority: 0.5 }],
    });

    const xml = await router.sitemap();
    expect(xml).toContain('<loc>https://example.com/special-landing</loc>');
    expect(xml).toContain('<loc>https://example.com/relative-path</loc>');
    expect(xml).toContain('<loc>https://example.com/another-relative</loc>');
  });

  it('should map parent dynamic entries across static child routes when nested is true', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();

    // Dynamic lang route that returns nested: true entries with hreflang for auto cross-linking
    const langRoute = root.route('/:lang', {
      sitemap: () => [
        { loc: '/en', nested: true, hreflang: 'en', changefreq: 'daily' },
        { loc: '/fr', nested: true, hreflang: 'fr', priority: 0.8 },
        { loc: '/es/', nested: true, hreflang: 'es' }, // Trailing slash for altHref cleanup
        { nested: true } as never, // Missing loc to cover line 59 fallback
      ],
    });

    // Index route to cover line 72 skip
    langRoute.route('/');

    langRoute.route('/about');
    langRoute.route('/contact');

    // Child that opts out
    langRoute.route('/admin', { sitemap: false });

    // Child that overrides loc
    langRoute.route('/custom', { sitemap: { loc: '/en/special-custom' } });

    // Child that overrides both loc and alternates explicitly
    langRoute.route('/custom2', {
      sitemap: {
        loc: '/en/special-custom2',
        alternates: [{ hreflang: 'es', href: 'es/special-custom2' }], // No leading slash for line 201 fallback
      },
    });

    // Child that only overrides attributes (no loc)
    langRoute.route('/attrs', { sitemap: { changefreq: 'always' } });

    // Standalone static route with unresolved parameter (should be skipped by fallback)
    root.route('/shop/:category/items');

    const xml = await router.sitemap();

    // The static children /about and /contact should be mapped and inherit parent attributes
    expect(xml).toContain('<loc>https://example.com/en/about</loc>');
    expect(xml).toContain('<loc>https://example.com/fr/about</loc>');
    expect(xml).toContain('<loc>https://example.com/en/contact</loc>');
    expect(xml).toContain('<loc>https://example.com/fr/contact</loc>');

    // Make sure attributes were inherited correctly from the nested parent entry
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');

    // Make sure auto cross-linking generated alternate tags mapped down to child routes
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/about" />');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/about" />');

    // The opted out child /admin should NOT be generated
    expect(xml).not.toContain('<loc>https://example.com/en/admin</loc>');
    expect(xml).not.toContain('<loc>https://example.com/fr/admin</loc>');

    // The overridden child should output its explicit loc and NOT output mapped /fr/custom
    expect(xml).toContain('<loc>https://example.com/en/special-custom</loc>');
    expect(xml).not.toContain('<loc>https://example.com/fr/custom</loc>');

    // The explicit child override should contain both explicit loc and explicit alternate tag
    expect(xml).toContain('<loc>https://example.com/en/special-custom2</loc>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/special-custom2" />');

    // The child overriding only attributes should have both the mapped path and overridden attributes
    expect(xml).toContain('<loc>https://example.com/en/attrs</loc>');
    expect(xml).toContain('<changefreq>always</changefreq>');

    // The unresolved static route should be completely skipped
    expect(xml).not.toContain('shop/:category/items');
  });

  it('should handle missing baseUrls, missing route options, single item generators, and empty locs', async () => {
    // Line 17: Router without baseUrl option
    const router = new Router();
    const root = router.route();

    // Line 22: Route with undefined options
    const rawEntry: RouteEntry = [
      '/raw',
      {
        type: ROUTE_TYPE.STATIC,
        isIndex: false,
        route: { path: '/raw' } as never,
        toString: () => '/raw',
      },
    ];

    // Line 32: Generator returning a single string (not array)
    root.route('/single', {
      sitemap: () => '/single-item',
    });

    // Line 60: Object generator returning entry with missing loc
    root.route('/empty-loc', {
      sitemap: () => ({ loc: '' }),
    });

    const xml = await generateSitemap([...router.entries(), rawEntry]);

    expect(xml).toContain('<loc>/single-item</loc>');
    expect(xml).toContain('<loc>/raw</loc>');
    expect(xml).not.toContain('/empty-loc');
  });

  it('should generate sitemapindex format when type is set to index or sitemapindex', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();

    root.route('/shards', {
      sitemap: () => [
        { loc: '/sitemap-posts-1.xml.gz', lastmod: '2026-07-04', changefreq: 'daily', priority: 1.0 },
        { loc: '/sitemap-posts-2.xml.gz' },
      ],
    });

    const xml = await router.sitemap({ type: 'index' });

    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<sitemap>');
    expect(xml).toContain('</sitemap>');
    expect(xml).toContain('</sitemapindex>');
    expect(xml).toContain('<loc>https://example.com/sitemap-posts-1.xml.gz</loc>');
    expect(xml).toContain('<lastmod>2026-07-04</lastmod>');
    expect(xml).not.toContain('<changefreq>');
    expect(xml).not.toContain('<priority>');
  });

  it('should return empty sitemap when calling sitemap directly on dynamic or wildcard route without sitemap option', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    const blog = root.route('/blog', { sitemap: false });
    const dyn = blog.route('/:slug');
    const files = root.route('/files', { sitemap: false });
    const wild = files.route('/*');

    const dynXml = await dyn.sitemap();
    const wildXml = await wild.sitemap();

    expect(dynXml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n</urlset>'
    );
    expect(wildXml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n</urlset>'
    );
  });

  it('should generate sitemap when calling sitemap directly on dynamic route instance that has a sitemap generator', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    const shop = root.route('/shop', { sitemap: false });
    const item = shop.route('/:itemId', {
      sitemap: (r) => [r.url({ itemId: '100' }), r.url({ itemId: '200' })],
    });

    const itemXml = await item.sitemap();

    expect(itemXml).toContain('<loc>https://example.com/shop/100</loc>');
    expect(itemXml).toContain('<loc>https://example.com/shop/200</loc>');
  });

  it('should automatically resolve subtree or full sitemap when config.url is provided', async () => {
    const router = new Router();
    const root = router.route();
    root.route('/home');
    const docs = root.route('/docs');
    docs.route('/intro');
    docs.route('/guide');

    const rootXml = await router.sitemap({ url: 'https://cdn.example.io/sitemap.xml' });
    const docsXml = await router.sitemap({ url: new URL('https://cdn.example.io/docs/sitemap.xml') });
    const notFoundXml = await router.sitemap({ url: 'https://cdn.example.io/missing/sitemap.xml' });

    expect(rootXml).toContain('<loc>https://cdn.example.io/home</loc>');
    expect(rootXml).toContain('<loc>https://cdn.example.io/docs</loc>');
    expect(docsXml).toContain('<loc>https://cdn.example.io/docs</loc>');
    expect(docsXml).toContain('<loc>https://cdn.example.io/docs/intro</loc>');
    expect(docsXml).not.toContain('<loc>https://cdn.example.io/home</loc>');
    expect(notFoundXml).toBe('');
  });

  it('should fallback to http://localhost when config.url is a relative string and no baseUrl is defined', async () => {
    const router = new Router();
    const root = router.route();
    root.route('/relative-item');

    const xml = await router.sitemap({ url: '/sitemap.xml' });
    expect(xml).toContain('<loc>http://localhost/relative-item</loc>');
  });

  it('should exclude route instances and all their child subtrees while filtering self and ancestors during sub-route sitemap generation', async () => {
    const router = new Router({ baseUrl: 'https://example.com' });
    const root = router.route();
    root.route('/home');
    const archive = root.route('/archive');
    const posts = archive.route('/posts');
    posts.route('/comments');
    archive.route('/shards');

    const excludeConfig = [archive, posts];

    const rootXml = await router.sitemap({ exclude: excludeConfig });
    const archiveXml = await archive.sitemap({ exclude: excludeConfig });
    const archiveViaUrl = await router.sitemap({
      url: 'https://example.com/archive/sitemap.xml',
      exclude: excludeConfig,
    });
    const postsXml = await posts.sitemap({ exclude: excludeConfig });

    // Root excludes archive and all its nested subtrees
    expect(rootXml).toContain('<loc>https://example.com/home</loc>');
    expect(rootXml).not.toContain('/archive');

    // Archive strips self (archive) but retains child exclusion (posts), generating shards but omitting posts
    expect(archiveXml).toContain('<loc>https://example.com/archive</loc>');
    expect(archiveXml).toContain('<loc>https://example.com/archive/shards</loc>');
    expect(archiveXml).not.toContain('/posts');
    expect(archiveViaUrl).toEqual(archiveXml);

    // Posts strips both ancestor (archive) and self (posts), allowing full generation of posts subtree
    expect(postsXml).toContain('<loc>https://example.com/archive/posts</loc>');
    expect(postsXml).toContain('<loc>https://example.com/archive/posts/comments</loc>');
  });

  it('should exclude index routes and deduplicate canonical URLs differing by trailing slash', async () => {
    const router = new Router({ baseUrl: 'http://localhost:3000' });
    const root = router.route();
    root.route('/');
    const auth = root.route('/auth');
    auth.route('/');
    auth.route('/signin');

    const xml = await router.sitemap();

    const matchesRoot = xml.match(/<loc>http:\/\/localhost:3000\/<\/loc>/g);
    const matchesAuth = xml.match(/<loc>http:\/\/localhost:3000\/auth<\/loc>/g);

    expect(matchesRoot).toHaveLength(1);
    expect(matchesAuth).toHaveLength(1);
  });

  it('should strip trailing slashes and deduplicate custom sitemap generator URLs', async () => {
    const router = new Router({ baseUrl: 'http://localhost:3000' });
    const root = router.route();
    root.route('/custom', {
      sitemap: () => ['http://localhost:3000/custom-guide', 'http://localhost:3000/custom-guide/'],
    });

    const xml = await router.sitemap();
    const matches = xml.match(/<loc>http:\/\/localhost:3000\/custom-guide<\/loc>/g);
    expect(matches).toHaveLength(1);
    expect(xml).not.toContain('<loc>http://localhost:3000/custom-guide/</loc>');
  });
});
