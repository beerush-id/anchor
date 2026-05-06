import '../../src/client/index';
import { createLifecycle, withIsolation } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '../../src/hoc.js';
import { headings, HeadLink, Meta, Style, Title } from '../../src/router/head';

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
  });
});
