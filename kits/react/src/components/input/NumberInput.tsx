import { bindable, setup, template } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { NumberInputProps } from './types.js';

export const NumberInput = setup(function NumberInput({
  type = 'number',
  value = 0,
  disabled,
  onChange,
  ...props
}: NumberInputProps) {
  const valueRef = bindable(0, value);
  const disabledRef = bindable(false, disabled);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = parseFloat(e.currentTarget.value);
    valueRef.value = Number.isNaN(value) ? 0 : value;
    onChange?.(e);
  };

  const Template = template(() => {
    return <input type={type} value={valueRef.value} onChange={handleChange} disabled={disabledRef.value} {...props} />;
  });

  return <Template />;
}, 'NumberInput');
