import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Radio } from '../../src/components/Radio';
import { anchor } from '@anchorlib/core';
import { debugRender, useValue } from '../../src/index.js';

// Mock debugRender to avoid console logs
vi.mock('../../src/index.js', async () => {
  const actual = await vi.importActual('../../src/index.js');
  return {
    ...actual,
    debugRender: vi.fn(),
    useValue: vi.fn(),
  };
});

describe('Radio Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render a radio input element', () => {
      (useValue as any).mockReturnValue(false);
      render(<Radio bind={{}} name="test" />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeTruthy();
      expect(radio.getAttribute('type')).toBe('radio');
      expect(radio.getAttribute('name')).toBe('test');
    });

    it('should render with checked state from useValue', () => {
      (useValue as any).mockReturnValue(true);
      render(<Radio bind={{}} name="test" />);

      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(true);
    });

    it('should render with fallback to checked prop', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Radio bind={{}} name="test" checked={true} />);

      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(true);
    });

    it('should render with fallback to false', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Radio bind={{}} name="test" />);

      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(false);
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the input element', () => {
      (useValue as any).mockReturnValue(false);
      render(<Radio bind={{}} name="test" disabled={true} />);

      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.disabled).toBe(true);
    });
  });

  describe('Binding Functionality', () => {
    it('should update bind object on change when checked', () => {
      (useValue as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      render(<Radio bind={bind} name="test" />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      expect(bind.test).toBe(true);
    });

    it('should call onChange handler when provided', () => {
      (useValue as any).mockReturnValue(false);
      const bind = anchor({ test: false });
      const onChange = vi.fn();
      render(<Radio bind={bind} name="test" onChange={onChange} />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      expect(onChange).toHaveBeenCalled();
      expect(bind.test).toBe(true);
    });

    it('should not update bind when no bind object provided', () => {
      (useValue as any).mockReturnValue(false);
      const onChange = vi.fn();
      render(<Radio name="test" onChange={onChange} />);

      const radio = screen.getByRole('radio');
      fireEvent.click(radio);

      expect(onChange).toHaveBeenCalled();
    });
  });
});
