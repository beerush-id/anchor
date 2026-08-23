/** @jsxImportSource solid-js */

import * as core from '@airlib/core';
import { createLifecycle } from '@airlib/core';
import { render } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachHeading, Head, HeadLink, headings, JsonLd, Meta, Style, Title } from '../../src/router/head.js';

describe('Anchor Solid - Head Components', () => {
  describe('headings()', () => {
    it('returns a stable HeadingMap for the current scope', () => {
      const map1 = headings();
      const map2 = headings();
      expect(map1).toBe(map2);
      expect(map1).toBeInstanceOf(Map);
    });
  });

  describe('attachHeading (browser path)', () => {
    let appendSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      appendSpy = vi.spyOn(document.head, 'appendChild' as any).mockImplementation((node: any) => node);
    });

    afterEach(() => {
      appendSpy.mockRestore();
    });

    it('sets document.title for title tags', () => {
      const originalTitle = document.title;
      const Renderer = () => null;
      attachHeading('title', { children: 'Test Title' }, Renderer as any);
      expect(document.title).toBe('Test Title');
      document.title = originalTitle;
    });

    it('creates and appends a meta element to document.head', () => {
      const Renderer = () => null;
      attachHeading('meta', { name: 'description', content: 'A test page' }, Renderer as any);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('META');
      expect(element.getAttribute('name')).toBe('description');
      expect(element.getAttribute('content')).toBe('A test page');
    });

    it('creates and appends a link element to document.head', () => {
      const Renderer = () => null;
      attachHeading('link', { href: '/style.css', rel: 'stylesheet' }, Renderer as any);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('LINK');
      expect(element.getAttribute('href')).toBe('/style.css');
      expect(element.getAttribute('rel')).toBe('stylesheet');
    });

    it('creates a style element with textContent for children prop', () => {
      const Renderer = () => null;
      attachHeading('style', { children: 'body { color: red; }' }, Renderer as any);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('STYLE');
      expect(element.textContent).toBe('body { color: red; }');
    });
  });

  describe('Title component', () => {
    it('renders and calls attachHeading with title tag', () => {
      const originalTitle = document.title;
      const { unmount } = render(() => <Title>My Page Title</Title>);
      expect(document.title).toBe('My Page Title');
      unmount();
      document.title = originalTitle;
    });
  });

  describe('Meta component', () => {
    let appendSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      appendSpy = vi.spyOn(document.head, 'appendChild' as any).mockImplementation((node: any) => node);
    });

    afterEach(() => {
      appendSpy.mockRestore();
    });

    it('renders and appends a meta tag to the head', () => {
      render(() => <Meta name="description" content="Test description" />);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('META');
      expect(element.getAttribute('name')).toBe('description');
    });
  });

  describe('HeadLink component', () => {
    let appendSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      appendSpy = vi.spyOn(document.head, 'appendChild' as any).mockImplementation((node: any) => node);
    });

    afterEach(() => {
      appendSpy.mockRestore();
    });

    it('renders and appends a link tag to the head', () => {
      render(() => <HeadLink href="/styles.css" rel="stylesheet" />);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('LINK');
      expect(element.getAttribute('href')).toBe('/styles.css');
    });
  });

  describe('Style component', () => {
    let appendSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      appendSpy = vi.spyOn(document.head, 'appendChild' as any).mockImplementation((node: any) => node);
    });

    afterEach(() => {
      appendSpy.mockRestore();
    });

    it('renders and appends a style tag to the head', () => {
      render(() => <Style>{'body { margin: 0; }'}</Style>);

      expect(appendSpy).toHaveBeenCalled();
      const element = appendSpy.mock.calls[0][0] as HTMLElement;
      expect(element.tagName).toBe('STYLE');
    });
  });

  describe('attachHeading (SSR path)', () => {
    let isBrowserSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      const core = await import('@airlib/core');
      isBrowserSpy = vi.spyOn(core, 'isBrowser').mockReturnValue(false);
    });

    afterEach(() => {
      isBrowserSpy.mockRestore();
      headings().clear();
    });

    it('stores meta heading with name-based key in SSR mode', () => {
      const Renderer = (() => null) as any;
      attachHeading('meta', { name: 'description', content: 'SSR test' }, Renderer);

      expect(headings().has('meta:description')).toBe(true);
    });

    it('stores meta heading with property-based key in SSR mode', () => {
      const Renderer = (() => null) as any;
      attachHeading('meta', { property: 'og:title', content: 'OG Title' }, Renderer);

      expect(headings().has('meta:og:title')).toBe(true);
    });

    it('stores link heading with href-based key in SSR mode', () => {
      const Renderer = (() => null) as any;
      attachHeading('link', { href: '/style.css', rel: 'stylesheet' }, Renderer);

      expect(headings().has('link:/style.css')).toBe(true);
    });

    it('stores style heading with timestamp-based key in SSR mode', () => {
      const Renderer = (() => null) as any;
      const sizeBefore = headings().size;
      attachHeading('style', { children: 'body {}' }, Renderer);

      expect(headings().size).toBe(sizeBefore + 1);
      const keys = Array.from(headings().keys());
      expect(keys.some((k) => k.startsWith('style:'))).toBe(true);
    });

    it('stores title heading directly in SSR mode', () => {
      const Renderer = (() => null) as any;
      attachHeading('title', { children: 'SSR Title' }, Renderer);

      expect(headings().has('title')).toBe(true);
    });

    it('removes heading from map on lifecycle cleanup', () => {
      const Renderer = (() => null) as any;
      const lifecycle = createLifecycle();

      lifecycle.run(() => {
        attachHeading('meta', { name: 'cleanup-ssr', content: 'test' }, Renderer);
      });

      expect(headings().has('meta:cleanup-ssr')).toBe(true);
      lifecycle.destroy();
      expect(headings().has('meta:cleanup-ssr')).toBe(false);
    });

    it('stores Title Renderer that can be invoked for SSR', () => {
      render(() => <Title>SSR Title</Title>);

      const entry = headings().get('title');
      expect(entry).toBeDefined();
      expect(typeof entry!.Renderer).toBe('function');

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('stores Meta Renderer that can be invoked for SSR', () => {
      render(() => <Meta name="ssr-meta" content="test" />);

      const entry = headings().get('meta:ssr-meta');
      expect(entry).toBeDefined();
      expect(typeof entry!.Renderer).toBe('function');

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('stores HeadLink Renderer that can be invoked for SSR', () => {
      render(() => <HeadLink href="/ssr.css" rel="stylesheet" />);

      const entry = headings().get('link:/ssr.css');
      expect(entry).toBeDefined();
      expect(typeof entry!.Renderer).toBe('function');

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('stores HeadLink with hreflang normalization', () => {
      render(() => <HeadLink href="/intl.css" hreflang="es" rel="alternate" />);

      const entry = headings().get('link:/intl.css');
      expect(entry).toBeDefined();

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('stores HeadLink with hrefLang attribute', () => {
      render(() => <HeadLink href="/fr.css" hrefLang="fr" rel="alternate" />);

      const entry = headings().get('link:/fr.css');
      expect(entry).toBeDefined();
    });

    it('stores Style Renderer that can be invoked for SSR', () => {
      render(() => <Style>{'body { color: red; }'}</Style>);

      const keys = Array.from(headings().keys());
      const styleKey = keys.find((k) => k.startsWith('style:'))!;
      const entry = headings().get(styleKey);
      expect(entry).toBeDefined();
      expect(typeof entry!.Renderer).toBe('function');

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('stores JsonLd Renderer that can be invoked for SSR', () => {
      render(() => <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'AIR' }} />);

      const keys = Array.from(headings().keys());
      const jsonLdKey = keys.find((k) => k.startsWith('jsonld:'))!;
      const entry = headings().get(jsonLdKey);
      expect(entry).toBeDefined();
      expect(typeof entry!.Renderer).toBe('function');

      createRoot(() => {
        const result = entry!.Renderer({});
        expect(result).toBeDefined();
      });
    });

    it('handles JsonLd with undefined data', () => {
      render(() => <JsonLd />);
      const keys = Array.from(headings().keys());
      const emptyJsonLdKey = keys.find((k) => k.startsWith('jsonld:{}'));
      expect(emptyJsonLdKey).toBeDefined();
    });

    it('stores Meta with property attribute for OpenGraph in SSR', () => {
      render(() => <Meta property="og:title" content="OpenGraph Title" />);
      const entry = headings().get('meta:og:title');
      expect(entry).toBeDefined();
    });
  });

  describe('attachHeading (browser cleanup)', () => {
    it('removes appended element on lifecycle destroy', () => {
      const appendSpy = vi.spyOn(document.head, 'appendChild' as any).mockImplementation((node: any) => node);
      const lifecycle = createLifecycle();

      lifecycle.run(() => {
        attachHeading('meta', { name: 'cleanup-browser', content: 'test' }, (() => null) as any);
      });

      const el = appendSpy.mock.calls[0][0] as HTMLElement;
      const removeSpy = vi.spyOn(el, 'remove');

      lifecycle.destroy();
      expect(removeSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
    });
  });

  describe('Head & JsonLd Components', () => {
    afterEach(() => {
      document.head.innerHTML = '';
    });

    it('renders metadata and JSON-LD scripts properly', () => {
      render(() => (
        <Head
          meta={{
            title: 'Solid SEO',
            description: 'Solid SEO description',
            keywords: ['solid', 'seo'],
            jsonLd: { '@type': 'Organization', name: 'AIR' },
          }}
        />
      ));

      expect(headings().has('title') || document.title === 'Solid SEO').toBe(true);
    });

    it('renders standalone JsonLd script in document head in browser mode', () => {
      render(() => <JsonLd data={{ '@type': 'Corporation', name: 'Anchor' }} />);
      const script = document.head.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      expect(script?.textContent).toContain('Corporation');
    });

    it('returns null when Head receives neither meta nor children', () => {
      const { container } = render(() => <Head />);
      expect(container.innerHTML).toBe('');
    });

    it('renders extensive SEO metadata including alternates, Open Graph, X cards, and custom tags', () => {
      const { unmount } = render(() => (
        <Head
          meta={{
            title: 'Full SEO',
            description: 'Full description',
            author: 'AIR Team',
            canonical: 'https://airlib.dev/doc',
            robots: 'index, follow',
            themeColor: '#4f46e5',
            viewport: 'width=device-width, initial-scale=1.0',
            keywords: 'solid, router, seo, ssr',
            og: {
              title: 'OG Title',
              description: 'OG Description',
              type: 'website',
              url: 'https://airlib.dev/og',
              image: 'https://airlib.dev/img.jpg',
              imageAlt: 'OG Image Alt',
              siteName: 'AirLib',
              locale: 'en_US',
            },
            twitter: {
              card: 'summary_large_image',
              site: '@airlib',
              creator: '@creator',
              title: 'Twitter Title',
              description: 'Twitter Description',
              image: 'https://airlib.dev/twitter.jpg',
              imageAlt: 'Twitter Image Alt',
            },
            alternates: [
              { href: 'https://airlib.dev/en', hreflang: 'en' },
              { rel: 'feed', href: 'https://airlib.dev/rss.xml', type: 'application/rss+xml' },
            ],
            custom: {
              'custom-meta': 'custom-value',
            },
          }}
        />
      ));

      expect(document.head.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe('https://airlib.dev/en');
      expect(document.head.querySelector('meta[name="custom-meta"]')?.getAttribute('content')).toBe('custom-value');
      unmount();
    });

    it('handles fallback Twitter cards and Open Graph derivations without explicit title or images', () => {
      const { unmount } = render(() => (
        <Head
          meta={{
            twitter: { site: '@air' },
            og: { description: 'Only OG Desc' },
          }}
        />
      ));

      expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary');
      unmount();
    });

    it('defaults Twitter card to summary_large_image when an image is present without explicit card type', () => {
      const { unmount } = render(() => (
        <Head
          meta={{
            twitter: { image: 'https://airlib.dev/img.jpg' },
          }}
        />
      ));

      expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
        'summary_large_image'
      );
      unmount();
    });

    it('attaches meta tag using property key in SSR mode', () => {
      const isBrowserSpy = vi.spyOn(core, 'isBrowser').mockReturnValue(false);
      headings().clear();

      attachHeading('meta', { property: 'og:site_name', content: 'AIR' }, (() => null) as any);
      expect(headings().has('meta:og:site_name')).toBe(true);

      headings().clear();
      isBrowserSpy.mockRestore();
    });
  });
});
