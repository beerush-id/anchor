import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../src/client/index.js';
import { Badge, type BadgeVariant } from '../../src/mdx/Badge.js';

describe('Documentation Status Badges', () => {
  it('displays informational tag by default to indicate general status', () => {
    const { container } = render(<Badge text="v1.0" />);
    const badge = container.querySelector('span');

    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('v1.0');
    expect(badge?.className).toContain('air-mdx-badge');
    expect(badge?.className).toContain('air-mdx-badge-info');
  });

  it('allows authors to provide badge label through nested children', () => {
    const { container } = render(<Badge>Experimental</Badge>);
    const badge = container.querySelector('span');

    expect(badge?.textContent).toBe('Experimental');
  });

  it('prioritizes explicit text prop over nested children when both are supplied', () => {
    const { container } = render(<Badge text="Primary Label">Fallback Content</Badge>);
    const badge = container.querySelector('span');

    expect(badge?.textContent).toBe('Primary Label');
  });

  it('visually distinguishes status variants for reader clarity', () => {
    const variants: BadgeVariant[] = ['tip', 'info', 'warning', 'danger', 'neutral'];

    for (const variant of variants) {
      const { container } = render(<Badge variant={variant} text={variant.toUpperCase()} />);
      const badge = container.querySelector('span');

      expect(badge?.className).toContain(`air-mdx-badge-${variant}`);
      expect(badge?.textContent).toBe(variant.toUpperCase());
    }
  });

  it('forwards custom class names and HTML attributes for layout styling', () => {
    const { container } = render(
      <Badge text="Deprecated" className="custom-badge" id="dep-badge" data-testid="status-tag" />
    );
    const badge = container.querySelector('span');

    expect(badge?.className).toContain('custom-badge');
    expect(badge?.id).toBe('dep-badge');
    expect(badge?.getAttribute('data-testid')).toBe('status-tag');
  });
});
