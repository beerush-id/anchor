import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle, ToggleGroup } from '../../src/components/Toggle';
import { anchor } from '@anchorlib/core';
import { debugRender, useValueIs } from '../../src/index.js';

// Mock debugRender to avoid console logs
vi.mock('../../src/index.js', async () => {
  const actual = await vi.importActual('../../src/index.js');
  return {
    ...actual,
    debugRender: vi.fn(),
    useValueIs: vi.fn(),
  };
});

describe('Toggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render a button element', () => {
      (useValueIs as any).mockReturnValue(false);
      render(
        <Toggle bind={{}} name="test">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Toggle');
    });

    it('should render with disabled state when no bind object', () => {
      (useValueIs as any).mockReturnValue(false);
      render(<Toggle name="test">Toggle</Toggle>);

      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should render with data-checked attribute when checked', () => {
      (useValueIs as any).mockReturnValue(true);
      render(
        <Toggle bind={{}} name="test">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('data-checked')).toBe('true');
    });

    it('should render with data-checked attribute as false when not checked', () => {
      (useValueIs as any).mockReturnValue(false);
      render(
        <Toggle bind={{}} name="test">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('data-checked')).toBe('false');
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the button element', () => {
      (useValueIs as any).mockReturnValue(false);
      render(
        <Toggle bind={{}} name="test" className="custom-class">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('Binding Functionality', () => {
    it('should set value to true when toggled and no value specified', () => {
      (useValueIs as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      render(
        <Toggle bind={bind} name="test">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(bind.test).toBe(true);
    });

    it('should delete property when toggled off and no value specified', () => {
      (useValueIs as any).mockReturnValue(true);
      const bind = anchor({ test: true });
      render(
        <Toggle bind={bind} name="test">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(bind.test).toBe(false);
    });

    it('should set value to specified value when toggled on', () => {
      (useValueIs as any).mockReturnValue(false);
      const bind = anchor({ test: undefined });
      render(
        <Toggle bind={bind} name="test" value="custom-value">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(bind.test).toBe('custom-value');
    });

    it('should delete property when toggled off with specified value', () => {
      (useValueIs as any).mockReturnValue(true);
      const bind = anchor({ test: 'custom-value' });
      render(
        <Toggle bind={bind} name="test" value="custom-value">
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(bind.test).toBe(undefined);
    });

    it('should call onClick and onChange handlers when provided', () => {
      (useValueIs as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      const onClick = vi.fn();
      const onChange = vi.fn();
      render(
        <Toggle bind={bind} name="test" onClick={onClick} onChange={onChange}>
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(true);
      expect(bind.test).toBe(true);
    });
  });

  describe('Partial State Handling', () => {
    it('should render with data-partial attribute when partial state exists', () => {
      (useValueIs as any).mockReturnValue(false);
      const inherits = [{ test: true }];
      render(
        <Toggle bind={{}} name="test" inherits={inherits}>
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('data-partial')).toBe('true');
    });

    it('should render with data-partial attribute as false when no partial state', () => {
      (useValueIs as any).mockReturnValue(false);
      const inherits = [{ test: false }];
      render(
        <Toggle bind={{}} name="test" inherits={inherits}>
          Toggle
        </Toggle>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('data-partial')).toBe('false');
    });
  });
});

describe('ToggleGroup Component', () => {
  it('should render a div with toggle-group class', () => {
    render(<ToggleGroup>Content</ToggleGroup>);

    const div = screen.getByText('Content').closest('div');
    expect(div).toBeTruthy();
    expect(div?.classList.contains('ark-toggle-group')).toBe(true);
  });

  it('should render with additional className', () => {
    render(<ToggleGroup className="custom">Content</ToggleGroup>);

    const div = screen.getByText('Content').closest('div');
    expect(div).toBeTruthy();
    expect(div?.classList.contains('ark-toggle-group')).toBe(true);
    expect(div?.classList.contains('custom')).toBe(true);
  });
});
