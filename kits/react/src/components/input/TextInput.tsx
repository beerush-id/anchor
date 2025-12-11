import { classx } from '@anchorkit/headless/utils';
import { callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextInputProps } from './types.js';

export const TextInput = setup<TextInputProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render(
    (_, { type = 'text', value = '', disabled, className }: TextInputProps) => (
      <input
        type={type}
        value={value}
        onChange={callback(handleChange)}
        disabled={disabled}
        className={classx('ark-input', className)}
        {...props.$omit(['type', 'value', 'disabled', 'className', 'onChange'])}
      />
    ),
    'TextInput'
  );
}, 'TextInput');
