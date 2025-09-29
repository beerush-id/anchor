import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ColorPicker } from '../../src/components/index.js';
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

describe('ColorPicker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render a label element with input', () => {
      (useValue as any).mockReturnValue('#000000');
      render(<ColorPicker bind={{ test: '' }} name="test" />);

      const label = screen.getByText('', { selector: 'label' });
      expect(label).toBeTruthy();

      const input = label.querySelector('input');
      expect(input).toBeTruthy();
      expect(input?.getAttribute('type')).toBe('color');
    });

    it('should render with value from useValue', () => {
      (useValue as any).mockReturnValue('#ff0000');
      render(<ColorPicker bind={{ test: '' }} name="test" />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#ff0000');
    });

    it('should render with fallback to value prop', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<ColorPicker bind={{ test: '' }} name="test" value="#00ff00" />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#00ff00');
    });

    it('should render with inherited placeholder value', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ test: '#0000ff' }];
      render(<ColorPicker bind={{ test: '' }} name="test" inherits={inherits} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#0000ff');
    });

    it('should render with placeholder prop value', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<ColorPicker bind={{ test: '' }} name="test" placeholder="#ffff00" />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#ffff00');
    });

    it('should render with default black color when no value provided', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<ColorPicker bind={{ test: '' }} name="test" />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#000000');
    });

    it('should render with custom className', () => {
      (useValue as any).mockReturnValue('#000000');
      render(<ColorPicker bind={{ test: '' }} name="test" className="custom-class" />);

      const label = screen.getByText('', { selector: 'label' });
      expect(label.classList.contains('custom-class')).toBe(true);
    });

    it('should render with children content', () => {
      (useValue as any).mockReturnValue('#000000');
      render(
        <ColorPicker bind={{ test: '' }} name="test">
          Child Content
        </ColorPicker>
      );

      const label = screen.getByText('Child Content', { selector: 'label' });
      expect(label).toBeTruthy();
    });
  });

  describe('Inherited Placeholder Handling', () => {
    it('should use first defined inherited value', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ test: undefined as any }, { test: '#abcdef' as any }, { test: '#123456' as any }];
      render(<ColorPicker bind={{ test: '' }} name="test" inherits={inherits} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#abcdef');
    });

    it('should return undefined when inherits is not an array', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<ColorPicker bind={{ test: '' }} name="test" inherits={undefined} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#000000');
    });

    it('should return undefined when inherits array is empty', () => {
      (useValue as any).mockReturnValue(undefined);
      render(<ColorPicker bind={{ test: '' }} name="test" inherits={[]} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#000000');
    });

    it('should return undefined when all inherited values are undefined', () => {
      (useValue as any).mockReturnValue(undefined);
      const inherits = [{ test: undefined as any }, { test: undefined as any }];
      render(<ColorPicker bind={{ test: '' }} name="test" inherits={inherits} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.value).toBe('#000000');
    });
  });

  describe('Props Handling', () => {
    it('should pass additional props to the input element', () => {
      (useValue as any).mockReturnValue('#000000');
      render(<ColorPicker bind={{ test: '' }} name="test" disabled={true} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input') as HTMLInputElement;
      expect(input?.disabled).toBe(true);
    });
  });

  describe('Binding Functionality', () => {
    it('should update bind object on change', () => {
      (useValue as any).mockReturnValue('#000000');
      const bind = anchor({ test: '#000000' });
      render(<ColorPicker bind={bind} name="test" />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input');
      fireEvent.change(input!, { target: { value: '#ff0000' } });

      expect(bind.test).toBe('#ff0000');
    });

    it('should call onChange handler when provided', () => {
      (useValue as any).mockReturnValue('#000000');
      const bind = anchor({ test: '#000000' });
      const onChange = vi.fn();
      render(<ColorPicker bind={bind} name="test" onChange={onChange} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input');
      fireEvent.change(input!, { target: { value: '#ff0000' } });

      expect(onChange).toHaveBeenCalled();
      expect(bind.test).toBe('#ff0000');
    });

    it('should call onChange handler when no bind object provided', () => {
      (useValue as any).mockReturnValue('#000000');
      const onChange = vi.fn();
      render(<ColorPicker bind={undefined} name="test" onChange={onChange} />);

      const label = screen.getByText('', { selector: 'label' });
      const input = label.querySelector('input');
      fireEvent.change(input!, { target: { value: '#ff0000' } });

      // Since there's no bind object, onChange should not be called
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Style Handling', () => {
    it('should set background color style based on current value', () => {
      (useValue as any).mockReturnValue('#ff0000');
      render(<ColorPicker bind={{ test: '' }} name="test" />);

      const label = screen.getByText('', { selector: 'label' }) as HTMLLabelElement;
      expect(label.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });
  });
});
