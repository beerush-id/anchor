import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/demos/', '/apis/', '/playground/'],
    },
    sitemap: ['https://anchorlib.dev/sitemap.xml', 'https://anchorlib.dev/docs/sitemap.xml'],
  };
}
