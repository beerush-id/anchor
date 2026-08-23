/** @jsxImportSource solid-js */

import '../../src/client/index.js';
import { fireEvent, render } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';
import { CodeGroup } from '../../src/mdx/CodeGroup.js';

describe('Multi-Variant Code Groups', () => {
  describe('Tab Derivation & Visual Labels', () => {
    it('derives tab titles from code block data-title or data-language attributes', () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="pnpm">pnpm add @airlib/solid</code>
          </pre>
          <pre>
            <code data-language="npm">npm install @airlib/solid</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs).toHaveLength(2);
      expect(tabs[0].textContent).toBe('pnpm');
      expect(tabs[1].textContent).toBe('npm');
    });

    it('falls back to numbered tab names when code blocks lack titles or languages', () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code>console.log(1)</code>
          </pre>
          <pre>
            <code>console.log(2)</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
      expect(tabs[1].textContent).toBe('Tab 2');
    });

    it('allows authors to set custom accessible label for the tablist', () => {
      const { container } = render(() => (
        <CodeGroup tablistLabel="Package Manager Install Commands">
          <pre>
            <code data-title="pnpm">pnpm add foo</code>
          </pre>
        </CodeGroup>
      ));

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist?.getAttribute('aria-label')).toBe('Package Manager Install Commands');
    });

    it('extracts metadata from nested child elements in tab blocks', () => {
      const { container } = render(() => (
        <CodeGroup>
          <div>
            <span>
              <code data-title="Nested Title">nested code</code>
            </span>
          </div>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Nested Title');
    });

    it('extracts metadata when tab child contains an array of nested elements', () => {
      const { container } = render(() => (
        <CodeGroup>
          <div>{[<span>Label</span>, <code data-title="Array Child">array code</code>]}</div>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Array Child');
    });

    it('falls back to default numbered tab title when tab contains no code or children', () => {
      const { container } = render(() => (
        <CodeGroup>
          <div>
            <hr />
          </div>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Tab 1');
    });

    it('extracts metadata from direct code element children', () => {
      const { container } = render(() => (
        <CodeGroup>
          <code data-title="Direct Code">code content</code>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Direct Code');
    });

    it('extracts metadata from nested code block elements', () => {
      const { container } = render(() => (
        <CodeGroup>
          <div>
            <pre>
              <code data-title="Nested Tab 1">code 1</code>
            </pre>
          </div>
          <div>
            <pre>
              <code data-title="Nested Tab 2">code 2</code>
            </pre>
          </div>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('Nested Tab 1');
      expect(tabs[1].textContent).toBe('Nested Tab 2');
    });

    it('extracts metadata from AST vnode structures in CodeGroup', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const vnode1 = { name: 'code', props: { 'data-title': 'VNode Code' } };
      const vnode2 = { children: [{ type: 'code', props: { 'data-title': 'Nested VNode' } }] };
      const vnode3 = { props: { children: [{ name: 'code', props: { 'data-title': 'Array Child' } }] } };
      const vnode4 = { children: { type: 'code', props: { 'data-title': 'Single Child' } } };
      const vnode5 = 'primitive string';
      const vnode6 = { children: [null, undefined, { type: 'code', props: { 'data-title': 'After Null' } }] };
      const vnode7 = { props: { children: { type: 'code', props: { 'data-title': 'Single Props Child' } } } };

      const { container } = render(() => (
        <CodeGroup>{[vnode1, vnode2, vnode3, vnode4, vnode5, vnode6, vnode7] as never}</CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('VNode Code');
      expect(tabs[1].textContent).toBe('Nested VNode');
      expect(tabs[2].textContent).toBe('Array Child');
      expect(tabs[3].textContent).toBe('Single Child');
      expect(tabs[4].textContent).toBe('Tab 5');
      expect(tabs[5].textContent).toBe('After Null');
      expect(tabs[6].textContent).toBe('Single Props Child');
      warnSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('Tab Selection & Content Visibility', () => {
    it('activates the first tab by default and hides inactive tab content', () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="TypeScript">const x: number = 1;</code>
          </pre>
          <pre>
            <code data-title="JavaScript">const x = 1;</code>
          </pre>
        </CodeGroup>
      ));

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
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="Tab A">Content A</code>
          </pre>
          <pre>
            <code data-title="Tab B">Content B</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll('[role="tab"]');
      const panel = container.querySelector('[role="tabpanel"]');

      fireEvent.click(tabs[1]);
      await Promise.resolve();

      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(panel?.textContent).toContain('Content B');
      expect(panel?.textContent).not.toContain('Content A');
    });
  });

  describe('WAI-ARIA Accessibility & Keyboard Navigation', () => {
    it('links tabs to panels via aria-controls and aria-labelledby', () => {
      const { container } = render(() => (
        <CodeGroup id="my-group">
          <pre>
            <code data-title="First">First Content</code>
          </pre>
        </CodeGroup>
      ));

      const tab = container.querySelector('[role="tab"]');
      const panel = container.querySelector('[role="tabpanel"]');

      expect(tab?.getAttribute('aria-controls')).toBe(panel?.id);
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab?.id);
    });

    it('navigates to next tab with ArrowRight and wraps around to beginning', async () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      await Promise.resolve();
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');

      fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
      await Promise.resolve();
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });

    it('navigates to previous tab with ArrowLeft and wraps around to end', async () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
      await Promise.resolve();
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');

      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
      await Promise.resolve();
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });

    it('jumps to first tab on Home and last tab on End', async () => {
      const { container } = render(() => (
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
      ));

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      fireEvent.keyDown(tabs[0], { key: 'End' });
      await Promise.resolve();
      expect(tabs[2].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tabs[2]);

      fireEvent.keyDown(tabs[2], { key: 'Home' });
      await Promise.resolve();
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('ignores other keyboard events without modifying active tab selection', async () => {
      const { container } = render(() => (
        <CodeGroup>
          <pre>
            <code data-title="Tab 1">Code 1</code>
          </pre>
          <pre>
            <code data-title="Tab 2">Code 2</code>
          </pre>
        </CodeGroup>
      ));

      const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

      fireEvent.keyDown(tabs[0], { key: 'Enter' });
      await Promise.resolve();
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    });

    it('handles AST nodes with DOM elements as children', () => {
      const domCode = document.createElement('code');
      domCode.setAttribute('data-title', 'DOM Code In AST');
      const vnodeWithCode = { children: domCode };

      const domDiv = document.createElement('div');
      const vnodeWithDiv = { children: domDiv };

      const emptyObject = { unknownField: true };

      const { container } = render(() => <CodeGroup>{[vnodeWithCode, vnodeWithDiv, emptyObject] as never}</CodeGroup>);

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].textContent).toBe('DOM Code In AST');
      expect(tabs[1].textContent).toBe('Tab 2');
      expect(tabs[2].textContent).toBe('Tab 3');
    });
  });
});
