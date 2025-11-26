import { bindable, setup, template } from '@anchorlib/react-next';
import type { ChangeEventHandler } from 'react';
import type { TextInputProps } from './types.js';

export const TextInput = setup(function TextInput({
  type = 'text',
  value = '',
  disabled = false,
  onChange,
  ...props
}: TextInputProps) {
  const valueRef = bindable('', value);
  const disabledRef = bindable(false, disabled);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    valueRef.value = e.currentTarget.value ?? '';
    onChange?.(e);
  };

  const Template = template(() => {
    return <input type={type} value={valueRef.value} disabled={disabledRef.value} onChange={handleChange} {...props} />;
  });

  return <Template />;
}, 'TextInput');
