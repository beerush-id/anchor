import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from '../../src/components/Checkbox';
import { anchor } from '@anchorlib/core';
import { useValue } from '../../src/index.js';

// Mock debugRender to avoid console logs
vi.mock('../../src/index.js', async () => {
  const actual = await vi.importActual('../../src/index.js');
  return {
    ...actual,
    debugRender: vi.fn(),
    useValue: vi.fn(),
  };
});

describe('Checkbox Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render a checkbox input element', () => {
      (useValue as any).mockReturnValue(false);
      render(<Checkbox bind={{ test: '' }} name="test" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeTruthy();
      expect(checkbox.getAttribute('type')).toBe('checkbox');
      expect(checkbox.getAttribute('name')).toBe('test');
    });

    it('should render with checked state from useValue', () => {
      (useValue as any).mockReturnValue(true);
      render(<Checkbox bind={{ test: '' }} name="test" />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should render with fallback to checked prop', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Checkbox bind={{ test: '' }} name="test" checked={true} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should render with fallback to false', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Checkbox bind={{ test: '' }} name="test" />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the input element', () => {
      (useValue as any).mockReturnValue(false);
      render(<Checkbox bind={{ test: '' }} name="test" disabled={true} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe('Binding Functionality', () => {
    it('should update bind object on change when checked', () => {
      (useValue as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      render(<Checkbox bind={bind} name="test" />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(bind.test).toBe(true);
    });

    it('should update bind object on change when unchecked', () => {
      (useValue as any).mockReturnValue(true);
      const bind = anchor({ test: true });
      render(<Checkbox bind={bind} name="test" />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(bind.test).toBe(false);
    });

    it('should call onChange handler when provided', () => {
      (useValue as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      const onChange = vi.fn();
      render(<Checkbox bind={bind} name="test" onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalled();
      expect(bind.test).toBe(true);
    });

    it('should not update bind when no bind object provided', () => {
      (useValue as any).mockReturnValue(false);
      const onChange = vi.fn();
      render(<Checkbox bind={undefined} name="test" onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalled();
    });
  });
});
