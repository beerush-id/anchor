import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../../src/components/Select';
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

describe('Select Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render a select element', () => {
      (useValue as any).mockReturnValue('');
      render(
        <Select bind={{}} name="test">
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeTruthy();
      expect(select.getAttribute('name')).toBe('test');
    });

    it('should render with value from useValue', () => {
      (useValue as any).mockReturnValue('2');
      render(
        <Select bind={{}} name="test">
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('2');
    });

    it('should render with fallback to value prop', () => {
      (useValue as any).mockReturnValue(undefined);
      render(
        <Select bind={{}} name="test" value="1">
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1');
    });

    it('should render with fallback to empty string', () => {
      (useValue as any).mockReturnValue(undefined);
      render(
        <Select bind={{}} name="test">
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the select element', () => {
      (useValue as any).mockReturnValue('');
      render(
        <Select bind={{}} name="test" disabled={true}>
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
        </Select>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });
  });

  describe('Binding Functionality', () => {
    it('should update bind object on change', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: '' });
      render(
        <Select bind={bind} name="test">
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      expect(bind.test).toBe('2');
    });

    it('should call onChange handler when provided', () => {
      (useValue as any).mockReturnValue('');
      const bind = anchor({ test: '' });
      const onChange = vi.fn();
      render(
        <Select bind={bind} name="test" onChange={onChange}>
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      expect(onChange).toHaveBeenCalled();
      expect(bind.test).toBe('2');
    });

    it('should not update bind when no bind object provided', () => {
      (useValue as any).mockReturnValue('');
      const onChange = vi.fn();
      render(
        <Select name="test" onChange={onChange}>
          <option value="">Select an option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      expect(onChange).toHaveBeenCalled();
    });
  });
});
