import '../../src/client/index';
import { createLifecycle, withIsolation } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '../../src/hoc.js';
import { Head, HeadLink, headings, Meta, Style, Title } from '../../src/router/head';

const ssr = createLifecycle();

describe('Anchor React - Head APIs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Client Mode', () => {
    it('renders Title and updates document.title', async () => {
      const TestTitle = template(() => <Title>My Page Title</Title>);
      const { unmount } = render(<TestTitle />);

      expect(document.title).toBe('My Page Title');

      // Also verify it appended an element to head
      const titleTag = document.head.querySelector('title');
      if (titleTag) {
        expect(titleTag.textContent).toBe('My Page Title');
      }

      unmount();

      // Document title natively remains what it was set to, but the element is removed.
      expect(document.head.querySelectorAll('title').length).toBeLessThanOrEqual(1);
    });

    it('renders Meta tag into document.head and removes it on unmount', async () => {
      const TestMeta = template(() => <Meta name="description" content="Test description" />);
      const { unmount } = render(<TestMeta />);

      const meta = document.head.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('Test description');

      unmount();
      await Promise.resolve();

      expect(document.head.querySelector('meta[name="description"]')).toBeNull();
    });

    it('renders HeadLink tag into document.head and removes it on unmount', async () => {
      const TestLink = template(() => <HeadLink rel="canonical" href="https://example.com" />);
      const { unmount } = render(<TestLink />);

      const link = document.head.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://example.com');

      unmount();

      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    });

    it('renders Style tag into document.head and removes it on unmount', async () => {
      const TestStyle = template(() => <Style>{`body { color: red; }`}</Style>);
      const { unmount } = render(<TestStyle />);

      // Find the style we just added.
      const styles = document.head.querySelectorAll('style');
      const style = Array.from(styles).find((s) => s.textContent === 'body { color: red; }');

      expect(style).not.toBeUndefined();

      unmount();

      const remainingStyles = document.head.querySelectorAll('style');
      const removedStyle = Array.from(remainingStyles).find((s) => s.textContent === 'body { color: red; }');
      expect(removedStyle).toBeUndefined();
    });

    it('renders Head component with SEO metadata, fallbacks, alternates, and JsonLd into document.head', async () => {
      const TestHead = template(() => (
        <Head
          meta={{
            title: 'SEO Title',
            description: 'SEO description',
            keywords: ['react', 'seo', 'anchor'],
            author: 'AIR Stack',
            canonical: 'https://airlib.dev',
            robots: 'index, follow',
            themeColor: '#000000',
            viewport: 'width=device-width',
            og: {
              type: 'website',
              image: 'https://airlib.dev/og.png',
              imageAlt: 'AIR Stack Banner',
              siteName: 'AIR Stack Docs',
              locale: 'en_US',
            },
            twitter: {
              card: 'summary_large_image',
              site: '@airlib',
              creator: '@beerush',
              imageAlt: 'AIR Stack Twitter Banner',
            },
            alternates: [{ href: 'https://airlib.dev/es', hreflang: 'es' }],
            jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'AIR Stack' },
            custom: { 'custom-tag': 'custom-value' },
          }}
        >
          <HeadLink rel="author" href="/author" />
        </Head>
      ));

      const { unmount } = render(<TestHead />);

      expect(document.title).toBe('SEO Title');
      expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('SEO description');
      expect(document.head.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('react, seo, anchor');
      expect(document.head.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('AIR Stack');
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://airlib.dev');
      expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('SEO Title');
      expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
        'https://airlib.dev'
      );
      expect(document.head.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe(
        'AIR Stack Docs'
      );
      expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
        'summary_large_image'
      );
      expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('SEO Title');
      expect(document.head.querySelector('meta[name="custom-tag"]')?.getAttribute('content')).toBe('custom-value');
      expect(document.head.querySelector('link[hreflang="es"]')?.getAttribute('href')).toBe('https://airlib.dev/es');

      const jsonLdScript = document.head.querySelector('script[type="application/ld+json"]');
      expect(jsonLdScript).not.toBeNull();
      expect(JSON.parse(jsonLdScript?.textContent || '{}')).toEqual({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AIR Stack',
      });

      expect(document.head.querySelector('link[rel="author"]')?.getAttribute('href')).toBe('/author');

      unmount();
      await Promise.resolve();

      expect(document.head.querySelector('meta[name="description"]')).toBeNull();
      expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
    });

    it('returns null when Head receives neither meta nor children', async () => {
      const TestEmptyHead = template(() => <Head />);
      const { container, unmount } = render(<TestEmptyHead />);
      expect(container.innerHTML).toBe('');
      unmount();
    });
  });

  describe('SSR Mode', async () => {
    it('collects headings in the closure map when window is undefined', async () => {
      // Stub window to simulate SSR
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        await ssr.runAsync(async () => {
          Title({ children: 'SSR Title' });
          Meta({ name: 'description', content: 'SSR description' });
          HeadLink({ rel: 'preload', href: '/style.css' });
          Style({ children: '.test { color: blue; }' });

          const map = headings();

          expect(map.size).toBe(4);

          expect(map.has('title')).toBe(true);
          expect(map.get('title')?.props.children).toBe('SSR Title');

          expect(map.has('meta:description')).toBe(true);
          expect(map.get('meta:description')?.props.content).toBe('SSR description');

          expect(map.has('link:/style.css')).toBe(true);
          expect(map.get('link:/style.css')?.props.href).toBe('/style.css');

          // Style uses performance.now() as part of the key, so we check if a style exists
          const styleKeys = Array.from(map.keys()).filter((key) => key.startsWith('style:'));
          expect(styleKeys.length).toBe(1);
          expect(map.get(styleKeys[0])?.props.children).toBe('.test { color: blue; }');

          for (const head of map.values()) {
            expect(typeof head.Renderer).toBe('function');
            expect(() => head.Renderer({})).not.toThrow();
          }
        });

        ssr.destroy();
      });
    });

    it('deduplicates tags appropriately in SSR', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        await ssr.runAsync(async () => {
          // First layout
          Title({ children: 'Base Title' });
          Meta({ name: 'description', content: 'Base description' });
          Meta({ property: 'og:title', content: 'Base OG Title' });

          // Child page overrides
          Title({ children: 'Page Title' });
          Meta({ name: 'description', content: 'Page description' });
          Meta({ property: 'og:title', content: 'Page OG Title' });

          const map = headings();

          expect(map.get('title')?.props.children).toBe('Page Title');
          expect(map.get('meta:description')?.props.content).toBe('Page description');
          expect(map.get('meta:og:title')?.props.content).toBe('Page OG Title');

          // No duplicates for title or same-name meta
          const metaKeys = Array.from(map.keys()).filter((key) => key.startsWith('meta:'));
          expect(metaKeys.length).toBe(2);
        });

        ssr.destroy();
      });
    });

    it('cleans up tags from the map on unmount in SSR', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        await ssr.runAsync(async () => {
          Title({ children: 'SSR Cleanup Title' });
          const map = headings();
          expect(map.has('title')).toBe(true);
        });

        ssr.destroy();

        expect(headings().has('title')).toBe(false);
      });
    });

    it('should render headings as html', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        await ssr.runAsync(async () => {
          Title({ children: undefined as never });
          Meta({ name: 'description', content: 'Base description' });
          HeadLink({ rel: 'preload', href: '/style.css' });
          Style({ children: '.test { color: blue; }' });
        });

        vi.unstubAllGlobals();

        const map = headings();
        const heads = [...map.values()].map(({ Renderer }, index) => <Renderer key={index} />);
        const { unmount } = render(heads);

        ssr.destroy();
      });
    });

    it('collects Head and JsonLd tags in SSR closure map', async () => {
      vi.stubGlobal('window', undefined);

      await withIsolation(async () => {
        await ssr.runAsync(async () => {
          Head({
            meta: {
              title: 'SSR Head Title',
              description: 'SSR Head description',
              jsonLd: { '@type': 'Organization', name: 'AIR' },
            },
          });

          const map = headings();
          expect(map.has('title')).toBe(true);
          expect(map.get('title')?.props.children).toBe('SSR Head Title');
          expect(map.has('meta:description')).toBe(true);

          const jsonLdKey = Array.from(map.keys()).find((key) => key.startsWith('jsonld:'));
          expect(jsonLdKey).toBeDefined();
          if (jsonLdKey) {
            expect(map.get(jsonLdKey)?.props.type).toBe('application/ld+json');
          }
        });

        ssr.destroy();
      });
    });
  });
});
