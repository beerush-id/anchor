import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../src/client/index.js';
import { Interactive } from '../../src/mdx/Interactive.js';

describe('Interactive Component', () => {
  it('renders default interactive demo with preview panel selected', () => {
    const { container } = render(
      <Interactive>
        <div className="preview">Live Demo Widget</div>
      </Interactive>
    );

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
    const { container, getByTestId } = render(
      <Interactive title="Custom Live Widget" icon={customIcon}>
        <div>Content</div>
      </Interactive>
    );

    const title = container.querySelector('.air-interactive-title');
    expect(title?.textContent).toBe('Custom Live Widget');
    expect(getByTestId('custom-interactive-icon')).not.toBeNull();
  });

  it('switches between source and preview panel via radio toggle', async () => {
    const { container } = render(
      <Interactive id="demo-widget">
        <div className="content">Body</div>
      </Interactive>
    );

    const sourceRadio = container.querySelector<HTMLInputElement>('input[value="source"]');
    const previewRadio = container.querySelector<HTMLInputElement>('input[value="preview"]');

    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');

    await act(async () => {
      fireEvent.click(sourceRadio!);
    });

    expect(sourceRadio?.checked).toBe(true);
    expect(previewRadio?.checked).toBe(false);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('source');

    await act(async () => {
      fireEvent.click(previewRadio!);
    });

    expect(previewRadio?.checked).toBe(true);
    expect(container.querySelector('.air-interactive-toggle')?.getAttribute('data-panel')).toBe('preview');
  });

  it('hides the toggle radio group when standalone is true', () => {
    const { container } = render(
      <Interactive standalone>
        <div>Standalone Preview</div>
      </Interactive>
    );

    const toggle = container.querySelector('.air-interactive-toggle');
    expect(toggle).toBeNull();
  });

  it('forwards custom id, className, and HTML attributes to root container', () => {
    const { container } = render(
      <Interactive id="my-interactive" className="custom-demo" data-testid="interactive-root">
        <div>Demo</div>
      </Interactive>
    );

    const root = container.firstElementChild;
    expect(root?.id).toBe('my-interactive');
    expect(root?.className).toContain('custom-demo');
    expect(root?.className).toContain('air-interactive');
    expect(root?.getAttribute('data-testid')).toBe('interactive-root');
  });
});
