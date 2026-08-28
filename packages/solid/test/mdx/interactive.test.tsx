/** @jsxImportSource solid-js */

import '../../src/client/index.js';
import { fireEvent, render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { bind, mutable } from '../../src/index.js';
import { Interactive, type InteractivePanel } from '../../src/mdx/Interactive.js';

describe('Interactive Component', () => {
  it('renders default interactive demo with preview panel selected', () => {
    const { container } = render(() => (
      <Interactive>
        <div class="preview">Live Demo Widget</div>
      </Interactive>
    ));

    const title = container.querySelector('.air-interactive-title');
    expect(title?.textContent).toBe('Interactive Demo');

    const toggle = container.querySelector('.air-interactive-toggle');
    expect(toggle?.getAttribute('data-panel')).toBe('preview');

    const previewRadio = container.querySelector<HTMLInputElement>('input[value="preview"]');
    const sourceRadio = container.querySelector<HTMLInputElement>('input[value="source"]');

    expect(previewRadio?.checked).toBe(true);
    expect(sourceRadio?.checked).toBe(false);
    expect(container.querySelector('.preview')?.textContent).toBe('Live Demo Widget');
  });

  it('allows custom title and custom icon', () => {
    const customIcon = <span data-testid="custom-interactive-icon">⚡</span>;
    const { container, getByTestId } = render(() => (
      <Interactive title="Custom Live Widget" icon={customIcon}>
        <div>Content</div>
      </Interactive>
    ));

    const title = container.querySelector('.air-interactive-title');
    expect(title?.textContent).toBe('Custom Live Widget');
    expect(getByTestId('custom-interactive-icon')).not.toBeNull();
  });

  it('switches between source and preview panel via radio toggle', async () => {
    const { container } = render(() => (
      <Interactive id="demo-widget">
        <div class="content">Body</div>
      </Interactive>
    ));

    const sourceRadio = container.querySelector<HTMLInputElement>('input[value="source"]');
    const previewRadio = container.querySelector<HTMLInputElement>('input[value="preview"]');

    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');

    fireEvent.change(sourceRadio!, { target: { checked: true } });
    await Promise.resolve();

    expect(sourceRadio?.checked).toBe(true);
    expect(previewRadio?.checked).toBe(false);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('source');

    fireEvent.change(previewRadio!, { target: { checked: true } });
    await Promise.resolve();

    expect(previewRadio?.checked).toBe(true);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');
  });

  it('supports two-way binding with external state via bind()', async () => {
    const state = mutable<{ panel: InteractivePanel }>({ panel: 'preview' });
    const { container } = render(() => (
      <Interactive id="bound-widget" panel={bind(state, 'panel')}>
        <div class="content">Body</div>
      </Interactive>
    ));

    const sourceRadio = container.querySelector<HTMLInputElement>('input[value="source"]');
    const previewRadio = container.querySelector<HTMLInputElement>('input[value="preview"]');

    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');

    fireEvent.change(sourceRadio!, { target: { checked: true } });
    await Promise.resolve();

    expect(state.panel).toBe('source');
    expect(sourceRadio?.checked).toBe(true);
    expect(previewRadio?.checked).toBe(false);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('source');

    fireEvent.change(previewRadio!, { target: { checked: true } });
    await Promise.resolve();

    expect(state.panel).toBe('preview');
    expect(previewRadio?.checked).toBe(true);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');
  });

  it('hides the toggle radio group when standalone is true', () => {
    const { container } = render(() => (
      <Interactive standalone>
        <div>Standalone Preview</div>
      </Interactive>
    ));

    const toggle = container.querySelector('.air-interactive-toggle');
    expect(toggle).toBeNull();
  });

  it('forwards custom id, class, and HTML attributes to root container', () => {
    const { container } = render(() => (
      <Interactive id="my-interactive" class="custom-demo" data-testid="interactive-root">
        <div>Demo</div>
      </Interactive>
    ));

    const root = container.firstElementChild as HTMLElement;
    expect(root?.id).toBe('my-interactive');
    expect(root?.className).toContain('custom-demo');
    expect(root?.className).toContain('air-interactive');
    expect(root?.getAttribute('data-testid')).toBe('interactive-root');
    expect(root?.style.getPropertyValue('--air-mdx-interactive-height')).toBeDefined();
  });
});
