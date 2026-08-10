# Sitemap Generation
To make an application discoverable, we need to provide a Sitemap for search engines. Anchor provides an enterprise-grade XML sitemap generator that is **always available** out of the box.

If you are using the Vite template and SSR engine, you don't need to write any generation code. Any request to `/sitemap.xml` is automatically intercepted and responded with a fully formatted XML sitemap that deeply nests and includes all of your registered static routes.

```typescript
import { Router } from '@beerush/anchor';

const router = new Router();
const root = router.route();

root.route('/about');
root.route('/contact');
```

When deployed via the Vite SSR template, navigating to `/sitemap.xml` automatically returns the generated XML containing your static routes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
  </url>
  <url>
    <loc>https://example.com/about</loc>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
  </url>
</urlset>
```

## Route Configuration
Sometimes we need to adjust how a route appears in the sitemap, or exclude it entirely (e.g., an admin dashboard). We can configure this using the `sitemap` option on the route.

```typescript
// Exclude a route and all its children
root.route('/admin', { sitemap: false });

// Customize priority and change frequency
root.route('/pricing', {
  sitemap: {
    priority: 0.9,
    changefreq: 'weekly',
  }
});
```

The route and all its descendant children will adopt these configurations or be excluded from the XML output accordingly.

### Dynamic Routes
Dynamic routes require concrete data to build real URLs. We can use a generator function to provide the actual paths for the sitemap.

```typescript
const postRoute = root.route('/posts/:id', {
  sitemap: async (route) => {
    const posts = await fetchPosts();
    return posts.map(post => route.url({ id: post.id }));
  }
});
```

The generator maps your application data into valid sitemap entries when the sitemap is requested.

## Multi-Language Sitemaps
Multi-language applications require alternate links to indicate language variants to search engines. We can automate this using the `hreflang` and `nested` options.

```typescript
const langRoute = root.route('/:lang', {
  sitemap: () => [
    { loc: '/en', nested: true, hreflang: 'en' },
    { loc: '/id', nested: true, hreflang: 'id' },
  ]
});

// These routes automatically receive the language prefixes and alternate tags
langRoute.route('/about');
langRoute.route('/contact');
```

The router will cross-link all language variants as alternates and propagate them down to every static child route, generating a complete multi-lingual sitemap automatically.

## Programmatic Generation
If you are building a custom backend or need to generate sitemaps manually outside of the standard Vite/SSR pipeline, you can use the programmatic API.

```typescript
// Generate the complete XML sitemap programmatically
const xml = await router.sitemap({ baseUrl: 'https://example.com' });
```

### Custom Subtree Sitemaps
You can also generate specialized sitemaps for specific sections of your application by passing a target `url` in the config. Since the SSR engine only intercepts the root `/sitemap.xml` automatically, you can intercept custom paths (like `/blog/sitemap.xml`) directly in your worker's `resolveAsset` hook.

```typescript
// worker.ts
import { createApp } from '@anchorlib/react/ssr';
import App from './app.js';
import router from './router.js';

export default createApp(router, App, {
  async resolveAsset(request, url, env) {
    // Intercept the custom sitemap request
    if (url.pathname === '/blog/sitemap.xml') {
      const xml = await router.sitemap({ url: request.url });
      
      return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    // ... continue handling standard static assets
  }
});
```
## Configuration
While the sitemap works out of the box with zero configuration, you may need to force a specific absolute `baseUrl` or globally exclude certain routes.

### Worker Configuration
Because the SSR engine handles the live interceptions, you can optionally pass the sitemap configuration directly to `createApp`. You can also import specific `Route` instances from your application if you need to globally exclude them.

```typescript
// worker.ts
import { createApp } from '@anchorlib/react/ssr';
import { router, adminRoute } from './router';
import App from './app';

export default createApp(router, App, {
  sitemap: {
    baseUrl: 'https://example.com',
    exclude: [adminRoute] // Globally exclude a route and its children
  }
});
```

## Interfaces
For advanced use-cases, you can customize individual routes by returning `SitemapEntry` objects from your generator functions or defining `SitemapConfig`.

```typescript
interface SitemapEntry {
  /** Explicit absolute or relative URL */
  loc?: string;
  /** ISO Date or string */
  lastmod?: Date | string;
  /** Change frequency */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority between 0.0 and 1.0 */
  priority?: number;
  /** If true, maps this entry across all static child routes of the generating route */
  nested?: boolean;
  /** The language code (e.g. 'en') for this specific entry to enable auto cross-linking */
  hreflang?: string;
  /** Explicit list of alternate versions of this page */
  alternates?: { hreflang: string; href: string }[];
}

interface SitemapConfig {
  /** The base URL to prefix all relative loc entries (e.g. https://example.com) */
  baseUrl?: string;
  /** Emits a <sitemapindex> tag for pagination instead of <urlset> */
  type?: 'sitemap' | 'sitemapindex';
  /** Exact URL of the request, used to intercept subtree sitemaps */
  url?: string;
  /** An array of specific route instances (and their children) to exclude */
  exclude?: Route[];
}
```
