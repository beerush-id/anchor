import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../src/client/index.js';
import type { AnyType } from '@airlib/core';
import { CodeGroup } from '../../src/mdx/CodeGroup.js';

describe('Multi-Variant Code Groups', () => {
  describe('Tab Derivation & Visual Labels', () => {
    it('derives tab titles from code block data-title or data-language attributes', () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="pnpm">pnpm add @airlib/react</code>
          </pre>
          <pre>
            <code data-language="npm">npm install @airlib/react</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs).toHaveLength(2);
      expect(tabs[0].textContent).toBe('pnpm');
      expect(tabs[1].textContent).toBe('npm');
    });

    it('falls back to numbered tab names when code blocks lack titles or languages', () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code>console.log(1)</code>
          </pre>
          <pre>
            <code>console.log(2)</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
      expect(tabs[1].textContent).toBe('Tab 2');
    });

    it('allows authors to set custom accessible label for the tablist', () => {
      const { container } = render(
        <CodeGroup tablistLabel="Package Manager Install Commands">
          <pre>
            <code data-title="pnpm">pnpm add foo</code>
          </pre>
        </CodeGroup>
      );

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist?.getAttribute('aria-label')).toBe('Package Manager Install Commands');
    });

    it('extracts metadata from child code elements in tab blocks', () => {
      const { container } = render(
        <CodeGroup>
          <div>
            <code data-title="Nested Title">nested code</code>
          </div>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Nested Title');
    });

    it('falls back to default numbered tab title when nested child lacks metadata', () => {
      const { container } = render(
        <CodeGroup>
          <div>
            <span>Label without metadata</span>
          </div>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
    });

    it('falls back to default numbered tab title when tab contains no code or children', () => {
      const { container } = render(
        <CodeGroup>
          <div>
            <hr />
          </div>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
    });

    it('handles empty code container without children and falls back to default title', () => {
      const { container } = render(
        <CodeGroup>
          <pre />
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
    });
  });

  describe('Tab Selection & Content Visibility', () => {
    it('activates the first tab by default and hides inactive tab content', () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="TypeScript">const x: number = 1;</code>
          </pre>
          <pre>
            <code data-title="JavaScript">const x = 1;</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      const panel = container.querySelector('[role="tabpanel"]');

      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[0].getAttribute('tabindex')).toBe('0');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
      expect(tabs[1].getAttribute('tabindex')).toBe('-1');

      expect(panel?.textContent).toContain('const x: number = 1;');
      expect(panel?.textContent).not.toContain('const x = 1;');
    });

    it('switches visible code example when reader clicks another tab', async () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="Tab A">Content A</code>
          </pre>
          <pre>
            <code data-title="Tab B">Content B</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      const panel = container.querySelector('[role="tabpanel"]');

      await act(async () => {
        fireEvent.click(tabs[1]);
      });

      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(panel?.textContent).toContain('Content B');
      expect(panel?.textContent).not.toContain('Content A');
    });
  });

  describe('WAI-ARIA Accessibility & Keyboard Navigation', () => {
    it('links tabs to panels via aria-controls and aria-labelledby', () => {
      const { container } = render(
        <CodeGroup id="my-group">
          <pre>
            <code data-title="First">First Content</code>
          </pre>
        </CodeGroup>
      );

      const tab = container.querySelector('[role="tab"]');
      const panel = container.querySelector('[role="tabpanel"]');

      expect(tab?.getAttribute('aria-controls')).toBe(panel?.id);
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab?.id);
    });

    it('navigates to next tab with ArrowRight and wraps around to beginning', async () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      await act(async () => {
        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      });
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');

      await act(async () => {
        fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
      });
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });

    it('navigates to previous tab with ArrowLeft and wraps around to end', async () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      await act(async () => {
        fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
      });
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');

      await act(async () => {
        fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
      });
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });

    it('jumps to first tab on Home and last tab on End', async () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
          <pre>
            <code data-title="Tab 3">Code 3</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      await act(async () => {
        fireEvent.keyDown(tabs[0], { key: 'End' });
      });
      expect(tabs[2].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tabs[2]);

      await act(async () => {
        fireEvent.keyDown(tabs[2], { key: 'Home' });
      });
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('ignores other keyboard events without modifying active tab selection', async () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      );

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      await act(async () => {
        fireEvent.keyDown(tabs[0], { key: 'Enter' });
      });
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('Shared Group Synchronization', () => {
    it('syncs active tab selection across code groups with identical group names', async () => {
      const { mdxCtx } = await import('../../src/mdx/context.js');
      mdxCtx.set({ store: {} as AnyType });

      const { container } = render(
        <div>
          <CodeGroup id="group-1" group="pkg-manager">
            <pre>
              <code data-title="pnpm" {...({ name: 'pnpm' } as AnyType)}>
                pnpm add a
              </code>
            </pre>
            <pre>
              <code data-title="npm" {...({ name: 'npm' } as AnyType)}>
                npm i a
              </code>
            </pre>
          </CodeGroup>
          <CodeGroup id="group-2" group="pkg-manager">
            <pre>
              <code data-title="pnpm" {...({ name: 'pnpm' } as AnyType)}>
                pnpm add b
              </code>
            </pre>
            <pre>
              <code data-title="npm" {...({ name: 'npm' } as AnyType)}>
                npm i b
              </code>
            </pre>
          </CodeGroup>
        </div>
      );

      const groups = container.querySelectorAll('.air-mdx-codegroup');
      const group1Tabs = groups[0].querySelectorAll('[role="tab"]');
      const group2Tabs = groups[1].querySelectorAll('[role="tab"]');

      expect(group1Tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(group2Tabs[0].getAttribute('aria-selected')).toBe('true');

      await act(async () => {
        fireEvent.click(group1Tabs[1]);
      });

      expect(group1Tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(group2Tabs[1].getAttribute('aria-selected')).toBe('true');
    });

    it('sets --air-mdx-group-height CSS property on mount', () => {
      const { container } = render(
        <CodeGroup>
          <pre>
            <code>echo 1</code>
          </pre>
        </CodeGroup>
      );

      const root = container.firstElementChild as HTMLElement;
      expect(root?.style.getPropertyValue('--air-mdx-group-height')).toBeDefined();
    });
  });
});
