/** @jsxImportSource solid-js */

import '../../src/client/index.js';
import * as core from '@airlib/core';
import { render } from '@solidjs/testing-library';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mdxCtx } from '../../src/mdx/context.js';
import { TableOfContent } from '../../src/mdx/TableOfContent.js';

describe('Table of Contents Outline', () => {
  let observerCallback: (entries: Array<{ target: { id: string }; isIntersecting: boolean }>) => void;
  let observeSpy: ReturnType<typeof vi.fn>;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();

    class MockIntersectionObserver {
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
      constructor(cb: (entries: Array<{ target: { id: string }; isIntersecting: boolean }>) => void) {
        observerCallback = cb;
      }
    }

    window.IntersectionObserver = MockIntersectionObserver as any;
    globalThis.IntersectionObserver = MockIntersectionObserver as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Heading Outline Rendering', () => {
    it('renders heading links with depth-based indentation', () => {
      mdxCtx.set({
        headings: [
          { id: 'section-1', text: 'Section 1', depth: 2 },
          { id: 'section-1-1', text: 'Section 1.1', depth: 3 },
          { id: 'section-1-1-1', text: 'Section 1.1.1', depth: 4 },
        ],
      });

      const { container } = render(() => <TableOfContent />);

      const links = container.querySelectorAll<HTMLAnchorElement>('.air-mdx-toc-link');
      expect(links).toHaveLength(3);

      expect(links[0].getAttribute('href')).toContain('#section-1');
      expect(links[0].textContent).toBe('Section 1');
      expect(links[0].style.paddingInlineStart).toBe('0rem');

      expect(links[1].getAttribute('href')).toContain('#section-1-1');
      expect(links[1].style.paddingInlineStart).toBe('0.75rem');

      expect(links[2].getAttribute('href')).toContain('#section-1-1-1');
      expect(links[2].style.paddingInlineStart).toBe('1.5rem');
    });

    it('attaches intersection observer to heading elements present in DOM', () => {
      const heading = document.createElement('h2');
      heading.id = 'dom-heading';
      document.body.appendChild(heading);

      mdxCtx.set({
        headings: [{ id: 'dom-heading', text: 'DOM Heading', depth: 2 }],
      });

      render(() => <TableOfContent />);
      expect(observeSpy).toHaveBeenCalledWith(heading);
      document.body.removeChild(heading);
    });

    it('unobserves target element when component unmounts', () => {
      const heading = document.createElement('h2');
      heading.id = 'unobserve-dom-heading';
      document.body.appendChild(heading);

      mdxCtx.set({
        headings: [{ id: 'unobserve-dom-heading', text: 'Heading', depth: 2 }],
      });

      const { unmount } = render(() => <TableOfContent />);
      unmount();
      document.body.removeChild(heading);
    });

    it('renders nothing when there are no headings on the page', () => {
      mdxCtx.set({ headings: [] });

      const { container } = render(() => <TableOfContent />);
      expect(container.firstElementChild).toBeNull();
    });

    it('allows authors to customize the outline title', () => {
      mdxCtx.set({
        headings: [{ id: 'intro', text: 'Introduction', depth: 2 }],
      });

      const { container } = render(() => <TableOfContent title="Daftar Isi" />);

      const titleEl = container.querySelector('.air-mdx-toc-title');
      const navEl = container.querySelector('nav');

      expect(titleEl?.textContent).toBe('Daftar Isi');
      expect(navEl?.getAttribute('aria-label')).toBe('Daftar Isi');
    });
  });

  describe('Scroll-Spy & Active Section Highlighting', () => {
    it('marks current section link as active when intersection observer triggers', async () => {
      const headingEl = document.createElement('h2');
      headingEl.id = 'feature-a';
      document.body.appendChild(headingEl);

      mdxCtx.set({
        headings: [
          { id: 'feature-a', text: 'Feature A', depth: 2 },
          { id: 'feature-b', text: 'Feature B', depth: 2 },
        ],
      });

      const { container } = render(() => <TableOfContent />);

      observerCallback([{ target: headingEl, isIntersecting: true }]);
      await Promise.resolve();

      const links = container.querySelectorAll<HTMLAnchorElement>('.air-mdx-toc-link');
      expect(links[0].className).toContain('active');
      expect(links[1].className).not.toContain('active');

      observerCallback([{ target: headingEl, isIntersecting: false }]);
      await Promise.resolve();

      document.body.removeChild(headingEl);
    });

    it('forces last heading active when reader scrolls to bottom of page', async () => {
      mdxCtx.set({
        headings: [
          { id: 'top-section', text: 'Top', depth: 2 },
          { id: 'bottom-section', text: 'Bottom', depth: 2 },
        ],
      });

      const { container } = render(() => <TableOfContent />);

      // Mock scrollable document and bottom scroll position
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });

      window.dispatchEvent(new Event('scroll'));
      await Promise.resolve();

      const links = container.querySelectorAll<HTMLAnchorElement>('.air-mdx-toc-link');
      expect(links[1].className).toContain('active');
    });

    it('does not force last heading active when document is not scrollable or not at bottom', async () => {
      mdxCtx.set({
        headings: [
          { id: 'h1', text: 'H1', depth: 2 },
          { id: 'h2', text: 'H2', depth: 2 },
        ],
      });

      const { container } = render(() => <TableOfContent />);

      // Document is not scrollable
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

      window.dispatchEvent(new Event('scroll'));
      await Promise.resolve();

      const links = container.querySelectorAll<HTMLAnchorElement>('.air-mdx-toc-link');
      expect(links[1].className).not.toContain('active');

      // Scrollable but in the middle
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });

      window.dispatchEvent(new Event('scroll'));
      await Promise.resolve();

      expect(links[1].className).not.toContain('active');
    });

    it('does not force active heading when headings are empty on scroll', async () => {
      mdxCtx.set({ headings: undefined });
      render(() => <TableOfContent />);

      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });

      window.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });

    it('disconnects observer and removes scroll listeners when unmounted', async () => {
      mdxCtx.set({
        headings: [{ id: 'heading-1', text: 'Heading 1', depth: 2 }],
      });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(() => <TableOfContent />);

      unmount();
      await Promise.resolve();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('renders cleanly in SSR mode when isBrowser is false', () => {
      const isBrowserSpy = vi.spyOn(core, 'isBrowser').mockReturnValue(false);
      mdxCtx.set({
        headings: [{ id: 'ssr-heading', text: 'SSR Heading', depth: 2 }],
      });
      const { container } = render(() => <TableOfContent />);
      expect(container.querySelector('.air-mdx-toc')).not.toBeNull();
      isBrowserSpy.mockRestore();
    });

    it('handles heading id not present in DOM during observe', () => {
      mdxCtx.set({
        headings: [{ id: 'non-existent-id', text: 'Missing', depth: 2 }],
      });
      const { container, unmount } = render(() => <TableOfContent />);
      expect(container.querySelector('.air-mdx-toc-link')).not.toBeNull();
      unmount();
    });
  });
});
