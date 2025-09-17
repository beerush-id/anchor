import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from '../../src/components/Input';
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

describe('Input Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render an input element', () => {
      (useValue as any).mockReturnValue('');
      render(<Input bind={{ test: '' }} name="test" />);

      const input = screen.getByRole('textbox');
      expect(input).toBeTruthy();
      expect(input.getAttribute('name')).toBe('test');
    });

    it('should render with initial value from useValue', () => {
      (useValue as any).mockReturnValue('initial value');
      render(<Input bind={{ test: '' }} name="test" />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial value');
    });

    it('should render with fallback to value prop', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Input bind={{ test: '' }} name="test" value="fallback value" />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('fallback value');
    });

    it('should render with fallback to empty string', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Input bind={{ test: '' }} name="test" />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the input element', () => {
      (useValue as any).mockReturnValue('');
      render(<Input bind={{ test: '' }} name="test" placeholder="Enter text" type="text" />);

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('placeholder')).toBe('Enter text');
      expect(input.getAttribute('type')).toBe('text');
    });

    it('should use custom ref when provided', () => {
      (useValue as any).mockReturnValue('');
      const customRef = { current: null };
      render(<Input bind={{ test: '' }} name="test" ref={customRef} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeTruthy();
    });
  });

  describe('Binding Functionality', () => {
    it('should update bind object on change', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: '' });
      render(<Input bind={bind} name="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(bind.test).toBe('new value');
    });

    it('should handle number type inputs', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: 0 });
      render(<Input bind={bind} name="test" type="number" />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '42' } });

      expect(bind.test).toBe(42);
    });

    it('should handle invalid number inputs', () => {
      (useValue as any).mockReturnValue('0');
      const bind = anchor({ test: 0 });
      render(<Input bind={bind} name="test" type="number" />);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'not-a-number' } });

      // When value is NaN, it should be deleted from the bind object
      expect(bind.hasOwnProperty('test')).toBe(false);
    });

    it('should not delete property when value is empty string', () => {
      (useValue as any).mockReturnValue('initial');
      const bind = anchor({ test: 'initial' });
      render(<Input bind={bind} name="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });

      // When value is empty string, it should NOT be deleted from the bind object
      expect(bind.test).toBe('');
    });

    it('should update pipe object when provided', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: '' });
      const pipe = anchor({ test: '' });
      render(<Input bind={bind} pipe={pipe} name="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(bind.test).toBe('new value');
      expect(pipe.test).toBe('new value');
    });

    it('should call onChange handler when provided', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: '' });
      const onChange = vi.fn();
      render(<Input bind={bind} name="test" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(onChange).toHaveBeenCalled();
      expect(bind.test).toBe('new value');
    });
  });

  describe('Placeholder Handling', () => {
    it('should use inherited placeholder when available', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ test: 'inherited value' }];
      render(<Input bind={{ test: '' }} name="test" inherits={inherits} />);

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('placeholder')).toBe('inherited value');
    });

    it('should handle placeholder when inherited from non-existing property', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ foo: 'inherited value' }];
      render(<Input bind={{ test: '' }} name="test" inherits={inherits} placeholder="test" />);

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('placeholder')).toBe('test');
    });

    it('should use placeholder prop when no inherited value', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<Input bind={{ test: '' }} name="test" placeholder="default placeholder" />);

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('placeholder')).toBe('default placeholder');
    });

    it('should prioritize inherited placeholder over placeholder prop', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ test: 'inherited value' }];
      render(<Input bind={{ test: '' }} name="test" inherits={inherits} placeholder="default placeholder" />);

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('placeholder')).toBe('inherited value');
    });
  });
});
